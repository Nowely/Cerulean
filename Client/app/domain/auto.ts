// Авто: where a line goes and what records it becomes. The stores run it; this file only decides.
import type { Due, Id, Page, Rec } from './types'
import type { ModelItem, ModelResult } from './model'
import { classify, guessOption, pageTopic, textTopics, type Learned, type RuleResult } from './rules'
import { cleanRecordText, dropPrefix, dueWords, isSearch, parseDue, parseQty, readDue, splitItems, splitParts, type Span } from './parse'
import { dayKey } from './dates'
import { capitalize, fold } from './text'

/** What Журнал's guess line says while typing: where the send goes and how many records it makes there */
export type Preview
  = | { kind: 'idle' }
    | { kind: 'search' }
    | { kind: 'page', pageId: Id, count: number }
    | { kind: 'inbox', count: number }
    | { kind: 'split', parts: { to: Id | 'inbox', count: number }[] }

export interface AutoContext {
  pages: Page[]
  learned: Learned
  recent: Id[]
  /** A model can still decide on send (key set, online, not «Сначала простые правила» with a clear rule) */
  model: boolean
}

/** Журнал's composer (unchanged in the main flow round): Авто never makes a page, an unclear line goes to Входящие */
export function preview(text: string, ctx: AutoContext): Preview {
  const t = text.trim()
  if (t.length < 2) return { kind: 'idle' }
  if (isSearch(t)) return { kind: 'search' }
  const now = Date.now()
  const split = splitRoute(t, ctx.pages, ctx.learned, ctx.recent)
  if (split) {
    const parts: { to: Id | 'inbox', count: number }[] = []
    for (const part of split) {
      const to = part.pageId ?? 'inbox'
      const page = ctx.pages.find(p => p.id === part.pageId)
      const n = page ? draftsFor(part.text, page, now).length : 1
      const had = parts.find(x => x.to === to)
      if (had) had.count += n
      else parts.push({ to, count: n })
    }
    return { kind: 'split', parts }
  }
  const r = classify(t, ctx.pages, ctx.learned, ctx.recent)
  const page = ctx.pages.find(p => p.id === r.pageId)
  if (page) return { kind: 'page', pageId: page.id, count: draftsFor(t, page, now).length }
  // With a model the decision waits for send; the chip stays «Авто» instead of promising Входящие
  if (ctx.model) return { kind: 'idle' }
  return { kind: 'inbox', count: 1 }
}

/** A part of a send and where the rules put it; no page: the part goes to Входящие */
export interface Part extends RuleResult {
  text: string
}

/**
 * A send whose parts belong to different pages (v22, U3): «сыр, позвонить бабушке» → Покупки and Задачи.
 * Commas, semicolons and new lines make the parts. A part with no clue of its own («вафли» after «молоко»)
 * stays with the list it is in; a part about something no page holds («подарок Лене») goes to Входящие.
 * Null when the send goes to one place as a whole.
 */
export function splitRoute(text: string, pages: Page[], learned: Learned, recent: Id[]): Part[] | null {
  const texts = splitParts(text)
  if (texts.length < 2) return null
  const parts: Part[] = texts.map(t => ({ text: t, ...classify(t, pages, learned, recent) }))
  const clue = (p: Part) => p.pageId ?? (textTopics(p.text).length ? 'inbox' : null)
  const targets = new Set(parts.map(clue).filter(Boolean))
  if (targets.size < 2) return null
  // Clueless parts join the nearest placed part before them, else after them
  return parts.map((p, i) => {
    if (clue(p)) return p
    const near = [...parts.slice(0, i)].reverse().find(clue) ?? parts.slice(i + 1).find(clue)
    return near?.pageId ? { ...p, pageId: near.pageId } : p
  })
}

/** Pages that hold lists of things split «молоко, яйца и сыр» into three records */
export function isListPage(page: Page): boolean {
  return page.template === 'shop' || page.props.some(p => p.name === 'Количество')
}

export interface Draft {
  text: string
  due: Due | null
  values: Rec['values']
}

/** The lines a send becomes on a page: on a list of things «и» splits too */
function linesFor(text: string, page: Page): string[] {
  // «покупки: хлеб» is a routing prefix on a list page too: the page says it, the record does not
  return isListPage(page) ? splitItems(dropPrefix(text)) : splitParts(dropPrefix(text))
}

/** One line as a record on a page: its date (unless `dates` is off), the quantity and the department */
function draftOf(line: string, page: Page, now: number, dates = true): Draft | null {
  const qtyProp = page.props.find(p => p.name === 'Количество')
  const select = page.props.find(p => p.type === 'select' && isListPage(page))
  const { due, rest } = dates ? parseDue(line, now) : { due: null, rest: line }
  const values: Rec['values'] = {}
  let body = rest
  if (qtyProp) {
    const q = parseQty(body)
    if (q.qty) {
      values[qtyProp.id] = q.qty
      body = q.rest
    }
  }
  if (select) {
    const option = guessOption(body, select)
    if (option) values[select.id] = option
  }
  const text = cleanRecordText(body || line)
  return text ? { text, due, values } : null
}

/** Records a line becomes on a page, by simple rules: dates, quantities, the department */
export function draftsFor(text: string, page: Page, now: number, opts: { dates?: boolean } = {}): Draft[] {
  return linesFor(text, page).map(line => draftOf(line, page, now, opts.dates)).filter((d): d is Draft => !!d)
}

// ---------- the field: one reading for the preview and the send (main flow, items 5–8, 23) ----------

/**
 * Who chose where a record goes: Авто (the chip is tinted with the place it chose), the person by hand, or the page
 * the field is on (both plain)
 */
export type PlaceBy = 'auto' | 'user' | 'page'

/** A record the field will add: what it says, where it goes and who chose that */
export interface LineDraft extends Draft {
  pageId: Id
  by: PlaceBy
  /** The record's text under its title, one paragraph per line */
  note: string
}

export interface LineContext {
  /** Pages Авто may file to, Входящие among them */
  pages: Page[]
  inboxId: Id
  learned: Learned
  recent: Id[]
  now: number
  /** The place in the chip when the person or the page chose it; none while Авто chooses */
  place?: { pageId: Id, by: 'user' | 'page' } | null
  /** Places picked by hand on rows of the list, by the record's title: a new reading of the same title keeps them */
  rows?: Record<string, Id>
  /** The date words the person dropped with a tap on the date chip: while they are typed the same, no date */
  noDate?: string | null
  /** Written on Сегодня: a record with no date of its own is due today */
  today?: boolean
  /** A record with no date of its own gets this day: a collecting view's first day, a calendar's selected day */
  day?: string | null
}

/** A date read in the field: where its words were typed (to tint them), the words, and the date */
export interface FieldDate {
  spans: Span[]
  words: string
  due: Due
}

export interface LineRead {
  drafts: LineDraft[]
  date: FieldDate | null
}

/** The date of the field's title line; null without one or once its chip was tapped away */
export function fieldDate(title: string, now: number, noDate?: string | null): FieldDate | null {
  const found = readDue(title, now)
  if (!found.due) return null
  const words = dueWords(title, found.spans)
  return noDate && noDate === words ? null : { spans: found.spans, words, due: found.due }
}

/** The date chip was tapped away: the words read as a date, but the record is filed without one */
function dropped(title: string, date: FieldDate | null, now: number): boolean {
  return !date && !!readDue(title, now).due
}

/** Задачи, where a dated line goes when no page claims it (main flow, item 7) */
function todoPage(pages: Page[]): Page | undefined {
  return pages.find(p => p.kind === 'page' && p.template === 'todo') ?? pages.find(p => p.kind === 'page' && pageTopic(p) === 'todo')
}

/**
 * What the field makes of its two lines by the rules, without a model: the records with their places. The same
 * function draws the list before the send and files on send, so what is filed is what was on screen
 */
export function readLine(title: string, note: string, ctx: LineContext): LineRead {
  const text = title.trim()
  if (!text) return { drafts: [], date: null }
  const date = fieldDate(title, ctx.now, ctx.noDate)
  const dates = !dropped(title, date, ctx.now)
  const page = (id: Id | null | undefined) => id ? ctx.pages.find(p => p.id === id) : undefined
  const inbox = page(ctx.inboxId)!
  const out: LineDraft[] = []
  const put = (line: string, to: Page, by: PlaceBy) => {
    const d = draftOf(line, to, ctx.now, dates)
    if (d) out.push({ ...d, pageId: to.id, by, note: '' })
  }

  const chosen = page(ctx.place?.pageId)
  if (chosen) {
    for (const line of linesFor(text, chosen)) put(line, chosen, ctx.place!.by)
  } else {
    const parts = splitRoute(text, ctx.pages, ctx.learned, ctx.recent) ?? [{ text, ...classify(text, ctx.pages, ctx.learned, ctx.recent) }]
    for (const part of parts) {
      let to = page(part.pageId)
      // Unsure, but dated: a to-do (Задачи); anything else unsure waits in Входящие, and nothing asks
      if (!to && dates && parseDue(part.text, ctx.now).due) to = todoPage(ctx.pages)
      to ??= inbox
      const lines = linesFor(part.text, to)
      for (const line of lines) {
        // A line of a list that clearly belongs elsewhere goes there: «молоко и позвонить маме» is Покупки and Задачи
        const own = lines.length > 1 ? page(classify(line, ctx.pages, ctx.learned, ctx.recent).pageId) : undefined
        put(line, own ?? to, 'auto')
      }
    }
  }
  return { drafts: finish(out, note, ctx), date }
}

/** The places picked on rows, Сегодня's date and the note: the same for the rules and a model's reading */
function finish(drafts: LineDraft[], note: string, ctx: LineContext): LineDraft[] {
  const today = dayKey(ctx.now)
  const valid = (id: Id) => ctx.pages.some(p => p.id === id)
  const out = drafts.map((d) => {
    const row = drafts.length > 1 ? ctx.rows?.[d.text] : undefined
    const placed = row && valid(row) && row !== d.pageId ? { ...d, ...retarget(d, row, ctx), pageId: row, by: 'user' as const } : d
    const day = ctx.day ?? (ctx.today ? today : null)
    return day && !placed.due ? { ...placed, due: { date: day } } : placed
  })
  // The note line is one record's: with several, what was typed there goes with the first
  if (out.length && note.trim()) out[0] = { ...out[0]!, note: note.trim() }
  return out
}

/** A record moved to another page by its row's chip keeps what it says; values follow the page's own properties */
function retarget(d: LineDraft, pageId: Id, ctx: LineContext): Pick<Draft, 'values'> {
  const to = ctx.pages.find(p => p.id === pageId)
  if (!to) return { values: {} }
  const again = draftOf(d.text, to, ctx.now, false)
  return { values: again?.values ?? {} }
}

/**
 * A model's reading of the field (main flow, item 23): its records, each on its page (unsure: Входящие), with the
 * note it read. One record keeps the title as typed on screen; the composer decides which title is filed
 */
export function readModel(result: ModelResult, title: string, note: string, ctx: LineContext): LineDraft[] {
  if (result.kind !== 'record' || !result.items.length) return []
  const undated = dropped(title, fieldDate(title, ctx.now, ctx.noDate), ctx.now)
  const page = (id: Id | null) => id ? ctx.pages.find(p => p.id === id) : undefined
  const inbox = page(ctx.inboxId)!
  const chosen = page(ctx.place?.pageId ?? null)
  const one = result.items.length === 1
  const drafts = result.items.map((item): LineDraft | null => {
    // A page or a hand pick holds one record; several records each go where the model put them
    const to = (one && chosen) || page(item.pageId) || inbox
    const by: PlaceBy = one && chosen ? ctx.place!.by : 'auto'
    const d = fromModel(item, to)
    return d ? { ...d, due: undated ? null : d.due, pageId: to.id, by, note: item.note?.trim() ?? '' } : null
  }).filter((d): d is LineDraft => !!d)
  return finish(drafts, note, ctx)
}

/** A record the model asked for, mapped onto the page's properties */
function fromModel(item: ModelItem, page: Page): Draft | null {
  const values: Rec['values'] = {}
  const qtyProp = page.props.find(p => p.name === 'Количество')
  if (item.qty && qtyProp) values[qtyProp.id] = item.qty
  if (item.option) {
    for (const prop of page.props.filter(p => p.type === 'select')) {
      const o = prop.options?.find(x => fold(x.name) === fold(item.option!))
      if (o) values[prop.id] = o.id
    }
  }
  const date = item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : null
  const time = item.time && /^\d{1,2}:\d{2}$/.test(item.time) ? item.time.replace(/^0(\d)/, '$1') : undefined
  const text = capitalize(item.text)
  return text ? { text, due: date ? (time ? { date, time } : { date }) : null, values } : null
}
