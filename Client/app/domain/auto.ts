// Авто: where a line goes and what records it becomes. The stores run it; this file only decides.
import type { Due, Id, Page, Rec } from './types'
import type { Learned } from './rules'
import type { ModelResult } from './model'
import { classify, guessOption } from './rules'
import { cleanRecordText, isQuestion, parseDue, parseQty, splitItems } from './parse'
import { capitalize, fold } from './text'

/** What the destination chip shows while typing in Авто */
export type Preview
  = | { kind: 'idle' }
    | { kind: 'search' }
    | { kind: 'page', pageId: Id }
    | { kind: 'inbox' }

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
  if (isQuestion(t)) return { kind: 'search' }
  const r = classify(t, ctx.pages, ctx.learned, ctx.recent)
  if (r.pageId) return { kind: 'page', pageId: r.pageId }
  // With a model the decision waits for send; the chip stays «Авто» instead of promising Входящие
  return ctx.model ? { kind: 'idle' } : { kind: 'inbox' }
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
  const lines = isListPage(page) ? splitItems(text) : text.split(/\n|;/).map(s => s.trim()).filter(Boolean)
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
