// Keeping data (v22 items 27, 28, 29 and the storage side of 9): the copy reminder, import, two tabs, refused writes
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { demo } from '~/domain/seed'
import { addedText, measure, mergeSnapshot, sizeText, toJSON, parseSnapshot, type Snapshot } from '~/domain/export'
import { copyDue } from '~/domain/keep'
import { DEFAULT_SETTINGS, newRecord } from '~/domain/factory'

const DAY = 86400000
let n = 0

/** One tab of the app; two of them on the same database name are two tabs of one browser */
async function tab(dbName = `data-${++n}`, opts: { demo?: boolean } = {}) {
  setActivePinia(createPinia())
  const data = useDataStore()
  await data.init({ ...opts, dbName })
  return { data, dbName }
}

/** A copy saved on another device: the demo with its own ids, as a file reads it back */
function fileFrom(change?: (d: ReturnType<typeof demo>) => void): Snapshot {
  const d = demo()
  change?.(d)
  return parseSnapshot(toJSON({ ...d, settings: { ...DEFAULT_SETTINGS }, learned: {} }))
}

/** What the user has, for comparing before and after (ids, order of keys and the sync stamp of an undone change aside) */
function state(data: ReturnType<typeof useDataStore>) {
  const sort = <T extends { id: string }>(xs: T[]) => JSON.parse(JSON.stringify([...xs].sort((a, b) => a.id.localeCompare(b.id)), (k, v) => k === 'updatedAt' ? undefined : v))
  return {
    pages: sort(Object.values(data.pages)),
    records: sort(Object.values(data.records)),
    sections: sort(Object.values(data.sections)),
    learned: { ...data.learned }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis.navigator, 'storage')
})

describe('the copy reminder on Главная', () => {
  const now = Date.UTC(2026, 9, 19)
  const recs = (k: number, at: number) => Array.from({ length: k }, () => newRecord({ pageId: 'p', text: 'x', addedAt: at }))
  const fresh = { copiedAt: 0, copyHiddenAt: 0, startedAt: now - 5 * DAY }

  it('never shows once the browser keeps the data', () => {
    expect(copyDue(fresh, recs(40, now), now, true)).toBe(false)
    expect(copyDue({ ...fresh, copiedAt: now - 90 * DAY }, [], now, true)).toBe(false)
  })

  it('before any copy: after 20 records written here, or a month after the first run', () => {
    expect(copyDue(fresh, recs(19, now), now, false)).toBe(false)
    expect(copyDue(fresh, recs(20, now), now, false)).toBe(true)
    expect(copyDue(fresh, recs(20, now), now, null)).toBe(true)
    // The demo's records were there before the first run: they do not count
    expect(copyDue(fresh, recs(40, now - 6 * DAY), now, false)).toBe(false)
    expect(copyDue({ ...fresh, startedAt: now - 31 * DAY }, recs(1, now), now, false)).toBe(true)
    expect(copyDue({ ...fresh, startedAt: now - 31 * DAY }, [], now, false)).toBe(false)
  })

  it('after a copy: once a month; «Не сейчас» puts it off for a month', () => {
    expect(copyDue({ ...fresh, copiedAt: now - 10 * DAY }, recs(40, now), now, false)).toBe(false)
    expect(copyDue({ ...fresh, copiedAt: now - 37 * DAY }, [], now, false)).toBe(true)
    expect(copyDue({ ...fresh, copiedAt: now - 37 * DAY, copyHiddenAt: now - 2 * DAY }, [], now, false)).toBe(false)
    expect(copyDue({ ...fresh, copiedAt: now - 70 * DAY, copyHiddenAt: now - 31 * DAY }, [], now, false)).toBe(true)
  })

  it('does not show on the demo, which starts counting at its first run', async () => {
    const { data } = await tab(undefined, { demo: true })
    expect(data.settings.startedAt).toBeGreaterThan(0)
    expect(copyDue(data.settings, Object.values(data.records), Date.now(), false)).toBe(false)
  })

  it('asks the browser to keep the data once, at the first record', async () => {
    const persist = vi.fn(async () => true)
    Object.defineProperty(globalThis.navigator, 'storage', {
      value: { persist, persisted: async () => false },
      configurable: true
    })
    const { data } = await tab(undefined, { demo: true })
    await vi.waitFor(() => expect(data.persisted).toBe(false))
    const inbox = data.inbox.id
    data.addRecord({ pageId: inbox, text: 'первая' })
    data.addRecord({ pageId: inbox, text: 'вторая' })
    await vi.waitFor(() => expect(data.persisted).toBe(true))
    expect(persist).toHaveBeenCalledTimes(1)
    expect(data.settings.persistAsked).toBe(true)
  })
})

describe('«Загрузить копию»', () => {
  it('counts what a copy holds, in Russian plural forms', () => {
    expect(sizeText({ pages: 24, records: 594 })).toBe('24 страницы и 594 записи')
    expect(sizeText({ pages: 6, records: 26 })).toBe('6 страниц и 26 записей')
    expect(addedText({ pages: 24, records: 594 })).toBe('Добавлено 24 страницы и 594 записи')
    expect(addedText({ pages: 0, records: 3 })).toBe('Добавлено 3 записи')
    expect(addedText({ pages: 1, records: 21 })).toBe('Добавлена 1 страница и 21 запись')
    expect(addedText({ pages: 0, records: 11 })).toBe('Добавлено 11 записей')
    const d = demo()
    expect(measure(d).pages).toBe(d.pages.filter(p => p.kind === 'page' && !p.deletedAt).length)
  })

  it('merges pages by title and does not double records', () => {
    const here = demo()
    const file = fileFrom((d) => {
      const products = d.pages.find(p => p.title === 'Покупки')!
      const dept = products.props.find(p => p.name === 'Отдел')!
      const dairy = dept.options!.find(o => o.name === 'Молочное')!
      d.records.push(newRecord({ pageId: products.id, text: 'Кефир', values: { [dept.id]: dairy.id } }))
      d.records.push(newRecord({ pageId: products.id, text: 'молоко' })) // the same as «Молоко» here
      const personal = d.sections.find(s => s.name === 'Личное')!
      const gifts = { ...products, id: 'p-gifts', title: 'Подарки', sectionId: personal.id, props: [], favorite: null }
      d.pages.push(gifts)
      d.records.push(newRecord({ pageId: gifts.id, text: 'Книга маме' }))
    })
    const m = mergeSnapshot({ ...here, learned: {} }, file)
    expect(m.sections).toEqual([])
    expect(m.pages.map(p => p.title)).toEqual(['Подарки'])
    expect(m.pages[0]!.sectionId).toBe(here.sections.find(s => s.name === 'Личное')!.id)
    expect(m.records.map(r => r.text).sort()).toEqual(['Кефир', 'Книга маме'])
    // Кефир lands on Покупки here, with the «Молочное» option of this Покупки
    const products = here.pages.find(p => p.title === 'Покупки')!
    const kefir = m.records.find(r => r.text === 'Кефир')!
    const dept = products.props.find(p => p.name === 'Отдел')!
    expect(kefir.pageId).toBe(products.id)
    expect(kefir.values[dept.id]).toBe(dept.options!.find(o => o.name === 'Молочное')!.id)
    expect(m.changed).toEqual([])
  })

  it('adds a file to what is here, and «Отменить» leaves the data as before', async () => {
    const { data, dbName } = await tab(undefined, { demo: true })
    const before = state(data)
    const file = fileFrom((d) => {
      const products = d.pages.find(p => p.title === 'Покупки')!
      // A property and an option this Покупки does not have
      products.props.push({ id: 'f-shop', name: 'Магазин', type: 'select', options: [{ id: 'o-x', name: 'Перекрёсток' }] })
      d.records.push(newRecord({ pageId: products.id, text: 'Кефир', values: { 'f-shop': 'o-x' } }))
      d.pages.push({ ...d.pages.find(p => p.title === 'Книги')!, id: 'p-films', title: 'Фильмы', favorite: null })
      d.records.push(newRecord({ pageId: 'p-films', text: 'Дюна' }))
    })
    const added = data.addSnapshot(file)
    expect(addedText({ pages: added.pages.length, records: added.records.length })).toBe('Добавлена 1 страница и 2 записи')
    const products = data.livePages.find(p => p.title === 'Покупки')!
    expect(products.props.map(p => p.name)).toContain('Магазин')
    expect(data.livePages.filter(p => p.title === 'Покупки')).toHaveLength(1)
    expect(data.recordsOf(products.id).some(r => r.text === 'Кефир')).toBe(true)

    data.takeBack(added)
    expect(state(data)).toEqual(before)
    await data.flush()
    setActivePinia(createPinia())
    const again = useDataStore()
    await again.init({ dbName })
    expect(state(again)).toEqual(before)
  })

  it('a copy of the same data adds nothing', async () => {
    const { data } = await tab(undefined, { demo: true })
    const file = parseSnapshot(toJSON(data.snapshot()))
    const added = data.addSnapshot(file)
    expect([added.pages, added.records, added.sections]).toEqual([[], [], []])
  })

  it('«Заменить всё» keeps the key and how this browser keeps its data', async () => {
    const { data } = await tab(undefined, { demo: true })
    data.setSettings({ apiKey: 'sk-test', copiedAt: 123, persistAsked: true })
    const file = fileFrom(d => d.pages.splice(d.pages.findIndex(p => p.title === 'Книги'), 1))
    await data.importSnapshot(file)
    expect(data.settings).toMatchObject({ apiKey: 'sk-test', copiedAt: 123, persistAsked: true })
    expect(data.livePages.some(p => p.title === 'Книги')).toBe(false)
    expect('copiedAt' in data.snapshot().settings).toBe(false)
  })
})

describe('two tabs', () => {
  it('a change in one tab applies in the other at once, without being written back', async () => {
    const a = await tab(undefined, { demo: true })
    const b = await tab(a.dbName)
    const heard: unknown[] = []
    const ear = new BroadcastChannel(`${a.dbName}:changed`)
    ear.onmessage = e => heard.push(e.data)

    const milk = Object.values(a.data.records).find(r => r.text === 'Молоко')!
    expect(b.data.records[milk.id]!.done).toBe(false)
    const shown = b.data.records[milk.id]
    a.data.toggleDone(milk.id)
    await vi.waitFor(() => expect(b.data.records[milk.id]!.done).toBe(true))
    // The same object took the change, so a row holding it stays as it is
    expect(b.data.records[milk.id]).toBe(shown)

    a.data.setSettings({ homeRows: 'compact' })
    await vi.waitFor(() => expect(b.data.settings.homeRows).toBe('compact'))

    const fresh = a.data.addRecord({ pageId: milk.pageId, text: 'Кефир' })
    await vi.waitFor(() => expect(b.data.records[fresh.id]?.text).toBe('Кефир'))
    a.data.purgeRecords([fresh.id])
    await vi.waitFor(() => expect(b.data.records[fresh.id]).toBeUndefined())

    // Four changes, four messages, all from the first tab: the second applied them without writing them back
    await new Promise(r => setTimeout(r, 50))
    expect(heard).toHaveLength(4)
    ear.close()
  })

  it('the record open here waits for «Обновить» when its fields changed elsewhere', async () => {
    const a = await tab(undefined, { demo: true })
    const b = await tab(a.dbName)
    const eggs = Object.values(a.data.records).find(r => r.text === 'Яйца')!
    const sub = Object.values(a.data.records).find(r => r.parentId === eggs.id)!
    b.data.hold(eggs.id)

    a.data.updateRecord(eggs.id, { text: 'Яйца С0' })
    a.data.toggleDone(sub.id)
    await vi.waitFor(() => expect(b.data.waiting[eggs.id]?.text).toBe('Яйца С0'))
    expect(b.data.records[eggs.id]!.text).toBe('Яйца')
    // Its subitems are other records: they apply at once
    expect(b.data.records[sub.id]!.done).toBe(true)

    b.data.takeWaiting(eggs.id)
    expect(b.data.records[eggs.id]!.text).toBe('Яйца С0')
    expect(b.data.waiting[eggs.id]).toBeUndefined()

    // A change to what does not show (the order) goes in quietly; letting go takes in what waited
    a.data.updateRecord(eggs.id, { order: 99 })
    await vi.waitFor(() => expect(b.data.records[eggs.id]!.order).toBe(99))
    a.data.updateRecord(eggs.id, { note: 'другая' })
    await vi.waitFor(() => expect(b.data.waiting[eggs.id]).toBeDefined())
    b.data.release(eggs.id)
    expect(b.data.records[eggs.id]!.note).toBe('другая')
  })

  it('an import in one tab reloads the other', async () => {
    const a = await tab(undefined, { demo: true })
    const b = await tab(a.dbName)
    await a.data.importSnapshot(fileFrom(d => d.pages.splice(d.pages.findIndex(p => p.title === 'Книги'), 1)))
    await vi.waitFor(() => expect(b.data.livePages.some(p => p.title === 'Книги')).toBe(false))
  })
})

describe('a refused write', () => {
  it('is reported with what it was about, and memory keeps the change', async () => {
    const { data } = await tab(undefined, { demo: true })
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const rec = data.addRecord({ pageId: data.inbox.id, text: 'купить батарейки' })
    await data.flush()
    expect(data.writeFailed).toMatchObject({ reason: 'quota' })
    expect(data.writeFailed!.kinds).toContain('records')
    expect(data.writeFailed!.ids).toContain(rec.id)
    expect(data.storageError).toBeNull()
    expect(data.records[rec.id]?.text).toBe('купить батарейки')
    data.clearWriteFailed()
    expect(data.writeFailed).toBeNull()
  })

  it('storage that cannot open leaves the app working in memory', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new DOMException('A mutation operation was attempted on a database that did not allow mutations.', 'InvalidStateError')
    })
    const { data } = await tab(undefined, { demo: true })
    expect(data.storageError).toBeTruthy()
    expect(data.livePages.some(p => p.title === 'Покупки')).toBe(true)
    data.addRecord({ pageId: data.inbox.id, text: 'хлеб' })
    expect(data.writeFailed).toBeNull()
  })
})
