import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import type { PropDef } from '~/domain/types'
import { applyView } from '~/domain/views'
import { bodyOf, docText } from '~/domain/body'

vi.mock('~/domain/model', async (orig) => {
  const real = await orig<typeof import('~/domain/model')>()
  return {
    ...real,
    askModel: vi.fn(async (_c: unknown, text: string, pages: { id: string, title: string }[]) => ({
      kind: 'record',
      items: [{ text: text.replace(/ для пульта/, ''), note: '', pageId: pages.find(p => p.title === 'Покупки')!.id, date: null, time: null, qty: '4 шт', option: 'Прочее' }]
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
  it('starts with Входящие, Сегодня, «Быстрый старт» and empty Покупки, Задачи and Идеи on the first run (main flow, item 1; Josh 28 Oct, 5)', async () => {
    const { data } = await fresh()
    expect(data.livePages.map(p => p.title)).toEqual(['Входящие', 'Сегодня', 'Быстрый старт', 'Покупки', 'Задачи', 'Идеи'])
    expect(data.recentlyMade.map(p => [p.title, p.template])).toEqual([['Быстрый старт', undefined], ['Покупки', 'shop'], ['Задачи', 'todo'], ['Идеи', 'note']])
    // «Быстрый старт» holds six records to tick, the first with its text; none of them is the person's own
    const start = data.recentlyMade[0]!
    expect(start.glyph).toBe('list')
    const steps = data.recordsOf(start.id)
    expect(steps.map(r => r.text)).toEqual([
      'Запишите что-нибудь в поле внизу',
      'Откройте запись и добавьте к ней заметку',
      'Разберите Входящие: кнопка справа у записи переносит её',
      'Создайте свою страницу: «+» у «Мои страницы»',
      'Подключите модель в Настройках, и записи будут раскладываться сами',
      'Удалите эту страницу, когда она станет не нужна: «⋯» → «Удалить»'
    ])
    expect(steps.every(r => r.seed && !r.done)).toBe(true)
    expect(data.liveRecords).toHaveLength(6)
    // Сегодня sits at the top with Входящие: Избранное is only the person's own stars
    expect(data.favorites).toEqual([])
    const shop = data.recentlyMade[1]!
    expect(shop.props.find(p => p.type === 'select')?.options?.map(o => o.name)).toContain('Молочное')
    expect(shop.views.map(v => v.name)).toEqual(['Купить', 'Куплено'])
  })

  it('takes a ticked row out of its list after a moment; a second tap before that keeps it (Josh 28 Oct, 12)', async () => {
    const { data } = await fresh()
    const [a, b] = data.recordsOf(data.recentlyMade[0]!.id)
    vi.useFakeTimers()
    try {
      data.toggleDone(a!.id)
      expect(data.records[a!.id]!.done).toBe(true)
      expect(data.leaving).toEqual({ [a!.id]: false })
      vi.advanceTimersByTime(1499)
      expect(data.leaving).toEqual({ [a!.id]: false })
      vi.advanceTimersByTime(1)
      expect(data.leaving).toEqual({})
      data.toggleDone(b!.id)
      vi.advanceTimersByTime(800)
      data.toggleDone(b!.id)
      expect(data.records[b!.id]!.done).toBe(false)
      expect(data.leaving).toEqual({})
      vi.advanceTimersByTime(2000)
      expect(data.leaving).toEqual({})
    } finally {
      vi.useRealTimers()
    }
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
    // The library record is linked to «24 книги за год» by hand and mentions the book in its body: its own links first
    expect(titles(library.id)).toEqual(['24 книги за год', 'Атомные привычки'])
    expect(titles(book.id)).toEqual(['Вернуть книгу в библиотеку', 'Полумарафон к маю'])
    expect(data.relatedOf(library.id).map(x => x.why)).toEqual(['hand', 'text'])
    expect(data.relatedOf(book.id)[0]).toMatchObject({ why: 'quote', quote: 'Сначала дочитать Атомные привычки, осталось две главы.' })

    const marathon = find('Полумарафон к маю')
    data.toggleLink(book.id, marathon.id)
    const goals = data.livePages.find(p => p.title === 'Цели')!
    data.toggleLink(book.id, goals.id)
    data.toggleLink(book.id, library.id)
    expect(titles(book.id)).toEqual(['Цели'])
    // Unlinking a mention turns the chip into words; the hand link stays
    expect(titles(library.id)).toEqual(['24 книги за год'])
    expect(docText(bodyOf(data.records[library.id]))).toContain('Сначала дочитать Атомные привычки, осталось')
    expect(data.records[library.id]!.mentions).toEqual([])
    expect(titles(marathon.id)).toEqual([])

    data.removePage(goals.id)
    expect(titles(book.id)).toEqual([])
    data.restorePage(goals.id)
    await data.flush()
    expect((await reload(dbName)).linksOf(book.id).map(h => h.kind)).toEqual(['page'])
  })
})

describe('bodies', () => {
  it('saves a body, reads its mentions out for «Связано» on both sides, and keeps a hand link when the chip goes', async () => {
    const { data, dbName } = await fresh({ demo: true })
    const find = (text: string) => data.liveRecords.find(r => r.text === text)!
    const dentist = find('Позвонить стоматологу')
    const milk = find('Молоко')
    const doc = (...content: object[]) => ({ type: 'doc' as const, content: [{ type: 'paragraph', content }] })
    data.setBody({ kind: 'record', id: dentist.id }, doc({ type: 'text', text: 'Спросить про ' }, { type: 'mention', attrs: { id: milk.id, label: 'Молоко' } }, { type: 'text', text: '.' }))
    expect(data.records[dentist.id]!.mentions).toEqual([milk.id])
    expect(data.relatedOf(dentist.id)).toMatchObject([{ why: 'text' }])
    expect(data.relatedOf(milk.id).find(x => x.hit.kind === 'record' && x.hit.rec.id === dentist.id)).toMatchObject({ why: 'quote', quote: 'Спросить про Молоко.' })
    data.toggleLink(dentist.id, milk.id) // unticking in «Связать» turns the chip into words
    expect(data.linksOf(dentist.id)).toEqual([])
    data.toggleLink(dentist.id, milk.id) // a second tap makes a hand link
    data.setBody({ kind: 'record', id: dentist.id }, doc({ type: 'mention', attrs: { id: milk.id, label: 'Молоко' } }))
    data.setBody({ kind: 'record', id: dentist.id }, doc({ type: 'text', text: 'без молока' }))
    expect(data.relatedOf(dentist.id)).toMatchObject([{ why: 'hand' }])
    // An emptied body is stored as none; an old note is left behind once the body is written
    const marathon = find('Полумарафон к маю')
    expect(docText(bodyOf(marathon))).toContain('Три пробежки в неделю')
    data.setBody({ kind: 'record', id: marathon.id }, { type: 'doc', content: [{ type: 'paragraph' }] })
    expect(data.records[marathon.id]).toMatchObject({ body: null, note: '' })
    // A page note mentions too
    const chores = data.livePages.find(p => p.title === 'Дела по дому')!
    data.setBody({ kind: 'page', id: chores.id }, doc({ type: 'mention', attrs: { id: milk.id, label: 'Молоко' } }))
    expect(data.linksOf(milk.id).some(h => h.kind === 'page' && h.page.id === chores.id)).toBe(true)
    await data.flush()
    const again = await reload(dbName)
    expect(again.records[dentist.id]!.body).toEqual(doc({ type: 'text', text: 'без молока' }))
    expect(again.pages[chores.id]!.mentions).toEqual([milk.id])
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

  it('writes a question down with «?» and shows records like it (v22, U10)', async () => {
    const { data, journal } = await fresh({ demo: true })
    const q = await journal.send('когда менять фильтр?', 'auto')
    expect(q.kind).toBe('routed')
    expect(data.pages[q.pageId!]!.title).toBe('Дела по дому')
    expect(data.records[q.recordIds![0]!]!.text).toBe('Когда менять фильтр?')
    expect(q.similar!.map(id => data.records[id]!.text)).toEqual(['Поменять фильтр воды'])
  })

  it('gives the found card only for an explicit search, and records it on «Записать»', async () => {
    const { data, journal } = await fresh({ demo: true })
    const q = await journal.send('где фильтр воды', 'auto')
    expect(q.kind).toBe('found')
    expect(q.hits!.map(id => data.records[id]!.text)).toEqual(['Поменять фильтр воды'])
    const r = await journal.record(q.id)
    expect(r!.kind).toBe('routed')
  })

  it('sends each part of a list to its own page under one receipt (v22, U3)', async () => {
    const { data, journal } = await fresh({ demo: true })
    const e = await journal.send('сыр, позвонить бабушке', 'auto')
    expect(e).toMatchObject({ kind: 'routed', split: true })
    const recs = e.recordIds!.map(id => data.records[id]!)
    expect(recs.map(r => [r.text, data.pages[r.pageId]!.title])).toEqual([['Сыр', 'Покупки'], ['Позвонить бабушке', 'Задачи']])
    // One row moves on its own
    const ideas = data.livePages.find(p => p.title === 'Идеи')!
    journal.chooseOne(e.id, recs[1]!.id, { pageId: ideas.id })
    expect(data.records[recs[1]!.id]!.pageId).toBe(ideas.id)
    expect(data.records[recs[0]!.id]!.pageId).not.toBe(ideas.id)
    // «Отменить» takes back every part
    journal.undo(e.id)
    expect(recs.every(r => !data.records[r.id])).toBe(true)
  })

  it('keeps a list with an unknown thing on one page', async () => {
    const { data, journal } = await fresh({ demo: true })
    const e = await journal.send('молоко, вафли', 'auto')
    expect(e.split).toBeFalsy()
    expect(data.pages[e.pageId!]!.title).toBe('Покупки')
    expect(e.recordIds).toHaveLength(2)
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

describe('day one (main flow)', () => {
  it('files into the pages there are and never makes one (decision 1)', async () => {
    const { data, journal } = await fresh()
    const e = await journal.send('хлеб', 'auto')
    expect(data.pages[e.pageId!]).toMatchObject({ title: 'Покупки', template: 'shop' })
    const call = await journal.send('позвонить маме', 'auto')
    expect(data.pages[call.pageId!]!.title).toBe('Задачи')
    await journal.send('прочитать Канемана', 'auto')
    expect(data.livePages.filter(p => p.kind === 'page').map(p => p.title)).toEqual(['Быстрый старт', 'Покупки', 'Задачи', 'Идеи'])
    journal.undo(e.id)
    expect(data.recordsOf(data.pages[e.pageId!]!.id)).toEqual([])
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

  it('puts the line in Входящие when the model does not answer, and «Повторить» runs it again (v22, B7)', async () => {
    const { data, journal } = await fresh({ demo: true })
    data.setSettings({ apiKey: 'sk-test', keyState: 'ok', rulesFirst: false })
    const { askModel, ModelError } = await import('~/domain/model')
    vi.mocked(askModel).mockRejectedValueOnce(new ModelError('timeout'))
    const e = await journal.send('батарейки для пульта', 'auto')
    expect(e).toMatchObject({ kind: 'routed', pageId: data.inbox.id, note: 'slow' })
    const waiting = e.recordIds![0]!
    await journal.retry(e.id)
    expect(data.records[waiting]).toBeUndefined()
    expect(e.note).toBeUndefined()
    expect(data.pages[e.pageId!]!.title).toBe('Покупки')
  })

  it('says the rules filed it when the key was refused (v22, B6)', async () => {
    const { data, journal } = await fresh({ demo: true })
    data.setSettings({ apiKey: 'sk-test', keyState: 'ok', rulesFirst: false })
    const { askModel, ModelError } = await import('~/domain/model')
    vi.mocked(askModel).mockRejectedValueOnce(new ModelError('key'))
    const e = await journal.send('батарейки', 'auto')
    expect(e).toMatchObject({ kind: 'routed', note: 'key' })
    expect(data.pages[e.pageId!]!.title).toBe('Покупки')
    expect(data.settings.keyState).toBe('bad')
  })
})

describe('duplicates, «Запомнить», existing pages (v22)', () => {
  it('writes a duplicate as typed and merges it, adding the quantities; «Отменить» leaves the merged record (G3)', async () => {
    const { data, journal } = await fresh({ demo: true })
    const shop = data.livePages.find(p => p.title === 'Покупки')!
    const qty = shop.props.find(p => p.name === 'Количество')!.id
    const milk = data.liveRecords.find(r => r.text === 'Молоко')!
    const e = await journal.send('молоко 1 л', 'auto')
    const typed = e.recordIds![0]!
    expect(data.records[typed]).toMatchObject({ text: 'Молоко', pageId: shop.id, values: { [qty]: '1 л' } })
    expect(journal.duplicateFor(e.id, typed)?.id).toBe(milk.id)
    expect(journal.merge(e.id, typed)?.id).toBe(milk.id)
    expect(data.records[typed]).toBeUndefined()
    expect(data.records[milk.id]!.values[qty]).toBe('3 л')
    expect(data.recordsOf(shop.id).filter(r => r.text === 'Молоко')).toHaveLength(1)
    expect(e.merged).toEqual({ [typed]: milk.id })
    journal.undo(e.id)
    expect(data.records[milk.id]).toMatchObject({ deletedAt: null, values: { [qty]: '3 л' } })
  })

  it('offers no merge for a ticked record or one of the same send', async () => {
    const { data, journal } = await fresh({ demo: true })
    const both = await journal.send('кефир, кефир', 'auto')
    expect(both.recordIds!.map(id => journal.duplicateFor(both.id, id))).toEqual([undefined, undefined])
    const bread = data.liveRecords.find(r => r.text === 'Хлеб')!
    data.toggleDone(bread.id)
    const e = await journal.send('хлеб', 'auto')
    expect(journal.duplicateFor(e.id, e.recordIds![0]!)).toBeUndefined()
  })

  it('«Запомнить» after a page chosen by hand writes an example into its description; «Отменить» takes it out (U5)', async () => {
    const { data, journal } = await fresh({ demo: true })
    const tasks = data.livePages.find(p => p.title === 'Задачи')!
    const before = tasks.description
    const ask = await journal.send('подарок Лене на новоселье', 'auto')
    expect(ask.kind).toBe('ask')
    expect(ask.learn).toBeFalsy()
    journal.choose(ask.id, { pageId: tasks.id })
    expect(ask).toMatchObject({ kind: 'routed', pageId: tasks.id, learn: true, learned: false })
    journal.remember(ask.id)
    expect(ask.learned).toBe(true)
    expect(data.pages[tasks.id]!.description).toBe(`${before}\nНапример: «подарок Лене на новоселье»`)
    journal.remember(ask.id)
    expect(data.pages[tasks.id]!.description.match(/Например/g)).toHaveLength(1)
    journal.forget(ask.id)
    expect(ask.learned).toBe(false)
    expect(data.pages[tasks.id]!.description).toBe(before)
    // Remembered, then moved on: the example leaves the first page with it
    journal.remember(ask.id)
    const ideas = data.livePages.find(p => p.title === 'Идеи')!
    journal.choose(ask.id, { pageId: ideas.id })
    expect(data.pages[tasks.id]!.description).toBe(before)
    expect(ask).toMatchObject({ pageId: ideas.id, learn: true, learned: false })
  })

  it('offers nothing to remember when Авто filed it by itself or the record stays in Входящие', async () => {
    const { journal } = await fresh({ demo: true })
    const e = await journal.send('позвонить маме', 'auto')
    expect(e.learn).toBeFalsy()
    journal.remember(e.id)
    expect(e.learned).toBeFalsy()
    const ask = await journal.send('подарок Лене на новоселье', 'auto')
    journal.choose(ask.id, { keep: true })
    expect(ask.learn).toBeFalsy()
  })

  it('files what the model is unsure of to Входящие and makes no page (main flow, item 23)', async () => {
    const { data, journal } = await fresh({ demo: true })
    data.setSettings({ apiKey: 'sk-test', keyState: 'ok', rulesFirst: false })
    const { askModel } = await import('~/domain/model')
    const before = data.livePages.length
    vi.mocked(askModel).mockResolvedValueOnce({ kind: 'record', items: [{ text: 'Что-нибудь для Лены', note: '', pageId: null, date: null, time: null, qty: null, option: null }] })
    const e = await journal.send('что-нибудь для Лены', 'auto')
    expect(e.pageId).toBe(data.inbox.id)
    expect(data.livePages.length).toBe(before)
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
    // An undo is a change of its own to sync: its stamp is new, the rest is as before
    const content = () => JSON.parse(JSON.stringify(page(), (k, v) => k === 'updatedAt' ? undefined : v))
    const before = content()
    const n = data.propUsage(id, [left.id, norm.id])
    expect(n).toBeGreaterThan(0)
    const done = data.removeProp(id, left.id)!
    expect(done.count).toBe(n)
    expect(page().props.map(p => p.name)).toEqual(['Количество', 'Отдел'])
    expect(page().views.some(v => v.shown.includes(left.id) || v.filter.some(f => f.field === left.id))).toBe(false)
    expect(Object.values(data.records).some(r => left.id in r.values || norm.id in r.values)).toBe(false)
    done.undo()
    expect(content()).toEqual(before)
    expect(data.propUsage(id, [left.id, norm.id])).toBe(n)
  })
})

describe('drag and the shop loop (v22, Josh #3, N9)', () => {
  async function shop() {
    const { data } = await fresh({ demo: true })
    const page = () => data.livePages.find(p => p.title === 'Покупки')!
    const view = () => page().views[0]!
    const groups = () => applyView(page(), data.recordsOf(page().id), view(), Date.now())
    const texts = (key: string) => groups().find(g => g.key === key)!.records.map(r => r.text)
    const rec = (text: string) => Object.values(data.records).find(r => r.text === text && !r.deletedAt)!
    const dept = page().props.find(p => p.name === 'Отдел')!
    const option = (name: string) => dept.options!.find(o => o.name === name)!.id
    return { data, page, view, groups, texts, rec, dept, option }
  }

  it('a drop into another group sets its value, and «Отменить» puts the record back', async () => {
    const { data, page, view, groups, texts, rec, dept, option } = await shop()
    const before = groups().map(g => [g.label, g.records.map(r => r.text)])
    const veg = option('Овощи и фрукты')
    const done = data.placeRecord(page().id, view().id, groups(), rec('Яйца').id, veg, 1)!
    expect(done.into?.label).toBe('Овощи и фрукты')
    expect(rec('Яйца').values[dept.id]).toBe(veg)
    expect(texts(veg)).toEqual(['Бананы', 'Яйца'])
    done.undo()
    expect(rec('Яйца').values[dept.id]).toBe(option('Молочное'))
    expect(groups().map(g => [g.label, g.records.map(r => r.text)])).toEqual(before)
  })

  it('a move within a group only reorders; a sorted view turns «Вручную» and undoes that too', async () => {
    const { data, page, view, groups, texts, rec, option } = await shop()
    const dairy = option('Молочное')
    const done = data.placeRecord(page().id, view().id, groups(), rec('Яйца').id, dairy, 0)!
    expect(done.into).toBeNull()
    expect(done.manual).toBe(false)
    expect(texts(dairy)[0]).toBe('Яйца')
    data.updatePage(page().id, { views: page().views.map((v, i) => i ? v : { ...v, sort: 'name' as const }) })
    const sorted = texts(dairy)
    const again = data.placeRecord(page().id, view().id, groups(), rec('Сыр').id, dairy, 0)!
    expect(again.manual).toBe(true)
    expect(view().sort).toBe('manual')
    expect(texts(dairy)[0]).toBe('Сыр')
    again.undo()
    expect(view().sort).toBe('name')
    expect(texts(dairy)).toEqual(sorted)
  })

  it('a group by date takes no rows from another group', async () => {
    const { data } = await fresh({ demo: true })
    const tasks = data.livePages.find(p => p.title === 'Задачи')!
    const view = { ...tasks.views[0]!, groupBy: 'due' as const }
    data.updatePage(tasks.id, { views: [view, ...tasks.views.slice(1)] })
    const groups = applyView(tasks, data.recordsOf(tasks.id), view, Date.now())
    expect(groups.length).toBeGreaterThan(1)
    expect(data.placeRecord(tasks.id, view.id, groups, groups[0]!.records[0]!.id, groups[1]!.key, 0)).toBeNull()
  })

  it('«Очистить купленное» sends the bought records to Корзина, and «Отменить» brings them back', async () => {
    const { data, page, rec } = await shop()
    const bought = page().views.find(v => v.name === 'Куплено')!
    const ids = ['Кофе в зёрнах', 'Помидоры'].map(t => rec(t).id)
    const done = data.clearDone(page().id, bought.id)
    expect(done.count).toBe(2)
    expect(ids.every(id => data.records[id]!.deletedAt)).toBe(true)
    expect(data.trash.flatMap(t => t.kind === 'record' ? [t.rec.text] : [])).toEqual(expect.arrayContaining(['Кофе в зёрнах', 'Помидоры']))
    // What is still to buy stays
    expect(rec('Молоко').deletedAt).toBeNull()
    done.undo()
    expect(ids.every(id => !data.records[id]!.deletedAt)).toBe(true)
    expect(data.recordsOf(page().id).filter(r => r.done).map(r => r.text).sort()).toEqual(['Кофе в зёрнах', 'Помидоры'])
  })
})
