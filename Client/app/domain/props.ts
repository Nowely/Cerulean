// A page's properties as one ordered list: its own (Количество, Отдел…) and the built-in Срок and Заметка.
// What the list and the editor read, and how a value survives a type change. Plain data in, plain data out;
// the store applies the result.
import type { BuiltinProp, Id, Page, PageColor, PropDef, PropOption, PropType, Rec } from './types'
import { PAGE_COLORS } from './types'
import { formatDueLong } from './dates'
import { parseDue } from './parse'

export type Value = Rec['values'][string]

export interface ListedProp {
  /** The property id, or 'due' / 'note' for the built-in ones */
  key: Id | BuiltinProp
  name: string
  type: PropType
  builtin: boolean
  prop?: PropDef
}

export const BUILTINS: { key: BuiltinProp, name: string, type: PropType }[] = [
  { key: 'due', name: 'Срок', type: 'date' },
  { key: 'note', name: 'Заметка', type: 'text' }
]

export const TYPE_NAMES: Record<PropType, string> = { text: 'текст', number: 'число', select: 'выбор', date: 'дата', relation: 'связь' }

export const TYPE_ICONS: Record<PropType, string> = {
  text: 'i-lucide-text',
  number: 'i-lucide-hash',
  select: 'i-lucide-circle-chevron-down',
  date: 'i-lucide-calendar',
  relation: 'i-lucide-link'
}

const isBuiltin = (k: string): k is BuiltinProp => k === 'due' || k === 'note'

/** A number's «Норма» goes with its number: it is not listed on its own and leaves with it */
export const isNorm = (page: Page, p: PropDef) => page.props.some(x => x.normProp === p.id)

/**
 * Every key in order: what `propOrder` knows, then a property it does not know yet right after the last own one,
 * Срок and Заметка last when missing. Old pages have no `propOrder` and read as own ones, Срок, Заметка.
 */
export function propKeys(page: Page): (Id | BuiltinProp)[] {
  const own = new Set(page.props.map(p => p.id))
  const keys: (Id | BuiltinProp)[] = []
  for (const k of page.propOrder ?? []) {
    if ((own.has(k) || isBuiltin(k)) && !keys.includes(k)) keys.push(k)
  }
  for (const p of page.props) {
    if (!keys.includes(p.id)) keys.splice(afterOwn(keys, own), 0, p.id)
  }
  for (const b of BUILTINS) if (!keys.includes(b.key)) keys.push(b.key)
  return keys
}

/** Where a new property goes: after the page's own ones, before Срок and Заметка when they come after them */
function afterOwn(keys: string[], own: Set<string>): number {
  for (let i = keys.length - 1; i >= 0; i--) if (own.has(keys[i]!)) return i + 1
  const first = keys.findIndex(isBuiltin)
  return first < 0 ? keys.length : first
}

/** The list «Свойства» shows, in order; `norms` keeps the «Норма» properties too (the record page shows their values) */
export function propList(page: Page, opts: { norms?: boolean } = {}): ListedProp[] {
  const out: ListedProp[] = []
  for (const key of propKeys(page)) {
    const b = BUILTINS.find(x => x.key === key)
    if (b) {
      out.push({ ...b, builtin: true })
      continue
    }
    const prop = page.props.find(p => p.id === key)!
    if (!opts.norms && isNorm(page, prop)) continue
    out.push({ key, name: prop.name, type: prop.type, builtin: false, prop })
  }
  return out
}

/** The full order after the listed keys were rearranged: a «Норма» rides right after its number */
export function orderFromListed(page: Page, listed: (Id | BuiltinProp)[]): (Id | BuiltinProp)[] {
  const out: (Id | BuiltinProp)[] = []
  for (const k of listed) {
    out.push(k)
    const norm = page.props.find(p => p.id === k)?.normProp
    if (norm && page.props.some(p => p.id === norm)) out.push(norm)
  }
  // Anything the caller did not know about keeps its place at the end
  for (const k of propKeys(page)) if (!out.includes(k)) out.push(k)
  return out
}

export const hasValue = (v: Value | undefined): v is string | number => v !== null && v !== undefined && v !== ''

/** The colour of an option's dot: its own, or one by position for options made before options had colours */
export function optionColor(options: PropOption[], option: PropOption): PageColor {
  if (option.color) return option.color
  const i = Math.max(0, options.findIndex(o => o.id === option.id))
  return PAGE_COLORS[i % PAGE_COLORS.length]!
}

/** «+ Вариант» takes the first colour no option has yet, then goes round again */
export function nextColor(options: PropOption[]): PageColor {
  const used = new Set(options.map(o => o.color))
  return PAGE_COLORS.find(c => !used.has(c)) ?? PAGE_COLORS[options.length % PAGE_COLORS.length]!
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** A value as the record page writes it: an option's name, «10 шт», «25 октября» */
export function formatValue(prop: PropDef, value: Value | undefined, now: number): string {
  if (!hasValue(value)) return ''
  if (prop.type === 'select') return prop.options?.find(o => o.id === value)?.name ?? ''
  if (prop.type === 'date' && typeof value === 'string' && ISO.test(value)) return formatDueLong({ date: value }, now).split(' · ')[0]!
  const text = typeof value === 'number' ? String(value).replace('.', ',') : value
  return prop.type === 'number' && prop.unit ? `${text} ${prop.unit}` : text
}

/** A number as written, only the number: «2,5» reads, «2 л» does not */
export function readNumber(text: string): number | null {
  const t = text.trim()
  return /^-?\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null
}

/** A date in the app's own words («завтра», «25 октября», «сб») or as YYYY-MM-DD; the whole text must be the date */
export function readDate(text: string, now: number): string | null {
  const t = text.trim()
  if (ISO.test(t)) return t
  const { due, rest } = parseDue(t, now)
  return due && !rest.replace(/[\s,.]/g, '') ? due.date : null
}

/**
 * A type change converts what it can. Текст ↔ Выбор keeps every value (each distinct text becomes an option, found
 * by name among the options the property had before); Число and Дата become text as written; a text that reads as a
 * number or a date converts. The rest is dropped: `values` maps it to null and `dropped` lists the records.
 */
export function convertValues(prop: PropDef, type: PropType, entries: [Id, Value][], now: number, newId: () => Id) {
  const was = prop.options ?? prop.stash ?? []
  const options: PropOption[] = prop.type === 'select' ? [...was] : (prop.stash ?? []).map(o => ({ ...o }))
  const values = new Map<Id, Value>()
  const dropped: Id[] = []
  for (const [id, value] of entries) {
    if (!hasValue(value)) continue
    const text = formatValue(prop, value, now).trim()
    let next: Value = null
    if (type === 'text') next = text || null
    else if (type === 'number') next = readNumber(text)
    else if (type === 'date') next = readDate(text, now)
    else if (type === 'select' && text) {
      let o = options.find(x => x.name.toLowerCase() === text.toLowerCase())
      if (!o) {
        o = { id: newId(), name: text, color: nextColor(options) }
        options.push(o)
      }
      next = o.id
    }
    values.set(id, next)
    if (next === null) dropped.push(id)
  }
  const { options: _o, stash: _s, unit: _u, ...rest } = prop
  const def: PropDef = { ...rest, type }
  if (type === 'select') def.options = options
  else if (prop.type === 'select' || prop.stash) def.stash = prop.type === 'select' ? was : prop.stash
  // A unit belongs to numbers: a number turned into text carries it in its words («10 шт»)
  if (type === 'number' && prop.unit) def.unit = prop.unit
  return { prop: def, values, dropped }
}

/** «Создать» works once there is a name and, for a «Выбор», at least one named option (B12) */
export function canCreate(draft: { name: string, type: PropType, options: PropOption[] }): boolean {
  return !!draft.name.trim() && (draft.type !== 'select' || draft.options.some(o => o.name.trim()))
}
