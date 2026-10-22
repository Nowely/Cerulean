// Navigation (v22 items 18, 21, 36): the page picker shows every page once, deleting a section comes back on
// «Отменить», and «Записать «…»» from an empty search writes the words down even when they read as a search
import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { pickerGroups } from '~/domain/picker'

let n = 0
async function fresh() {
  setActivePinia(createPinia())
  const data = useDataStore()
  await data.init({ demo: true, dbName: `nav-${++n}` })
  return { data, journal: useJournalStore() }
}

const idOf = (data: ReturnType<typeof useDataStore>, title: string) => data.livePages.find(p => p.title === title)!.id
const titles = (groups: ReturnType<typeof pickerGroups>) => groups.flatMap(g => g.pages.map(p => p.title))

describe('the page picker (v22, U8, B31)', () => {
  it('lists every page once: guesses, «Открыто недавно», sections, «Системные»', async () => {
    const { data } = await fresh()
    const ideas = idOf(data, 'Идеи')
    data.updatePage(ideas, { openedAt: Date.now() })
    const groups = pickerGroups({ pages: data.livePages, sections: data.sectionList, guesses: [ideas, idOf(data, 'Задачи')] })
    const all = titles(groups)
    expect(all.length).toBe(new Set(all).size)
    expect(groups[0]!.label).toBe('Похоже на')
    expect(groups[0]!.pages.map(p => p.title)).toEqual(['Идеи', 'Задачи'])
    expect(groups[1]!.label).toBe('Открыто недавно')
    expect(groups[1]!.pages.map(p => p.title)).not.toContain('Идеи')
    expect(groups.at(-1)!.label).toBe('Системные')
    // Every page a record can go to is there; Сегодня has no records of its own, На неделе only collects (v24)
    const choosable = data.livePages.filter(p => (p.kind === 'page' || p.kind === 'inbox') && p.title !== 'На неделе').map(p => p.title)
    expect([...all].sort()).toEqual([...choosable].sort())
  })

  it('shows the page the records are on once, in its section, never among the guesses or the recent', async () => {
    const { data } = await fresh()
    const shop = idOf(data, 'Покупки')
    data.updatePage(shop, { openedAt: Date.now() })
    const groups = pickerGroups({ pages: data.livePages, sections: data.sectionList, guesses: [shop], current: shop })
    expect(titles(groups).filter(t => t === 'Покупки')).toHaveLength(1)
    const home = data.sections[data.pages[shop]!.sectionId!]!.name
    expect(groups.find(g => g.pages.some(p => p.id === shop))!.label).toBe(home)
  })

  it('leaves out the page a top row stands for, and finds by any part of the title', async () => {
    const { data } = await fresh()
    const shop = idOf(data, 'Покупки')
    expect(titles(pickerGroups({ pages: data.livePages, sections: data.sectionList, skip: [shop] }))).not.toContain('Покупки')
    const found = pickerGroups({ pages: data.livePages, sections: data.sectionList, query: 'ПОК' })
    expect(found).toEqual([expect.objectContaining({ label: 'Найдено' })])
    expect(titles(found)).toEqual(['Покупки'])
  })

  it('puts pages without a section under «Мои страницы», newest first', async () => {
    const { data } = await fresh()
    // Not opened lately, or «Открыто недавно» would take them first
    const a = data.createPage({ title: 'Подарки' })
    const b = data.createPage({ title: 'Ремонт' })
    data.updatePage(a.id, { openedAt: 0, createdAt: Date.now() - 1000 })
    data.updatePage(b.id, { openedAt: 0 })
    const mine = pickerGroups({ pages: data.livePages, sections: data.sectionList }).find(g => g.label === 'Мои страницы')!
    expect(mine.pages.map(p => p.id)).toEqual([b.id, a.id])
  })
})

describe('deleting a section (v22, G12)', () => {
  it('moves its pages to «Мои страницы», and «Отменить» brings it back in its place with its pages', async () => {
    const { data } = await fresh()
    const before = data.sectionList.map(s => s.name)
    const home = data.sectionList.find(s => s.name === 'Дом')!
    const pages = data.livePages.filter(p => p.sectionId === home.id).map(p => p.id)
    const { pages: moved, undo } = data.removeSection(home.id)
    expect(moved).toEqual(pages)
    expect(data.sections[home.id]).toBeUndefined()
    expect(pages.every(id => data.pages[id]!.sectionId === null)).toBe(true)
    undo()
    expect(data.sectionList.map(s => s.name)).toEqual(before)
    expect(pages.every(id => data.pages[id]!.sectionId === home.id)).toBe(true)
    expect(data.livePages.filter(p => p.sectionId === home.id).map(p => p.id)).toEqual(pages)
  })

  it('leaves a page where it is when it was moved somewhere else before «Отменить»', async () => {
    const { data } = await fresh()
    const home = data.sectionList.find(s => s.name === 'Дом')!
    const own = data.sectionList.find(s => s.name === 'Личное')!
    const shop = idOf(data, 'Покупки')
    const { undo } = data.removeSection(home.id)
    data.updatePage(shop, { sectionId: own.id })
    undo()
    expect(data.pages[shop]!.sectionId).toBe(own.id)
    expect(data.pages[idOf(data, 'Дела по дому')]!.sectionId).toBe(home.id)
  })

  it('says there is nothing to move for an empty section', async () => {
    const { data } = await fresh()
    const empty = data.createSection('Работа')
    expect(data.removeSection(empty.id).pages).toEqual([])
  })
})

describe('«Записать «…»» from an empty search (v22, N19)', () => {
  it('writes the words down even when they read as a search', async () => {
    const { data, journal } = await fresh()
    const asked = await journal.send('где гараж', 'auto')
    expect(asked.kind).toBe('found')
    const written = await journal.send('где гараж', 'auto', { record: true })
    expect(written.kind).not.toBe('found')
    expect(written.recordIds?.map(id => data.records[id]!.text)).toEqual(['Где гараж'])
  })

  it('files a plain word like any send, with its receipt', async () => {
    const { data, journal } = await fresh()
    const e = await journal.send('гараж', 'auto', { record: true })
    expect(['routed', 'ask']).toContain(e.kind)
    expect(data.records[e.recordIds![0]!]!.text).toBe('Гараж')
  })
})
