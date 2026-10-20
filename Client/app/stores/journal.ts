// Чат and Авто: what was written, where it went, and the one-tap fixes («Не туда», «Отменить», Уточнение)
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Entry, Id, Page, Rec } from '~/domain/types'
import { useDataStore } from './data'
import { askModel, ModelError, type ModelResult } from '~/domain/openai'
import { classify } from '~/domain/rules'
import { draftsFor, draftsFromModel, preview, type Draft, type Preview } from '~/domain/auto'
import { cleanRecordText, isQuestion, parseDue } from '~/domain/parse'
import { answer } from '~/domain/search'
import { newEntry } from '~/domain/factory'
import { dayKey } from '~/domain/dates'

export type Choice = { pageId: Id } | { newPage: string } | { keep: true }

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export const useJournalStore = defineStore('journal', () => {
  const data = useDataStore()
  /** Receipts whose 15 s undo line is still running */
  const fresh = ref<Set<Id>>(new Set())
  /** Models calls in flight, so a second «online» event does not run them twice */
  const busy = new Set<Id>()

  const hasModel = () => !!data.settings.apiKey && data.settings.keyState !== 'bad'

  /** The chip while typing in Авто: a clear rule shows its page; with a reachable model an unclear line stays «Авто» */
  function previewFor(text: string): Preview {
    return preview(text, { pages: data.livePages, learned: data.learned, recent: data.recent, model: hasModel() && isOnline() })
  }

  function place(entry: Entry, page: Page, drafts: Draft[], opts: { today?: boolean, via?: Rec['via'] } = {}): Entry {
    const today = dayKey(Date.now())
    const now = Date.now()
    const recs = [...drafts].reverse().map(d => data.addRecord({
      pageId: page.id,
      text: d.text,
      due: d.due ?? (opts.today ? { date: today } : null),
      values: d.values,
      via: opts.via ?? 'chat',
      addedAt: now
    })).reverse()
    data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, recordIds: recs.map(r => r.id), hits: undefined })
    fresh.value.add(entry.id)
    return entry
  }

  /** Not placed: one record in Входящие with «уточнить», and the Уточнение asks about that same record */
  function ask(entry: Entry, text: string, guesses: Id[], newName: string | null, today = false): Entry {
    const { due, rest } = parseDue(text, Date.now())
    const rec = data.addRecord({
      pageId: data.inbox.id,
      text: cleanRecordText(rest || text),
      due: due ?? (today ? { date: dayKey(Date.now()) } : null),
      via: 'chat',
      tags: ['clarify'],
      guesses
    })
    data.updateEntry(entry.id, { kind: 'ask', pageId: data.inbox.id, recordIds: [rec.id], newName, hits: undefined })
    return entry
  }

  /** Key set but no network: the record waits in Входящие and is filed when the network is back */
  function park(entry: Entry, text: string, today = false): Entry {
    const { due, rest } = parseDue(text, Date.now())
    const rec = data.addRecord({
      pageId: data.inbox.id,
      text: cleanRecordText(rest || text),
      due: due ?? (today ? { date: dayKey(Date.now()) } : null),
      via: 'chat',
      tags: ['offline']
    })
    data.updateEntry(entry.id, { kind: 'offline', pageId: data.inbox.id, recordIds: [rec.id] })
    return entry
  }

  function found(entry: Entry, text: string): Entry {
    data.updateEntry(entry.id, { kind: 'found', hits: answer(text, data.liveRecords).map(r => r.id) })
    return entry
  }

  function validPage(id: string | null): Page | undefined {
    const p = id ? data.pages[id] : undefined
    return p && !p.deletedAt && p.kind === 'page' ? p : undefined
  }

  async function decide(entry: Entry, text: string, opts: { today?: boolean, record?: boolean } = {}): Promise<Entry> {
    const now = Date.now()
    if (!opts.record && isQuestion(text)) return found(entry, text)
    const rules = classify(text, data.livePages, data.learned, data.recent)
    const rulePage = validPage(rules.pageId)
    if (rulePage && (!hasModel() || data.settings.rulesFirst)) return place(entry, rulePage, draftsFor(text, rulePage, now), opts)
    if (!hasModel()) return ask(entry, text, rules.guesses, rules.newName, opts.today)
    if (!isOnline()) return park(entry, text, opts.today)

    let result: ModelResult
    busy.add(entry.id)
    try {
      result = await askModel(data.settings.apiKey, data.settings.model, text, data.livePages, now)
      if (data.settings.keyState !== 'ok') data.setSettings({ keyState: 'ok' })
    } catch (e) {
      if (e instanceof ModelError && e.reason === 'key') data.setSettings({ keyState: 'bad' })
      if (e instanceof ModelError && e.reason === 'offline') return park(entry, text, opts.today)
      return rulePage ? place(entry, rulePage, draftsFor(text, rulePage, now), opts) : ask(entry, text, rules.guesses, rules.newName, opts.today)
    } finally {
      busy.delete(entry.id)
    }
    if (result.kind === 'question' && !opts.record) return found(entry, text)
    const page = validPage(result.pageId)
    if (result.kind === 'record' && page) return place(entry, page, draftsFromModel(result, page, now, text), opts)
    const guesses = [...result.guesses.filter(id => validPage(id)), ...rules.guesses].filter((id, i, a) => a.indexOf(id) === i).slice(0, 3)
    return ask(entry, text, guesses, result.newPageName?.trim() || rules.newName, opts.today)
  }

  /**
   * Sends a line from a composer in Авто or to a chosen page.
   * `today`: the composer of «Сегодня», records without a date get today's.
   * `onStart`: the line exists and is being decided, so a screen can show «Разбирается…» before the answer.
   */
  async function send(text: string, dest: 'auto' | Id, opts: { today?: boolean, onStart?: (entry: Entry) => void } = {}): Promise<Entry> {
    const t = text.trim()
    const entry = data.addEntry(newEntry({ at: Date.now(), text: t, kind: 'pending' }))
    opts.onStart?.(entry)
    const page = dest === 'auto' ? undefined : data.pages[dest]
    if (page) {
      if (page.kind === 'inbox') {
        const { due, rest } = parseDue(t, Date.now())
        const rec = data.addRecord({ pageId: page.id, text: cleanRecordText(rest || t), due, via: 'chat' })
        data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, recordIds: [rec.id] })
        fresh.value.add(entry.id)
        return entry
      }
      return place(entry, page, draftsFor(t, page, Date.now()), opts)
    }
    return decide(entry, t, opts)
  }

  /** «Записать» on a found card: the same line becomes a record */
  async function record(entryId: Id): Promise<Entry | undefined> {
    const entry = data.entries.find(e => e.id === entryId)
    if (!entry) return
    data.updateEntry(entry.id, { kind: 'pending', at: Date.now() })
    return decide(entry, entry.text, { record: true })
  }

  /** A page chosen in Уточнение or after «Не туда»; «Оставить здесь» keeps the record in Входящие without the tag */
  function choose(entryId: Id, choice: Choice): Page | undefined {
    const entry = data.entries.find(e => e.id === entryId)
    const ids = entry?.recordIds?.filter(id => data.records[id]) ?? []
    if (!entry || !ids.length) return
    const wasAsk = entry.kind === 'ask'
    if ('keep' in choice) {
      for (const id of ids) data.updateRecord(id, { tags: [], guesses: undefined })
      data.updateEntry(entry.id, { kind: 'routed', pageId: data.inbox.id })
      return data.inbox
    }
    const page = 'pageId' in choice ? data.pages[choice.pageId] : data.createPage({ title: choice.newPage, glyph: null, color: 'gray', description: '' })
    if (!page) return
    data.moveRecords(ids, page.id)
    data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, moved: !wasAsk })
    return page
  }

  /** The same choice made on a record in Входящие (its row chips): resolves the entry that asked about it */
  function chooseForRecord(recId: Id, choice: Choice): Page | undefined {
    const entry = [...data.entries].reverse().find(e => e.kind === 'ask' && e.recordIds?.includes(recId))
    if (entry) return choose(entry.id, choice)
    if ('keep' in choice) {
      data.updateRecord(recId, { tags: [], guesses: undefined })
      return data.inbox
    }
    const page = 'pageId' in choice ? data.pages[choice.pageId] : data.createPage({ title: choice.newPage })
    if (page) data.moveRecords([recId], page.id)
    return page
  }

  /** «Отменить»: the records are gone, the journal keeps the line */
  function undo(entryId: Id) {
    const entry = data.entries.find(e => e.id === entryId)
    if (!entry) return
    data.purgeRecords(entry.recordIds ?? [])
    data.updateEntry(entry.id, { kind: 'undone', recordIds: [] })
    fresh.value.delete(entry.id)
  }

  function settle(entryId: Id) {
    fresh.value.delete(entryId)
  }

  /** Back online, or the app opened again: lines that waited for the network or were cut off go through Авто */
  async function resume() {
    if (!isOnline()) return
    for (const entry of data.entries.filter(e => (e.kind === 'offline' || e.kind === 'pending') && !busy.has(e.id))) {
      const parked = (entry.recordIds ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && r.tags.includes('offline'))
      if (entry.kind === 'offline' && !parked.length) continue
      if (entry.kind === 'offline' && !hasModel()) {
        for (const r of parked) data.updateRecord(r.id, { tags: ['clarify'] })
        data.updateEntry(entry.id, { kind: 'ask' })
        continue
      }
      data.purgeRecords(parked.map(r => r.id))
      data.updateEntry(entry.id, { kind: 'pending' })
      await decide(entry, entry.text)
    }
  }

  return { fresh, hasModel, previewFor, send, record, choose, chooseForRecord, undo, settle, resume }
})
