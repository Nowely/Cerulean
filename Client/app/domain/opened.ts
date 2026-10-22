// «Открыто недавно» (v24, item 16; Josh 21 Oct 06:45, overrules v20's «Недавние записи»): Поиск and Найти without a query
// list the six things opened last, pages and records together, newest first, each once. The list is about this browser, not
// the data, so it is kept with the browser's UI state (composables/useOpened), never in IndexedDB or a copy.
import type { Id, Page, Rec } from './types'
import type { Hit } from './search'

export interface Opened {
  kind: 'page' | 'record'
  id: Id
}

/** How many are kept: more than shown, so a section filter or a deletion still leaves six */
export const OPENED_KEPT = 12

/** Opened again: on top, without a repeat */
export function touchOpened(list: Opened[], item: Opened, limit = OPENED_KEPT): Opened[] {
  return [item, ...list.filter(x => x.kind !== item.kind || x.id !== item.id)].slice(0, limit)
}

/** What Поиск shows: the newest that still exist, narrowed to a section like any result (Сегодня is not searched) */
export function openedHits(list: Opened[], pages: Record<Id, Page>, records: Record<Id, Rec>, sectionId: Id | null, limit = 6): Hit[] {
  const out: Hit[] = []
  const livePage = (id: Id | undefined) => {
    const p = id ? pages[id] : undefined
    return p && !p.deletedAt ? p : undefined
  }
  for (const x of list) {
    if (out.length >= limit) break
    if (x.kind === 'page') {
      const page = livePage(x.id)
      if (page && page.kind !== 'today' && (!sectionId || page.sectionId === sectionId)) out.push({ kind: 'page', page })
    } else {
      const rec = records[x.id]
      const page = livePage(rec?.pageId)
      if (rec && !rec.deletedAt && page && (!sectionId || page.sectionId === sectionId)) out.push({ kind: 'record', rec })
    }
  }
  return out
}

/** Before anything is opened in this browser: the pages by when they were last opened */
export function openedFromPages(pages: Page[], limit = 6): Opened[] {
  return pages.filter(p => !p.deletedAt && p.kind !== 'today' && p.openedAt > 0)
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, limit)
    .map(p => ({ kind: 'page', id: p.id }))
}

/** The demo's history (spec «Demo data», v24): a record, a page, a record, two pages, a record */
const DEMO: [kind: Opened['kind'], name: string][] = [
  ['record', 'Яйца'], ['page', 'Задачи'], ['record', 'Вернуть книгу в библиотеку'], ['page', 'Дела по дому'],
  ['record', 'Полумарафон к маю'], ['record', 'Атомные привычки']
]

export function demoOpened(pages: Page[], records: Rec[]): Opened[] {
  return DEMO.flatMap(([kind, name]): Opened[] => {
    const x = kind === 'page'
      ? pages.find(p => p.title === name && !p.deletedAt)
      : records.find(r => r.text === name && !r.parentId && !r.deletedAt)
    return x ? [{ kind, id: x.id }] : []
  })
}
