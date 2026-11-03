// Журнал and Авто: what was written, where it went, and the one-tap fixes («Не туда», «Отменить», Уточнение)
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Entry, Id, Page, Rec, Tag, TemplateKey } from '~/domain/types'
import { useDataStore } from './data'
import { askModel, isConnected, ModelError, type ModelResult } from '~/domain/model'
import { classify, rank, templateFor } from '~/domain/rules'
import { draftsFor, preview, readModel, splitRoute, type Draft, type LineContext, type LineDraft, type Part, type Preview } from '~/domain/auto'
import { cleanRecordText, dropPrefix, isQuestion, isSearch, parseDue } from '~/domain/parse'
import { answer } from '~/domain/search'
import { newEntry, newPage } from '~/domain/factory'
import { applyTemplate, TEMPLATES } from '~/domain/templates'
import { capitalize } from '~/domain/text'
import { useNotify } from '~/composables/useNotify'
import { noteDoc } from '~/domain/body'
import { dayKey } from '~/domain/dates'
import { addQty, duplicateOf, qtyProp } from '~/domain/merge'
import { onlyCollects } from '~/domain/collect'
import { menLinks } from '~/domain/mention'
import { applyDepartment, departmentProp } from '~/domain/departmentMemory'

/** What one send of the field filed: its Журнал line, the records in order, the pages they went to */
export interface Filed {
  entryId: Id
  ids: Id[]
  pages: Id[]
}

/** A page, a new page (a starter's name makes it from that starter), a starter itself, or «Оставить там» */
export type Choice = { pageId: Id } | { newPage: string } | { newList: string } | { template: TemplateKey } | { keep: true }

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export const useJournalStore = defineStore('journal', () => {
  const data = useDataStore()
  const notify = useNotify()
  /** Receipts whose 15 s undo line is still running */
  const fresh = ref<Set<Id>>(new Set())
  /** Models calls in flight, so a second «online» event does not run them twice */
  const busy = new Set<Id>()

  const hasModel = () => isConnected(data.settings) && data.settings.keyState !== 'bad'
  /** Pages Авто files to: never one whose every view collects (v24), nothing is filed there by words */
  const targets = () => data.livePages.filter(p => !onlyCollects(p))
  /** A key is set and the service refused it: Авто files by the simple rules and the receipt says so */
  const keyRefused = () => isConnected(data.settings) && data.settings.keyState === 'bad'
  const endOf = (pageId: Id) => data.recordsOf(pageId).reduce((last, r) => Math.max(last, r.order), -1) + 1
  const drafts = (text: string, page: Page, now: number) => draftsFor(text, page, now, {
    split: data.settings.aiSplit !== false,
    department: data.settings.aiDepartment !== false
  })

  function departmentValues(page: Page, text: string, values: Rec['values']) {
    if (data.settings.aiDepartment !== false) return applyDepartment(page, text, values)
    const prop = departmentProp(page)
    if (!prop || !(prop.id in values)) return values
    const next = { ...values }
    delete next[prop.id]
    return next
  }

  /** The chip while typing in Авто: a clear rule shows its page; with a reachable model an unclear line stays «Авто» */
  function previewFor(text: string): Preview {
    return preview(text, { pages: targets(), learned: data.learned, recent: data.recent, model: hasModel() && isOnline(), route: data.settings.aiRoute !== false, split: data.settings.aiSplit !== false })
  }

  /** Records on a page in the order they were written (each goes on top, so they are added last first) */
  function addDrafts(page: Page, drafts: (Draft & { note?: string })[], opts: { day?: string, via?: Rec['via'] } = {}): Id[] {
    const now = Date.now()
    return [...drafts].reverse().map(d => data.addRecord({
      pageId: page.id,
      text: d.text,
      due: d.due ?? (opts.day ? { date: opts.day } : null),
      values: departmentValues(page, d.text, d.values),
      body: noteDoc(d.note ?? ''),
      via: opts.via ?? 'chat',
      addedAt: now
    }).id).reverse()
  }

  /** A record waiting in Входящие: «уточнить» offers its guesses (or `tags`: «ждёт сети») */
  function addToInbox(text: string, opts: { day?: string, guesses?: Id[], tags?: Tag[] } = {}): Id {
    const { due, rest } = parseDue(text, Date.now())
    return data.addRecord({
      pageId: data.inbox.id,
      text: cleanRecordText(dropPrefix(rest || text)),
      due: due ?? (opts.day ? { date: opts.day } : null),
      via: 'chat',
      tags: opts.tags ?? ['clarify'],
      guesses: opts.guesses
    }).id
  }

  function place(entry: Entry, page: Page, drafts: Draft[], opts: { day?: string, via?: Rec['via'] } = {}, made = false): Entry {
    data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, recordIds: addDrafts(page, drafts, opts), hits: undefined, made })
    fresh.value.add(entry.id)
    return entry
  }

  /**
   * A send whose parts belong to different pages: each part goes to its own page under one receipt; a part no
   * rule places asks the model when there is one, else waits in Входящие with «уточнить» (v22, U3)
   */
  async function placeParts(entry: Entry, parts: Part[], opts: { day?: string } = {}): Promise<Entry> {
    const now = Date.now()
    const decided = await Promise.all(parts.map(async (part): Promise<{ page?: Page, part: Part, result?: ModelResult }> => {
      const page = validPage(part.pageId)
      if (page) return { page, part }
      if (!hasModel() || !isOnline()) return { part }
      try {
        const r = await askModel(data.settings, part.text, targets(), now)
        const read = readModel(r, part.text, '', lineContext(now))
        const p = validPage(read[0]?.pageId ?? null)
        return p ? { page: p, part, result: r } : { part }
      } catch {
        return { part }
      }
    }))
    if (data.entries.find(e => e.id === entry.id)?.kind !== 'pending') return entry
    if (data.settings.aiRoute === false || data.settings.aiSplit === false) return localRoute(entry, entry.text, opts, now)
    const ids = decided.flatMap((d) => {
      const page = d.page && validPage(d.page.id)
      if (!page) return [addToInbox(d.part.text, { day: opts.day, guesses: d.part.guesses })]
      const current = d.result ? readModel(d.result, d.part.text, '', lineContext(now)).filter(x => x.pageId === page.id) : drafts(d.part.text, page, now)
      return current.length ? addDrafts(page, current, opts) : [addToInbox(d.part.text, { day: opts.day, guesses: d.part.guesses })]
    })
    data.updateEntry(entry.id, { kind: 'routed', pageId: data.records[ids[0]!]?.pageId, recordIds: ids, split: true, hits: undefined })
    fresh.value.add(entry.id)
    return entry
  }

  /** A page Авто made for a line goes with it while nothing else was put there */
  function dropIfEmpty(pageId: Id | undefined) {
    if (pageId && !Object.values(data.records).some(r => r.pageId === pageId)) data.purgePages([pageId])
  }

  function planTarget(choice: Exclude<Choice, { keep: true }>): { page: Page, create: boolean } | undefined {
    if ('pageId' in choice) {
      const page = data.pages[choice.pageId]
      return page ? { page, create: false } : undefined
    }
    if ('newList' in choice) {
      const title = capitalize(choice.newList)
      const same = data.livePages.find(p => (p.kind === 'page' || p.kind === 'inbox') && p.title.trim().toLowerCase() === title.toLowerCase())
      return same ? { page: same, create: false } : { page: newPage({ title, glyph: 'list' }), create: true }
    }
    const title = 'newPage' in choice && choice.newPage.trim() ? choice.newPage : ''
    const template = 'template' in choice ? choice.template : TEMPLATES.find(t => t.name.toLowerCase() === title.trim().toLowerCase() && !data.livePages.some(p => p.template === t.key))?.key
    const page = newPage({ title: template ? '' : title })
    if (template) Object.assign(page, applyTemplate(page, template))
    return { page, create: true }
  }

  function commitTarget(plan: { page: Page, create: boolean }): Page {
    if (!plan.create) return plan.page
    const { order: _order, ...init } = plan.page
    return data.createPage(init)
  }

  /** Include all records a clarification would resolve, not just the selected row. */
  function clarificationIds(ids: Id[], onlyTagged = false) {
    const all = new Set(ids)
    for (const id of ids) {
      if (onlyTagged && !data.records[id]?.tags.includes('clarify')) continue
      const entry = [...data.entries].reverse().find(e => (e.kind === 'ask' || e.kind === 'offline') && e.recordIds?.includes(id))
      for (const recId of entry?.recordIds ?? []) if (data.records[recId]) all.add(recId)
    }
    return [...all]
  }

  function planMove(ids: Id[], choice: Exclude<Choice, { keep: true }>, clarify = false) {
    const target = planTarget(choice)
    if (!target) return { ok: false as const, reason: 'missing-target' as const }
    const checked = data.checkMoveRecords(clarify ? clarificationIds(ids, true) : ids, target.page)
    return checked.ok ? { ok: true as const, target } : checked
  }

  function moveRefused(reason: 'stock-conflict' | 'missing-target') {
    notify(reason === 'stock-conflict'
      ? 'Не удалось переместить: настройки запасов на страницах несовместимы.'
      : 'Не удалось переместить: страница не найдена.', undefined, undefined, { keepCard: true })
  }

  /** Not placed: one record in Входящие with «уточнить», and the Уточнение asks about that same record */
  function ask(entry: Entry, text: string, guesses: Id[], newName: string | null, day?: string): Entry {
    const id = addToInbox(text, { day, guesses })
    data.updateEntry(entry.id, { kind: 'ask', pageId: data.inbox.id, recordIds: [id], newName, hits: undefined })
    return entry
  }

  /** Key set but no network: the record waits in Входящие and is filed when the network is back */
  function park(entry: Entry, text: string, day?: string): Entry {
    const id = addToInbox(text, { day, tags: ['offline'] })
    data.updateEntry(entry.id, { kind: 'offline', pageId: data.inbox.id, recordIds: [id] })
    return entry
  }

  /** The model did not answer in time: the record waits in Входящие, the receipt says so with «Повторить» */
  function wait(entry: Entry, text: string, guesses: Id[], day?: string): Entry {
    const id = addToInbox(text, { day, guesses })
    data.updateEntry(entry.id, { kind: 'routed', pageId: data.inbox.id, recordIds: [id], note: 'slow', hits: undefined })
    fresh.value.add(entry.id)
    return entry
  }

  function found(entry: Entry, text: string): Entry {
    data.updateEntry(entry.id, { kind: 'found', hits: answer(text, data.liveRecords).map(r => r.id) })
    return entry
  }

  function validPage(id: string | null): Page | undefined {
    const p = id ? data.pages[id] : undefined
    return p && !p.deletedAt && p.kind === 'page' && !onlyCollects(p) ? p : undefined
  }

  /**
   * «@» (v24, item 13): each record links to the names its own text holds with their marker («позвонить @Стоматолог, купить
   * хлеб» links only the first). The link is the record's own, so «Связано» lists it on both sides and «Отменить», which
   * takes the record, takes the link with it
   */
  function linkWords(recIds: Id[], links: Id[] | undefined) {
    if (!links?.length) return
    const named = links.map(id => ({ id, name: data.nameOf(id) }))
    for (const id of recIds) {
      const rec = data.records[id]
      const add = rec ? menLinks(rec.text, named).map(l => l.id).filter(x => x !== id && !rec.links?.includes(x)) : []
      if (rec && add.length) data.updateRecord(id, { links: [...(rec.links ?? []), ...add] })
    }
  }

  /**
   * Where a line goes, then what its receipt adds: the key note when the rules filed it because the key was
   * refused, and for a question written down the records like it («Похожее в записях»)
   */
  async function decide(entry: Entry, text: string, opts: { day?: string, record?: boolean } = {}): Promise<Entry> {
    await route(entry, text, opts)
    linkWords(entry.recordIds ?? [], entry.links)
    if (entry.kind !== 'routed' && entry.kind !== 'ask') return entry
    if (keyRefused() && !entry.note) data.updateEntry(entry.id, { note: 'key' })
    if (isQuestion(text)) {
      const own = new Set(entry.recordIds)
      const similar = answer(text, data.liveRecords.filter(r => !own.has(r.id)), 3).map(r => r.id)
      if (similar.length) data.updateEntry(entry.id, { similar })
    }
    return entry
  }

  async function route(entry: Entry, text: string, opts: { day?: string, record?: boolean } = {}): Promise<Entry> {
    const now = Date.now()
    if (!opts.record && isSearch(text)) return found(entry, text)
    const split = data.settings.aiRoute !== false && data.settings.aiSplit !== false && splitRoute(text, targets(), data.learned, data.recent)
    if (split) return placeParts(entry, split, opts)
    const rules = classify(text, targets(), data.learned, data.recent)
    const rulePage = data.settings.aiRoute === false ? undefined : validPage(rules.pageId)
    if (rulePage && (!hasModel() || data.settings.rulesFirst)) return place(entry, rulePage, drafts(text, rulePage, now), opts)
    // Авто never makes a page (main flow, item 5): an unclear line asks in Журнал, as before
    const unclear = (guesses: Id[], newName: string | null) => data.settings.aiRoute === false
      ? place(entry, data.inbox, drafts(text, data.inbox, now), opts)
      : ask(entry, text, guesses, newName, opts.day)
    if (!hasModel()) return unclear(rules.guesses, rules.newName)
    if (!isOnline()) return data.settings.aiRoute === false ? unclear(rules.guesses, rules.newName) : park(entry, text, opts.day)

    let result: ModelResult
    busy.add(entry.id)
    try {
      result = await askModel(data.settings, text, targets(), now)
      if (data.entries.find(e => e.id === entry.id)?.kind !== 'pending') return entry
      if (data.settings.keyState !== 'ok') data.setSettings({ keyState: 'ok' })
    } catch (e) {
      if (data.entries.find(e => e.id === entry.id)?.kind !== 'pending') return entry
      const reason = e instanceof ModelError ? e.reason : 'other'
      if (reason === 'key' || reason === 'model') data.setSettings({ keyState: 'bad' })
      if (data.settings.aiRoute === false) return unclear(rules.guesses, rules.newName)
      if (reason === 'offline' && !isOnline()) return park(entry, text, opts.day)
      // «Нет сети» only without a network: a service that never answers is a slow model
      if (reason === 'timeout' || reason === 'offline') return wait(entry, text, rules.guesses, opts.day)
      return rulePage ? place(entry, rulePage, drafts(text, rulePage, now), opts) : unclear(rules.guesses, rules.newName)
    } finally {
      busy.delete(entry.id)
    }
    // Only an explicit search gives the found card: a question the model saw is written down like any line
    if (result.kind === 'question') return localRoute(entry, text, opts, now)
    // Each record on the page the model put it; a line no page fits asks, as Журнал always did
    const read = readModel(result, text, '', lineContext(now)).filter(d => (d.pageId === data.inbox.id && data.settings.aiRoute === false) || validPage(d.pageId))
    if (!read.length) return unclear(rules.guesses, rules.newName)
    const pages = [...new Set(read.map(d => d.pageId))]
    if (pages.length === 1) return place(entry, data.pages[pages[0]!]!, read, opts)
    const ids = pages.flatMap(id => addDrafts(data.pages[id]!, read.filter(d => d.pageId === id), opts))
    data.updateEntry(entry.id, { kind: 'routed', pageId: pages[0], recordIds: ids, split: true, hits: undefined })
    fresh.value.add(entry.id)
    return entry
  }

  function localRoute(entry: Entry, text: string, opts: { day?: string }, now: number): Entry {
    if (data.settings.aiRoute === false) return place(entry, data.inbox, drafts(text, data.inbox, now), opts)
    const rules = classify(text, targets(), data.learned, data.recent)
    const page = validPage(rules.pageId)
    return page ? place(entry, page, drafts(text, page, now), opts) : ask(entry, text, rules.guesses, rules.newName, opts.day)
  }

  /** What Авто reads a line against: the pages it files to, what it learned, the pages written to lately */
  function lineContext(now: number): LineContext {
    return { pages: targets(), inboxId: data.inbox.id, learned: data.learned, recent: data.recent, now, route: data.settings.aiRoute !== false, split: data.settings.aiSplit !== false, department: data.settings.aiDepartment !== false }
  }

  /**
   * Sends a line from a composer in Авто or to a chosen page.
   * `day`: records without a date of their own get it: the first day of a collecting view's filter (v24, «завтра»
   * under «На неделе»); `today` is Сегодня's composer, today's date.
   * `onStart`: the line exists and is being decided, so a screen can show «Разбирается…» before the answer.
   * `record`: written down even when it reads as a search («Записать «…»» in Поиск, v22 N19).
   */
  async function send(text: string, dest: 'auto' | Id, opts: { today?: boolean, day?: string, record?: boolean, links?: Id[], onStart?: (entry: Entry) => void } = {}): Promise<Entry> {
    const t = text.trim()
    const day = opts.day ?? (opts.today ? dayKey(Date.now()) : undefined)
    const entry = data.addEntry(newEntry({ at: Date.now(), text: t, kind: 'pending', ...(opts.links?.length ? { links: opts.links } : {}) }))
    opts.onStart?.(entry)
    const page = dest === 'auto' ? undefined : data.pages[dest]
    if (page) {
      if (page.kind === 'inbox') {
        if (hasModel() && data.settings.aiSplit !== false) place(entry, page, drafts(t, page, Date.now()), { day })
        else {
          data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, recordIds: [addToInbox(t, { tags: [] })] })
          fresh.value.add(entry.id)
        }
      } else {
        place(entry, page, drafts(t, page, Date.now()), { day })
      }
      linkWords(entry.recordIds ?? [], entry.links)
      return entry
    }
    return decide(entry, t, { day, record: opts.record })
  }

  // ---------- the field of Главная and pages (main flow, items 9, 10, 24) ----------

  /**
   * Files what the field shows: each record on its page (in the order written, the note as its text), one line in
   * Журнал for the send. `here`: the record shows where it was written (the page it was written on), so it is not new
   */
  function write(text: string, drafts: LineDraft[], opts: { here: (d: LineDraft) => boolean, links?: Id[] }): Filed {
    const at = Date.now()
    const ids = drafts.map(d => data.addRecord({
      pageId: d.pageId,
      text: d.text,
      due: d.due,
      values: departmentValues(data.pages[d.pageId]!, d.text, d.values),
      body: noteDoc(d.note),
      via: opts.here(d) ? 'manual' : 'chat',
      addedAt: at,
      order: endOf(d.pageId)
    }).id)
    linkWords(ids, opts.links)
    const pages = [...new Set(drafts.map(d => d.pageId))]
    const entry = data.addEntry(newEntry({ at, text, kind: 'routed', pageId: pages[0], recordIds: ids, ...(pages.length > 1 ? { split: true } : {}), ...(opts.links?.length ? { links: opts.links } : {}) }))
    return { entryId: entry.id, ids, pages }
  }

  /** A send filed by the rules while the model was still reading: what the model reads replaces it, keeping the ids */
  function refile(filed: Filed, drafts: LineDraft[], opts: { here: (d: LineDraft) => boolean }): Filed | null {
    const old = filed.ids.map(id => data.records[id])
    if (!drafts.length || old.some(r => !r || r.deletedAt)) return null
    const same = drafts.length === old.length && drafts.every((d, i) => {
      const r = old[i]!
      return r.pageId === d.pageId && r.text === d.text && docOf(r) === d.note && JSON.stringify(r.due) === JSON.stringify(d.due) && JSON.stringify(r.values) === JSON.stringify(departmentValues(data.pages[d.pageId]!, d.text, d.values))
    })
    if (same) return null
    const at = old[0]!.addedAt
    const ids = drafts.map((d, i) => {
      const fields = { pageId: d.pageId, text: d.text, due: d.due, values: departmentValues(data.pages[d.pageId]!, d.text, d.values), body: noteDoc(d.note), via: opts.here(d) ? 'manual' as const : 'chat' as const, addedAt: at }
      const r = old[i]
      if (r) {
        data.updateRecord(r.id, { ...fields, note: '', parentId: null, ...(r.pageId !== d.pageId ? { order: endOf(d.pageId) } : {}) })
        return r.id
      }
      return data.addRecord({ ...fields, order: endOf(d.pageId) }).id
    })
    data.purgeRecords(filed.ids.slice(drafts.length))
    const pages = [...new Set(drafts.map(d => d.pageId))]
    data.updateEntry(filed.entryId, { pageId: pages[0], recordIds: ids, split: pages.length > 1 || undefined })
    return { entryId: filed.entryId, ids, pages }
  }

  const docOf = (r: Rec) => (r.body?.content ?? []).map(p => (p.content ?? []).map(n => n.text ?? '').join('')).join('\n')

  /**
   * The send did not wait for the model (item 24): it reads the same words now and, when it reads them otherwise, the
   * records are filed again. `then` hears where they went, so the screen can light those pages and the notice follow
   */
  async function lateRead(filed: Filed, title: string, note: string, ctx: LineContext, opts: { here: (d: LineDraft) => boolean, keepTitle: (d: LineDraft) => LineDraft }, then: (f: Filed) => void) {
    if (!hasModel() || !isOnline()) return
    const before = JSON.stringify(filed.ids.map(id => data.records[id]))
    const entry = JSON.stringify(data.entries.find(e => e.id === filed.entryId))
    const kept = note.trim() ? opts.keepTitle({ pageId: filed.pages[0]!, text: title, due: null, values: {}, note: '', by: 'auto' }) : null
    try {
      const result = await askModel(data.settings, title, targets(), ctx.now)
      if (!hasModel() || before !== JSON.stringify(filed.ids.map(id => data.records[id])) || entry !== JSON.stringify(data.entries.find(e => e.id === filed.entryId))) return
      if (data.settings.aiSplit === false && filed.ids.length > 1) return
      if (data.settings.aiRoute === false && filed.pages.length > 1) return
      const place = data.settings.aiRoute === false && !ctx.place ? { pageId: filed.pages[0]!, by: 'user' as const } : ctx.place
      const current = { ...ctx, pages: targets(), place, route: data.settings.aiRoute !== false && !ctx.place, split: data.settings.aiSplit !== false, department: data.settings.aiDepartment !== false }
      const read = readModel(result, title, note, current)
      const next = read.length === 1 && kept ? [{ ...read[0]!, text: kept.text, note: kept.note }] : read
      const again = refile(filed, next, opts)
      if (again) then(again)
    } catch (e) {
      const reason = e instanceof ModelError ? e.reason : 'other'
      if (reason === 'key' || reason === 'model') data.setSettings({ keyState: 'bad' })
    }
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
    const plan = planMove(ids, choice)
    if (!plan.ok) {
      moveRefused(plan.reason)
      return
    }
    const page = commitTarget(plan.target)
    if (entry.learned) forget(entry.id)
    const moved = data.moveRecords(ids, page.id)
    if (!moved.ok) {
      moveRefused(moved.reason)
      return
    }
    // Chosen by hand: why Авто filed it no longer matters, and the receipt offers to remember the choice (v22, U5)
    data.updateEntry(entry.id, { kind: 'routed', pageId: page.id, moved: !wasAsk, made: false, note: undefined, learn: page.kind === 'page', learned: false })
    if (made !== page.id) dropIfEmpty(made)
    return page
  }

  /** The example «Запомнить» writes into the page's «Что сюда класть» */
  const example = (entry: Entry) => `Например: «${entry.text}»`

  /**
   * «Запомнить» after a page was chosen by hand: the line becomes an example in that page's «Что сюда класть»,
   * which Авто reads when filing (v22, U5). «Отменить» on the same line (`forget`) takes it out again.
   */
  function remember(entryId: Id) {
    const entry = data.entries.find(e => e.id === entryId)
    const page = entry?.pageId ? data.pages[entry.pageId] : undefined
    if (!entry?.learn || !page || page.kind !== 'page') return
    const line = example(entry)
    const text = page.description.trimEnd()
    if (!text.split('\n').includes(line)) data.updatePage(page.id, { description: text ? `${text}\n${line}` : line })
    data.updateEntry(entry.id, { learned: true })
  }

  function forget(entryId: Id) {
    const entry = data.entries.find(e => e.id === entryId)
    const page = entry?.pageId ? data.pages[entry.pageId] : undefined
    if (!entry) return
    if (page) {
      const line = example(entry)
      const lines = page.description.split('\n')
      if (lines.includes(line)) data.updatePage(page.id, { description: lines.filter(l => l !== line).join('\n') })
    }
    data.updateEntry(entry.id, { learned: false })
  }

  /** The open record a row of this send repeats on its page («Молоко» again), if any */
  function duplicateFor(entryId: Id, recId: Id): Rec | undefined {
    const entry = data.entries.find(e => e.id === entryId)
    const rec = data.records[recId]
    if (!entry || !rec || rec.deletedAt) return
    return duplicateOf(rec, data.recordsOf(rec.pageId), new Set(entry.recordIds))
  }

  /**
   * «Объединить» (v22, G3): the new record goes and the open one like it stays, with the quantities added when
   * their units match. The receipt row says so in place; «Отменить» then leaves the merged record alone.
   */
  function merge(entryId: Id, recId: Id): Rec | undefined {
    const entry = data.entries.find(e => e.id === entryId)
    const rec = data.records[recId]
    const into = duplicateFor(entryId, recId)
    if (!entry || !rec || !into) return
    const prop = qtyProp(data.pages[rec.pageId])
    if (prop) {
      const qty = addQty(into.values[prop.id], rec.values[prop.id])
      if (qty !== (into.values[prop.id] ?? null)) data.updateRecord(into.id, { values: { ...into.values, [prop.id]: qty } })
    }
    data.purgeRecords([rec.id])
    data.updateEntry(entry.id, { merged: { ...entry.merged, [rec.id]: into.id } })
    return data.records[into.id]
  }

  /**
   * The «→» of one receipt row (a split send or a series): only that record moves, no toast; the receipt changes
   * in place and lists each row's page once they differ
   */
  function chooseOne(entryId: Id, recId: Id, choice: Choice): Page | undefined {
    const entry = data.entries.find(e => e.id === entryId)
    if (!entry || !data.records[recId]) return
    let page: Page | undefined
    if ('keep' in choice) {
      data.updateRecord(recId, { tags: [], guesses: undefined })
      page = data.inbox
    } else {
      const plan = planMove([recId], choice)
      if (!plan.ok) {
        moveRefused(plan.reason)
        return
      }
      page = commitTarget(plan.target)
      const moved = data.moveRecords([recId], page.id)
      if (!moved.ok) {
        moveRefused(moved.reason)
        return
      }
    }
    // The line keeps where it was sent (a series stays one receipt); the receipt reads each row's page
    data.updateEntry(entry.id, { kind: 'routed', note: undefined })
    return page
  }

  /** «Повторить» after the model did not answer: the line goes through Авто again */
  async function retry(entryId: Id): Promise<void> {
    const entry = data.entries.find(e => e.id === entryId)
    if (!entry) return
    data.purgeRecords(entry.recordIds ?? [])
    data.updateEntry(entry.id, { kind: 'pending', recordIds: [], note: undefined, similar: undefined, split: undefined })
    await decide(entry, entry.text)
  }

  /** «Не туда» on a series: every line goes to the one page the choice makes or names */
  function chooseAll(entryIds: Id[], choice: Choice): Page | undefined {
    if (!('keep' in choice)) {
      const ids = entryIds.flatMap(id => data.entries.find(e => e.id === id)?.recordIds ?? []).filter(id => !!data.records[id])
      if (!ids.length) return
      const plan = planMove(ids, choice)
      if (!plan.ok) {
        moveRefused(plan.reason)
        return
      }
      choice = { pageId: commitTarget(plan.target).id }
    }
    const made = entryIds.map(id => data.entries.find(e => e.id === id)).filter(e => e?.made).map(e => e!.pageId)
    let page: Page | undefined
    for (const id of entryIds) page = choose(id, page ? { pageId: page.id } : choice) ?? page
    for (const id of made) if (id !== page?.id) dropIfEmpty(id)
    // The series is one receipt: its latest send carries «Запомнить»
    for (const id of entryIds.slice(0, -1)) data.updateEntry(id, { learn: false })
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
    const plan = planMove([recId], choice)
    if (!plan.ok) {
      moveRefused(plan.reason)
      return
    }
    const page = commitTarget(plan.target)
    const moved = data.moveRecords([recId], page.id)
    if (!moved.ok) {
      moveRefused(moved.reason)
      return
    }
    return page
  }

  /**
   * Runs a change to records (a move, a choice) so it can be taken back: the records, their subitems and the
   * Журнал lines about them return to how they were, and a page the change made goes again while it is empty.
   */
  function undoable<T>(recIds: Id[], run: () => T): { result: T, undo: () => void } {
    const children = new Map<Id, Id[]>()
    for (const r of Object.values(data.records)) {
      if (!r.parentId) continue
      const siblings = children.get(r.parentId) ?? []
      siblings.push(r.id)
      children.set(r.parentId, siblings)
    }
    const ids = new Set<Id>()
    const visit = (roots: Id[], seen: Set<Id>) => {
      const queue = [...roots]
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i]!
        if (seen.has(id) || !data.records[id]) continue
        seen.add(id)
        queue.push(...(children.get(id) ?? []))
      }
    }
    visit(recIds, ids)
    // Restore ancestors first: changing a page also carries its descendants.
    const ordered = new Set<Id>()
    visit([...ids].filter(id => !data.records[id]?.parentId || !ids.has(data.records[id]!.parentId!)), ordered)
    visit([...ids], ordered) // malformed cycles still terminate
    const recs = [...ordered].map(id => data.records[id]).filter((r): r is Rec => !!r)
      .map(r => ({ id: r.id, pageId: r.pageId, parentId: r.parentId, tags: [...r.tags], guesses: r.guesses && [...r.guesses], values: { ...r.values }, stockUnits: r.stockUnits && { ...r.stockUnits }, stockBuy: r.stockBuy && { ...r.stockBuy }, order: r.order }))
    const lines = data.entries.filter(e => e.recordIds?.some(id => ids.has(id)))
      .map(e => ({ id: e.id, kind: e.kind, pageId: e.pageId, moved: e.moved, made: e.made, note: e.note, learn: e.learn, learned: e.learned }))
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
   * so the starter («Задачи») and «Новая страница» lead; earlier guesses and recent pages fill in otherwise.
   */
  function guessesFor(rec: Rec, recent = true): Id[] {
    const ok = (id: Id) => id !== rec.pageId && !!validPage(id)
    const ranked = rank(rec.text, data.livePages, data.learned).map(r => r.pageId)
    if (!ranked.length && templateFor(rec.text, data.livePages)) return []
    const out = [...ranked, ...(rec.guesses ?? [])].filter((id, i, a) => a.indexOf(id) === i && ok(id))
    return (out.length || !recent ? out : data.recent.filter(ok)).slice(0, 3)
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

  return { fresh, hasModel, targets, write, refile, lateRead, previewFor, send, linkWords, record, retry, choose, chooseOne, chooseAll, chooseForRecord, planMove, commitTarget, moveRefused, clarificationIds, undoable, guessesFor, undo, settle, resume, remember, forget, duplicateFor, merge }
})
