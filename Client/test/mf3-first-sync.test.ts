import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DATA_KEY, emptySide, fileOf, firstMerge, mergeSides, parseFile, type Side } from '~/domain/bucket'
import { firstRun } from '~/domain/seed'
import { enableStock } from '~/domain/stock'
import type { Page, Rec } from '~/domain/types'
import { useCloudStore } from '~/stores/cloud'
import { useDataStore } from '~/stores/data'
import { fakeS3 } from './fakeS3'

const side = (at: number): Side => ({ ...emptySide(), ...firstRun(at) })
const pageNamed = (s: Side, name: string) => s.pages.find(p => p.title === name)!

function preservedOnBothSides(changed: Side, other: Side, page: Page, record?: Rec) {
  const before = JSON.stringify([changed, other])
  const forward = firstMerge(changed, other)
  expect(forward.dropped.pages).not.toContain(page.id)
  expect(forward.here.pages.find(p => p.id === page.id)).toEqual(page)
  if (record) {
    expect(forward.dropped.records).not.toContain(record.id)
    expect(forward.here.records.find(r => r.id === record.id)).toEqual(record)
  }
  const reverse = firstMerge(other, changed)
  expect(reverse.retired.pages[page.id]).toBeUndefined()
  if (record) expect(reverse.retired.records[record.id]).toBeUndefined()
  const incoming = mergeSides(reverse.here, changed)
  expect(incoming.take.pages).toContainEqual(page)
  if (record) expect(incoming.take.records).toContainEqual(record)
  expect(JSON.stringify([changed, other])).toBe(before)
}

describe('first connect preserves pages and examples', () => {
  it.each(['stocks', 'departmentMemory', 'views', 'description', 'props', 'favorite', 'homeOrder'] as const)(
    'keeps a page with changed %s', (field) => {
      const changed = side(100)
      const other = side(200)
      const index = changed.pages.findIndex(p => p.title === 'Задачи')
      const page = changed.pages[index]!
      switch (field) {
        case 'stocks':
          changed.pages[index] = enableStock(page, { amount: 'amount', norm: 'norm', buy: 'buy', stock: 'stock' })
          break
        case 'departmentMemory':
          page.departmentMemory = { department: { молоко: 'dairy' } }
          break
        case 'views':
          page.views = page.views.map((v, i) => i === 0 ? { ...v, name: 'Мой вид' } : v)
          break
        case 'description':
          page.description = 'Мои правила'
          break
        case 'props':
          page.props = [...page.props, { id: 'custom', name: 'Моё свойство', type: 'text' }]
          break
        case 'favorite':
          page.favorite = 0
          break
        case 'homeOrder':
          page.homeOrder = { sectionId: null, position: 3 }
          break
      }
      const result = changed.pages[index]!
      if (field === 'stocks' || field === 'views' || field === 'description' || field === 'props') result.updatedAt = 300
      else delete result.updatedAt
      preservedOnBothSides(changed, other, result)
    }
  )

  it.each(['text', 'note', 'done', 'deletedAt'] as const)(
    'keeps a seed record with a stamped change to %s', (field) => {
      const changed = side(100)
      const other = side(200)
      const record = changed.records[0]!
      if (field === 'text') record.text = 'Моя запись'
      if (field === 'note') record.note = 'Моя заметка'
      if (field === 'done') record.done = true
      if (field === 'deletedAt') record.deletedAt = 123
      record.updatedAt = 300
      preservedOnBothSides(changed, other, changed.pages.find(p => p.id === record.pageId)!, record)
    }
  )

  it('deduplicates untouched starters, including the shopping template with stock', () => {
    const a = side(100)
    const b = side(100)
    const first = firstMerge(a, b)
    for (const name of ['Задачи', 'Покупки', 'Идеи', 'Быстрый старт']) {
      const pageA = pageNamed(a, name)
      expect(pageA.id).not.toBe(pageNamed(b, name).id)
      expect(first.dropped.pages).toContain(pageA.id)
    }
    expect(pageNamed(a, 'Покупки').stocks?.length).toBeGreaterThan(0)
    const same = firstMerge(a, a)
    expect(same.added).toEqual({ pages: 0, records: 0 })
    expect(mergeSides(same.here, a).take.pages).toEqual([])
  })

  it('stamps a manual department choice through the real store', () => {
    setActivePinia(createPinia())
    const data = useDataStore()
    const page = data.createFromTemplate('shop')
    const department = page.props.find(p => p.name === 'Отдел')!
    const option = department.options![0]!
    const record = data.addRecord({ pageId: page.id, text: 'Хлеб' })
    delete page.updatedAt
    data.teachDepartment(record.id, department.id, undefined, option.id)
    expect(page.updatedAt).toEqual(expect.any(Number))
    expect(page.departmentMemory?.[department.id]).toBeDefined()
    const changed = { ...emptySide(), pages: [page] }
    const other = { ...emptySide(), pages: [pageNamed(side(200), 'Покупки')] }
    preservedOnBothSides(changed, other, page)
  })
})

describe('first connect with a fake Yandex bucket', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps configured pages and edited seed records on both sides without sending secrets', async () => {
    const keyId = 'fake-key-id'
    const secret = 'fake-secret-only-for-this-test'
    const modelKey = 'fake-model-key-only-for-this-test'
    const bucket = 'fake-first-sync'
    const s3 = fakeS3({ [keyId]: secret })
    vi.stubGlobal('fetch', s3.fetch)

    const remote = side(100)
    const remotePage = pageNamed(remote, 'Задачи')
    remotePage.departmentMemory = { department: { хлеб: 'bread' } }
    const remoteSeed = remote.records[0]!
    remoteSeed.text = 'Удалённый пример изменён'
    remoteSeed.deletedAt = 123
    remoteSeed.updatedAt = 300
    s3.objects.set(`${bucket}/${DATA_KEY}`, { body: JSON.stringify(fileOf(remote)), etag: '"initial"' })

    const pinia = createPinia()
    setActivePinia(pinia)
    const data = useDataStore(pinia)
    await data.init({ dbName: 'mf3-first-sync-fake-bucket' })
    const localPage = Object.values(data.pages).find(p => p.title === 'Задачи')!
    const configured = enableStock(localPage, { amount: 'fake-amount', norm: 'fake-norm', buy: 'fake-buy', stock: 'fake-stock' })
    data.updatePage(localPage.id, { props: configured.props, views: configured.views, stocks: configured.stocks, description: 'Локальные правила' })
    expect(localPage.updatedAt).toEqual(expect.any(Number))
    data.setSettings({ apiKey: modelKey })
    const localSeed = Object.values(data.records).find(r => r.seed)!
    data.updateRecord(localSeed.id, { note: 'Локальная заметка', done: true })
    expect(localSeed.updatedAt).toEqual(expect.any(Number))
    const cloud = useCloudStore(pinia)
    const result = await cloud.connect({ bucket, keyId, secret })
    expect(result.ok).toBe(true)
    await cloud.roundTrip()

    expect(data.pages[localPage.id]?.description).toBe('Локальные правила')
    expect(data.pages[localPage.id]?.stocks).toEqual(configured.stocks)
    expect(data.pages[remotePage.id]?.departmentMemory).toEqual(remotePage.departmentMemory)
    expect(data.records[localSeed.id]).toMatchObject({ note: 'Локальная заметка', done: true })
    expect(data.records[remoteSeed.id]).toMatchObject({ text: remoteSeed.text, deletedAt: 123 })
    const body = s3.objects.get(`${bucket}/${DATA_KEY}`)!.body
    const saved = parseFile(body).side
    expect(saved.pages.map(p => p.id)).toEqual(expect.arrayContaining([localPage.id, remotePage.id]))
    expect(saved.records.map(r => r.id)).toEqual(expect.arrayContaining([localSeed.id, remoteSeed.id]))
    expect(saved.pages.find(p => p.id === localPage.id)).toMatchObject({ description: 'Локальные правила', stocks: configured.stocks })
    expect(saved.pages.find(p => p.id === remotePage.id)?.departmentMemory).toEqual(remotePage.departmentMemory)
    expect(saved.records.find(r => r.id === localSeed.id)).toMatchObject({ note: 'Локальная заметка', done: true })
    expect(saved.records.find(r => r.id === remoteSeed.id)).toMatchObject({ text: remoteSeed.text, deletedAt: 123 })
    expect(saved.gone.pages[remotePage.id]).toBeUndefined()
    expect(saved.gone.records[remoteSeed.id]).toBeUndefined()
    for (const object of s3.objects.values()) {
      expect(object.body).not.toContain(secret)
      expect(object.body).not.toContain(keyId)
      expect(object.body).not.toContain(modelKey)
    }
    cloud.disconnect()
  })
})
