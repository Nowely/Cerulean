// Duplicates (v22, G3): a record is written as typed even when the same thing is already open on its page; the
// receipt then offers to merge it into the one that was there, adding up quantities in the same unit.
import type { Id, Page, Rec } from './types'
import { normalize } from './text'

/**
 * The open record on the same page that says the same thing («Молоко» for a new «Молоко»), not one of `own`
 * (the records of the same send). Subitems and ticked records are not duplicates.
 */
export function duplicateOf(rec: Rec, records: Rec[], own: Set<Id> = new Set()): Rec | undefined {
  const text = normalize(rec.text)
  return records.find(r => r.id !== rec.id && !own.has(r.id) && r.pageId === rec.pageId && !r.parentId && !r.done && !r.deletedAt
    && normalize(r.text) === text)
}

const QTY = /^(\d+(?:[.,]\d+)?)\s*(.*)$/

/**
 * Two quantities as one: «2 л» and «1 л» are «3 л», «2,5 кг» and «1 кг» are «3,5 кг». Different units keep the
 * first («2 л» and «500 мл» stay «2 л»); a missing one takes the other.
 */
export function addQty(a: string | number | null | undefined, b: string | number | null | undefined): string | null {
  const x = a == null || a === '' ? null : QTY.exec(String(a).trim())
  const y = b == null || b === '' ? null : QTY.exec(String(b).trim())
  if (!x) return b == null || b === '' ? (a == null || a === '' ? null : String(a)) : String(b)
  if (!y || x[2] !== y[2]) return String(a)
  const sum = Math.round((Number(x[1]!.replace(',', '.')) + Number(y[1]!.replace(',', '.'))) * 1000) / 1000
  return `${String(sum).replace('.', ',')}${x[2] ? ` ${x[2]}` : ''}`
}

/** The property quantities live in on a list page («Количество»), if it has one */
export function qtyProp(page: Page | undefined) {
  return page?.props.find(p => p.name === 'Количество')
}

/** «уже есть в списке, 2 л» and the label «Объединить с «Молоко, 2 л»» for a duplicate on `page` */
export function duplicateWords(dup: Rec, page: Page | undefined): { sub: string, label: string } {
  const prop = qtyProp(page)
  const qty = prop ? dup.values[prop.id] : null
  const q = qty == null || qty === '' ? '' : `, ${qty}`
  return { sub: `уже есть в списке${q}`, label: `Объединить с «${dup.text}${q}»` }
}
