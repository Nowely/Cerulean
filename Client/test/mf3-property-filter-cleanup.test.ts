import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useCloudStore } from '~/stores/cloud'
import { enableStock } from '~/domain/stock'
import { newPage } from '~/domain/factory'
import { listView } from '~/domain/templates'
import { DATA_KEY, emptySide, fileOf, mergeSides, type Side } from '~/domain/bucket'
import { fakeS3 } from './fakeS3'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
let number = 0

async function world() {
  setActivePinia(createPinia())
  const data = useDataStore()
  const dbName = `mf3-property-filter-${++number}`
  await data.init({ dbName })
  const initial = newPage({ title: 'Фильтры', props: [
    { id: 'colour', name: 'Цвет', type: 'select', options: [{ id: 'red', name: 'Красный' }, { id: 'blue', name: 'Синий' }, { id: 'green', name: 'Зелёный' }] },
    { id: 'room', name: 'Комната', type: 'select', options: [{ id: 'kitchen', name: 'Кухня' }] }
  ], views: [
    listView('Один', { id: 'one', filter: [{ field: 'done', op: 'is', value: false }], selectFilters: { colour: ['red', 'blue'], room: ['kitchen'] } }),
    listView('Два', { id: 'two', filter: [{ field: 'colour', op: 'notEmpty' }], selectFilters: { colour: ['red'] } }),
    listView('Три', { id: 'three', selectFilters: { colour: ['green'], room: ['kitchen'] } })
  ] })
  const withStock = enableStock(enableStock(initial, { amount: 'left1', norm: 'norm1', buy: 'buy1', stock: 'stock1' }),
    { amount: 'left2', norm: 'norm2', buy: 'buy2', stock: 'stock2' })
  const page = data.createPage(withStock)
  const a = data.addRecord({ pageId: page.id, text: 'A', values: { colour: 'red', room: 'kitchen', left1: 1, norm1: 5, left2: 2, norm2: 3 }, stockUnits: { left1: 'л', left2: 'уп' }, stockBuy: { left1: true, left2: false } })
  const b = data.addRecord({ pageId: page.id, text: 'B', values: { colour: 'blue', room: 'kitchen' } })
  const trash = data.addRecord({ pageId: page.id, text: 'Trash', deletedAt: Date.now(), values: { colour: 'red' } })
  await data.flush()
  return { data, pageId: page.id, a: a.id, b: b.id, trash: trash.id, dbName }
}

describe('mf3 property filter cleanup', () => {
  it('removes only the selected option from each view, with values and undo including trash', async () => {
    const { data, pageId, a, b, trash } = await world()
    const page = () => data.pages[pageId]!
    const before = clone(page())
    const records = clone([data.records[a], data.records[b], data.records[trash]])
    const result = data.removeOption(pageId, 'colour', 'red')!
    expect(result.count).toBe(1)
    expect(page().views[0]!.selectFilters).toEqual({ colour: ['blue'], room: ['kitchen'] })
    expect(page().views[1]!.selectFilters).toEqual({})
    expect(page().views[2]!.selectFilters).toEqual({ colour: ['green'], room: ['kitchen'] })
    expect(page().views.slice(3)).toEqual(before.views.slice(3))
    expect(page().stocks).toEqual(before.stocks)
    expect(data.records[a]!.values.colour).toBeUndefined()
    expect(data.records[trash]!.values.colour).toBeUndefined()
    expect(data.records[b]!.values.colour).toBe('blue')
    expect(data.records[a]!.stockUnits).toEqual(records[0]!.stockUnits)
    expect(data.records[a]!.stockBuy).toEqual(records[0]!.stockBuy)
    result.undo()
    expect(page().props).toEqual(before.props)
    expect(page().views).toEqual(before.views)
    expect([a, b, trash].map(id => data.records[id]!.values)).toEqual(records.map(r => r!.values))
  })

  it.each(['remove', 'retype'] as const)('%s clears the affected property only and undo restores views and values', async (operation) => {
    const { data, pageId, a, b, trash, dbName } = await world()
    const before = clone(data.pages[pageId]!)
    const records = clone([data.records[a], data.records[b], data.records[trash]])
    const result = operation === 'remove' ? data.removeProp(pageId, 'colour')! : data.retypeProp(pageId, 'colour', 'number')!
    const page = data.pages[pageId]!
    expect(page.views[0]!.selectFilters).toEqual({ room: ['kitchen'] })
    expect(page.views[1]!.selectFilters).toEqual({})
    expect(page.views[2]!.selectFilters).toEqual({ room: ['kitchen'] })
    expect(page.views[0]!.filter).toEqual(before.views[0]!.filter)
    expect(page.views[1]!.filter).toEqual(operation === 'remove' ? [] : before.views[1]!.filter)
    expect(page.stocks).toEqual(before.stocks)
    expect(page.views.slice(3)).toEqual(before.views.slice(3))
    expect(data.records[a]!.stockUnits).toEqual(records[0]!.stockUnits)
    expect(data.records[a]!.stockBuy).toEqual(records[0]!.stockBuy)
    const updatedAt = page.updatedAt!
    result.undo()
    expect(data.pages[pageId]!.updatedAt).toBeGreaterThan(updatedAt)
    expect(data.pages[pageId]!.props).toEqual(before.props)
    expect(data.pages[pageId]!.views).toEqual(before.views)
    expect([a, b, trash].map(id => data.records[id]!.values)).toEqual(records.map(r => r!.values))
    await data.flush()
    setActivePinia(createPinia())
    const reloaded = useDataStore()
    await reloaded.init({ dbName })
    expect(reloaded.pages[pageId]!.views).toEqual(before.views)
    expect([a, b, trash].map(id => reloaded.records[id]!.values)).toEqual(records.map(r => r!.values))
  })

  it('keeps other properties and choice rules when the new type supports choices', async () => {
    const { data, pageId } = await world()
    data.updateProp(pageId, 'colour', { type: 'text' })
    const selections = clone(data.pages[pageId]!.views.map(v => v.selectFilters))
    data.retypeProp(pageId, 'colour', 'select')
    expect(clone(data.pages[pageId]!.views.map(v => v.selectFilters))).toEqual(selections)
  })

  it('restores a removed selection even when retyping converts every value without a drop', async () => {
    const { data, pageId } = await world()
    const before = clone(data.pages[pageId]!.views)
    const result = data.retypeProp(pageId, 'colour', 'text')!
    expect(result.dropped).toBe(0)
    expect(result.filtersRemoved).toBe(3)
    expect(data.pages[pageId]!.views[0]!.selectFilters).toEqual({ room: ['kitchen'] })
    result.undo()
    expect(data.pages[pageId]!.views).toEqual(before)
  })

  it('reports no removed filter for empty or unrelated selections and when the new type supports choices', async () => {
    const { data, pageId } = await world()
    const page = data.pages[pageId]!
    data.updatePage(pageId, { views: page.views.map(v => ({ ...v, selectFilters: { colour: [], room: ['kitchen'] } })) })
    const toText = data.retypeProp(pageId, 'colour', 'text')!
    expect(toText.dropped).toBe(0)
    expect(toText.filtersRemoved).toBe(0)
    expect(data.retypeProp(pageId, 'colour', 'select')!.filtersRemoved).toBe(0)
  })

  it('reports both dropped values and removed filters while preserving unrelated later record and page fields on undo', async () => {
    const { data, pageId, a } = await world()
    const before = clone(data.pages[pageId]!.views)
    const result = data.retypeProp(pageId, 'colour', 'number')!
    expect(result.dropped).toBe(2)
    expect(result.filtersRemoved).toBe(3)
    data.updatePage(pageId, { description: 'новое описание' })
    data.updateRecord(a, { note: 'новая заметка', values: { ...data.records[a]!.values, room: 'другая' } })
    result.undo()
    expect(data.pages[pageId]!.description).toBe('новое описание')
    expect(data.pages[pageId]!.views).toEqual(before)
    expect(data.records[a]!.note).toBe('новая заметка')
    expect(data.records[a]!.values).toMatchObject({ colour: 'red', room: 'другая' })
  })

  it('stamps deletion and undo as later versions for S3 merge', async () => {
    const { data, pageId } = await world()
    const before = clone(data.pages[pageId]!)
    const result = data.removeOption(pageId, 'colour', 'red')!
    const changed = clone(data.pages[pageId]!)
    expect(changed.updatedAt!).toBeGreaterThan(before.updatedAt!)
    const local = { ...emptySide(), pages: [changed] }
    const remote = { ...emptySide(), pages: [before] }
    const synced = mergeSides(remote, local)
    expect(synced.take.pages[0]!.views[0]!.selectFilters).toEqual({ colour: ['blue'], room: ['kitchen'] })
    expect(fileOf(local).pages[0]!.views[0]!.selectFilters).toEqual({ colour: ['blue'], room: ['kitchen'] })
    result.undo()
    const restored = data.pages[pageId]!
    expect(restored.updatedAt!).toBeGreaterThan(changed.updatedAt!)
    expect(mergeSides(local, { ...emptySide(), pages: [clone(restored)] }).take.pages[0]!.views).toEqual(before.views)
  })

  it('syncs option cleanup and its undo to a fake S3 bucket', async () => {
    const { data, pageId } = await world()
    const keyId = 'YCAJEtestkey'
    const secret = 'YCPtestsecret0042'
    const s3 = fakeS3({ [keyId]: secret })
    vi.stubGlobal('fetch', s3.fetch)
    const cloud = useCloudStore()
    try {
      cloud.start()
      expect((await cloud.connect({ bucket: 'cerulean-test', keyId, secret })).ok).toBe(true)
      const result = data.removeOption(pageId, 'colour', 'red')!
      await cloud.roundTrip()
      const read = () => (JSON.parse(s3.objects.get(`cerulean-test/${DATA_KEY}`)!.body) as Side).pages.find(p => p.id === pageId)!
      expect(read().views[0]!.selectFilters).toEqual({ colour: ['blue'], room: ['kitchen'] })
      result.undo()
      await cloud.roundTrip()
      expect(read().views[0]!.selectFilters).toEqual({ colour: ['red', 'blue'], room: ['kitchen'] })
    } finally {
      cloud.disconnect()
      vi.unstubAllGlobals()
    }
  })
})
