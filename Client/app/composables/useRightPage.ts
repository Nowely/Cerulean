// What is open on a computer's right side (computer delta, items 3, 16): a page, or a record in place of the page it was
// opened from. «‹ <page>» and Esc go back to that page, and its card on the left stays marked.
import { computed } from 'vue'
import { useRoute } from '#imports'
import type { Id, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'

const PAGE = /^\/p\/([^/?#]+)/

/**
 * The page a record goes back to: the one it was opened from (Сегодня, a page that collects), read from the step before it
 * in history, else its own page
 */
export function useRecordFrom() {
  const route = useRoute()
  const data = useDataStore()
  return (rec: Rec | undefined): Page | undefined => {
    void route.fullPath // history.state changes with every navigation
    if (!rec) return undefined
    const prev = typeof window === 'undefined' ? null : window.history.state?.back
    const id = typeof prev === 'string' ? PAGE.exec(prev)?.[1] : undefined
    const from = id ? data.pages[id] : undefined
    return from && !from.deletedAt ? from : data.pages[rec.pageId]
  }
}

/**
 * The card on Главная marked open: the page on the right, or for a record the card of that record when it is a favourite
 * (a subitem's too), else the page the record goes back to
 */
export function useOpenCard() {
  const route = useRoute()
  const data = useDataStore()
  const from = useRecordFrom()
  return computed<Id | null>(() => {
    const m = /^\/(p|r)\/([^/]+)/.exec(route.path)
    if (!m) return null
    if (m[1] === 'p') return m[2]!
    const rec = data.records[m[2]!]
    const top = rec?.parentId ? data.records[rec.parentId] : rec
    if (top && data.favorites.some(f => f.kind === 'record' && f.rec.id === top.id)) return top.id
    return from(top)?.id ?? null
  })
}
