// One line per page. Главная's cards (main flow, item 17): what is in the page as content, «19:00 забрать посылку,
// завтра 10:00 позвонить маме», and how many are open; elsewhere «6 купить · хлеб, молоко, сыр +3» and a badge
import type { Due, Page, Rec } from './types'
import { addDays, dayKey, daysBetween, formatDueBrief, keyToDate } from './dates'
import { count, lowerFirst, plural } from './text'
import { filterRecords, sortRecords } from './views'
import { collectLead, collected, firstCollects } from './collect'
import { bodyOf, docText } from './body'

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
    return { lead: '', ...names(byAction(sortRecords(left, 'manual'), now, page.seenAt), page) }
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
    // Nothing to clarify: the count, as on any page; «Всё разложено» described an empty page (main flow, item 2)
    const ask = records.filter(r => !r.done && r.tags.includes('clarify')).length
    if (ask) return `${ask} уточнить`
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

// ---------- Главная's cards (main flow, items 10, 17) ----------

export interface CardLine {
  /** What is in the page, cut by the screen where it ends (never «+3»); a page of text shows its first line */
  line: string
  /** How many are open: the grey number on the right; null on a page of text or an empty page */
  open: number | null
  /** Records written from elsewhere since the page was last opened: the dot */
  isNew: boolean
  /** Сегодня keeps its warn signal in the number's place: «1 просрочено» */
  late: number
}

const SHORT_DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const SHORT_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** The day in front of a dated name: nothing for today, «завтра», a weekday within the week, else «21 окт» */
function dayWord(date: string, now: number): string {
  const diff = daysBetween(dayKey(now), date)
  if (diff === 0) return ''
  if (diff === 1) return 'завтра'
  if (diff === 2) return 'послезавтра'
  if (diff === -1) return 'вчера'
  const d = keyToDate(date)
  return Math.abs(diff) <= 6 ? SHORT_DAYS[d.getDay()]! : `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`
}

/** Dated records by day, a timed one before the untimed of its day; then the rest, newest first */
function cardOrder(records: Rec[]): Rec[] {
  const key = (due: Due) => {
    const [h, m] = (due.time ?? '').split(':').map(Number)
    return `${due.date} ${String(due.time ? h! * 60 + m! : 1500).padStart(4, '0')}`
  }
  return [...records].sort((a, b) => {
    if (a.due && b.due) return key(a.due) < key(b.due) ? -1 : key(a.due) > key(b.due) ? 1 : b.addedAt - a.addedAt
    if (a.due || b.due) return a.due ? -1 : 1
    return b.addedAt - a.addedAt
  })
}

/** A name as the card says it: lower case first, with its day and time when dated («завтра 10:00 позвонить маме») */
function cardName(rec: Rec, now: number): string {
  const name = lowerFirst(rec.text)
  if (!rec.due) return name
  const pre = [dayWord(rec.due.date, now), rec.due.time ?? ''].filter(Boolean).join(' ')
  return pre ? `${pre} ${name}` : name
}

/** A record is new on Главная while it was written from elsewhere after its page was last opened */
export function isNewRecord(rec: Rec, page: Page): boolean {
  return !rec.done && !rec.deletedAt && rec.via === 'chat' && rec.addedAt > page.seenAt
}

/**
 * A card's line (spec «Summary formula»): the open records' names, the dated ones first by day and time, then the
 * newest; how many are open; the dot. Сегодня is made of what is due today and overdue, from every page; a page of
 * text with no records shows its first line and no number; an empty page is its name alone
 */
export function cardLine(page: Page, records: Rec[], now: number, all: Rec[] = []): CardLine {
  if (page.kind === 'today') {
    const due = dueToday(all, now).filter(r => !r.done)
    return { line: cardOrder(due).map(r => cardName(r, now)).join(', '), open: due.length || null, isNew: false, late: overdue(due, now).length }
  }
  const own = records.filter(r => !r.parentId && !r.deletedAt)
  const list = firstCollects(page) ? collected(page.views[0]!, all, now) : own
  const open = list.filter(r => !r.done)
  const isNew = own.some(r => isNewRecord(r, page))
  if (!own.length && !firstCollects(page)) {
    const text = docText(bodyOf(page)).split('\n').find(l => l.trim())?.trim() ?? ''
    return { line: text, open: null, isNew, late: 0 }
  }
  return { line: cardOrder(open).map(r => cardName(r, now)).join(', '), open: open.length || null, isNew, late: 0 }
}
