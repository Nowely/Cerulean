import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { emptySide, fileOf, firstMerge, mergeSides, parseFile } from '~/domain/bucket'
import { mergeSnapshot, parseSnapshot, StockImportConflict, toJSON } from '~/domain/export'
import { DEFAULT_SETTINGS, newPage, newSection } from '~/domain/factory'
import { homeOrder, type HomePosition } from '~/domain/homeOrder'

async function tab(dbName: string) {
  setActivePinia(createPinia())
  const data = useDataStore()
  await data.init({ dbName })
  return data
}

const names = (data: ReturnType<typeof useDataStore>, section: string | null) => data.homePages(section).map(p => p.title)

describe('Главная manual page order', () => {
  it('uses the observed legacy order and persists repeated moves without rewriting unrelated pages', async () => {
    const data = await tab('mf3-home-order-legacy')
    for (const [i, name] of ['Идеи', 'Задачи', 'Покупки', 'Быстрый старт'].entries()) {
      data.updatePage(data.livePages.find(p => p.title === name)!.id, { order: i })
    }
    const ids = Object.fromEntries(data.livePages.filter(p => p.kind === 'page').map(p => [p.title, p.id])) as Record<string, string>
    const systemBefore = JSON.stringify(data.inbox)
    const settingsBefore = JSON.stringify(data.settings)
    const oldOrders = Object.fromEntries(Object.values(data.pages).map(p => [p.id, p.order]))
    expect(names(data, null)).toEqual(['Быстрый старт', 'Покупки', 'Задачи', 'Идеи'])
    expect(data.homePages(null).every(p => !p.homeOrder)).toBe(true)
    expect(data.placeHomePage(ids.Идеи!, null, ids.Покупки!)).not.toBeNull()
    expect(names(data, null)).toEqual(['Быстрый старт', 'Идеи', 'Покупки', 'Задачи'])
    expect(data.placeHomePage(ids['Быстрый старт']!, null, null)).not.toBeNull()
    expect(names(data, null)).toEqual(['Идеи', 'Покупки', 'Задачи', 'Быстрый старт'])
    expect(JSON.stringify(data.inbox)).toBe(systemBefore)
    expect(JSON.stringify(data.settings)).toBe(settingsBefore)
    expect(Object.fromEntries(Object.values(data.pages).map(p => [p.id, p.order]))).toEqual(oldOrders)
    await data.flush()
    const reloaded = await tab('mf3-home-order-legacy')
    expect(names(reloaded, null)).toEqual(['Идеи', 'Покупки', 'Задачи', 'Быстрый старт'])
    const section = reloaded.createSection('Другая')
    const transferred = reloaded.createPage({ title: 'Перенесённая', sectionId: section.id, createdAt: Date.now() + 100_000 })
    reloaded.updatePage(transferred.id, { sectionId: null })
    reloaded.createPage({ title: 'Новая' })
    expect(names(reloaded, null)).toEqual(['Новая', 'Перенесённая', 'Идеи', 'Покупки', 'Задачи', 'Быстрый старт'])
  })

  it('moves between sections and undoes only the touched fields while the notice is alive', async () => {
    const data = await tab('mf3-home-order-undo')
    const section = data.createSection('Дом')
    const shop = data.livePages.find(p => p.title === 'Покупки')!
    const tasks = data.livePages.find(p => p.title === 'Задачи')!
    const idea = data.livePages.find(p => p.title === 'Идеи')!
    data.updatePage(shop.id, { sectionId: section.id, order: 50 })
    data.updatePage(tasks.id, { sectionId: section.id, order: 5 })
    expect(names(data, section.id)).toEqual(['Задачи', 'Покупки'])
    const result = data.placeHomePage(idea.id, section.id, shop.id)!
    expect(names(data, section.id)).toEqual(['Задачи', 'Идеи', 'Покупки'])
    data.updatePage(idea.id, { title: 'Новое название' })
    result.undo()
    expect(data.pages[idea.id]!.title).toBe('Новое название')
    expect(data.pages[idea.id]!.sectionId).toBeNull()
    expect(names(data, section.id)).toEqual(['Задачи', 'Покупки'])
    expect(data.pages[shop.id]!.homeOrder).toBeUndefined()
    expect(data.pages[tasks.id]!.homeOrder).toBeUndefined()
  })
})

describe('importing Главная page order', () => {
  const position = (p: { homeOrder?: HomePosition }) => p.homeOrder

  it('round-trips JSON, remaps active positions and keeps local pages in their order', () => {
    const localSection = { ...newSection('Дом', 0), id: 'local-home' }
    const collision = { ...newSection('Личное', 1), id: 'same-id' }
    const localFirst = newPage({ id: 'local-first', title: 'Первая здесь', sectionId: localSection.id, order: 0, homeOrder: { sectionId: localSection.id, position: 0 } })
    const localSecond = newPage({ id: 'local-second', title: 'Вторая здесь', sectionId: localSection.id, order: 1, homeOrder: { sectionId: localSection.id, position: 1 } })
    const legacy = newPage({ id: 'legacy', title: 'Старая страница', sectionId: localSection.id, order: 2 })
    const localMerged = newPage({ id: 'local-merged', title: 'Совпадающая', sectionId: localSection.id, order: 3, homeOrder: { sectionId: localSection.id, position: 3 } })
    const here = { pages: [localFirst, localSecond, legacy, localMerged], records: [], sections: [localSection, collision], learned: {} }
    const before = JSON.stringify(here)
    const remoteHome = { ...newSection('Дом', 0), id: 'remote-home' }
    const remoteCollision = { ...newSection('Мастерская', 1), id: collision.id }
    const incoming = [
      newPage({ id: 'incoming-a', title: 'Импорт А', sectionId: remoteHome.id, order: 0, homeOrder: { sectionId: remoteHome.id, position: 1 } }),
      newPage({ id: 'incoming-b', title: 'Импорт Б', sectionId: remoteHome.id, order: 1, homeOrder: { sectionId: remoteHome.id, position: 0 } }),
      newPage({ id: localFirst.id, title: 'Конфликт ID', sectionId: remoteCollision.id, order: 2, homeOrder: { sectionId: remoteCollision.id, position: 4 } }),
      newPage({ id: 'plain', title: 'Без позиции', sectionId: remoteHome.id, order: 3 }),
      newPage({ id: 'stale', title: 'Устаревшая', sectionId: remoteHome.id, order: 4, homeOrder: { sectionId: 'other', position: 2 } }),
      newPage({ id: 'stale-destination', title: 'Устаревшая цель', sectionId: remoteHome.id, order: 5, homeOrder: { sectionId: localSection.id, position: 2 } }),
      newPage({ id: 'no-section', title: 'Без секции', sectionId: null, order: 6, homeOrder: { sectionId: null, position: -1 } }),
      newPage({ id: 'missing', title: 'Секция отсутствует', sectionId: 'missing-section', order: 7, homeOrder: { sectionId: 'missing-section', position: 9 } }),
      newPage({ id: 'stale-null', title: 'Устаревший null', sectionId: 'missing-section', order: 8, homeOrder: { sectionId: null, position: -2 } }),
      newPage({ id: 'incoming-merged', title: localMerged.title, sectionId: remoteHome.id, order: 9, homeOrder: { sectionId: remoteHome.id, position: 99 }, props: [{ id: 'extra', name: 'Дополнение', type: 'text' }] })
    ]
    const text = toJSON({ pages: incoming, sections: [remoteHome, remoteCollision], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} })
    const file = parseSnapshot(text)
    expect(file.pages.map(p => p.homeOrder)).toEqual(incoming.map(p => p.homeOrder))
    const fileBefore = JSON.stringify(file)
    const result = mergeSnapshot(here, file)
    const page = (title: string) => result.pages.find(p => p.title === title)!
    expect(JSON.stringify(here)).toBe(before)
    expect(JSON.stringify(file)).toBe(fileBefore)
    const a = position(page('Импорт А'))!
    const b = position(page('Импорт Б'))!
    expect(a).toMatchObject({ sectionId: localSection.id, position: 1 })
    expect(b).toMatchObject({ sectionId: localSection.id, position: 0 })
    expect(a.importGroup).toBeTruthy()
    expect(b.importGroup).toBe(a.importGroup)
    const madeSection = result.sections.find(s => s.name === remoteCollision.name)!
    expect(madeSection.id).not.toBe(collision.id)
    expect(page('Конфликт ID').id).not.toBe(localFirst.id)
    expect(page('Конфликт ID').sectionId).toBe(madeSection.id)
    expect(page('Конфликт ID').homeOrder).toMatchObject({ sectionId: madeSection.id, position: 0 })
    expect(page('Без позиции').homeOrder).toMatchObject({ sectionId: localSection.id, position: 2 })
    // Stale markers do not become active: the new ranks come from their observed source slots.
    expect(page('Устаревшая').homeOrder).toMatchObject({ sectionId: localSection.id, position: 3 })
    expect(page('Устаревшая цель').homeOrder).toMatchObject({ sectionId: localSection.id, position: 4 })
    expect(page('Без секции').homeOrder).toMatchObject({ sectionId: null, position: 0 })
    expect(page('Секция отсутствует').sectionId).toBeNull()
    expect(page('Секция отсутствует').homeOrder).toMatchObject({ sectionId: null, position: 0 })
    expect(page('Устаревший null').sectionId).toBeNull()
    expect(page('Устаревший null').homeOrder).toMatchObject({ sectionId: null, position: 1 })
    expect(result.pages.some(p => p.title === localMerged.title)).toBe(false)
    expect(result.changed.find(p => p.id === localMerged.id)?.homeOrder).toEqual(localMerged.homeOrder)
    const after = [...here.pages, ...result.pages].filter(p => p.sectionId === localSection.id).sort((a, b) => a.order - b.order)
    const originalIds = new Set(here.pages.map(p => p.id))
    expect(homeOrder(after, localSection.id).filter(p => originalIds.has(p.id)).map(p => p.id))
      .toEqual(homeOrder(here.pages, localSection.id).map(p => p.id))
    expect(homeOrder(after, localSection.id).findIndex(p => p.title === 'Импорт Б'))
      .toBeLessThan(homeOrder(after, localSection.id).findIndex(p => p.title === 'Импорт А'))
    const roundTrip = parseSnapshot(toJSON({ pages: result.pages, sections: result.sections, records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    expect(position(roundTrip.pages.find(p => p.title === 'Импорт А')!)?.importGroup).toBe(a.importGroup)
  })

  it('preserves the observed order of multiple source groups through repeated imports and stable ties', () => {
    const section = { ...newSection('Дом', 0), id: 'home' }
    const positioned = (id: string, order: number, rank: number, importGroup?: string) => newPage({ id, title: id, sectionId: section.id, order, homeOrder: { sectionId: section.id, position: rank, ...(importGroup ? { importGroup } : {}) } })
    const source = [positioned('a', 0, 1, 'one'), positioned('b', 1, 0, 'one'), positioned('c', 2, 0, 'two'), positioned('d', 3, 0, 'two')]
    expect(homeOrder(source, section.id).map(p => p.id)).toEqual(['b', 'a', 'c', 'd'])
    const file = parseSnapshot(toJSON({ pages: source, sections: [section], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const once = mergeSnapshot({ pages: [], sections: [], records: [], learned: {} }, file)
    const onceSorted = [...once.pages].sort((a, b) => a.order - b.order)
    expect(homeOrder(onceSorted, section.id).map(p => p.id)).toEqual(['b', 'a', 'c', 'd'])
    expect(position(once.pages[0]!)?.importGroup).toBe(position(once.pages[2]!)?.importGroup)
    const againFile = parseSnapshot(toJSON({ pages: once.pages, sections: once.sections, records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const again = mergeSnapshot({ pages: [], sections: [], records: [], learned: {} }, againFile)
    const againSorted = [...again.pages].sort((a, b) => a.order - b.order)
    expect(homeOrder(againSorted, section.id).map(p => p.id)).toEqual(['b', 'a', 'c', 'd'])
    expect(position(again.pages[0]!)?.importGroup).toBe(position(again.pages[2]!)?.importGroup)
    expect(position(again.pages[0]!)?.importGroup).not.toBe(position(once.pages[0]!)?.importGroup)
  })

  it('firstMerge retains section ids and their positions', () => {
    const localSection = { ...newSection('Дом', 0), id: 'local-home' }
    const remoteSection = { ...newSection('Дом', 0), id: 'bucket-home' }
    const page = newPage({ title: 'Своя страница', sectionId: localSection.id, homeOrder: { sectionId: localSection.id, position: 2, importGroup: 'test-group' } })
    const here = { ...emptySide(), pages: [page], sections: [localSection] }
    const there = { ...emptySide(), sections: [remoteSection] }
    const first = firstMerge(here, there)
    const parsed = parseFile(JSON.stringify(fileOf(first.here))).side
    expect(parsed.pages[0]?.sectionId).toBe(localSection.id)
    expect(parsed.pages[0]?.homeOrder).toEqual(page.homeOrder)
    expect(parsed.sections).toEqual([localSection])
    expect(mergeSides(first.here, there).take.sections).toEqual([remoteSection])
  })

  it('does not treat an imported ordered page as an untouched duplicate on first connect', () => {
    const sectionId = 'local-home'
    const ordered = newPage({ id: 'imported', title: 'Одинаковая', sectionId, homeOrder: { sectionId, position: 1, importGroup: 'import-group' } })
    const bucketPage = newPage({ id: 'in-bucket', title: ordered.title })
    const first = firstMerge({ ...emptySide(), pages: [ordered] }, { ...emptySide(), pages: [bucketPage] })
    expect(first.dropped.pages).not.toContain(ordered.id)
    expect(first.here.pages).toContainEqual(ordered)
    const mirrored = firstMerge({ ...emptySide(), pages: [bucketPage] }, { ...emptySide(), pages: [ordered] })
    expect(mirrored.retired.pages[ordered.id]).toBeUndefined()
    const stale = { ...ordered, homeOrder: { sectionId: 'old-section', position: 1 } }
    const old = firstMerge({ ...emptySide(), pages: [stale] }, { ...emptySide(), pages: [bucketPage] })
    expect(old.dropped.pages).toContain(stale.id)
  })

  it('keeps the import group on the later whole-page LWW version', () => {
    const sectionId = 'section'
    const position: HomePosition = { sectionId, position: 2, importGroup: 'imported-group' }
    const old = newPage({ id: 'page', title: 'Старая', sectionId, homeOrder: position, updatedAt: 10 })
    const newer = { ...old, title: 'Новая', updatedAt: 20 }
    const local = { ...emptySide(), pages: [old] }
    const remote = parseFile(JSON.stringify(fileOf({ ...emptySide(), pages: [newer] }))).side
    const merged = mergeSides(local, remote)
    expect(merged.take.pages).toEqual([newer])
    expect((merged.take.pages[0] as typeof newer).homeOrder).toEqual(position)
  })

  it('orders same-counter batches from different devices deterministically', () => {
    const local = newPage({ id: 'local', title: 'Локальная', createdAt: 1 })
    const a = newPage({ id: 'a', title: 'A', createdAt: 3, homeOrder: { sectionId: null, position: -1, importGroup: 'home-import-v1:0000000000000001:device-a:scope' } })
    const b = newPage({ id: 'b', title: 'B', createdAt: 2, homeOrder: { sectionId: null, position: -2, importGroup: 'home-import-v1:0000000000000001:device-b:scope' } })
    expect(homeOrder([a, b, local], null).map(p => p.id)).toEqual(['local', 'a', 'b'])
    expect(homeOrder([b, local, a], null).map(p => p.id)).toEqual(['local', 'a', 'b'])
  })

  it('adds ordered pages without touching local pages and undoes the import', async () => {
    const data = await tab('mf3-home-order-import-undo')
    const section = data.createSection('Дом')
    const first = data.createPage({ title: 'Здесь первая', sectionId: section.id })
    const second = data.createPage({ title: 'Здесь вторая', sectionId: section.id })
    data.placeHomePage(second.id, section.id, first.id)
    data.createPage({ title: 'Здесь без позиции', sectionId: section.id })
    const before = JSON.stringify(data.snapshot())
    const oldNames = names(data, section.id)
    const sourceSection = { ...newSection('Дом', 0), id: 'source-home' }
    const pages = [
      newPage({ title: 'Импорт первая', sectionId: sourceSection.id, order: 0, homeOrder: { sectionId: sourceSection.id, position: 1 } }),
      newPage({ title: 'Импорт вторая', sectionId: sourceSection.id, order: 1, homeOrder: { sectionId: sourceSection.id, position: 0 } })
    ]
    const snapshot = parseSnapshot(toJSON({ pages, sections: [sourceSection], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const added = data.addSnapshot(snapshot)
    expect(added.pages).toHaveLength(2)
    expect(added.before).toHaveLength(0)
    expect(names(data, section.id).filter(n => oldNames.includes(n))).toEqual(oldNames)
    expect(names(data, section.id).filter(n => n.startsWith('Импорт'))).toEqual(['Импорт вторая', 'Импорт первая'])
    expect(JSON.stringify(data.snapshot().pages.filter(p => !added.pages.includes(p.id)))).toBe(JSON.stringify(JSON.parse(before).pages))
    data.takeBack(added)
    expect(JSON.stringify(data.snapshot())).toBe(before)
    await data.flush()
    const reloaded = await tab('mf3-home-order-import-undo')
    expect(names(reloaded, section.id)).toEqual(oldNames)
  })

  it('lets a later drag place an imported page before local pages', async () => {
    const data = await tab('mf3-home-order-import-drag')
    const section = data.createSection('Дом')
    const local = data.createPage({ title: 'Локальная', sectionId: section.id })
    const remoteSection = { ...newSection('Дом', 0), id: 'remote-home' }
    const imported = newPage({ title: 'Импорт', sectionId: remoteSection.id, homeOrder: { sectionId: remoteSection.id, position: 0 } })
    const file = parseSnapshot(toJSON({ pages: [imported], sections: [remoteSection], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const added = data.addSnapshot(file)
    expect(names(data, section.id)).toEqual(['Локальная', 'Импорт'])
    data.placeHomePage(added.pages[0]!, section.id, local.id)
    expect(names(data, section.id)).toEqual(['Импорт', 'Локальная'])
    await data.flush()
    const reloaded = await tab('mf3-home-order-import-drag')
    expect(names(reloaded, section.id)).toEqual(['Импорт', 'Локальная'])
  })

  it('puts negative positions from successive imports after existing pages and survives drag, undo and reload', async () => {
    const data = await tab('mf3-home-order-negative-imports')
    const local = names(data, null)
    const original = JSON.stringify(data.snapshot().pages)
    const makeFile = (prefix: string, createdAt: number) => parseSnapshot(toJSON({
      pages: [
        newPage({ id: `${prefix}-a`, title: `${prefix} A`, createdAt, homeOrder: { sectionId: null, position: -1 } }),
        newPage({ id: `${prefix}-b`, title: `${prefix} B`, createdAt: createdAt - 1, homeOrder: { sectionId: null, position: -2 } })
      ],
      sections: [], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {}
    }))
    const first = data.addSnapshot(makeFile('Импорт 1', Date.now() + 200_000))
    expect(names(data, null)).toEqual([...local, 'Импорт 1 B', 'Импорт 1 A'])
    const second = data.addSnapshot(makeFile('Импорт 2', Date.now() + 300_000))
    expect(names(data, null)).toEqual([...local, 'Импорт 1 B', 'Импорт 1 A', 'Импорт 2 B', 'Импорт 2 A'])
    const oldIds = new Set([...first.pages, ...second.pages])
    expect(JSON.stringify(data.snapshot().pages.filter(p => !oldIds.has(p.id)))).toBe(original)
    const savedOrder = names(data, null)
    const groups = [...oldIds].map(id => data.pages[id]!.homeOrder!.importGroup)
    expect(groups.every(Boolean)).toBe(true)
    expect(new Set(groups).size).toBe(2)
    const target = data.createSection('Цель')
    const moved = data.placeHomePage(second.pages[0]!, target.id, null)!
    moved.undo()
    expect(names(data, null)).toEqual(savedOrder)
    expect([...oldIds].map(id => data.pages[id]!.homeOrder!.importGroup)).toEqual(groups)
    await data.flush()
    const resumed = await tab('mf3-home-order-negative-imports')
    expect(names(resumed, null)).toEqual(savedOrder)
    expect([...oldIds].map(id => resumed.pages[id]!.homeOrder!.importGroup)).toEqual(groups)
    resumed.placeHomePage(second.pages[0]!, null, resumed.livePages.find(p => p.title === local[0])!.id)
    expect(names(resumed, null)[0]).toBe('Импорт 2 A')
    expect([...oldIds].every(id => resumed.pages[id]!.homeOrder?.importGroup === undefined)).toBe(true)
    await resumed.flush()
    const reloaded = await tab('mf3-home-order-negative-imports')
    expect(names(reloaded, null)).toEqual(names(resumed, null))
  })

  it('appends legacy, stale and favourite pages in their observed source order without changing local pages', async () => {
    const data = await tab('mf3-home-order-legacy-favorites')
    const local = names(data, null)
    const localBefore = JSON.stringify(data.snapshot().pages)
    const base = Date.now() + 100_000
    const pages = [
      newPage({ id: 'legacy-ranked', title: 'Упорядоченная', createdAt: base + 1, homeOrder: { sectionId: null, position: -2 } }),
      newPage({ id: 'legacy-stale', title: 'С устаревшей позицией', createdAt: base + 4, homeOrder: { sectionId: 'old-section', position: -99 } }),
      newPage({ id: 'legacy-plain', title: 'Без позиции', createdAt: base + 3 }),
      newPage({ id: 'legacy-favorite', title: 'Избранная из копии', createdAt: base + 2, favorite: 1 })
    ]
    const source = homeOrder([...pages].sort((a, b) => b.createdAt - a.createdAt), null).map(p => p.title)
    expect(source).toEqual(['Упорядоченная', 'С устаревшей позицией', 'Без позиции', 'Избранная из копии'])
    const file = parseSnapshot(toJSON({ pages, sections: [], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const added = data.addSnapshot(file)
    expect(names(data, null)).toEqual([...local, ...source])
    expect(JSON.stringify(data.snapshot().pages.filter(p => !added.pages.includes(p.id)))).toBe(localBefore)
    const imported = source.map(title => data.livePages.find(p => p.title === title)!)
    expect(imported.map(p => p.homeOrder?.position)).toEqual([0, 1, 2, 3])
    expect(imported.every(p => p.homeOrder?.sectionId === null)).toBe(true)
    expect(new Set(imported.map(p => p.homeOrder?.importGroup)).size).toBe(1)
    expect(data.favorites.some(f => f.kind === 'page' && f.page.title === 'Избранная из копии')).toBe(true)
    const positions = JSON.stringify(imported.map(p => p.homeOrder))
    const target = data.createSection('Для отмены')
    const moved = data.placeHomePage(imported[2]!.id, target.id, null)!
    moved.undo()
    expect(names(data, null)).toEqual([...local, ...source])
    expect(JSON.stringify(imported.map(p => p.homeOrder))).toBe(positions)
    data.createPage({ title: 'Создана здесь' })
    expect(names(data, null)).toEqual(['Создана здесь', ...local, ...source])
    await data.flush()
    const reloaded = await tab('mf3-home-order-legacy-favorites')
    expect(names(reloaded, null)).toEqual(['Создана здесь', ...local, ...source])
    expect(reloaded.favorites.some(f => f.kind === 'page' && f.page.title === 'Избранная из копии')).toBe(true)
  })

  it('imports the full observed order across legacy pages, favourites and earlier import batches', () => {
    const batch1 = 'home-import-v1:0000000000000001:first:scope'
    const batch2 = 'home-import-v1:0000000000000002:second:scope'
    const source = [
      newPage({ id: 'source-local', title: 'Источник: создана', order: 2, createdAt: 30, homeOrder: { sectionId: null, position: -1 } }),
      newPage({ id: 'source-legacy', title: 'Источник: старая', order: 0, createdAt: 50 }),
      newPage({ id: 'source-favorite', title: 'Источник: избранная', order: 1, createdAt: 40, favorite: 0 }),
      newPage({ id: 'source-stale', title: 'Источник: устаревшая', order: 3, createdAt: 60, homeOrder: { sectionId: 'old', position: -99 } }),
      newPage({ id: 'source-first', title: 'Источник: импорт 1', order: 4, createdAt: 10, homeOrder: { sectionId: null, position: -1, importGroup: batch1 } }),
      newPage({ id: 'source-second', title: 'Источник: импорт 2', order: 5, createdAt: 70, homeOrder: { sectionId: null, position: -4, importGroup: batch2 } })
    ]
    const local = [
      newPage({ id: 'local-a', title: 'Локальная A', order: 0, createdAt: 5, homeOrder: { sectionId: null, position: 1 } }),
      newPage({ id: 'local-b', title: 'Локальная B', order: 1, createdAt: 4, homeOrder: { sectionId: null, position: 0 } }),
      newPage({ id: 'local-favorite', title: 'Локальная избранная', order: 2, createdAt: 3, favorite: 1 })
    ]
    const observed = (pages: typeof source) => homeOrder([...pages].sort((a, b) => a.order - b.order).sort((a, b) => b.createdAt - a.createdAt), null)
    const sourceOrder = observed(source).map(p => p.id)
    expect(sourceOrder).toEqual(['source-local', 'source-stale', 'source-legacy', 'source-favorite', 'source-first', 'source-second'])
    const before = JSON.stringify(local)
    const file = parseSnapshot(toJSON({ pages: source, sections: [], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const merged = mergeSnapshot({ pages: local, sections: [], records: [], learned: {} }, file)
    expect(JSON.stringify(local)).toBe(before)
    expect(observed([...local, ...merged.pages]).map(p => p.id)).toEqual([...observed(local).map(p => p.id), ...sourceOrder])
    expect(sourceOrder.map(id => merged.pages.find(p => p.id === id)?.homeOrder?.position)).toEqual([0, 1, 2, 3, 4, 5])
    expect(new Set(merged.pages.map(p => p.homeOrder?.importGroup)).size).toBe(1)
    expect(merged.pages.find(p => p.id === 'source-favorite')?.favorite).not.toBeNull()
  })

  it('matches the source store order when importing into a same-named local section', async () => {
    const source = await tab('mf3-home-order-real-source')
    const sourceSection = source.createSection('Дом из копии')
    source.createPage({ title: 'Источник A', sectionId: sourceSection.id, order: 2 })
    source.createPage({ title: 'Источник B', sectionId: sourceSection.id, order: 1, favorite: 0 })
    source.createPage({ title: 'Источник C', sectionId: sourceSection.id, order: 0, homeOrder: { sectionId: sourceSection.id, position: 4, importGroup: 'home-import-v1:0000000000000001:earlier:scope' } })
    const expected = names(source, sourceSection.id)
    const sourceBefore = JSON.stringify(source.snapshot())
    const file = parseSnapshot(toJSON({ pages: source.snapshot().pages.filter(p => p.sectionId === sourceSection.id), sections: [sourceSection], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const target = await tab('mf3-home-order-real-target')
    const targetSection = target.createSection('Дом из копии')
    const local = target.createPage({ title: 'Здесь раньше', sectionId: targetSection.id })
    const before = JSON.stringify(target.pages[local.id])
    const added = target.addSnapshot(file)
    expect(added.pages).toHaveLength(3)
    expect(names(target, targetSection.id)).toEqual(['Здесь раньше', ...expected])
    expect(JSON.stringify(target.pages[local.id])).toBe(before)
    expect(JSON.stringify(source.snapshot())).toBe(sourceBefore)
    expect(target.favorites.some(f => f.kind === 'page' && f.page.title === 'Источник B')).toBe(true)
  })

  it('restores import groups on cross-section drag undo even when a position was unchanged', async () => {
    const data = await tab('mf3-home-order-import-drag-undo')
    const from = data.createSection('Откуда')
    const to = data.createSection('Куда')
    const remoteFrom = { ...newSection('Откуда', 0), id: 'remote-from' }
    const remoteTo = { ...newSection('Куда', 1), id: 'remote-to' }
    const pages = [
      newPage({ title: 'Перенести', sectionId: remoteFrom.id, homeOrder: { sectionId: remoteFrom.id, position: 0 } }),
      newPage({ title: 'В цели', sectionId: remoteTo.id, homeOrder: { sectionId: remoteTo.id, position: 0 } })
    ]
    const file = parseSnapshot(toJSON({ pages, sections: [remoteFrom, remoteTo], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const added = data.addSnapshot(file)
    const moved = data.pages[added.pages.find(id => data.pages[id]?.title === 'Перенести')!]!
    const alreadyThere = data.pages[added.pages.find(id => data.pages[id]?.title === 'В цели')!]!
    const saved = JSON.stringify(alreadyThere.homeOrder)
    expect(position(alreadyThere)?.importGroup).toBeTruthy()
    const result = data.placeHomePage(moved.id, to.id, null)!
    expect(position(alreadyThere)?.importGroup).toBeUndefined()
    result.undo()
    expect(moved.sectionId).toBe(from.id)
    expect(JSON.stringify(alreadyThere.homeOrder)).toBe(saved)
    expect(names(data, from.id)).toEqual(['Перенести'])
    expect(names(data, to.id)).toEqual(['В цели'])
  })

  it('stops a conflicting stock import before changing pages or their order', async () => {
    const data = await tab('mf3-home-order-import-conflict')
    const page = data.createFromTemplate('shop')
    data.updatePage(page.id, { title: 'Тестовый магазин' })
    const source = {
      ...page,
      id: 'other-shop',
      homeOrder: { sectionId: page.sectionId, position: 0 },
      props: page.props.map(p => p.id === page.stocks![0]!.amountProp ? { ...p, type: 'text' as const } : p)
    }
    const file = parseSnapshot(toJSON({ pages: [source], sections: [], records: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }))
    const before = JSON.stringify(data.snapshot())
    expect(() => data.addSnapshot(file)).toThrow(StockImportConflict)
    expect(JSON.stringify(data.snapshot())).toBe(before)
  })
})
