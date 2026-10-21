// The page picker's list (one for «Ещё…», «Переместить», «Не туда» and the composer chip). Without a query: Авто's
// guesses, «Открыто недавно», then every section with the pages not shown yet, «Системные» last. Every page shows
// once (v22, U8, B31): the page the records are on keeps its place in its section, never among the guesses or the
// recent, so it is marked once. With a query: «Найдено».
import type { Id, Page, Section } from './types'
import { fold } from './text'

export interface PickGroup {
  label: string
  pages: Page[]
  /** Rows name their section on the right (mixed groups: guesses, recent, found) */
  where: boolean
}

export interface PickerInput {
  /** Live pages, in their order */
  pages: Page[]
  /** User sections, in their order */
  sections: Section[]
  query?: string
  /** «Похоже на»: Авто's guesses, best first */
  guesses?: Id[]
  /** Pages a top row stands for already («Эта страница»): left out of the list without a query */
  skip?: Id[]
  /** The page the records are on: shown once, in its section */
  current?: Id
}

const GUESSES = 3
const RECENT = 3

/** Pages a record can go to: user pages and Входящие (Сегодня has no records of its own) */
export const choosable = (pages: Page[]) => pages.filter(p => !p.deletedAt && (p.kind === 'page' || p.kind === 'inbox'))

export function pickerGroups(o: PickerInput): PickGroup[] {
  const pages = choosable(o.pages)
  const query = fold(o.query?.trim() ?? '')
  if (query) {
    const found = pages.filter(p => fold(p.title).includes(query))
    return found.length ? [{ label: 'Найдено', pages: found, where: true }] : []
  }
  const shown = new Set<Id>(o.skip ?? [])
  const take = (list: Page[]) => {
    for (const p of list) shown.add(p.id)
    return list
  }
  const free = (p: Page) => !shown.has(p.id) && p.id !== o.current
  const byId = new Map(pages.map(p => [p.id, p]))
  const out: PickGroup[] = []

  const guesses = take((o.guesses ?? []).map(id => byId.get(id)).filter((p): p is Page => !!p && p.kind === 'page' && free(p))
    .filter((p, i, a) => a.indexOf(p) === i).slice(0, GUESSES))
  if (guesses.length) out.push({ label: 'Похоже на', pages: guesses, where: true })

  const opened = take(pages.filter(p => p.kind === 'page' && free(p)).sort((a, b) => b.openedAt - a.openedAt).slice(0, RECENT))
  if (opened.length) out.push({ label: 'Открыто недавно', pages: opened, where: true })

  const known = new Set(o.sections.map(s => s.id))
  const own = (p: Page) => p.kind === 'page' && !shown.has(p.id)
  // Pages without a section, newest first by creation, as on Главная
  const loose = take(pages.filter(p => own(p) && (!p.sectionId || !known.has(p.sectionId))).sort((a, b) => b.createdAt - a.createdAt))
  if (loose.length) out.push({ label: 'Мои страницы', pages: loose, where: false })
  for (const s of o.sections) {
    const list = take(pages.filter(p => own(p) && p.sectionId === s.id))
    if (list.length) out.push({ label: s.name, pages: list, where: false })
  }
  const system = take(pages.filter(p => p.kind === 'inbox' && !shown.has(p.id)))
  if (system.length) out.push({ label: 'Системные', pages: system, where: false })
  return out
}
