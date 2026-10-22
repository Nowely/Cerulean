// Dates as the interface writes them: «сегодня, 10:00», «сб, 25 окт», «Сегодня, 19 октября»
import type { Due } from './types'
import { plural } from './text'

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day as YYYY-MM-DD */
export function dayKey(t: number | Date): string {
  const d = typeof t === 'number' ? new Date(t) : t
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDays(key: string, n: number): string {
  const d = keyToDate(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** Whole days from `a` to `b` (positive when b is later) */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToDate(b).getTime() - keyToDate(a).getTime()) / 86400000)
}

export function clock(t: number): string {
  const d = new Date(t)
  return `${d.getHours()}:${pad(d.getMinutes())}`
}

function dayWord(diff: number): string | null {
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'завтра'
  if (diff === -1) return 'вчера'
  return null
}

/** Short form for rows and cards: «сегодня, 10:00», «вт, 21 окт», «12 дек», «18 мая 2027» */
export function formatDue(due: Due, now: number): string {
  const today = dayKey(now)
  const diff = daysBetween(today, due.date)
  const d = keyToDate(due.date)
  let base = dayWord(diff)
  if (!base) {
    const dm = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
    if (d.getFullYear() !== new Date(now).getFullYear()) base = `${dm} ${d.getFullYear()}`
    else base = Math.abs(diff) <= 6 ? `${WEEKDAYS[d.getDay()]}, ${dm}` : dm
  }
  return due.time ? `${base}, ${due.time}` : base
}

/** The day a calendar composer writes on: «сегодня», «завтра», «вс, 25 окт» (v22, G6: «Запись на вс, 25 окт») */
export function dayAim(key: string, now: number): string {
  const diff = daysBetween(dayKey(now), key)
  if (diff === 0 || diff === 1) return dayWord(diff)!
  const d = keyToDate(key)
  const base = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  return d.getFullYear() !== new Date(now).getFullYear() ? `${base} ${d.getFullYear()}` : base
}

/** The day a row of «На неделе» shows on its right (v23, B4): «завтра», then the short weekday («ср», «вс») */
export function weekday(key: string, now: number): string {
  return daysBetween(dayKey(now), key) === 1 ? 'завтра' : WEEKDAYS[keyToDate(key).getDay()]!
}

/** Only the time when the day goes without saying (in «Сегодня»): «10:00», otherwise the short form */
export function formatDueBrief(due: Due, now: number): string {
  if (due.time && daysBetween(dayKey(now), due.date) === 0) return due.time
  return formatDue(due, now)
}

/** Full form for a record page: «18 мая 2027 · через 7 месяцев» */
export function formatDueLong(due: Due, now: number): string {
  const today = dayKey(now)
  const diff = daysBetween(today, due.date)
  const d = keyToDate(due.date)
  const word = dayWord(diff)
  let base = word ?? `${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (!word && d.getFullYear() !== new Date(now).getFullYear()) base += ` ${d.getFullYear()}`
  if (due.time) base += `, ${due.time}`
  if (diff > 1) base += ` · ${inTime(diff)}`
  return base
}

function inTime(days: number): string {
  if (days < 14) return `через ${days} ${plural(days, ['день', 'дня', 'дней'])}`
  if (days < 60) {
    const w = Math.round(days / 7)
    return `через ${w} ${plural(w, ['неделю', 'недели', 'недель'])}`
  }
  const m = Math.round(days / 30.4)
  if (m < 12) return `через ${m} ${plural(m, ['месяц', 'месяца', 'месяцев'])}`
  const y = Math.round(days / 365)
  return `через ${y} ${plural(y, ['год', 'года', 'лет'])}`
}

/** The day choices of the «Срок» sheet: today, tomorrow, the coming Saturday after tomorrow («В субботу, 24 окт») */
export function dueChoices(now: number): { key: string, label: string }[] {
  const today = dayKey(now)
  const tomorrow = addDays(today, 1)
  let sat = addDays(today, 2)
  while (keyToDate(sat).getDay() !== 6) sat = addDays(sat, 1)
  const d = keyToDate(sat)
  return [
    { key: today, label: 'Сегодня' },
    { key: tomorrow, label: 'Завтра' },
    { key: sat, label: `В субботу, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` }
  ]
}

export function isOverdue(due: Due | null | undefined, now: number): boolean {
  return !!due && due.date < dayKey(now)
}

export function isDueToday(due: Due | null | undefined, now: number): boolean {
  return !!due && due.date === dayKey(now)
}

/** Day header in Журнал: «Сегодня, 19 октября», «Вчера», «17 октября», «17 октября 2025» */
export function formatDay(t: number, now: number): string {
  const diff = daysBetween(dayKey(now), dayKey(t))
  const d = new Date(t)
  const dm = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (diff === 0) return `Сегодня, ${dm}`
  if (diff === -1) return 'Вчера'
  return d.getFullYear() === new Date(now).getFullYear() ? dm : `${dm} ${d.getFullYear()}`
}

/** A day in running text: «сегодня», «вчера», «12 сентября», «12 сентября 2025» («последняя 12 сентября») */
export function formatDate(t: number, now: number): string {
  const word = dayWord(daysBetween(dayKey(now), dayKey(t)))
  if (word) return word
  const d = new Date(t)
  const dm = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === new Date(now).getFullYear() ? dm : `${dm} ${d.getFullYear()}`
}

/** A moment relative to now: «сегодня, 8:40», «вчера, 22:15», «16 окт», «16 окт 2025» */
export function formatMoment(t: number, now: number): string {
  const word = dayWord(daysBetween(dayKey(now), dayKey(t)))
  return word ? `${word}, ${clock(t)}` : formatDayShort(t, now)
}

/** Only the day: «сегодня», «вчера», «16 окт», «16 окт 2025» (Корзина: «удалено вчера») */
export function formatDayShort(t: number, now: number): string {
  const word = dayWord(daysBetween(dayKey(now), dayKey(t)))
  if (word) return word
  const d = new Date(t)
  const dm = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  return d.getFullYear() === new Date(now).getFullYear() ? dm : `${dm} ${d.getFullYear()}`
}

/** «Добавлено» is the moment only, never where from (main flow, item 13): «сегодня, 16:03», «вчера, 22:15», «16 окт» */
export function formatAdded(at: number, now: number): string {
  return formatMoment(at, now)
}
