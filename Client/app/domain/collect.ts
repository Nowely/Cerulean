// Views that collect records (v24, И10, И4): «Откуда записи» takes a view's rows from every page or from the chosen
// ones, through the view's «Фильтр» (Срок chips, Сделано, «Ждут уточнения»; `matchesChips` in views.ts, which a page's
// own records go through too). A collecting page is an ordinary page; Сегодня stays the fixed case (B4) and has none of it.
import type { DueChip, Id, Page, Rec, ViewDef, ViewSource } from './types'
import { addDays, dayKey, formatDue, isOverdue, weekday } from './dates'
import { capitalize, count, plural } from './text'
import { filterRecords, inWeek, sortRecords, type Leaving } from './views'

/** «Срок» chips after «Любой», in the order their words go into the «Фильтр» select */
export const DUE_CHIPS: { key: DueChip, label: string }[] = [
  { key: 'late', label: 'Просрочено' },
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'На неделе' },
  { key: 'none', label: 'Без срока' }
]

export const SOURCES: { value: ViewSource, label: string, notice: string }[] = [
  { value: 'self', label: 'Эта страница', notice: 'только записи этой страницы' },
  { value: 'all', label: 'Все страницы', notice: 'записи со всех страниц' },
  { value: 'pick', label: 'Выбранные', notice: 'записи с выбранных страниц' }
]

/** The view shows records of other pages */
export const collects = (view: ViewDef | undefined): boolean => !!view?.from && view.from !== 'self'

/** Every view collects: nothing is filed here by words, so no «Что сюда класть» and Авто never files here (v24 fixes, 16) */
export const onlyCollects = (page: Page): boolean => page.kind === 'page' && page.views.length > 0 && page.views.every(collects)

/** The page's first view collects: Главная sums up what it collects and never raises its overdue signal */
export const firstCollects = (page: Page): boolean => page.kind === 'page' && collects(page.views[0])

/** The view's «Сделано» choice, read from its done rule */
export function doneChoice(view: ViewDef): 'open' | 'done' | 'all' {
  const rule = view.filter.find(r => r.field === 'done')
  return !rule ? 'all' : rule.value ? 'done' : 'open'
}

/**
 * What a collecting view shows: live records and subitems of every page or of the chosen ones, through its filter,
 * by date («По сроку», fixed). `all` is every live record; rows a tick is taking out stay until they leave
 */
export function collected(view: ViewDef, all: Rec[], now: number, leaving?: Leaving): Rec[] {
  const from = view.from === 'pick' ? new Set(view.pages ?? []) : null
  return sortRecords(filterRecords(from ? all.filter(r => from.has(r.pageId)) : all, view, leaving, now), 'due')
}

/** The day a record written here gets when it names none (v24): «завтра» under «На неделе», today under «Сегодня» */
export function firstDay(view: ViewDef, now: number): string | null {
  const dues = view.dues ?? []
  if (dues.includes('week')) return addDays(dayKey(now), 1)
  if (dues.includes('today')) return dayKey(now)
  return null
}

/** The page's line for a collecting view: «7 дел со всех страниц», «5 дел с 2 страниц»; empty with nothing in it */
export function collectLead(page: Page, view: ViewDef, rows: number, pages = view.pages?.length ?? 0): string {
  if (!rows) return ''
  const where = view.from === 'pick' ? `с ${pages} ${plural(pages, ['страницы', 'страниц', 'страниц'])}` : 'со всех страниц'
  return `${count(rows, page.noun)} ${where}`
}

/**
 * The «Фильтр» select in words: the picked Срок chips in their order, the «Сделано» choice in lower case, then «ждут
 * уточнения» («Просрочено · На неделе · не сделано»); with nothing picked «Не сделано» («Не куплено» on Покупки)
 */
export function filterWords(page: Page, view: ViewDef): string {
  const shop = page.template === 'shop'
  const done = { open: shop ? 'не куплено' : 'не сделано', done: shop ? 'куплено' : 'сделано', all: 'все' }[doneChoice(view)]
  const words = [...DUE_CHIPS.filter(c => view.dues?.includes(c.key)).map(c => c.label), done, view.asking ? 'ждут уточнения' : '']
  return capitalize(words.filter(Boolean).join(' · '))
}

/** «Выбранные»: a tap adds or removes a page; the list keeps the order they were picked in */
export function togglePicked(view: ViewDef, id: Id): Id[] {
  const pages = view.pages ?? []
  return pages.includes(id) ? pages.filter(p => p !== id) : [...pages, id]
}

/**
 * The right column of a collected row (v24): an overdue record «было вчера» (`late`: muted 500, v24 fixes, 12), today
 * «сегодня, 10:00», the weekday under a «На неделе» filter («завтра», «ср»), else the date. Line 2 is always the
 * record's home page, so the date never goes there
 */
export function rowEnd(rec: Rec, view: ViewDef, now: number): { text: string, late: boolean } {
  const due = rec.due
  if (!due) return { text: '', late: false }
  if (!rec.done && isOverdue(due, now)) return { text: `было ${formatDue(due, now)}`, late: true }
  const today = due.date === dayKey(now)
  if (!today && view.dues?.includes('week') && inWeek(due, now)) return { text: weekday(due.date, now), late: false }
  return { text: formatDue(due, now), late: false }
}
