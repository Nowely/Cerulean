// Sync through a bucket: the one file `cerulean/data.json` holds everything that syncs, and two sides (this browser
// and the file) merge into one. Every object carries `updatedAt`; per object the later version wins whole, with no
// field merge; a thing deleted for good stays as a tombstone that beats every older version of it.
import type { ConnectionField, Entry, Id, KeepingField, Page, Rec, Section, Settings } from './types'
import type { Learned } from './rules'
import { readPage } from './templates'
import { isEmptyDoc, remapMentions } from './body'
import { count, normalize, PAGE_FORMS, plural, RECORD_FORMS } from './text'
import { formatMoment } from './dates'

/** The file's format; a build that finds a higher one only reads (sync delta, item 14) */
export const FORMAT = 1
export const DATA_KEY = 'cerulean/data.json'
/** What «Подключить» writes and reads back; it is never deleted, so the bucket's rule needs no DELETE */
export const CHECK_KEY = 'cerulean/check.json'

export type SyncKind = 'pages' | 'records' | 'sections' | 'entries'
export const SYNC_KINDS: SyncKind[] = ['pages', 'records', 'sections', 'entries']
type Obj = Page | Rec | Section | Entry

/** Things deleted for good (purged), by kind and id: when */
export type Gone = Record<SyncKind, Record<Id, number>>
export const noneGone = (): Gone => ({ pages: {}, records: {}, sections: {}, entries: {} })

/** Settings that follow the person: all but the connection and this browser's keeping, and the theme besides */
export type SyncedSettings = Omit<Settings, ConnectionField | KeepingField> & { theme?: string }

export interface Stamped<T> {
  at: number
  value: T
}

/** What one side holds: this browser's data, or the bucket's file */
export interface Side {
  pages: Page[]
  records: Rec[]
  sections: Section[]
  entries: Entry[]
  gone: Gone
  settings: Stamped<SyncedSettings> | null
  learned: Stamped<Learned> | null
}

export interface BucketFile extends Side {
  app: 'cerulean'
  format: number
  writtenAt: number
}

export const emptySide = (): Side => ({ pages: [], records: [], sections: [], entries: [], gone: noneGone(), settings: null, learned: null })

export const stampOf = (x: { updatedAt?: number }) => x.updatedAt ?? 0

export function fileOf(side: Side, now = Date.now()): BucketFile {
  return { app: 'cerulean', format: FORMAT, writtenAt: now, ...side }
}

/** Reads the bucket's file; throws when it is not Cerulean's. A newer format is read as far as it goes */
export function parseFile(text: string): { side: Side, newer: boolean } {
  const f = JSON.parse(text) as Partial<BucketFile> | null
  if (f?.app !== 'cerulean' || typeof f.format !== 'number') throw new Error('Not a Cerulean sync file')
  const list = <T>(x: unknown) => (Array.isArray(x) ? x : []) as T[]
  const gone = noneGone()
  for (const kind of SYNC_KINDS) Object.assign(gone[kind], (f.gone as Partial<Gone> | undefined)?.[kind] ?? {})
  return {
    newer: f.format > FORMAT,
    side: {
      pages: list<Page>(f.pages).map(readPage),
      records: list(f.records),
      sections: list(f.sections),
      entries: list(f.entries),
      gone,
      settings: f.settings ?? null,
      learned: f.learned ?? null
    }
  }
}

// ---------- a round trip ----------

/** What the bucket's side brings to this one, and whether this one has anything the bucket lacks */
export interface Merged {
  /** Versions from the bucket that win here */
  take: Record<SyncKind, Obj[]>
  /** Things here that the bucket deleted for good */
  drop: Record<SyncKind, Id[]>
  /** The tombstones of both sides */
  gone: Gone
  /** The bucket's settings, when they are later than these */
  settings: Stamped<SyncedSettings> | null
  /** Learned words, when the bucket's add to these */
  learned: Stamped<Learned> | null
  /** This side has a later version, a thing or a tombstone the bucket lacks: the file is written */
  ahead: boolean
  /** The latest stamp in the bucket's file */
  top: number
}

const sameWords = (a: Learned, b: Learned) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v)

/**
 * Per object the later `updatedAt` wins whole (equal stamps are the same version); a tombstone at or after both
 * versions wins over them. Settings go whole by their stamp. Learned words only ever grow, so both sides' words are
 * kept, the later side's page winning for a word on both
 */
export function mergeSides(here: Side, there: Side): Merged {
  const take = { pages: [], records: [], sections: [], entries: [] } as Merged['take']
  const drop: Merged['drop'] = { pages: [], records: [], sections: [], entries: [] }
  const gone = noneGone()
  let ahead = false
  let top = Math.max(there.settings?.at ?? 0, there.learned?.at ?? 0)
  for (const kind of SYNC_KINDS) {
    const mine = new Map<Id, Obj>(here[kind].map(x => [x.id, x]))
    const theirs = new Map<Id, Obj>(there[kind].map(x => [x.id, x]))
    const gh = here.gone[kind]
    const gt = there.gone[kind]
    for (const x of there[kind]) top = Math.max(top, stampOf(x))
    for (const at of Object.values(gt)) top = Math.max(top, at)
    for (const id of new Set([...mine.keys(), ...theirs.keys(), ...Object.keys(gh), ...Object.keys(gt)])) {
      const h = mine.get(id)
      const t = theirs.get(id)
      const g = Math.max(gh[id] ?? -1, gt[id] ?? -1)
      if (g >= 0) gone[kind][id] = g
      const uh = h ? stampOf(h) : -1
      const ut = t ? stampOf(t) : -1
      if (g >= 0 && g >= uh && g >= ut) {
        if (h) drop[kind].push(id)
        if (t || (gt[id] ?? -1) < g) ahead = true
      } else if (t && ut > uh) {
        take[kind].push(t)
      } else if (h && uh > ut) {
        ahead = true
      }
    }
  }

  let settings: Merged['settings'] = null
  const sh = here.settings
  const st = there.settings
  if (st && (!sh || st.at > sh.at)) settings = st
  else if (sh && (!st || sh.at > st.at)) ahead = true

  let learned: Merged['learned'] = null
  const lh = here.learned
  const lt = there.learned
  if (lh || lt) {
    const theirsLater = (lt?.at ?? -1) > (lh?.at ?? -1)
    const value = theirsLater ? { ...lh?.value, ...lt?.value } : { ...lt?.value, ...lh?.value }
    const at = Math.max(lh?.at ?? 0, lt?.at ?? 0)
    if (!sameWords(value, lh?.value ?? {})) learned = { at, value }
    if (!sameWords(value, lt?.value ?? {})) ahead = true
  }
  return { take, drop, gone, settings, learned, ahead, top }
}

// ---------- the first connect ----------

export interface First {
  /** This side as the bucket will know it: its Входящие and Сегодня, and the untouched pages, under the bucket's ids */
  here: Side
  /** What goes from here: its own Входящие and Сегодня and the untouched pages the bucket has, with their examples */
  dropped: Record<SyncKind, Id[]>
  /**
   * What goes from the bucket: its untouched pages this device has by name, with their examples, by the stamp each has
   * there. They are deleted with a tombstone, so the other device takes this device's page in their place
   */
  retired: Record<SyncKind, Record<Id, number>>
  /** What came from the bucket, for the receipt */
  added: { pages: number, records: number }
}

/**
 * The first connect (sync delta, item 8): no question is asked. Входящие and Сегодня merge by kind, and everything
 * else is added, a page of the same name included (two «Покупки» side by side). One exception, both ways: a page with
 * nothing of the person's on it (no record but the first run's examples, not even in Корзина, and no note) whose name
 * the other side has is that side's page, so neither a new device nor the bucket of one doubles the starter pages.
 * Things with the same id on both sides (this device was connected before) are one thing: the later version wins, as
 * on every round trip
 */
export function firstMerge(here: Side, there: Side): First {
  const live = <T extends { id: Id, deletedAt?: number | null }>(xs: T[], gone: Record<Id, number>) => xs.filter(x => !x.deletedAt && gone[x.id] === undefined)
  const theirPages = live(there.pages, there.gone.pages)
  const theirIds = new Set<Id>([...there.pages, ...there.records].map(x => x.id))
  const to = new Map<Id, Id>()
  const taken = new Set<Id>()
  for (const kind of ['inbox', 'today'] as const) {
    const h = here.pages.find(p => p.kind === kind && !p.deletedAt)
    const t = theirPages.find(p => p.kind === kind)
    if (h && t && h.id !== t.id) {
      to.set(h.id, t.id)
      taken.add(t.id)
    }
  }
  const owned = new Set(here.records.filter(r => !r.seed).map(r => r.pageId))
  const starters = new Set<Id>()
  for (const p of here.pages) {
    if (p.kind !== 'page' || p.deletedAt || !p.title.trim() || theirIds.has(p.id) || owned.has(p.id) || !isEmptyDoc(p.body ?? null)) continue
    const t = theirPages.find(x => x.kind === 'page' && !taken.has(x.id) && normalize(x.title) === normalize(p.title))
    if (!t) continue
    to.set(p.id, t.id)
    taken.add(t.id)
    starters.add(p.id)
  }
  // The other way: the bucket's untouched page goes, this device's page of that name stands for it
  const mineIds = new Set<Id>([...here.pages, ...here.records].map(x => x.id))
  const theirOwned = new Set(there.records.filter(r => !r.seed).map(r => r.pageId))
  const retired: First['retired'] = { pages: {}, records: {}, sections: {}, entries: {} }
  const kept = new Set<Id>()
  for (const t of theirPages) {
    if (t.kind !== 'page' || !t.title.trim() || mineIds.has(t.id) || taken.has(t.id) || theirOwned.has(t.id) || !isEmptyDoc(t.body ?? null)) continue
    const h = here.pages.find(p => p.kind === 'page' && !p.deletedAt && !to.has(p.id) && !kept.has(p.id) && normalize(p.title) === normalize(t.title))
    if (!h) continue
    kept.add(h.id)
    retired.pages[t.id] = stampOf(t)
    for (const r of there.records) if (r.pageId === t.id) retired.records[r.id] = stampOf(r)
  }

  const dropped: First['dropped'] = { pages: [...to.keys()], records: [], sections: [], entries: [] }
  const id = (x: Id) => to.get(x) ?? x
  const ids = (xs?: Id[]) => xs?.map(id)
  const records: Rec[] = []
  for (const r of here.records) {
    if (starters.has(r.pageId)) dropped.records.push(r.id)
    else records.push(to.has(r.pageId) || r.mentions?.some(m => to.has(m)) || r.links?.some(l => to.has(l)) || r.guesses?.some(g => to.has(g))
      ? { ...r, pageId: id(r.pageId), links: ids(r.links), mentions: ids(r.mentions), guesses: ids(r.guesses), body: r.body ? remapMentions(r.body, id) : r.body }
      : r)
  }
  const pages = here.pages.filter(p => !to.has(p.id)).map(p => p.mentions?.some(m => to.has(m)) || p.views.some(v => v.pages?.some(x => to.has(x)))
    ? { ...p, mentions: ids(p.mentions), body: p.body ? remapMentions(p.body, id) : p.body, views: p.views.map(v => v.pages ? { ...v, pages: v.pages.map(id) } : v) }
    : p)
  const entries = here.entries.map(e => e.pageId && to.has(e.pageId) ? { ...e, pageId: id(e.pageId) } : e)
  const learned = here.learned && { ...here.learned, value: Object.fromEntries(Object.entries(here.learned.value).map(([w, p]) => [w, id(p)])) }

  const livePageIds = new Set(theirPages.map(p => p.id))
  const added = {
    pages: theirPages.filter(p => p.kind === 'page' && !mineIds.has(p.id) && !taken.has(p.id) && retired.pages[p.id] === undefined).length,
    records: live(there.records, there.gone.records).filter(r => !r.seed && !mineIds.has(r.id) && livePageIds.has(r.pageId)).length
  }
  return { here: { ...here, pages, records, entries, learned }, dropped, retired, added }
}

/** The receipt of the first connect: «Из бакета добавлено: 1 страница, 3 записи»; nothing new is «Синхронизация включена» */
export function receiptText(n: { pages: number, records: number }): string {
  const parts = [n.pages ? count(n.pages, PAGE_FORMS) : '', n.records ? count(n.records, RECORD_FORMS) : ''].filter(Boolean)
  return parts.length ? `Из бакета добавлено: ${parts.join(', ')}` : 'Синхронизация включена'
}

// ---------- what Настройки say ----------

/** Why sync stopped: the key stopped working, the key lost its rights, or the bucket does not answer */
export type SyncError = 'key' | 'access' | 'reach'

/**
 * Sync as this browser keeps it (IndexedDB meta `cloud`, never in a copy or in the bucket): the bucket and its key,
 * and where the last round trip left off
 */
export interface CloudMeta {
  endpoint: string
  region: string
  bucket: string
  keyId: string
  secret: string
  /** This browser, in the test object and the file it writes */
  device: string
  /** The file's version after the last round trip: the next read asks only for a newer one */
  etag: string | null
  /** When the last round trip came through (the wall clock) */
  at: number
  /** Changes stamped up to here are in the bucket */
  synced: number
  error: SyncError | null
  /** The file is in a newer format: read only */
  newer: boolean
}

export interface SyncView {
  on: boolean
  /** The last round trip that came through */
  at: number
  offline: boolean
  pending: number
  error: SyncError | null
  newer: boolean
}

const ERRORS: Record<SyncError, string> = {
  key: 'Ошибка: ключ больше не подходит',
  access: 'Ошибка: нет доступа к бакету',
  reach: 'Ошибка: бакет не отвечает'
}

/** The row's second line and the sheet's state line (sync delta, item 11); `warn` only when something is wrong */
export function stateText(s: SyncView, now: number): { text: string, warn: boolean } {
  if (!s.on) return { text: 'Выключена', warn: false }
  if (s.newer) return { text: 'Только чтение: нужна новая версия', warn: true }
  if (s.error) return { text: ERRORS[s.error], warn: true }
  if (s.offline && s.pending) {
    const one = s.pending % 10 === 1 && s.pending % 100 !== 11
    return { text: `Ждёт сети · ${count(s.pending, ['изменение', 'изменения', 'изменений'])} ${one ? 'не отправлено' : 'не отправлены'}`, warn: false }
  }
  const m = Math.floor((now - s.at) / 60000)
  return { text: `Синхронизировано · ${m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : formatMoment(s.at, now)}`, warn: false }
}

/** Главная's one sign (item 13): only when something is wrong for long, never for a blip */
export function signOf(s: SyncView & { waitingSince: number | null }, now: number): 'wait' | 'warn' | null {
  if (!s.on) return null
  if (s.error || s.newer) return 'warn'
  if (s.offline && s.pending && s.waitingSince !== null && now - s.waitingSince > 10 * 60000) return 'wait'
  return null
}

/** «1 изменение не отправлено» in the sign's label */
export function pendingWords(n: number): string {
  return `${n} ${plural(n, ['изменение', 'изменения', 'изменений'])} ${n % 10 === 1 && n % 100 !== 11 ? 'не отправлено' : 'не отправлены'}`
}
