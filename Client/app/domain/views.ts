// A view is a saved way to look at a page: which records, in what order, grouped how
import type { Due, DueChip, FilterRule, GroupBy, Id, Page, PropDef, Rec, ViewDef } from './types'
import { addDays, dayKey } from './dates'
import { fold, ofProp } from './text'
import { searchText } from './body'

export interface Group {
  key: string
  label: string
  /** Due groups: «Просрочено» is written in warn */
  tone?: 'warn'
  records: Rec[]
}

function matches(rec: Rec, rule: FilterRule): boolean {
  const value = rule.field === 'done'
    ? rec.done
    : rule.field === 'due'
      ? rec.due?.date ?? null
      : rec.values[rule.field] ?? null
  const empty = value === null || value === ''
  if (rule.op === 'empty') return empty
  if (rule.op === 'notEmpty') return !empty
  return value === rule.value
}

/** «На неделе» as a filter chip (v24 fixes, item 11): today and the six days after it, so never an overdue record */
export function inWeek(due: Due | null | undefined, now: number): boolean {
  const today = dayKey(now)
  return !!due && due.date >= today && due.date <= addDays(today, 6)
}

function matchesDue(rec: Rec, chip: DueChip, now: number): boolean {
  const d = rec.due?.date
  if (chip === 'none') return !d
  if (!d) return false
  if (chip === 'late') return !rec.done && d < dayKey(now)
  if (chip === 'today') return d === dayKey(now)
  return inWeek(rec.due, now)
}

/**
 * The «Фильтр» chips of a view (v24), the same on its own records and on what it collects: a record passes when it
 * matches any picked «Срок» chip (none picked is «Любой»), and with «Ждут уточнения» only when tagged «уточнить»
 */
export function matchesChips(rec: Rec, view: ViewDef, now: number): boolean {
  const dues = view.dues ?? []
  if (dues.length && !dues.some(c => matchesDue(rec, c, now))) return false
  return !view.asking || rec.tags.includes('clarify')
}

/**
 * Rows a tick is taking out of their list (Josh 28 Oct, 12, as in Apple Reminders): each record's id and the done state
 * it still shows with. A tick strikes the row at once and it leaves a moment later; until then it is only in the list it
 * was in, never in both («Купить» and «Куплено»), and a second tap takes the tick back
 */
export type Leaving = Readonly<Record<Id, boolean>>

/** The record as its lists see it: as it was before the tick while the tick is taking it out */
export const asListed = (r: Rec, leaving?: Leaving): Rec => leaving && r.id in leaving ? { ...r, done: leaving[r.id]! } : r

/**
 * `leaving`: rows a tick is taking out stay in the views they belonged to before the tick, struck through, until they
 * leave: a row ticked on «Купить» never shows up on «Запасы» or, yet, on «Куплено»
 */
export function filterRecords(records: Rec[], view: ViewDef, leaving?: Leaving, now = Date.now()): Rec[] {
  const fits = (r: Rec) => view.filter.every(rule => matches(r, rule)) && matchesChips(r, view, now)
  return records.filter(r => fits(asListed(r, leaving)))
}

const byOrder = (a: Rec, b: Rec) => a.order - b.order

/** «9:30» sorts before «10:00»; a day without a time goes after the timed ones */
const dueKey = (r: Rec) => r.due ? `${r.due.date} ${r.due.time?.padStart(5, '0') ?? '99'}` : '~'

export function sortRecords(records: Rec[], sort: ViewDef['sort']): Rec[] {
  const list = [...records]
  if (sort === 'name') return list.sort((a, b) => a.text.localeCompare(b.text, 'ru'))
  if (sort === 'due') {
    return list.sort((a, b) => {
      const da = dueKey(a)
      const db = dueKey(b)
      return da === db ? byOrder(a, b) : da < db ? -1 : 1
    })
  }
  return list.sort(byOrder)
}

/** «Без отдела», «Без статуса»: the group of records without a value of a «Выбор» */
export const noValueLabel = (prop: PropDef) => `Без ${ofProp(prop.name)}`

/** Groups by a «Выбор» property follow the order of its options; records without a value come first («Без отдела») */
function groupBySelect(records: Rec[], prop: PropDef): Group[] {
  const groups: Group[] = (prop.options ?? []).map(o => ({ key: o.id, label: o.name, records: [] }))
  const rest: Group = { key: 'none', label: noValueLabel(prop), records: [] }
  for (const r of records) {
    const g = groups.find(x => x.key === r.values[prop.id]) ?? rest
    g.records.push(r)
  }
  return [rest, ...groups].filter(g => g.records.length)
}

/** «Просрочено», «Сегодня», «Завтра», «На неделе», «Позже», «Без срока» */
export function groupByDue(records: Rec[], now: number): Group[] {
  const today = dayKey(now)
  const tomorrow = addDays(today, 1)
  const week = addDays(today, 7)
  const groups: Group[] = [
    { key: 'late', label: 'Просрочено', tone: 'warn', records: [] },
    { key: 'today', label: 'Сегодня', records: [] },
    { key: 'tomorrow', label: 'Завтра', records: [] },
    { key: 'week', label: 'На неделе', records: [] },
    { key: 'later', label: 'Позже', records: [] },
    { key: 'none', label: 'Без срока', records: [] }
  ]
  for (const r of records) {
    const d = r.due?.date
    const key = !d ? 'none' : d < today ? 'late' : d === today ? 'today' : d === tomorrow ? 'tomorrow' : d <= week ? 'week' : 'later'
    groups.find(g => g.key === key)!.records.push(r)
  }
  return groups.filter(g => g.records.length)
}

export function groupRecords(records: Rec[], groupBy: GroupBy, page: Page, now: number): Group[] {
  if (groupBy === 'due') return groupByDue(records, now)
  const prop = groupBy ? page.props.find(p => p.id === groupBy && p.type === 'select') : undefined
  if (prop) return groupBySelect(records, prop)
  return [{ key: 'all', label: '', records }]
}

/** Records of a view in display order, grouped. Groups have an empty label when the view is not grouped. */
export function applyView(page: Page, records: Rec[], view: ViewDef, now: number, leaving?: Leaving): Group[] {
  return groupRecords(sortRecords(filterRecords(records, view, leaving, now), view.sort), view.groupBy, page, now)
}

export function viewCount(page: Page, records: Rec[], view: ViewDef | undefined): number {
  return view ? filterRecords(records, view).length : records.length
}

/** «Очистить купленное»: the ticked records a view shows (v22, N9) */
export function doneIn(records: Rec[], view: ViewDef): Rec[] {
  return filterRecords(records, view).filter(r => r.done)
}

/** A send on a calendar's selected day: a record without its own date lands on that day (v22, G6) */
export function onDay<T extends { due: Due | null }>(drafts: T[], day: string | null | undefined): T[] {
  return day ? drafts.map(d => d.due ? d : { ...d, due: { date: day } }) : drafts
}

/**
 * Where a row dropped at `index` of the group `to` goes (drag, Alt+↑/↓): the `order` between its new neighbours,
 * read from `orders`, and the group's value when it crosses into another group of a «Выбор» property. Null when
 * it cannot go there: groups by date or no groups at all take no rows from another group
 */
export function dropPlace(groups: Group[], prop: PropDef | undefined, rec: Rec, to: string, index: number, orders: (r: Rec) => number = r => r.order): { order: number, values: Rec['values'], into: Group | null } | null {
  const from = groups.find(g => g.records.some(r => r.id === rec.id))
  const target = groups.find(g => g.key === to)
  if (!target) return null
  const into = from && from.key !== target.key ? target : null
  if (into && !prop) return null
  const others = target.records.filter(r => r.id !== rec.id)
  const before = others[index - 1]
  const after = others[index]
  const order = before && after
    ? (orders(before) + orders(after)) / 2
    : before ? orders(before) + 1 : after ? orders(after) - 1 : orders(rec)
  const values = into ? { ...rec.values, [prop!.id]: into.key === 'none' ? null : into.key } : rec.values
  return { order, values, into }
}

/** New records go on top of a manually sorted list */
export function topOrder(records: Rec[]): number {
  return records.reduce((m, r) => Math.min(m, r.order), 1) - 1
}

/** What a view can be grouped by: «Выбор» properties and «Срок» */
export function groupOptions(page: Page): { value: GroupBy, label: string }[] {
  return [
    { value: null, label: 'Без групп' },
    { value: 'due', label: 'Срок' },
    ...page.props.filter(p => p.type === 'select').map(p => ({ value: p.id as GroupBy, label: p.name }))
  ]
}

/** Search inside one page: text and body */
export function matchesQuery(rec: Rec, q: string): boolean {
  const f = fold(q.trim())
  return !f || fold(rec.text).includes(f) || fold(searchText(rec)).includes(f)
}
