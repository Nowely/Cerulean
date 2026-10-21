import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import type { PropDef } from '~/domain/types'

vi.mock('~/domain/model', async (orig) => {
  const real = await orig<typeof import('~/domain/model')>()
  return {
    ...real,
    askModel: vi.fn(async (_c: unknown, text: string, pages: { id: string, title: string }[]) => ({
      kind: 'record',
      pageId: pages.find(p => p.title === 'Покупки')!.id,
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
    const products = data.livePages.find(p => p.title === 'Покупки')!
    const rec = data.addRecord({ pageId: products.id, text: 'Кефир', values: { a: 1 } })
    data.updateRecord(rec.id, { note: 'обезжиренный', due: { date: '2026-10-20' } })
    expect(data.storageError).toBeNull()
    await data.flush()
    const again = await reload(dbName)
    expect(again.records[rec.id]).toMatchObject({ text: 'Кефир', note: 'обезжиренный', due: { date: '2026-10-20' } })
    expect(again.livePages.map(p => p.title)).toContain('Покупки')
  })

  it('keeps pages of a deleted section and empties the trash', async () => {
    const { data } = await fresh({ demo: true })
    const home = data.sectionList.find(s => s.name === 'Дом')!
    data.removeSection(home.id)
    expect(data.livePages.find(p => p.title === 'Покупки')!.sectionId).toBeNull()
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
    expect(titles(book.id)).toEqual(['Вернуть книгу в библиотеку', 'Полумарафон к маю'])

    const marathon = find('Полумарафон к маю')
    data.toggleLink(book.id, marathon.id)
    const goals = data.livePages.find(p => p.title === 'Цели')!
    data.toggleLink(book.id, goals.id)
    data.toggleLink(book.id, library.id)
    expect(titles(book.id)).toEqual(['Цели'])
    expect(titles(library.id)).toEqual([])
    expect(titles(marathon.id)).toEqual([])

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
    const products = data.livePages.find(p => p.title === 'Покупки')!
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

describe('day one (v21 F1)', () => {
  it('makes a page from a starter when no page fits, and «Отменить» takes it back', async () => {
    const { data, journal } = await fresh()
    const e = await journal.send('хлеб', 'auto')
    const page = data.pages[e.pageId!]!
    expect(e).toMatchObject({ kind: 'routed', made: true })
    expect(page).toMatchObject({ title: 'Покупки', template: 'shop', sectionId: null })
    expect(data.recentlyMade.map(p => p.title)).toEqual(['Покупки'])
    journal.undo(e.id)
    expect(data.livePages.some(p => p.title === 'Покупки')).toBe(false)
  })

  it('files calls into Дела and asks about a book with the starters to choose from', async () => {
    const { data, journal } = await fresh()
    const call = await journal.send('позвонить маме', 'auto')
    expect(data.pages[call.pageId!]!.title).toBe('Задачи')
    const book = await journal.send('прочитать Канемана', 'auto')
    expect(book.kind).toBe('ask')
    expect(data.livePages.filter(p => p.kind === 'page').map(p => p.title)).toEqual(['Задачи'])
    const page = journal.choose(book.id, { template: 'note' })!
    expect(page).toMatchObject({ title: 'Идеи', template: 'note' })
    expect(data.recordsOf(page.id).map(r => r.text)).toEqual(['Прочитать Канемана'])
  })

  it('«Не туда» drops the page Авто made while it is empty', async () => {
    const { data, journal } = await fresh()
    const e = await journal.send('хлеб', 'auto')
    const made = e.pageId!
    journal.choose(e.id, { newPage: 'Дача' })
    expect(data.pages[made]).toBeUndefined()
    expect(data.pages[e.pageId!]!.title).toBe('Дача')
  })

  it('takes a choice in Входящие back with its Чат line', async () => {
    const { data, journal } = await fresh({ demo: true })
    const gift = data.liveRecords.find(r => r.text === 'Подарок маме на др')!
    const tasks = data.livePages.find(p => p.title === 'Задачи')!
    const entry = data.entries.find(x => x.recordIds?.includes(gift.id))!
    const { undo } = journal.undoable([gift.id], () => journal.chooseForRecord(gift.id, { pageId: tasks.id }))
    expect(data.records[gift.id]).toMatchObject({ pageId: tasks.id, tags: [] })
    expect(entry.kind).toBe('routed')
    undo()
    expect(data.records[gift.id]).toMatchObject({ pageId: data.inbox.id, tags: ['clarify'] })
    expect(entry.kind).toBe('ask')
  })

  it('works out the Входящие guesses again when pages change', async () => {
    const { data, journal } = await fresh()
    const e = await journal.send('прочитать Канемана', 'auto')
    const rec = data.records[e.recordIds![0]!]!
    expect(journal.guessesFor(rec)).toEqual([])
    const books = data.createPage({ title: 'Книги' })
    expect(journal.guessesFor(rec)).toEqual([books.id])
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
    expect(data.pages[rec.pageId]!.title).toBe('Покупки')
  })
})

describe('properties (v22 item 30)', () => {
  async function shop() {
    const { data, dbName } = await fresh({ demo: true })
    const id = data.livePages.find(p => p.title === 'Покупки')!.id
    const [qty, dept, left, norm] = data.pages[id]!.props.map(p => JSON.parse(JSON.stringify(p)) as PropDef)
    const rec = (text: string) => Object.values(data.records).find(r => r.text === text && !r.deletedAt)!
    return { data, dbName, id, page: () => data.pages[id]!, rec, qty: qty!, dept: dept!, left: left!, norm: norm! }
  }

  it('adds a property after the own ones and reorders Срок and Заметка with the rest', async () => {
    const { data, dbName, id, page, qty, dept, left, norm } = await shop()
    data.moveProp(id, 'due', 0)
    expect(page().propOrder).toEqual(['due', qty.id, dept.id, left.id, norm.id, 'note'])
    const shopName = data.addProp(id, { name: 'Магазин', type: 'select', options: [{ id: 'o1', name: 'Лента', color: 'teal' }] })!
    expect(page().propOrder).toEqual(['due', qty.id, dept.id, left.id, norm.id, shopName.id, 'note'])
    // The place counts the rows as listed: Осталось second, its «Норма» right after it
    data.moveProp(id, left.id, 1)
    expect(page().propOrder).toEqual(['due', left.id, norm.id, qty.id, dept.id, shopName.id, 'note'])
    expect(page().props.map(p => p.name)).toEqual(['Осталось', 'Норма', 'Количество', 'Отдел', 'Магазин'])
    await data.flush()
    const again = await reload(dbName)
    expect(again.pages[id]!.propOrder).toEqual(page().propOrder)
    expect(again.pages[id]!.props.at(-1)!.options).toEqual([{ id: 'o1', name: 'Лента', color: 'teal' }])
  })

  it('deletes an option with its values, and «Отменить» brings both back', async () => {
    const { data, id, page, rec, dept } = await shop()
    const chem = dept.options!.find(o => o.name === 'Бытовая химия')!
    expect(data.propUsage(id, [dept.id], chem.id)).toBe(1)
    const done = data.removeOption(id, dept.id, chem.id)!
    expect(done.count).toBe(1)
    expect(page().props[1]!.options!.map(o => o.name)).not.toContain('Бытовая химия')
    expect(dept.id in rec('Порошок').values).toBe(false)
    done.undo()
    expect(page().props[1]!.options).toEqual(dept.options)
    expect(rec('Порошок').values[dept.id]).toBe(chem.id)
  })

  it('changes a type, converting what it can, and undoes all of it', async () => {
    const { data, id, page, rec, qty, dept } = await shop()
    const done = data.retypeProp(id, qty.id, 'number')!
    expect(done.dropped).toBe(4)
    expect(qty.id in rec('Молоко').values).toBe(false)
    done.undo()
    expect(page().props[0]!.type).toBe('text')
    expect(rec('Молоко').values[qty.id]).toBe('2 л')
    // «Купить» is grouped by Отдел: as text it loses the groups, as «Выбор» again it finds the same options
    const t = data.retypeProp(id, dept.id, 'text')!
    expect(t.dropped).toBe(0)
    expect(page().views[0]!.groupBy).toBeNull()
    expect(rec('Молоко').values[dept.id]).toBe('Молочное')
    data.retypeProp(id, dept.id, 'select')
    expect(page().props[1]!.options).toEqual(dept.options)
    expect(rec('Молоко').values[dept.id]).toBe(dept.options!.find(o => o.name === 'Молочное')!.id)
    t.undo()
    expect(page().views[0]!.groupBy).toBe(dept.id)
  })

  it('deletes a property with its «Норма», values and place in the views; «Отменить» restores them', async () => {
    const { data, id, page, left, norm } = await shop()
    const before = JSON.parse(JSON.stringify(page()))
    const n = data.propUsage(id, [left.id, norm.id])
    expect(n).toBeGreaterThan(0)
    const done = data.removeProp(id, left.id)!
    expect(done.count).toBe(n)
    expect(page().props.map(p => p.name)).toEqual(['Количество', 'Отдел'])
    expect(page().views.some(v => v.shown.includes(left.id) || v.filter.some(f => f.field === left.id))).toBe(false)
    expect(Object.values(data.records).some(r => left.id in r.values || norm.id in r.values)).toBe(false)
    done.undo()
    expect(JSON.parse(JSON.stringify(page()))).toEqual(before)
    expect(data.propUsage(id, [left.id, norm.id])).toBe(n)
  })
})
