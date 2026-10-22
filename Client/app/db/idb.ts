// IndexedDB: the only storage. Everything is read into memory once; every change is written through.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Entry, Page, Rec, Section } from '~/domain/types'

interface Schema extends DBSchema {
  pages: { key: string, value: Page }
  records: { key: string, value: Rec, indexes: { pageId: string } }
  sections: { key: string, value: Section }
  entries: { key: string, value: Entry }
  meta: { key: string, value: unknown }
}

export type Kind = 'pages' | 'records' | 'sections' | 'entries'
export const KINDS: Kind[] = ['pages', 'records', 'sections', 'entries']

/** What a write was about, handed to the error callback when the browser refuses it */
export interface Touched {
  kinds: (Kind | 'meta')[]
  ids: string[]
}

export interface Loaded {
  pages: Page[]
  records: Rec[]
  sections: Section[]
  entries: Entry[]
  meta: Map<string, unknown>
}

/**
 * Reactive objects are proxies, and structured clone refuses them (the DataCloneError on main).
 * Writes go through JSON, which reads through proxies and keeps only plain data.
 */
export function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export class Storage {
  private queue: Promise<unknown> = Promise.resolve()

  private constructor(private db: IDBPDatabase<Schema>, private onError: (e: unknown, what: Touched) => void) {}

  static async open(name = 'cerulean', onError: (e: unknown, what: Touched) => void = console.error): Promise<Storage> {
    const db = await openDB<Schema>(name, 1, {
      upgrade(db) {
        db.createObjectStore('pages', { keyPath: 'id' })
        db.createObjectStore('records', { keyPath: 'id' }).createIndex('pageId', 'pageId')
        db.createObjectStore('sections', { keyPath: 'id' })
        db.createObjectStore('entries', { keyPath: 'id' })
        db.createObjectStore('meta')
      }
    })
    return new Storage(db, onError)
  }

  async load(): Promise<Loaded> {
    const tx = this.db.transaction(['pages', 'records', 'sections', 'entries', 'meta'])
    const [pages, records, sections, entries, keys, values] = await Promise.all([
      tx.objectStore('pages').getAll(),
      tx.objectStore('records').getAll(),
      tx.objectStore('sections').getAll(),
      tx.objectStore('entries').getAll(),
      tx.objectStore('meta').getAllKeys(),
      tx.objectStore('meta').getAll()
    ])
    return { pages, records, sections, entries, meta: new Map(keys.map((k, i) => [k, values[i]])) }
  }

  /** Writes run one after another, in the order they were made; a refused one is reported with what it was about */
  private run(task: () => Promise<unknown>, what: Touched): Promise<void> {
    const next = this.queue.then(task).catch(e => this.onError(e, what))
    this.queue = next
    return next.then(() => undefined)
  }

  put(kind: Kind, value: Page | Rec | Section | Entry): Promise<void> {
    const data = plain(value)
    return this.run(() => this.db.put(kind, data as never), { kinds: [kind], ids: [value.id] })
  }

  putMany(kind: Kind, values: (Page | Rec | Section | Entry)[]): Promise<void> {
    const data = values.map(plain)
    return this.run(async () => {
      const tx = this.db.transaction(kind, 'readwrite')
      await Promise.all([...data.map(v => tx.store.put(v as never)), tx.done])
    }, { kinds: [kind], ids: values.map(v => v.id) })
  }

  delete(kind: Kind, ids: string[]): Promise<void> {
    return this.run(async () => {
      const tx = this.db.transaction(kind, 'readwrite')
      await Promise.all([...ids.map(id => tx.store.delete(id)), tx.done])
    }, { kinds: [kind], ids })
  }

  setMeta(key: string, value: unknown): Promise<void> {
    const data = plain(value)
    return this.run(() => this.db.put('meta', data, key), { kinds: ['meta'], ids: [key] })
  }

  /** Reads items back by id (what another tab wrote); undefined for those that are gone */
  getMany<K extends Kind>(kind: K, ids: string[]): Promise<(Schema[K]['value'] | undefined)[]> {
    const tx = this.db.transaction(kind)
    return Promise.all(ids.map(id => tx.store.get(id)))
  }

  getMeta(keys: string[]): Promise<unknown[]> {
    const tx = this.db.transaction('meta')
    return Promise.all(keys.map(k => tx.store.get(k)))
  }

  /** Replaces everything (import, «Удалить всё») in one transaction */
  replaceAll(data: Omit<Loaded, 'meta'>, meta: Map<string, unknown>): Promise<void> {
    const copy = plain(data)
    const metaCopy = [...meta].map(([k, v]) => [k, plain(v)] as const)
    return this.run(async () => {
      const tx = this.db.transaction(['pages', 'records', 'sections', 'entries', 'meta'], 'readwrite')
      await Promise.all([
        ...(['pages', 'records', 'sections', 'entries', 'meta'] as const).map(s => tx.objectStore(s).clear()),
        ...copy.pages.map(v => tx.objectStore('pages').put(v)),
        ...copy.records.map(v => tx.objectStore('records').put(v)),
        ...copy.sections.map(v => tx.objectStore('sections').put(v)),
        ...copy.entries.map(v => tx.objectStore('entries').put(v)),
        ...metaCopy.map(([k, v]) => tx.objectStore('meta').put(v, k)),
        tx.done
      ])
    }, { kinds: [...KINDS, 'meta'], ids: [] })
  }

  /** Resolves when every write made so far has finished (tests, before reload) */
  flush(): Promise<void> {
    return this.queue.then(() => undefined)
  }

  close() {
    this.db.close()
  }
}
