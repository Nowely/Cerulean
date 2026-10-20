// One line per page: «6 купить · хлеб, молоко, сыр +3», and the badge on the title line
import type { Page, Rec } from './types'
import { dayKey, formatDueBrief } from './dates'
import { count, lowerFirst, plural } from './text'
import { filterRecords, sortRecords } from './views'

export interface Summary {
  /** Counter or sentence: «6 купить», «3 из 6», «Всё сделано» */
  lead: string
  /** First records, lower case: «хлеб, молоко, сыр». Truncates on screen, `more` stays visible. */
  names: string
  more: number
}

export interface Badge {
  text: string
  tone: 'warn' | 'accent' | 'neutral'
}

const DEAL: [string, string, string] = ['дело', 'дела', 'дел']
const NEW: [string, string, string] = ['новая', 'новых', 'новых']
const ENDING: [string, string, string] = ['заканчивается', 'заканчиваются', 'заканчиваются']

const open = (records: Rec[]) => records.filter(r => !r.done)

function nameOf(rec: Rec, page: Page): string {
  return page.titles ? `«${rec.text}»` : lowerFirst(rec.text)
}

function names(records: Rec[], page: Page, k = 3): Pick<Summary, 'names' | 'more'> {
  return { names: records.slice(0, k).map(r => nameOf(r, page)).join(', '), more: Math.max(0, records.length - k) }
}

export function overdue(records: Rec[], now: number): Rec[] {
  const today = dayKey(now)
  return records.filter(r => !r.done && r.due && r.due.date < today)
}

/** Open records due today or earlier, from every page: what «Сегодня» shows */
export function dueToday(records: Rec[], now: number): Rec[] {
  const today = dayKey(now)
  return sortRecords(records.filter(r => !r.done && r.due && r.due.date <= today), 'due')
}

/** Records the first view shows, in its order: the counter and the names come from here */
function firstView(page: Page, records: Rec[]): Rec[] {
  const view = page.views[0]
  return view ? sortRecords(filterRecords(records, view), view.sort) : records
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

/** Records of a page are its top-level, live records; `today` is every live record for «Сегодня» */
export function pageSummary(page: Page, records: Rec[], now: number, today: Rec[] = []): Summary {
  if (page.kind === 'today') {
    const due = dueToday(today, now)
    if (!due.length) return { lead: 'На сегодня ничего, всё со сроком появится здесь', names: '', more: 0 }
    return { lead: `${count(due.length, DEAL)} со всех страниц`, names: '', more: 0 }
  }
  if (page.kind === 'inbox') {
    const left = open(records)
    if (!left.length) return { lead: 'Сюда попадает то, что не удалось разложить', names: '', more: 0 }
    return { lead: '', ...names(left, page, 2) }
  }
  if (!records.length) {
    return { lead: page.title.trim() ? 'Нет записей. Пиши внизу, и они появятся здесь' : 'Новая страница', names: '', more: 0 }
  }
  if (page.hasDone) {
    const shown = firstView(page, records)
    if (!open(records).length) return { lead: 'Всё сделано', names: '', more: 0 }
    return { lead: count(shown.length, page.noun), ...names(shown, page) }
  }
  const all = sortRecords(records, 'manual')
  return { lead: count(all.length, page.noun), ...names(all, page) }
}

/** A record shown as a page (Полумарафон к маю): «3 из 6 · дальше пробежка 6 км, 19:00» */
export function recordSummary(subitems: Rec[], now: number): Summary {
  if (!subitems.length) return { lead: 'Нет подпунктов', names: '', more: 0 }
  const done = subitems.filter(s => s.done).length
  const next = sortRecords(open(subitems), 'manual')[0]
  if (!next) return { lead: `${done} из ${subitems.length}`, names: 'всё сделано', more: 0 }
  const when = next.due ? `, ${formatDueBrief(next.due, now)}` : ''
  return { lead: `${done} из ${subitems.length}`, names: `дальше ${lowerFirst(next.text)}${when}`, more: 0 }
}

export function summaryText(s: Summary): string {
  const tail = s.names + (s.more ? ` +${s.more}` : '')
  return [s.lead, tail].filter(Boolean).join(' · ')
}

/** One badge at most, by priority: overdue, then «уточнить», then new since the last visit */
export function pageBadge(page: Page, records: Rec[], now: number, today: Rec[] = []): Badge | null {
  const late = overdue(page.kind === 'today' ? today : records, now).length
  if (late) return { text: `${late} просрочено`, tone: 'warn' }
  const ask = records.filter(r => !r.done && r.tags.includes('clarify')).length
  if (ask) return { text: `${ask} уточнить`, tone: 'accent' }
  if (page.kind === 'today') return null
  const fresh = records.filter(r => !r.done && r.addedAt > page.seenAt).length
  if (fresh) return { text: `${fresh} ${plural(fresh, NEW)}`, tone: 'neutral' }
  return null
}

export function recordBadge(subitems: Rec[], now: number): Badge | null {
  const late = overdue(subitems, now).length
  return late ? { text: `${late} просрочено`, tone: 'warn' } : null
}

/** The line under a page title: «6 купить · 2 заканчиваются», «3 дела · 1 просрочено», «2 уточнить» */
export function pageSubline(page: Page, records: Rec[], now: number, today: Rec[] = []): string {
  if (page.kind === 'today') {
    const due = dueToday(today, now)
    const late = overdue(due, now).length
    return [`${count(due.length, DEAL)} со всех страниц`, late ? `${late} просрочено` : ''].filter(Boolean).join(' · ')
  }
  if (page.kind === 'inbox') {
    const ask = records.filter(r => !r.done && r.tags.includes('clarify')).length
    return ask ? `${ask} уточнить` : 'Всё разложено'
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
