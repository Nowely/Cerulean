// Чат and Авто: what was written, where it went, and the one-tap fixes («Не туда», «Отменить», Уточнение)
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Entry, Id, Page, Rec, TemplateKey } from '~/domain/types'
import { useDataStore } from './data'
import { askModel, isConnected, ModelError, type ModelResult } from '~/domain/model'
import { classify, rank, templateFor } from '~/domain/rules'
import { draftsFor, draftsFromModel, preview, type Draft, type Preview } from '~/domain/auto'
import { cleanRecordText, isQuestion, parseDue } from '~/domain/parse'
import { answer } from '~/domain/search'
import { newEntry } from '~/domain/factory'
import { dayKey } from '~/domain/dates'

/** A page, a new page (a starter's name makes it from that starter), a starter itself, or «Оставить там» */
export type Choice = { pageId: Id } | { newPage: string } | { template: TemplateKey } | { keep: true }

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export const useJournalStore = defineStore('journal', () => {
  const data = useDataStore()
  /** Receipts whose 15 s undo line is still running */
  const fresh = ref<Set<Id>>(new Set())
  /** Models calls in flight, so a second «online» event does not run them twice */
  const busy = new Set<Id>()

  const hasModel = () => isConnected(data.settings) && data.settings.keyState !== 'bad'

  /** The chip while typing in Авто: a clear rule shows its page; with a reachable model an unclear line stays «Авто» */
  function previewFor(text: string): Preview {
    return preview(text, { pages: data.livePages, learned: data.learned, recent: data.recent, model: hasModel() && isOnline() })
  }

  function place(entry: Entry, page: Page, drafts: Draft[], opts: { today?: boolean, via?: Rec['via'] } = {}, made = false): Entry {
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
    data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, recordIds: recs.map(r => r.id), hits: undefined, made })
    fresh.value.add(entry.id)
    return entry
  }

  /** No page fits but a starter does (day one: «хлеб»): the page is made from it in «Недавнее» and the line goes there */
  function make(entry: Entry, key: TemplateKey, text: string, opts: { today?: boolean } = {}): Entry {
    const page = data.createFromTemplate(key)
    return place(entry, page, draftsFor(text, page, Date.now()), opts, true)
  }

  /** A page Авто made for a line goes with it while nothing else was put there */
  function dropIfEmpty(pageId: Id | undefined) {
    if (pageId && !Object.values(data.records).some(r => r.pageId === pageId)) data.purgePages([pageId])
  }

  /** The page a choice points at, made now when it is new */
  function targetOf(choice: Exclude<Choice, { keep: true }>): Page | undefined {
    if ('pageId' in choice) return data.pages[choice.pageId]
    if ('template' in choice) return data.createFromTemplate(choice.template)
    return choice.newPage.trim() ? data.createNamed(choice.newPage) : data.createPage({ title: '' })
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
    const starter = rulePage ? null : templateFor(text, data.livePages)
    const unclear = (guesses: Id[], newName: string | null) => starter ? make(entry, starter, text, opts) : ask(entry, text, guesses, newName, opts.today)
    if (!hasModel()) return unclear(rules.guesses, rules.newName)
    if (!isOnline()) return park(entry, text, opts.today)

    let result: ModelResult
    busy.add(entry.id)
    try {
      result = await askModel(data.settings, text, data.livePages, now)
      if (data.settings.keyState !== 'ok') data.setSettings({ keyState: 'ok' })
    } catch (e) {
      if (e instanceof ModelError && (e.reason === 'key' || e.reason === 'model')) data.setSettings({ keyState: 'bad' })
      if (e instanceof ModelError && e.reason === 'offline') return park(entry, text, opts.today)
      return rulePage ? place(entry, rulePage, draftsFor(text, rulePage, now), opts) : unclear(rules.guesses, rules.newName)
    } finally {
      busy.delete(entry.id)
    }
    if (result.kind === 'question' && !opts.record) return found(entry, text)
    const page = validPage(result.pageId)
    if (result.kind === 'record' && page) return place(entry, page, draftsFromModel(result, page, now, text), opts)
    const guesses = [...result.guesses.filter(id => validPage(id)), ...rules.guesses].filter((id, i, a) => a.indexOf(id) === i).slice(0, 3)
    return unclear(guesses, result.newPageName?.trim() || rules.newName)
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

  /** A page chosen in Уточнение or after «Не туда»; «Оставить там» keeps the record in Входящие without the tag */
  function choose(entryId: Id, choice: Choice): Page | undefined {
    const entry = data.entries.find(e => e.id === entryId)
    const ids = entry?.recordIds?.filter(id => data.records[id]) ?? []
    if (!entry || !ids.length) return
    const wasAsk = entry.kind === 'ask'
    const made = entry.made ? entry.pageId : undefined
    if ('keep' in choice) {
      for (const id of ids) data.updateRecord(id, { tags: [], guesses: undefined })
      data.updateEntry(entry.id, { kind: 'routed', pageId: data.inbox.id })
      return data.inbox
    }
    const page = targetOf(choice)
    if (!page) return
    data.moveRecords(ids, page.id)
    data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, moved: !wasAsk, made: false })
    if (made !== page.id) dropIfEmpty(made)
    return page
  }

  /** «Не туда» on a series: every line goes to the one page the choice makes or names */
  function chooseAll(entryIds: Id[], choice: Choice): Page | undefined {
    const made = entryIds.map(id => data.entries.find(e => e.id === id)).filter(e => e?.made).map(e => e!.pageId)
    let page: Page | undefined
    for (const id of entryIds) page = choose(id, page ? { pageId: page.id } : choice) ?? page
    for (const id of made) if (id !== page?.id) dropIfEmpty(id)
    return page
  }

  /** The same choice made on a record in Входящие (its row chips): resolves the entry that asked about it or waits */
  function chooseForRecord(recId: Id, choice: Choice): Page | undefined {
    const entry = [...data.entries].reverse().find(e => (e.kind === 'ask' || e.kind === 'offline') && e.recordIds?.includes(recId))
    if (entry) return choose(entry.id, choice)
    if ('keep' in choice) {
      data.updateRecord(recId, { tags: [], guesses: undefined })
      return data.inbox
    }
    const page = targetOf(choice)
    if (page) data.moveRecords([recId], page.id)
    return page
  }

  /**
   * Runs a change to records (a move, a choice) so it can be taken back: the records, their subitems and the
   * Чат lines about them return to how they were, and a page the change made goes again while it is empty.
   */
  function undoable<T>(recIds: Id[], run: () => T): { result: T, undo: () => void } {
    const ids = new Set(recIds)
    for (const r of Object.values(data.records)) if (r.parentId && ids.has(r.parentId)) ids.add(r.id)
    const recs = [...ids].map(id => data.records[id]).filter((r): r is Rec => !!r)
      .map(r => ({ id: r.id, pageId: r.pageId, parentId: r.parentId, tags: [...r.tags], guesses: r.guesses, values: { ...r.values }, order: r.order }))
    const lines = data.entries.filter(e => e.recordIds?.some(id => ids.has(id)))
      .map(e => ({ id: e.id, kind: e.kind, pageId: e.pageId, moved: e.moved, made: e.made }))
    const before = new Set(Object.keys(data.pages))
    const result = run()
    const created = Object.keys(data.pages).filter(id => !before.has(id))
    return {
      result,
      undo: () => {
        for (const { id, ...patch } of recs) data.updateRecord(id, patch)
        for (const { id, ...patch } of lines) data.updateEntry(id, patch)
        for (const id of created) dropIfEmpty(id)
      }
    }
  }

  /** Pages to offer for a record waiting in Входящие, worked out again from the pages there are now */
  /**
   * Recomputed from the pages as they are now. A line no page matches but a starter fits gets no guesses,
   * so the starter («Дела») and «Новая страница» lead; earlier guesses and recent pages fill in otherwise.
   */
  function guessesFor(rec: Rec): Id[] {
    const ok = (id: Id) => id !== rec.pageId && !!validPage(id)
    const ranked = rank(rec.text, data.livePages, data.learned).map(r => r.pageId)
    if (!ranked.length && templateFor(rec.text, data.livePages)) return []
    const out = [...ranked, ...(rec.guesses ?? [])].filter((id, i, a) => a.indexOf(id) === i && ok(id))
    return (out.length ? out : data.recent.filter(ok)).slice(0, 3)
  }

  /** «Отменить»: the records are gone, the journal keeps the line */
  function undo(entryId: Id) {
    const entry = data.entries.find(e => e.id === entryId)
    if (!entry) return
    const made = entry.made ? entry.pageId : undefined
    data.purgeRecords(entry.recordIds ?? [])
    data.updateEntry(entry.id, { kind: 'undone', recordIds: [], made: false })
    dropIfEmpty(made)
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
      data.updateEntry(entry.id, { kind: 'pending', resumed: entry.kind === 'offline' })
      await decide(entry, entry.text)
    }
  }

  return { fresh, hasModel, previewFor, send, record, choose, chooseAll, chooseForRecord, undoable, guessesFor, undo, settle, resume }
})
