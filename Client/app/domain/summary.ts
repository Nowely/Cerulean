// One line per page: «6 купить · хлеб, молоко, сыр +3», and the badge on the title line
import type { Page, Rec } from './types'
import { addDays, dayKey, formatDueBrief } from './dates'
import { count, lowerFirst, plural } from './text'
import { filterRecords, sortRecords } from './views'
import { collectLead, collected, firstCollects } from './collect'

export interface Summary {
  /** Counter or sentence: «6 купить», «3 из 6», «Всё сделано» */
  lead: string
  /** First records, lower case: «хлеб, молоко, сыр». Truncates on screen, `more` stays visible. */
  names: string
  more: number
  /**
   * The names on offer one by one and how many there are in all (v24 fixes, 9): Главная fits whole names to its
   * column (`fitNames`), so «+N» counts what it leaves out
   */
  list?: string[]
  total?: number
}

export interface Badge {
  text: string
  /** `new` is not a word on screen but a 6px dot after the name; the text stays for screen readers */
  tone: 'warn' | 'accent' | 'new'
}

const DEAL: [string, string, string] = ['дело', 'дела', 'дел']
const NEW: [string, string, string] = ['новая', 'новых', 'новых']
const ENDING: [string, string, string] = ['заканчивается', 'заканчиваются', 'заканчиваются']

const open = (records: Rec[]) => records.filter(r => !r.done)

function nameOf(rec: Rec, page: Page): string {
  return page.titles ? `«${rec.text}»` : lowerFirst(rec.text)
}

function names(records: Rec[], page: Page, k = 3): Pick<Summary, 'names' | 'more' | 'list' | 'total'> {
  const list = records.slice(0, k).map(r => nameOf(r, page))
  return { names: list.join(', '), more: Math.max(0, records.length - k), list, total: records.length }
}

export function overdue(records: Rec[], now: number): Rec[] {
  const today = dayKey(now)
  return records.filter(r => !r.done && r.due && r.due.date < today)
}

/**
 * «На неделе» on Сегодня (v23, B4): open records due in the six days after today, by date, so each weekday names
 * one date (and rows ticked there since `since`)
 */
export function dueThisWeek(records: Rec[], now: number, since = Number.POSITIVE_INFINITY): Rec[] {
  const today = dayKey(now)
  const last = addDays(today, 6)
  return sortRecords(records.filter(r => (!r.done || (r.tickedAt ?? 0) >= since) && r.due && r.due.date > today && r.due.date <= last), 'due')
}

/** Open records due today or earlier, from every page: what «Сегодня» shows (and rows ticked there since `since`) */
export function dueToday(records: Rec[], now: number, since = Number.POSITIVE_INFINITY): Rec[] {
  const today = dayKey(now)
  return sortRecords(records.filter(r => (!r.done || (r.tickedAt ?? 0) >= since) && r.due && r.due.date <= today), 'due')
}

/** Records the first view shows, in its order: the counter and the names come from here */
function firstView(page: Page, records: Rec[]): Rec[] {
  const view = page.views[0]
  return view ? sortRecords(filterRecords(records, view), view.sort) : records
}

/**
 * What needs action comes first (v23, B1): overdue, then due today, then new since the page was last opened, then
 * the rest in the order given. Names only: the overdue word stays where «once per screen» puts it
 */
export function byAction(records: Rec[], now: number, seenAt = Number.POSITIVE_INFINITY): Rec[] {
  const today = dayKey(now)
  const rank = (r: Rec) => r.done ? 4 : r.due && r.due.date < today ? 0 : r.due?.date === today ? 1 : r.addedAt > seenAt ? 2 : 3
  return records.map((r, i) => ({ r, i, k: rank(r) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.r)
}

/** Number properties below their «Норма» */
export function lowStock(page: Page, records: Rec[]): Rec[] {
  const pairs = page.props.filter(p => p.type === 'number' && p.normProp)
  return records.filter(r => pairs.some((p) => {
    const v = r.values[p.id]
    const n = r.values[p.normProp!]
    return typeof v === 'number' && typeof n === 'number' && v < n
  }))
}

/**
 * Records of a page are its top-level, live records; `today` is every live record, for «Сегодня» and for a page whose
 * first view collects (v24: its summary is made of what it collects)
 */
export function pageSummary(page: Page, records: Rec[], now: number, today: Rec[] = []): Summary {
  if (page.kind === 'today') {
    const due = dueToday(today, now)
    if (!due.length) return { lead: 'Пока ничего на сегодня', names: '', more: 0 }
    // The formula of every row, what needs action first (v24 fixes, 10); «со всех страниц» stays on the page's own line
    return { lead: count(due.length, DEAL), ...names(byAction(due, now), page) }
  }
  if (firstCollects(page)) {
    const rows = collected(page.views[0]!, today, now)
    if (!rows.length) return { lead: 'Нет записей', names: '', more: 0 }
    return { lead: count(rows.length, page.noun), ...names(byAction(rows, now), page) }
  }
  if (page.kind === 'inbox') {
    const left = open(records)
    if (!left.length) return { lead: 'Сюда попадает то, что не удалось разложить', names: '', more: 0 }
    // In the page's own order, the newest on top, as Входящие lists them
    return { lead: '', ...names(byAction(sortRecords(left, 'manual'), now, page.seenAt), page, 2) }
  }
  if (!records.length) {
    return { lead: page.title.trim() ? 'Нет записей' : 'Новая страница', names: '', more: 0 }
  }
  if (page.hasDone) {
    const shown = firstView(page, records)
    if (!open(records).length) return { lead: 'Всё сделано', names: '', more: 0 }
    return { lead: count(shown.length, page.noun), ...names(byAction(shown, now, page.seenAt), page) }
  }
  const all = sortRecords(records, 'manual')
  return { lead: count(all.length, page.noun), ...names(byAction(all, now, page.seenAt), page) }
}

/** A record shown as a page (Полумарафон к маю): «3 из 6 · дальше пробежка 6 км, 19:00» */
export function recordSummary(subitems: Rec[], now: number): Summary {
  if (!subitems.length) return { lead: 'Нет подпунктов', names: '', more: 0 }
  const done = subitems.filter(s => s.done).length
  // «дальше» names what needs action first, as the page summaries do (v23, B1)
  const next = byAction(sortRecords(open(subitems), 'manual'), now)[0]
  if (!next) return { lead: `${done} из ${subitems.length}`, names: 'всё сделано', more: 0 }
  const when = next.due ? `, ${formatDueBrief(next.due, now)}` : ''
  return { lead: `${done} из ${subitems.length}`, names: `дальше ${lowerFirst(next.text)}${when}`, more: 0 }
}

export function summaryText(s: Summary): string {
  const tail = s.names + (s.more ? ` +${s.more}` : '')
  return [s.lead, tail].filter(Boolean).join(' · ')
}

/**
 * One badge at most, by priority: overdue, then «уточнить», then new since the last visit.
 * `late: false`: Сегодня is on screen and says «просрочено» for every page, so this one leaves it out
 */
export function pageBadge(page: Page, records: Rec[], now: number, today: Rec[] = [], opts: { late?: boolean } = {}): Badge | null {
  // A collecting page never raises the overdue signal: that stays with Сегодня or the source page (v24)
  if (firstCollects(page)) return null
  const late = opts.late === false ? 0 : overdue(page.kind === 'today' ? today : records, now).length
  if (late) return { text: `${late} просрочено`, tone: 'warn' }
  const ask = records.filter(r => !r.done && r.tags.includes('clarify')).length
  if (ask) return { text: `${ask} уточнить`, tone: 'accent' }
  if (page.kind === 'today') return null
  const fresh = records.filter(r => !r.done && r.addedAt > page.seenAt).length
  if (fresh) return { text: `${fresh} ${plural(fresh, NEW)}`, tone: 'new' }
  return null
}

export function recordBadge(subitems: Rec[], now: number, opts: { late?: boolean } = {}): Badge | null {
  const late = opts.late === false ? 0 : overdue(subitems, now).length
  return late ? { text: `${late} просрочено`, tone: 'warn' } : null
}

/** The line under a page title: «6 купить · 2 заканчиваются», «3 дела · 1 просрочено», «2 уточнить» */
export function pageSubline(page: Page, records: Rec[], now: number, today: Rec[] = []): string {
  if (page.kind === 'today') {
    const due = dueToday(today, now)
    // Nothing today: no «0 дел», the page says it in its empty line (v23, M15)
    if (!due.length) return ''
    const late = overdue(due, now).length
    return [`${count(due.length, DEAL)} со всех страниц`, late ? `${late} просрочено` : ''].filter(Boolean).join(' · ')
  }
  if (page.kind === 'inbox') {
    const ask = records.filter(r => !r.done && r.tags.includes('clarify')).length
    return ask ? `${ask} уточнить` : 'Всё разложено'
  }
  if (firstCollects(page)) {
    const rows = collected(page.views[0]!, today, now)
    const late = overdue(rows, now).length
    return [collectLead(page, page.views[0]!, rows.length), late ? `${late} просрочено` : ''].filter(Boolean).join(' · ')
  }
  if (!records.length) return ''
  if (!page.hasDone) return count(records.length, page.noun)
  const shown = firstView(page, records)
  const low = lowStock(page, records).length
  const late = overdue(records, now).length
  return [
    count(shown.length, page.noun),
    low ? `${low} ${plural(low, ENDING)}` : '',
    late ? `${late} просрочено` : ''
  ].filter(Boolean).join(' · ')
}
