// Авто: where a line goes and what records it becomes. The stores run it; this file only decides.
import type { Due, Id, Page, Rec } from './types'
import type { ModelResult } from './model'
import { classify, guessOption, templateFor, textTopics, type Learned, type RuleResult } from './rules'
import { templateByKey } from './templates'
import { cleanRecordText, dropPrefix, isSearch, parseDue, parseQty, splitItems, splitParts } from './parse'
import { capitalize, fold } from './text'

/** What the guess line says while typing in Авто: where the send goes and how many records it makes there */
export type Preview
  = | { kind: 'idle' }
    | { kind: 'search' }
    | { kind: 'page', pageId: Id, count: number }
    | { kind: 'inbox', count: number }
    | { kind: 'split', parts: { to: Id | 'inbox', count: number }[] }
    /** Day one: no page of the kind yet, so the send makes one from its template («→ Покупки») */
    | { kind: 'starter', name: string, count: number }

export interface AutoContext {
  pages: Page[]
  learned: Learned
  recent: Id[]
  /** A model can still decide on send (key set, online, not «Сначала простые правила» with a clear rule) */
  model: boolean
}

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
  const starter = templateFor(t, ctx.pages)
  if (!starter) return { kind: 'inbox', count: 1 }
  return { kind: 'starter', name: templateByKey(starter).name, count: (starter === 'shop' ? splitItems(t) : splitParts(dropPrefix(t))).length }
}

/** A part of a send and where the rules put it; no page: Входящие with «уточнить» (or the model, when there is one) */
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

/** Records a line becomes on a page, by simple rules: dates, quantities, the department */
export function draftsFor(text: string, page: Page, now: number): Draft[] {
  const qtyProp = page.props.find(p => p.name === 'Количество')
  const select = page.props.find(p => p.type === 'select' && isListPage(page))
  // «покупки: хлеб» is a routing prefix on a list page too: the page says it, the record does not
  const lines = isListPage(page) ? splitItems(dropPrefix(text)) : splitParts(dropPrefix(text))
  return lines.map((line) => {
    const { due, rest } = parseDue(line, now)
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
    return { text: cleanRecordText(body || line), due, values }
  }).filter(d => d.text)
}

/** Records the model asked for, mapped onto the page's properties */
export function draftsFromModel(result: ModelResult, page: Page, now: number, fallback: string): Draft[] {
  if (!result.items.length) return draftsFor(fallback, page, now)
  const qtyProp = page.props.find(p => p.name === 'Количество')
  return result.items.map((item) => {
    const values: Rec['values'] = {}
    if (item.qty && qtyProp) values[qtyProp.id] = item.qty
    if (item.option) {
      for (const prop of page.props.filter(p => p.type === 'select')) {
        const o = prop.options?.find(x => fold(x.name) === fold(item.option!))
        if (o) values[prop.id] = o.id
      }
    }
    const date = item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : null
    const time = item.time && /^\d{1,2}:\d{2}$/.test(item.time) ? item.time.replace(/^0(\d)/, '$1') : undefined
    return { text: capitalize(item.text), due: date ? (time ? { date, time } : { date }) : null, values }
  }).filter(d => d.text)
}
