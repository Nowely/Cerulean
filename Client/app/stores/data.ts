// Everything the user has, in memory, written through to IndexedDB on every change
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Entry, Id, Page, Rec, Section, Settings, TemplateKey } from '~/domain/types'
import type { Learned } from '~/domain/rules'
import type { Snapshot } from '~/domain/export'
import type { Hit } from '~/domain/search'
import { Storage, type Kind } from '~/db/idb'
import { DEFAULT_SETTINGS, newPage, newRecord, newSection } from '~/domain/factory'
import { demo, firstRun, recentPages, type Dataset } from '~/domain/seed'
import { learn } from '~/domain/rules'
import { topOrder } from '~/domain/views'
import { applyTemplate, TEMPLATES } from '~/domain/templates'

const TRASH_DAYS = 30

export const useDataStore = defineStore('data', () => {
  const pages = ref<Record<Id, Page>>({})
  const records = ref<Record<Id, Rec>>({})
  const sections = ref<Record<Id, Section>>({})
  const entries = ref<Entry[]>([])
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
  const learned = ref<Learned>({})
  const ready = ref(false)
  /** Set when the browser refused storage (private mode, full disk): the app keeps working in memory */
  const storageError = ref<string | null>(null)
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
  /** «Недавнее»: pages without a section and outside Избранное, newest first by creation (a list you aim at must not reorder) */
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
    void storage.value?.put(kind, value)
  }

  function saveMeta(key: string, value: unknown) {
    void storage.value?.setMeta(key, value)
  }

  function apply(data: Dataset) {
    pages.value = Object.fromEntries(data.pages.map(p => [p.id, p]))
    records.value = Object.fromEntries(data.records.map(r => [r.id, r]))
    sections.value = Object.fromEntries(data.sections.map(s => [s.id, s]))
    entries.value = [...data.entries].sort((a, b) => a.at - b.at)
  }

  async function init(opts: { demo?: boolean, dbName?: string } = {}) {
    try {
      storage.value = await Storage.open(opts.dbName, (e) => {
        storageError.value = e instanceof Error ? e.message : String(e)
      })
      const loaded = await storage.value.load()
      settings.value = { ...DEFAULT_SETTINGS, ...(loaded.meta.get('settings') as Partial<Settings> | undefined) }
      learned.value = (loaded.meta.get('learned') as Learned | undefined) ?? {}
      if (loaded.pages.length) {
        apply(loaded)
        purgeOld()
      } else {
        const data = opts.demo ? demo() : firstRun()
        apply(data)
        await storage.value.replaceAll(data, new Map<string, unknown>([['settings', settings.value]]))
      }
    } catch (e) {
      storageError.value = e instanceof Error ? e.message : String(e)
      apply(opts.demo ? demo() : firstRun())
    }
    ready.value = true
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

  /** A page made from a starter (icon, description, views, «Готово»); without a section it lands in «Недавнее» */
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

  // records

  function addRecord(init: Partial<Rec> & Pick<Rec, 'pageId' | 'text'>): Rec {
    const siblings = init.parentId ? subitemsOf(init.parentId) : recordsOf(init.pageId)
    // Subitems go to the end, records of a page on top
    const order = init.parentId ? siblings.reduce((m, r) => Math.max(m, r.order), -1) + 1 : topOrder(siblings)
    const rec = newRecord({ order, ...init })
    records.value[rec.id] = rec
    save('records', rec)
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
    updateRecord(id, rec.done ? { done: false, doneAt: undefined } : { done: true, doneAt: Date.now() })
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
    void storage.value?.delete('records', [...all])
  }

  function purgePages(ids: Id[]) {
    const recs = Object.values(records.value).filter(r => ids.includes(r.pageId)).map(r => r.id)
    for (const id of ids) delete pages.value[id]
    void storage.value?.delete('pages', ids)
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

  function createSection(name: string): Section {
    const s = newSection(name, sectionList.value.length)
    sections.value[s.id] = s
    save('sections', s)
    return sections.value[s.id]!
  }

  function updateSection(id: Id, patch: Partial<Section>) {
    const s = sections.value[id]
    if (!s) return
    Object.assign(s, patch)
    save('sections', s)
  }

  /** Deleting a section keeps its pages: they move to «Недавнее» (pages without a section) */
  function removeSection(id: Id) {
    for (const p of livePages.value.filter(p => p.sectionId === id)) updatePage(p.id, { sectionId: null })
    delete sections.value[id]
    void storage.value?.delete('sections', [id])
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
    const { provider: _p, apiKey: _key, baseUrl: _url, modelId: _model, keyState: _state, ...rest } = settings.value
    return {
      pages: Object.values(pages.value),
      records: Object.values(records.value),
      sections: Object.values(sections.value),
      entries: entries.value,
      settings: rest,
      learned: learned.value
    }
  }

  async function replaceAll(data: Dataset, keep: Partial<Settings> = {}) {
    apply(data)
    learned.value = {}
    settings.value = { ...DEFAULT_SETTINGS, ...keep }
    await storage.value?.replaceAll(data, new Map<string, unknown>([['settings', settings.value]]))
  }

  /** Import replaces everything; the connection to the model stays, it is never in a file */
  async function importSnapshot(s: Snapshot) {
    const { provider, apiKey, baseUrl, modelId, keyState } = settings.value
    await replaceAll(s, { ...s.settings, provider, apiKey, baseUrl, modelId, keyState })
    learned.value = s.learned
    saveMeta('learned', learned.value)
  }

  /** «Удалить всё»: back to the first run, the key goes too */
  async function wipe() {
    await replaceAll(firstRun())
  }

  return {
    pages, records, sections, entries, settings, learned, ready, storageError,
    livePages, liveRecords, inbox, clarify, sectionList, recentlyMade, favorites, trash, recent,
    recordsOf, subitemsOf, linksOf, placeOf,
    init, setSettings, toggleFolded,
    createPage, createFromTemplate, createNamed, updatePage, removePage, restorePage, visitPage, toggleFavorite,
    addRecord, updateRecord, toggleLink, toggleDone, moveRecords, removeRecords, restoreRecords, purgeRecords, purgePages, emptyTrash,
    createSection, updateSection, removeSection,
    addEntry, updateEntry,
    snapshot, importSnapshot, wipe,
    flush: () => storage.value?.flush() ?? Promise.resolve()
  }
})
