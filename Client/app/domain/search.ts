// Поиск: pages and records by text; recent groups when nothing is typed; answers to a question in Журнал
import type { Id, Page, Rec } from './types'
import { addDays, dayKey } from './dates'
import { fold, stems } from './text'

export type Hit = { kind: 'page', page: Page } | { kind: 'record', rec: Rec }

export interface SearchOptions {
  /** «Только названия»: skip notes */
  titlesOnly: boolean
  /** One section, or every section */
  sectionId: Id | null
}

const QUESTION_STEMS = new Set(['когда', 'где', 'сколько', 'какой', 'какая', 'какие', 'какое', 'зачем', 'почему', 'менять', 'нужно', 'надо', 'есть', 'было', 'была', 'были'].map(w => w.slice(0, 5)))

export function search(q: string, pages: Page[], records: Rec[], opts: SearchOptions): Hit[] {
  const f = fold(q.trim())
  if (!f) return []
  const inSection = (pageId: Id) => !opts.sectionId || pages.find(p => p.id === pageId)?.sectionId === opts.sectionId
  const pageHits: Hit[] = pages
    .filter(p => fold(p.title).includes(f) && inSection(p.id))
    .sort((a, b) => b.openedAt - a.openedAt)
    .map(page => ({ kind: 'page', page }))
  const recHits: Hit[] = records
    .filter(r => (fold(r.text).includes(f) || (!opts.titlesOnly && fold(r.note).includes(f))) && inSection(r.pageId))
    .sort((a, b) => Number(fold(b.text).startsWith(f)) - Number(fold(a.text).startsWith(f)) || Number(a.done) - Number(b.done) || b.addedAt - a.addedAt)
    .map(rec => ({ kind: 'record', rec }))
  return [...pageHits, ...recHits]
}

export interface RecentGroup {
  label: string
  hits: Hit[]
}

/** «Открыто сегодня», «На этой неделе», «Раньше» («Сегодня» alone would read as the page) */
export function recent(pages: Page[], records: Rec[], now: number, limit = 12): RecentGroup[] {
  const today = dayKey(now)
  const weekAgo = addDays(today, -6)
  const items = [
    ...pages.filter(p => p.openedAt > 0).map(page => ({ at: page.openedAt, hit: { kind: 'page', page } as Hit })),
    ...records.filter(r => (r.openedAt ?? 0) > 0).map(rec => ({ at: rec.openedAt!, hit: { kind: 'record', rec } as Hit }))
  ].sort((a, b) => b.at - a.at).slice(0, limit)
  const groups: RecentGroup[] = [
    { label: 'Открыто сегодня', hits: [] },
    { label: 'На этой неделе', hits: [] },
    { label: 'Раньше', hits: [] }
  ]
  for (const { at, hit } of items) {
    const d = dayKey(at)
    groups[d === today ? 0 : d >= weekAgo ? 1 : 2]!.hits.push(hit)
  }
  return groups.filter(g => g.hits.length)
}

/** Records that answer a question: «когда менять фильтр воды?» finds «Поменять фильтр воды» */
export function answer(question: string, records: Rec[], limit = 5): Rec[] {
  const words = stems(question).filter(s => !QUESTION_STEMS.has(s))
  if (!words.length) return []
  return records
    .map((r) => {
      const own = new Set(stems(`${r.text} ${r.note}`))
      return { r, n: words.filter(w => own.has(w)).length }
    })
    .filter(x => x.n > 0 && x.n >= Math.ceil(words.length / 2))
    .sort((a, b) => b.n - a.n || Number(a.r.done) - Number(b.r.done) || b.r.addedAt - a.r.addedAt)
    .slice(0, limit)
    .map(x => x.r)
}

/** Поиск on a phone without a query: the records added last, with their path (recent pages would repeat Главная) */
export function lastAdded(records: Rec[], limit = 6): Rec[] {
  return records
    .filter(r => !r.parentId && !r.done)
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, limit)
}
