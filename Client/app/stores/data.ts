// Everything the user has, in memory, written through to IndexedDB on every change
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Entry, Id, Page, PropDef, PropType, Rec, Section, Settings, TemplateKey } from '~/domain/types'
import type { Learned } from '~/domain/rules'
import type { Hit } from '~/domain/search'
import { KINDS, plain, Storage, type Kind, type Touched } from '~/db/idb'
import { TabSync, type Change } from '~/db/sync'
import { mergeSnapshot, type Snapshot } from '~/domain/export'
import { DEFAULT_SETTINGS, newPage, newRecord, newSection } from '~/domain/factory'
import { demo, firstRun, recentPages, type Dataset } from '~/domain/seed'
import { learn } from '~/domain/rules'
import { topOrder } from '~/domain/views'
import { applyTemplate, TEMPLATES } from '~/domain/templates'
import { convertValues, hasValue, orderFromListed, propKeys, propList } from '~/domain/props'
import { uid } from '~/domain/ids'

const TRASH_DAYS = 30

/** A write the browser refused; see `writeFailed` */
export interface WriteFailure {
  at: number
  /** 'quota': the browser is out of space (QuotaExceededError); 'error': any other refused write */
  reason: 'quota' | 'error'
  /** What the refused writes were about, gathered until `clearWriteFailed()` */
  kinds: (Kind | 'meta')[]
  ids: Id[]
}

/** «Добавить к текущим»: what was added and what it changed, so that «Отменить» takes exactly that back */
export interface Added {
  pages: Id[]
  records: Id[]
  sections: Id[]
  /** Pages here as they were before they took properties from the file */
  before: Page[]
  learned: Learned
}

/** Fields that can change in another tab without anything to show on the record's page */
const QUIET_FIELDS = new Set(['openedAt', 'order'])

/** Same plain data, whatever the key order (a stored copy and Object.assign order keys differently) */
function same(a: unknown, b: unknown, top = false): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const x = a as Record<string, unknown>
  const y = b as Record<string, unknown>
  const keys = (o: Record<string, unknown>) => Object.keys(o).filter(k => o[k] !== undefined && !(top && QUIET_FIELDS.has(k)))
  const kx = keys(x)
  return kx.length === keys(y).length && kx.every(k => same(x[k], y[k]))
}

/** Another tab's version goes into the object already on screen, so whatever holds that object keeps it */
function refill<T extends object>(here: T, value: T) {
  for (const k of Object.keys(here)) if (!(k in value)) delete (here as Record<string, unknown>)[k]
  Object.assign(here, value)
}

function into<T extends { id: Id }>(map: Record<Id, T>, id: Id, value: T | undefined) {
  const here = map[id]
  if (!value) delete map[id]
  else if (here) refill(here, value)
  else map[id] = value
}

export const useDataStore = defineStore('data', () => {
  const pages = ref<Record<Id, Page>>({})
  const records = ref<Record<Id, Rec>>({})
  const sections = ref<Record<Id, Section>>({})
  const entries = ref<Entry[]>([])
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
  const learned = ref<Learned>({})
  const ready = ref(false)
  /** Set when the browser gives no storage at all (a private window, blocked site data): the app works in memory */
  const storageError = ref<string | null>(null)
  /**
   * Set when the browser refused a write (storage full, or any put that fails). Nothing is undone: memory and
   * the screen keep the change, and nothing is retried. The writing loop watches it: when `ids` holds a record
   * it has just written, the send did not keep, so it docks «Не сохранилось…», puts the text back in the composer
   * and calls `clearWriteFailed()` once that card goes. «Освободить место ›» opens `/settings#data`.
   * To try it in a browser, make `IDBObjectStore.prototype.put` throw a QuotaExceededError
   * (`scripts/checks/data.mjs`, `fillStorage`).
   */
  const writeFailed = ref<WriteFailure | null>(null)
  /** Whether the browser keeps the data when the disk runs short (`navigator.storage.persisted()`); null: it cannot say */
  const persisted = ref<boolean | null>(null)
  /** The record open on its own page here: a change to its fields from another tab waits for «Обновить» */
  const holding = ref<Id | null>(null)
  /** Another tab's version of the held record, until «Обновить» or until this tab writes the record itself */
  const waiting = ref<Record<Id, Rec>>({})
  const storage = shallowRef<Storage | null>(null)

  // ---------- reading ----------

  const livePages = computed(() => Object.values(pages.value).filter(p => !p.deletedAt).sort((a, b) => a.order - b.order))
  const liveIds = computed(() => new Set(livePages.value.map(p => p.id)))
  /** Live records whose page is live too */
  const liveRecords = computed(() => Object.values(records.value).filter(r => !r.deletedAt && liveIds.value.has(r.pageId)))

  const byPage = computed(() => {
    const map = new Map<Id, Rec[]>()
    for (const r of liveRecords.value) {
      if (r.parentId) continue
      const list = map.get(r.pageId) ?? []
      list.push(r)
      map.set(r.pageId, list)
    }
    return map
  })

  const byParent = computed(() => {
    const map = new Map<Id, Rec[]>()
    for (const r of liveRecords.value) {
      if (!r.parentId) continue
      const list = map.get(r.parentId) ?? []
      list.push(r)
      map.set(r.parentId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return map
  })

  const recordsOf = (pageId: Id) => byPage.value.get(pageId) ?? []
  const subitemsOf = (recId: Id) => byParent.value.get(recId) ?? []

  /** Records that link to a record, by the record they link to */
  const backlinks = computed(() => {
    const map = new Map<Id, Rec[]>()
    for (const r of liveRecords.value) {
      for (const id of r.links ?? []) {
        const list = map.get(id) ?? []
        list.push(r)
        map.set(id, list)
      }
    }
    return map
  })

  /** «Связано» of a record: what it links to, then what links to it; live things only, each once */
  function linksOf(recId: Id): Hit[] {
    const out: Hit[] = []
    const seen = new Set<Id>([recId])
    for (const id of records.value[recId]?.links ?? []) {
      if (seen.has(id)) continue
      const rec = records.value[id]
      const page = pages.value[id]
      if (rec && !rec.deletedAt && liveIds.value.has(rec.pageId)) out.push({ kind: 'record', rec })
      else if (page && !page.deletedAt) out.push({ kind: 'page', page })
      else continue
      seen.add(id)
    }
    for (const rec of backlinks.value.get(recId) ?? []) {
      if (seen.has(rec.id)) continue
      out.push({ kind: 'record', rec })
      seen.add(rec.id)
    }
    return out
  }

  const inbox = computed(() => livePages.value.find(p => p.kind === 'inbox')!)
  const clarify = computed(() => liveRecords.value.filter(r => r.tags.includes('clarify') && !r.done))
  const sectionList = computed(() => Object.values(sections.value).sort((a, b) => a.order - b.order))
  /** «Мои страницы»: pages without a section and outside Избранное, newest first by creation (a list you aim at must not reorder) */
  const recentlyMade = computed(() => livePages.value
    .filter(p => p.kind === 'page' && !p.sectionId && p.favorite === null)
    .sort((a, b) => b.createdAt - a.createdAt))

  /** Избранное: pages and records with a position */
  const favorites = computed(() => [
    ...livePages.value.filter(p => p.favorite !== null).map(page => ({ kind: 'page' as const, page, at: page.favorite! })),
    ...liveRecords.value.filter(r => r.favorite !== null).map(rec => ({ kind: 'record' as const, rec, at: rec.favorite! }))
  ].sort((a, b) => a.at - b.at))

  const trash = computed(() => [
    ...Object.values(pages.value).filter(p => p.deletedAt).map(page => ({ kind: 'page' as const, page, at: page.deletedAt! })),
    ...Object.values(records.value).filter(r => r.deletedAt && !r.parentId && liveIds.value.has(r.pageId)).map(rec => ({ kind: 'record' as const, rec, at: rec.deletedAt! }))
  ].sort((a, b) => b.at - a.at))

  const recent = computed(() => recentPages(entries.value))

  /** Where a record lives, for «в Задачи»: its page, or the record it is a subitem of */
  function placeOf(rec: Rec): { title: string, page: Page | undefined, parent: Rec | undefined } {
    const parent = rec.parentId ? records.value[rec.parentId] : undefined
    const page = pages.value[rec.pageId]
    return { title: parent?.text ?? page?.title ?? '', page, parent }
  }

  // ---------- writing ----------

  function save(kind: Kind, value: Page | Rec | Section | Entry) {
    if (kind === 'records') delete waiting.value[value.id] // this tab's write is the last one now
    void storage.value?.put(kind, value)
    tell(kind, [value.id])
  }

  function saveMany(kind: Kind, values: (Page | Rec | Section | Entry)[]) {
    if (!values.length) return
    void storage.value?.putMany(kind, values)
    tell(kind, values.map(v => v.id))
  }

  function drop(kind: Kind, ids: Id[]) {
    void storage.value?.delete(kind, ids)
    tell(kind, ids)
  }

  function saveMeta(key: string, value: unknown) {
    void storage.value?.setMeta(key, value)
    tell('meta', [key])
  }

  function failed(e: unknown, what: Touched) {
    console.error(e)
    const was = writeFailed.value
    const quota = /quota/i.test((e as { name?: string } | null)?.name ?? '')
    writeFailed.value = {
      at: Date.now(),
      reason: quota || was?.reason === 'quota' ? 'quota' : 'error',
      kinds: [...new Set([...(was?.kinds ?? []), ...what.kinds])],
      ids: [...new Set([...(was?.ids ?? []), ...what.ids])]
    }
  }

  function clearWriteFailed() {
    writeFailed.value = null
  }

  // ---------- other tabs ----------
  // Every write is announced once it is in IndexedDB; another tab reads the items back and puts them in place,
  // without writing them again. Last write wins per item, as within one tab.

  let sync: TabSync | null = null
  let outgoing: Change | null = null
  /** Counts this tab's writes; a read for another tab that started before a write here yields to it */
  let seq = 0
  const touched = new Map<string, number>()

  function tell(kind: Kind | 'meta', ids: Id[]) {
    seq++
    for (const id of ids) touched.set(`${kind}:${id}`, seq)
    if (!sync) return
    if (!outgoing) {
      const change: Change = outgoing = {}
      // One message per task, sent when the writes made in it are stored
      queueMicrotask(() => {
        outgoing = null
        void storage.value?.flush().then(() => sync?.post(change))
      })
    }
    outgoing[kind] = [...(outgoing[kind] ?? []), ...ids]
  }

  async function receive(change: Change) {
    const db = storage.value
    if (!db) return
    if (change.all) {
      const loaded = await db.load()
      apply(loaded)
      readMeta(loaded.meta)
      waiting.value = {}
      return
    }
    const start = seq
    const mine = (kind: Kind | 'meta', id: Id) => (touched.get(`${kind}:${id}`) ?? 0) > start
    for (const kind of KINDS) {
      const ids = change[kind]
      if (!ids?.length) continue
      const values = await db.getMany(kind, ids)
      ids.forEach((id, i) => {
        if (!mine(kind, id)) take(kind, id, values[i])
      })
    }
    const keys = change.meta?.filter(k => !mine('meta', k))
    if (keys?.length) {
      const values = await db.getMeta(keys)
      readMeta(new Map(keys.map((k, i) => [k, values[i]])))
    }
  }

  function take(kind: Kind, id: Id, value: Page | Rec | Section | Entry | undefined) {
    if (kind === 'pages') into(pages.value, id, value as Page | undefined)
    else if (kind === 'sections') into(sections.value, id, value as Section | undefined)
    else if (kind === 'records') {
      const rec = value as Rec | undefined
      const here = records.value[id]
      // The record open here waits; a version with no change to its fields goes in quietly
      if (id === holding.value && here && !(rec && same(here, rec, true))) {
        waiting.value[id] = rec ?? { ...here, deletedAt: Date.now() }
      } else {
        delete waiting.value[id]
        into(records.value, id, rec)
      }
    } else {
      const entry = value as Entry | undefined
      const here = entries.value.find(e => e.id === id)
      if (here && entry) refill(here, entry)
      else if (here) entries.value = entries.value.filter(e => e !== here)
      else if (entry) entries.value = [...entries.value, entry].sort((a, b) => a.at - b.at)
    }
  }

  function readMeta(meta: Map<string, unknown>) {
    if (meta.has('settings')) settings.value = { ...DEFAULT_SETTINGS, ...(meta.get('settings') as Partial<Settings> | undefined) }
    if (meta.has('learned')) learned.value = (meta.get('learned') as Learned | undefined) ?? {}
  }

  /** The record page holds its record while it is open; letting go takes in what waited */
  function hold(id: Id | null) {
    const was = holding.value
    holding.value = id
    if (was && was !== id) takeWaiting(was)
  }

  /** A record page that goes lets go of its record, unless the next page already holds another one */
  function release(id: Id) {
    if (holding.value === id) hold(null)
  }

  /** «Обновить»: the version from the other tab replaces the one on screen */
  function takeWaiting(id: Id) {
    const rec = waiting.value[id]
    if (!rec) return
    delete waiting.value[id]
    into(records.value, id, rec)
  }

  function apply(data: Dataset) {
    pages.value = Object.fromEntries(data.pages.map(p => [p.id, p]))
    records.value = Object.fromEntries(data.records.map(r => [r.id, r]))
    sections.value = Object.fromEntries(data.sections.map(s => [s.id, s]))
    entries.value = [...data.entries].sort((a, b) => a.at - b.at)
  }

  async function init(opts: { demo?: boolean, dbName?: string } = {}) {
    const name = opts.dbName ?? 'cerulean'
    try {
      storage.value = await Storage.open(name, failed)
      const loaded = await storage.value.load()
      settings.value = { ...DEFAULT_SETTINGS, ...(loaded.meta.get('settings') as Partial<Settings> | undefined) }
      learned.value = (loaded.meta.get('learned') as Learned | undefined) ?? {}
      if (loaded.pages.length) {
        apply(loaded)
        purgeOld()
      } else {
        const data = opts.demo ? demo() : firstRun()
        apply(data)
        // The copy reminder counts records from here
        settings.value = { ...settings.value, startedAt: Date.now() }
        await storage.value.replaceAll(data, new Map<string, unknown>([['settings', settings.value]]))
      }
      sync = new TabSync(name, change => void receive(change))
      void readPersisted()
    } catch (e) {
      storageError.value = e instanceof Error ? e.message : String(e)
      apply(opts.demo ? demo() : firstRun())
    }
    ready.value = true
  }

  // ---------- keeping data ----------

  async function readPersisted() {
    try {
      persisted.value = await navigator.storage.persisted()
    } catch {
      persisted.value = null // no StorageManager here (an old browser, a plain-http origin, tests)
    }
  }

  /** Asks the browser to keep the data when the disk runs short; most decide without asking the user */
  async function persist(): Promise<boolean | null> {
    try {
      persisted.value = await navigator.storage.persist()
    } catch {
      persisted.value = null
    }
    return persisted.value
  }

  function toggleFolded(key: string) {
    const folded = settings.value.folded
    setSettings({ folded: folded.includes(key) ? folded.filter(k => k !== key) : [...folded, key] })
  }

  function setSettings(patch: Partial<Settings>) {
    settings.value = { ...settings.value, ...patch }
    saveMeta('settings', settings.value)
  }

  // pages

  function createPage(init: Partial<Page> = {}): Page {
    const now = Date.now()
    const inSection = livePages.value.filter(p => p.sectionId === (init.sectionId ?? null))
    const page = newPage({ order: inSection.reduce((m, p) => Math.max(m, p.order), -1) + 1, ...init }, now)
    pages.value[page.id] = page
    save('pages', page)
    return pages.value[page.id]!
  }

  /** A page made from a starter (icon, description, views, «Готово»); without a section it lands in «Мои страницы» */
  function createFromTemplate(key: TemplateKey, init: Partial<Page> = {}): Page {
    const page = createPage({ title: '', ...init })
    updatePage(page.id, applyTemplate(page, key))
    return pages.value[page.id]!
  }

  /** «Новая страница «Покупки»»: a starter's name makes the page from that starter while there is none yet */
  function createNamed(title: string): Page {
    const t = TEMPLATES.find(x => x.name.toLowerCase() === title.trim().toLowerCase())
    if (t && !livePages.value.some(p => p.template === t.key)) return createFromTemplate(t.key)
    return createPage({ title })
  }

  function updatePage(id: Id, patch: Partial<Page>) {
    const page = pages.value[id]
    if (!page) return
    Object.assign(page, patch)
    save('pages', page)
  }

  function removePage(id: Id) {
    const page = pages.value[id]
    if (!page || page.kind === 'inbox') return
    updatePage(id, { deletedAt: Date.now(), favorite: null })
  }

  function restorePage(id: Id) {
    updatePage(id, { deletedAt: null })
  }

  /** Opening a page: «новых» count from now on; the previous moment is returned to highlight what is new */
  function visitPage(id: Id): number {
    const page = pages.value[id]
    if (!page) return 0
    const before = page.seenAt
    const now = Date.now()
    updatePage(id, { seenAt: now, openedAt: now })
    return before
  }

  function toggleFavorite(target: { kind: 'page', id: Id } | { kind: 'record', id: Id }) {
    const next = favorites.value.reduce((m, f) => Math.max(m, f.at), -1) + 1
    if (target.kind === 'page') {
      const page = pages.value[target.id]
      if (page) updatePage(page.id, { favorite: page.favorite === null ? next : null })
    } else {
      const rec = records.value[target.id]
      if (rec) updateRecord(rec.id, { favorite: rec.favorite === null ? next : null })
    }
  }

  // properties: one ordered list with Срок and Заметка (domain/props.ts). Renaming, colours, order and adding are
  // light and apply at once; what loses values (an option, a type change, the property) returns an undo that
  // brings back the property, its options and every value

  /** Every record of a page, in Корзина too, so a value comes back with a record restored later */
  const allOf = (pageId: Id) => Object.values(records.value).filter(r => r.pageId === pageId)

  /** How many records show a value of a property (or of one of its options) */
  function propUsage(pageId: Id, propIds: Id[], optionId?: Id): number {
    return liveRecords.value.filter(r => r.pageId === pageId && propIds.some(id => optionId ? r.values[id] === optionId : hasValue(r.values[id]))).length
  }

  /** The page's properties and views, and the values of `propIds`, as they are now; the result puts them back */
  function keepProps(pageId: Id, propIds: Id[]) {
    const page = pages.value[pageId]!
    const kept = JSON.parse(JSON.stringify({ props: page.props, views: page.views, propOrder: page.propOrder ?? null })) as Pick<Page, 'props' | 'views'> & { propOrder: Page['propOrder'] | null }
    const values = allOf(pageId).map(r => [r.id, Object.fromEntries(propIds.filter(id => id in r.values).map(id => [id, r.values[id]!]))] as const)
    return () => {
      updatePage(pageId, { props: kept.props, views: kept.views, propOrder: kept.propOrder ?? undefined })
      for (const [id, was] of values) {
        const rec = records.value[id]
        if (!rec) continue
        const next = { ...rec.values }
        for (const p of propIds) delete next[p]
        updateRecord(id, { values: { ...next, ...was } })
      }
    }
  }

  /** Sets (or with null drops) one property's value on many records */
  function setValues(propId: Id, values: Map<Id, Rec['values'][string]>) {
    for (const [id, v] of values) {
      const rec = records.value[id]
      if (!rec) continue
      const { [propId]: _old, ...rest } = rec.values
      updateRecord(id, { values: hasValue(v) ? { ...rest, [propId]: v } : rest })
    }
  }

  /** A new property goes after the page's own ones, before Срок and Заметка */
  function addProp(pageId: Id, init: Omit<PropDef, 'id'>): PropDef | null {
    const page = pages.value[pageId]
    if (!page) return null
    const prop: PropDef = { ...init, id: uid('f') }
    const next = { ...page, props: [...page.props, prop] }
    updatePage(pageId, { props: next.props, propOrder: propKeys(next) })
    return prop
  }

  /** Light edits: the name, the options (names, colours, order, a new empty one) */
  function updateProp(pageId: Id, propId: Id, patch: Partial<Omit<PropDef, 'id'>>) {
    const page = pages.value[pageId]
    if (!page) return
    updatePage(pageId, { props: page.props.map(p => p.id === propId ? { ...p, ...patch } : p) })
  }

  /** Reorders «Свойства», Срок and Заметка included; `to` is the place in the list as it shows (without «Норма») */
  function moveProp(pageId: Id, key: Id, to: number) {
    const page = pages.value[pageId]
    if (!page) return
    const listed = propList(page).map(p => p.key).filter(k => k !== key)
    listed.splice(Math.max(0, Math.min(to, listed.length)), 0, key)
    const order = orderFromListed(page, listed)
    // The page's own list follows, so groups and Доска columns read the same order
    const props = [...page.props].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    updatePage(pageId, { props, propOrder: order })
  }

  /** Deleting an option: records that had it lose the value */
  function removeOption(pageId: Id, propId: Id, optionId: Id) {
    const page = pages.value[pageId]
    const prop = page?.props.find(p => p.id === propId)
    if (!page || !prop) return null
    const undo = keepProps(pageId, [propId])
    const count = propUsage(pageId, [propId], optionId)
    updateProp(pageId, propId, { options: (prop.options ?? []).filter(o => o.id !== optionId) })
    setValues(propId, new Map(allOf(pageId).filter(r => r.values[propId] === optionId).map(r => [r.id, null])))
    return { count, undo }
  }

  /** A type change converts what it can; a grouping by a property that is no longer «Выбор» falls back to «Без групп» */
  function retypeProp(pageId: Id, propId: Id, type: PropType) {
    const page = pages.value[pageId]
    const prop = page?.props.find(p => p.id === propId)
    if (!page || !prop || prop.type === type) return null
    const undo = keepProps(pageId, [propId])
    const entries = allOf(pageId).map(r => [r.id, r.values[propId] ?? null] as [Id, Rec['values'][string]])
    const out = convertValues(prop, type, entries, Date.now(), () => uid('o'))
    updatePage(pageId, {
      props: page.props.map(p => p.id === propId ? out.prop : p),
      // A filter on one value no longer matches anything; «пусто» and «не пусто» still mean the same
      views: page.views.map(v => ({
        ...v,
        filter: v.filter.filter(f => f.field !== propId || f.op !== 'is'),
        groupBy: v.groupBy === propId && type !== 'select' ? null : v.groupBy
      }))
    })
    setValues(propId, out.values)
    const live = new Set(liveRecords.value.map(r => r.id))
    return { dropped: out.dropped.filter(id => live.has(id)).length, undo }
  }

  /** A property leaves with every value it had (a number takes its «Норма» along) and with its place in the views */
  function removeProp(pageId: Id, propId: Id) {
    const page = pages.value[pageId]
    const prop = page?.props.find(p => p.id === propId)
    if (!page || !prop) return null
    const ids = [propId, ...(prop.normProp ? [prop.normProp] : [])]
    const undo = keepProps(pageId, ids)
    const count = propUsage(pageId, ids)
    updatePage(pageId, {
      props: page.props.filter(p => !ids.includes(p.id)),
      propOrder: page.propOrder?.filter(k => !ids.includes(k)),
      views: page.views.map(v => ({
        ...v,
        shown: v.shown.filter(k => !ids.includes(k)),
        filter: v.filter.filter(f => !ids.includes(f.field)),
        groupBy: v.groupBy === propId ? null : v.groupBy
      }))
    })
    for (const id of ids) setValues(id, new Map(allOf(pageId).filter(r => id in r.values).map(r => [r.id, null])))
    return { count, undo }
  }

  // records

  function addRecord(init: Partial<Rec> & Pick<Rec, 'pageId' | 'text'>): Rec {
    const siblings = init.parentId ? subitemsOf(init.parentId) : recordsOf(init.pageId)
    // Subitems go to the end, records of a page on top
    const order = init.parentId ? siblings.reduce((m, r) => Math.max(m, r.order), -1) + 1 : topOrder(siblings)
    const rec = newRecord({ order, ...init })
    records.value[rec.id] = rec
    save('records', rec)
    // The first record is worth keeping: the browser is asked once, with no screen of ours around it
    if (!settings.value.persistAsked && storage.value) {
      setSettings({ persistAsked: true })
      void persist()
    }
    return records.value[rec.id]!
  }

  function updateRecord(id: Id, patch: Partial<Rec>) {
    const rec = records.value[id]
    if (!rec) return
    Object.assign(rec, patch)
    save('records', rec)
  }

  /** Links a record to a record or a page, or undoes the link from whichever side holds it */
  function toggleLink(recId: Id, targetId: Id) {
    const rec = records.value[recId]
    if (!rec || recId === targetId) return
    const other = records.value[targetId]
    if (rec.links?.includes(targetId)) updateRecord(recId, { links: rec.links.filter(id => id !== targetId) })
    else if (other?.links?.includes(recId)) updateRecord(targetId, { links: other.links.filter(id => id !== recId) })
    else updateRecord(recId, { links: [...(rec.links ?? []), targetId] })
  }

  function toggleDone(id: Id) {
    const rec = records.value[id]
    if (!rec) return
    const now = Date.now()
    updateRecord(id, rec.done ? { done: false, doneAt: undefined, tickedAt: now } : { done: true, doneAt: now, tickedAt: now })
  }

  /** Moves records to another page: the «уточнить» tag goes, values move by property name, Авто learns the words */
  function moveRecords(ids: Id[], pageId: Id, opts: { teach?: boolean } = {}) {
    const target = pages.value[pageId]
    if (!target) return
    const order = topOrder(recordsOf(pageId))
    ids.forEach((id, i) => {
      const rec = records.value[id]
      if (!rec) return
      const from = pages.value[rec.pageId]
      const values: Rec['values'] = {}
      for (const [propId, value] of Object.entries(rec.values)) {
        const prop = from?.props.find(p => p.id === propId)
        const to = prop && target.props.find(p => p.name === prop.name && p.type === prop.type)
        if (!prop || !to) continue
        if (prop.type === 'select') {
          const name = prop.options?.find(o => o.id === value)?.name
          const option = to.options?.find(o => o.name === name)
          if (option) values[to.id] = option.id
        } else {
          values[to.id] = value
        }
      }
      updateRecord(id, { pageId, values, order: order - ids.length + i + 1, tags: [], guesses: undefined, parentId: null })
      for (const sub of subitemsOf(id)) updateRecord(sub.id, { pageId })
      if (opts.teach !== false && target.kind === 'page') {
        learned.value = learn(learned.value, rec.text, pageId)
      }
    })
    saveMeta('learned', learned.value)
  }

  function removeRecords(ids: Id[]) {
    const now = Date.now()
    for (const id of ids) {
      updateRecord(id, { deletedAt: now })
      for (const sub of subitemsOf(id)) updateRecord(sub.id, { deletedAt: now })
    }
  }

  function restoreRecords(ids: Id[]) {
    for (const id of ids) {
      const rec = records.value[id]
      if (!rec) continue
      const at = rec.deletedAt
      updateRecord(id, { deletedAt: null })
      for (const sub of Object.values(records.value)) {
        if (sub.parentId === id && sub.deletedAt === at) updateRecord(sub.id, { deletedAt: null })
      }
    }
  }

  /** Gone for good: used by «Отменить» in a receipt and by emptying the trash */
  function purgeRecords(ids: Id[]) {
    const all = new Set(ids)
    for (const r of Object.values(records.value)) if (r.parentId && all.has(r.parentId)) all.add(r.id)
    for (const id of all) delete records.value[id]
    drop('records', [...all])
  }

  function purgePages(ids: Id[]) {
    const recs = Object.values(records.value).filter(r => ids.includes(r.pageId)).map(r => r.id)
    for (const id of ids) delete pages.value[id]
    drop('pages', ids)
    purgeRecords(recs)
  }

  function emptyTrash() {
    purgePages(Object.values(pages.value).filter(p => p.deletedAt).map(p => p.id))
    purgeRecords(Object.values(records.value).filter(r => r.deletedAt).map(r => r.id))
  }

  /** The trash keeps things for 30 days */
  function purgeOld() {
    const limit = Date.now() - TRASH_DAYS * 86400000
    purgePages(Object.values(pages.value).filter(p => p.deletedAt && p.deletedAt < limit).map(p => p.id))
    purgeRecords(Object.values(records.value).filter(r => r.deletedAt && r.deletedAt < limit).map(r => r.id))
  }

  // sections

  /** A new section goes last, or right under `after` (from a section's «⋯») */
  function createSection(name: string, after?: Id): Section {
    const list = sectionList.value
    const at = after ? list.findIndex(x => x.id === after) + 1 : list.length
    const made = newSection(name, at)
    sections.value[made.id] = made
    const s = sections.value[made.id]!
    renumber([...list.slice(0, at), s, ...list.slice(at)])
    save('sections', s)
    return s
  }

  /** «Изменить порядок»: one step up or down */
  function moveSection(id: Id, by: -1 | 1) {
    const list = [...sectionList.value]
    const i = list.findIndex(x => x.id === id)
    const j = i + by
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j]!, list[i]!]
    renumber(list)
  }

  function renumber(list: Section[]) {
    list.forEach((x, i) => {
      if (x.order === i) return
      x.order = i
      save('sections', x)
    })
  }

  function updateSection(id: Id, patch: Partial<Section>) {
    const s = sections.value[id]
    if (!s) return
    Object.assign(s, patch)
    save('sections', s)
  }

  /**
   * Deleting a section keeps its pages: they move to «Мои страницы» (pages without a section). Returns the pages
   * moved and «Отменить», which brings the section back in its place with those pages, in their order (v22, G12)
   */
  function removeSection(id: Id): { pages: Id[], undo: () => void } {
    const section = sections.value[id]
    const moved = livePages.value.filter(p => p.sectionId === id).map(p => p.id)
    if (!section) return { pages: [], undo: () => {} }
    const kept = { ...section }
    const at = sectionList.value.findIndex(x => x.id === id)
    for (const pageId of moved) updatePage(pageId, { sectionId: null })
    delete sections.value[id]
    drop('sections', [id])
    return {
      pages: moved,
      undo: () => {
        if (sections.value[id]) return
        sections.value[id] = kept
        const back = sections.value[id]!
        const list = sectionList.value.filter(x => x.id !== id)
        renumber([...list.slice(0, at), back, ...list.slice(at)])
        save('sections', back)
        // A page moved elsewhere meanwhile stays where it was put
        for (const pageId of moved) if (pages.value[pageId] && !pages.value[pageId].sectionId) updatePage(pageId, { sectionId: id })
      }
    }
  }

  // journal

  function addEntry(entry: Entry): Entry {
    entries.value.push(entry)
    save('entries', entry)
    return entries.value[entries.value.length - 1]!
  }

  function updateEntry(id: Id, patch: Partial<Entry>) {
    const e = entries.value.find(x => x.id === id)
    if (!e) return
    Object.assign(e, patch)
    save('entries', e)
  }

  // whole database

  function snapshot(): Omit<Snapshot, 'app' | 'version' | 'exportedAt'> {
    const {
      provider: _p, apiKey: _key, baseUrl: _url, modelId: _model, keyState: _state,
      copiedAt: _c, copyHiddenAt: _h, startedAt: _s, persistAsked: _a, ...rest
    } = settings.value
    return {
      pages: Object.values(pages.value),
      records: Object.values(records.value),
      sections: Object.values(sections.value),
      entries: entries.value,
      settings: rest,
      learned: learned.value
    }
  }

  /** How this browser keeps the data: it goes through an import and «Удалить всё» */
  function keeping(): Partial<Settings> {
    const { copiedAt, copyHiddenAt, startedAt, persistAsked } = settings.value
    return { copiedAt, copyHiddenAt, startedAt, persistAsked }
  }

  async function replaceAll(data: Dataset, keep: Partial<Settings> = {}, words: Learned = {}) {
    apply(data)
    learned.value = words
    settings.value = { ...DEFAULT_SETTINGS, ...keep }
    waiting.value = {}
    await storage.value?.replaceAll(data, new Map<string, unknown>([['settings', settings.value], ['learned', words]]))
    sync?.post({ all: true })
  }

  /** «Заменить всё»: the file replaces everything; the connection to the model stays, it is never in a file */
  async function importSnapshot(s: Snapshot) {
    const { provider, apiKey, baseUrl, modelId, keyState } = settings.value
    await replaceAll(s, { ...s.settings, provider, apiKey, baseUrl, modelId, keyState, ...keeping() }, s.learned)
  }

  /** «Добавить к текущим»: see `mergeSnapshot`; returns what «Отменить» needs */
  function addSnapshot(s: Snapshot): Added {
    const m = mergeSnapshot({
      pages: Object.values(pages.value),
      records: Object.values(records.value),
      sections: Object.values(sections.value),
      learned: learned.value
    }, s)
    const before = m.changed.map(p => plain(pages.value[p.id]!))
    for (const x of m.sections) sections.value[x.id] = x
    for (const p of m.pages) pages.value[p.id] = p
    for (const p of m.changed) into(pages.value, p.id, p)
    for (const r of m.records) records.value[r.id] = r
    saveMany('sections', m.sections)
    saveMany('pages', [...m.pages, ...m.changed].map(p => pages.value[p.id]!))
    saveMany('records', m.records)
    const words = learned.value
    if (Object.keys(m.learned).length) {
      learned.value = { ...m.learned, ...words }
      saveMeta('learned', learned.value)
    }
    return { pages: m.pages.map(p => p.id), records: m.records.map(r => r.id), sections: m.sections.map(x => x.id), before, learned: words }
  }

  /** «Отменить» after «Добавить к текущим»: exactly what was added goes, the pages it changed are as they were */
  function takeBack(a: Added) {
    purgeRecords(a.records)
    purgePages(a.pages)
    for (const id of a.sections) delete sections.value[id]
    if (a.sections.length) drop('sections', a.sections)
    for (const p of a.before) into(pages.value, p.id, p)
    saveMany('pages', a.before.map(p => pages.value[p.id]!))
    if (learned.value !== a.learned) {
      learned.value = a.learned
      saveMeta('learned', learned.value)
    }
  }

  /** «Удалить всё»: back to the first run, the key goes too */
  async function wipe() {
    await replaceAll(firstRun(), { ...keeping(), startedAt: Date.now() })
  }

  return {
    pages, records, sections, entries, settings, learned, ready, storageError, writeFailed, persisted, waiting,
    livePages, liveRecords, inbox, clarify, sectionList, recentlyMade, favorites, trash, recent,
    recordsOf, subitemsOf, linksOf, placeOf,
    init, setSettings, toggleFolded, clearWriteFailed, persist, hold, release, takeWaiting,
    createPage, createFromTemplate, createNamed, updatePage, removePage, restorePage, visitPage, toggleFavorite,
    propUsage, addProp, updateProp, moveProp, removeOption, retypeProp, removeProp,
    addRecord, updateRecord, toggleLink, toggleDone, moveRecords, removeRecords, restoreRecords, purgeRecords, purgePages, emptyTrash,
    createSection, updateSection, moveSection, removeSection,
    addEntry, updateEntry,
    snapshot, importSnapshot, addSnapshot, takeBack, wipe,
    flush: () => storage.value?.flush() ?? Promise.resolve()
  }
})
