// «Открыто недавно» (v24, item 16), kept per browser in localStorage beside the theme: opening a page from anywhere, or a
// record on its page or in the preview, puts it on top. A private window or blocked storage keeps it for the session only.
import { ref, watch } from 'vue'
import { useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { usePeek } from '~/composables/usePeek'
import type { Id } from '~/domain/types'
import { demoOpened, openedFromPages, touchOpened, type Opened } from '~/domain/opened'

const KEY = 'cerulean:opened'
const list = ref<Opened[]>([])
let loaded = false

function read(): Opened[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) as unknown : null
    return Array.isArray(v) ? v.filter((x): x is Opened => !!x && (x.kind === 'page' || x.kind === 'record') && typeof x.id === 'string') : null
  } catch {
    return null
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.value))
  } catch {
    // no storage here: the list lives as long as the tab
  }
}

/** The list, newest first, and how to put something on top */
export function useOpened() {
  return {
    list,
    touch(item: Opened) {
      list.value = touchOpened(list.value, item)
      write()
    }
  }
}

/** The page opened last in this browser, beside the opened list: a UI preference like the theme, read with a default */
const LAST = 'cerulean:last-page'

function lastPage(): Id | null {
  try {
    return localStorage.getItem(LAST)
  } catch {
    return null
  }
}

function keepLast(id: Id) {
  try {
    localStorage.setItem(LAST, id)
  } catch {
    // no storage here: `/` opens the first-run page
  }
}

/**
 * What a computer opens on the right at `/` (computer delta, item 2): the page opened last; Входящие when that page is
 * gone; on a first run, with nothing opened yet, «Быстрый старт» (Notion opens «Getting Started»), else Входящие
 */
export function startPage(): Id {
  const data = useDataStore()
  const last = lastPage()
  if (last) {
    const p = data.pages[last]
    return p && !p.deletedAt ? p.id : data.inbox.id
  }
  const start = data.livePages.find(p => p.title === 'Быстрый старт' && data.liveRecords.some(r => r.pageId === p.id && r.seed))
  return start?.id ?? data.inbox.id
}

/**
 * The shell follows what is opened. The first time in this browser the list starts from the pages' last visits, or with
 * the demo's history when the app was opened with the demo
 */
export function useOpenedTracking() {
  const route = useRoute()
  const data = useDataStore()
  const peek = usePeek()
  const opened = useOpened()
  if (!loaded) {
    loaded = true
    const kept = read()
    list.value = kept ?? (route.query.demo !== undefined
      ? demoOpened(data.livePages, data.liveRecords)
      : openedFromPages(data.livePages))
    if (!kept) write()
  }
  watch(() => route.path, (path) => {
    const m = /^\/(p|r)\/([^/]+)/.exec(path)
    if (m && data[m[1] === 'p' ? 'pages' : 'records'][m[2]!]) opened.touch({ kind: m[1] === 'p' ? 'page' : 'record', id: m[2]! })
    if (m?.[1] === 'p' && data.pages[m[2]!]) keepLast(m[2]!)
  }, { immediate: true })
  watch(() => peek.target.value, (t) => {
    if (t && (t.kind === 'page' ? data.pages[t.id] : data.records[t.id])) opened.touch(t)
  }, { immediate: true })
}
