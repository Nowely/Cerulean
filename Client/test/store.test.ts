import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'

vi.mock('~/domain/model', async (orig) => {
  const real = await orig<typeof import('~/domain/model')>()
  return {
    ...real,
    askModel: vi.fn(async (_c: unknown, text: string, pages: { id: string, title: string }[]) => ({
      kind: 'record',
      pageId: pages.find(p => p.title === 'Продукты')!.id,
      items: [{ text: text.replace(/ для пульта/, ''), date: null, time: null, qty: '4 шт', option: 'Прочее' }],
      guesses: [],
      newPageName: null
    }))
  }
})

let n = 0
async function fresh(opts: { demo?: boolean } = {}) {
  setActivePinia(createPinia())
  const data = useDataStore()
  const dbName = `test-${++n}`
  await data.init({ ...opts, dbName })
  return { data, journal: useJournalStore(), dbName }
}

/** A second app instance on the same database: what the user sees after a reload */
async function reload(dbName: string) {
  setActivePinia(createPinia())
  const data = useDataStore()
  await data.init({ dbName })
  return data
}

const online = (value: boolean) => Object.defineProperty(globalThis.navigator, 'onLine', { value, configurable: true })

beforeEach(() => online(true))

describe('data store', () => {
  it('starts with Входящие and Сегодня on the first run', async () => {
    const { data } = await fresh()
    expect(data.livePages.map(p => p.title)).toEqual(['Входящие', 'Сегодня'])
    expect(data.favorites.map(f => f.kind === 'page' && f.page.title)).toEqual(['Сегодня'])
  })

  it('writes reactive objects to IndexedDB (the DataCloneError on main)', async () => {
    const { data, dbName } = await fresh({ demo: true })
    const products = data.livePages.find(p => p.title === 'Продукты')!
    const rec = data.addRecord({ pageId: products.id, text: 'Кефир', values: { a: 1 } })
    data.updateRecord(rec.id, { note: 'обезжиренный', due: { date: '2026-10-20' } })
    expect(data.storageError).toBeNull()
    await data.flush()
    const again = await reload(dbName)
    expect(again.records[rec.id]).toMatchObject({ text: 'Кефир', note: 'обезжиренный', due: { date: '2026-10-20' } })
    expect(again.livePages.map(p => p.title)).toContain('Продукты')
  })

  it('keeps pages of a deleted section and empties the trash', async () => {
    const { data } = await fresh({ demo: true })
    const home = data.sectionList.find(s => s.name === 'Дом')!
    data.removeSection(home.id)
    expect(data.livePages.find(p => p.title === 'Продукты')!.sectionId).toBeNull()
    const books = data.livePages.find(p => p.title === 'Книги')!
    data.removePage(books.id)
    expect(data.trash[0]).toMatchObject({ kind: 'page' })
    data.emptyTrash()
    expect(data.pages[books.id]).toBeUndefined()
  })

  it('shows a link on both sides, once, and undoes it from either', async () => {
    const { data, dbName } = await fresh({ demo: true })
    const find = (text: string) => data.liveRecords.find(r => r.text === text)!
    const library = find('Вернуть книгу в библиотеку')
    const book = find('Атомные привычки')
    const titles = (id: string) => data.linksOf(id).map(h => h.kind === 'page' ? h.page.title : h.rec.text)
    expect(titles(library.id)).toEqual(['Атомные привычки'])
    expect(titles(book.id)).toEqual(['Вернуть книгу в библиотеку'])

    const goals = data.livePages.find(p => p.title === 'Цели')!
    data.toggleLink(book.id, goals.id)
    data.toggleLink(book.id, library.id)
    expect(titles(book.id)).toEqual(['Цели'])
    expect(titles(library.id)).toEqual([])

    data.removePage(goals.id)
    expect(titles(book.id)).toEqual([])
    data.restorePage(goals.id)
    await data.flush()
    expect((await reload(dbName)).linksOf(book.id).map(h => h.kind)).toEqual(['page'])
  })
})

describe('Авто without a key', () => {
  it('files a clear line by simple rules', async () => {
    const { data, journal } = await fresh({ demo: true })
    const entry = await journal.send('кефир 1 л', 'auto')
    const products = data.livePages.find(p => p.title === 'Продукты')!
    expect(entry.kind).toBe('routed')
    expect(entry.pageId).toBe(products.id)
    const rec = data.records[entry.recordIds![0]!]!
    expect(rec).toMatchObject({ text: 'Кефир', via: 'chat' })
    expect(Object.values(rec.values)).toContain('1 л')
    expect(journal.fresh.has(entry.id)).toBe(true)
  })

  it('puts an unclear line into Входящие with «уточнить» and moves it on a choice', async () => {
    const { data, journal, dbName } = await fresh({ demo: true })
    const entry = await journal.send('купить подарок маме на др в пятницу', 'auto')
    expect(entry.kind).toBe('routed') // «купить» is shopping: a clear rule
    const ask = await journal.send('подарок маме на др', 'auto')
    expect(ask.kind).toBe('ask')
    expect(ask.newName).toBe('Подарки')
    const rec = data.records[ask.recordIds![0]!]!
    expect(rec.pageId).toBe(data.inbox.id)
    expect(rec.tags).toEqual(['clarify'])
    const page = journal.choose(ask.id, { newPage: 'Подарки' })!
    expect(page.title).toBe('Подарки')
    expect(data.records[rec.id]).toMatchObject({ pageId: page.id, tags: [] })
    expect(ask.kind).toBe('routed')
    // Авто learned the words
    const next = await journal.send('подарок папе', 'auto')
    expect(next.pageId).toBe(page.id)
    await data.flush()
    expect((await reload(dbName)).learned).toMatchObject({ подар: page.id })
  })

  it('answers a question first and records it on «Записать»', async () => {
    const { data, journal } = await fresh({ demo: true })
    const q = await journal.send('когда менять фильтр воды?', 'auto')
    expect(q.kind).toBe('found')
    expect(q.hits!.map(id => data.records[id]!.text)).toEqual(['Поменять фильтр воды'])
    const r = await journal.record(q.id)
    expect(r!.kind).toBe('routed')
    expect(data.pages[r!.pageId!]!.title).toBe('Дела по дому')
  })

  it('«Отменить» removes the records, «Не туда» moves them', async () => {
    const { data, journal } = await fresh({ demo: true })
    const e = await journal.send('молоко, хлеб', 'auto')
    const ids = e.recordIds!
    expect(ids).toHaveLength(2)
    journal.undo(e.id)
    expect(ids.every(id => !data.records[id])).toBe(true)
    expect(e.kind).toBe('undone')
    const e2 = await journal.send('позвонить маме', 'auto')
    const chores = data.livePages.find(p => p.title === 'Дела по дому')!
    journal.choose(e2.id, { pageId: chores.id })
    expect(e2).toMatchObject({ kind: 'routed', moved: true, pageId: chores.id })
  })

  it('adds today\'s date from the composer of Сегодня', async () => {
    const { data, journal } = await fresh({ demo: true })
    const e = await journal.send('позвонить в банк', 'auto', { today: true })
    expect(data.records[e.recordIds![0]!]!.due).not.toBeNull()
  })
})

describe('Авто with a key', () => {
  it('waits for the network in Входящие and files the line when it is back', async () => {
    const { data, journal } = await fresh({ demo: true })
    data.setSettings({ apiKey: 'sk-test', keyState: 'ok', rulesFirst: false })
    online(false)
    const e = await journal.send('батарейки для пульта', 'auto')
    expect(e.kind).toBe('offline')
    const parked = data.records[e.recordIds![0]!]!
    expect(parked).toMatchObject({ pageId: data.inbox.id, tags: ['offline'] })
    online(true)
    await journal.resume()
    expect(e.kind).toBe('routed')
    expect(data.records[parked.id]).toBeUndefined()
    const rec = data.records[e.recordIds![0]!]!
    expect(rec.text).toBe('Батарейки')
    expect(data.pages[rec.pageId]!.title).toBe('Продукты')
  })
})
