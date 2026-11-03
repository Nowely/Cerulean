import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_SETTINGS, newPage, newRecord } from '../app/domain/factory'
import { listView } from '../app/domain/templates'
import { enableStock, purchaseStock, removePageView, restoreStockView, stockView, undoPageView } from '../app/domain/stock'
import { mergeSnapshot, parseSnapshot, toJSON, type Snapshot } from '../app/domain/export'
import { DATA_KEY, emptySide, fileOf, mergeSides, parseFile } from '../app/domain/bucket'
import { stepperPatch } from '../app/components/record/stock-stepper'
import type { Page } from '../app/domain/types'
import { useDataStore } from '../app/stores/data'
import { useCloudStore } from '../app/stores/cloud'
import { fakeS3 } from './fakeS3'

const makePage = () => enableStock(newPage({ id: 'p', title: 'Покупки', views: [listView('Мой вид', { id: 'custom', sort: 'name' })] }, 1),
  { amount: 'amount', norm: 'norm', buy: 'buy', stock: 'stock' })
const snap = (page: Page): Snapshot => ({ app: 'cerulean', version: 1, exportedAt: 1, pages: [page], records: [], sections: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} })
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('stock views', () => {
  it.each(['buy', 'stock'])('removes %s alone and undoes without overwriting later changes', (id) => {
    const original = makePage()
    const gone = removePageView(original, id)!
    expect(gone.page.props).toEqual(original.props)
    expect(gone.page.views).toEqual(original.views.filter(v => v.id !== id))
    expect(gone.page.stocks![0]![id === 'buy' ? 'buyViewId' : 'stockViewId']).toBeUndefined()
    const edited = { ...gone.page, views: gone.page.views.map(v => v.id === 'custom' ? { ...v, name: 'Позднее изменение' } : v) }
    const undone = undoPageView(edited, gone.removed)!
    expect(undone.views.find(v => v.id === id)).toEqual(original.views.find(v => v.id === id))
    expect(undone.views.find(v => v.id === 'custom')?.name).toBe('Позднее изменение')
    expect(undone.stocks).toEqual(original.stocks)
  })

  it('restores both explicitly, gives unique names, and refuses a conflicting undo', () => {
    const initial = makePage()
    const first = removePageView(initial, 'buy')!
    const second = removePageView(first.page, 'stock')!
    const page = { ...second.page, views: [...second.page.views, listView('Купить', { id: 'ordinary' }), listView('Запасы', { id: 'ordinary2' })] }
    const buy = restoreStockView(page, page.stocks![0]!, 'buy', 'new-buy')!
    const both = restoreStockView(buy, buy.stocks![0]!, 'stock', 'new-stock')!
    expect(both.views.slice(-2).map(v => v.name)).toEqual(['Купить 2', 'Запасы 2'])
    expect(both.props).toEqual(initial.props)
    expect(stockView(both, both.stocks![0]!, 'buy')?.id).toBe('new-buy')
    expect(undoPageView(both, first.removed)).toBeNull()
    expect(undoPageView(both, second.removed)).toBeNull()
    expect(restoreStockView(both, both.stocks![0]!, 'buy', 'again')).toBeNull()
  })

  it.each([['buy'], ['stock'], ['buy', 'stock']])('imports with missing views %s and retains the pair', (...ids) => {
    const source = ids.reduce((p, id) => removePageView(p, id)!.page, makePage())
    const here = { pages: [newPage({ id: 'target', title: 'Покупки' }, 1)], records: [], sections: [], learned: {} }
    const result = mergeSnapshot(here, snap(source))
    const merged = result.changed[0]!
    expect(merged.stocks).toHaveLength(1)
    expect(merged.props.find(p => p.id === 'amount')?.normProp).toBe('norm')
    for (const mode of ['buy', 'stock'] as const) expect(!!stockView(merged, merged.stocks![0]!, mode)).toBe(!ids.includes(mode))
  })

  it('reads old dangling IDs as missing without binding an unrelated view', () => {
    const initial = makePage()
    const legacy = { ...initial, views: initial.views.filter(v => v.id !== 'buy' && v.id !== 'stock') }
    const parsed = parseSnapshot(toJSON(snap(legacy)))
    expect(parsed.pages[0]!.stocks).toEqual([{ amountProp: 'amount', normProp: 'norm' }])
    const result = mergeSnapshot({ pages: [newPage({ id: 'target', title: 'Покупки' }, 1)], records: [], sections: [], learned: {} }, snap(legacy))
    expect(result.changed[0]!.stocks).toEqual([{ amountProp: 'amount', normProp: 'norm' }])
    expect(restoreStockView(legacy, legacy.stocks![0]!, 'buy', 'new')?.stocks![0]?.buyViewId).toBe('new')
  })

  it('keeps optional references through fake bucket sync, buying and stepper', () => {
    const p = { ...removePageView(makePage(), 'stock')!.page, updatedAt: 10 }
    const record = newRecord({ id: 'r', pageId: p.id, text: 'Молоко', values: { amount: 1, norm: 5 } }, 1)
    const remote = parseFile(JSON.stringify(fileOf({ ...emptySide(), pages: [p], records: [record] }, 11))).side
    expect(mergeSides(emptySide(), remote).take.pages).toEqual([p])
    expect(stepperPatch(p, record, p.stocks![0]!, -1, false)?.patch.values).toEqual({ amount: 0, norm: 5 })
    expect(purchaseStock(record, p.stocks![0]!, 12)?.values).toEqual({ amount: 5, norm: 5 })
  })

  it('does not refill when a stale purchase context names a deleted view', () => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    const data = useDataStore()
    const page = removePageView(makePage(), 'buy')!.page
    data.pages[page.id] = page
    const rec = data.addRecord({ pageId: page.id, text: 'Молоко', values: { amount: 0, norm: 5 } })
    data.toggleDone(rec.id, { pageId: page.id, viewId: 'buy' })
    expect(rec.values.amount).toBe(0)
    expect(rec.done).toBe(false)
  })

  it('syncs deletion and explicit restore through a fake S3 bucket without changing a product', async () => {
    const s3 = fakeS3({ 'fake-id': 'fake-secret' })
    vi.stubGlobal('fetch', s3.fetch)
    const pinia = createPinia()
    setActivePinia(pinia)
    const data = useDataStore(pinia)
    await data.init({ dbName: 'mf3-stock-views-fake-bucket' })
    const page = data.createPage(makePage())
    const rec = data.addRecord({ pageId: page.id, text: 'Товар', values: { amount: 2, norm: 5 }, stockUnits: { amount: 'л' } })
    const cloud = useCloudStore(pinia)
    expect((await cloud.connect({ bucket: 'fake-stock-views', keyId: 'fake-id', secret: 'fake-secret' })).ok).toBe(true)
    const removed = removePageView(data.pages[page.id]!, 'buy')!
    data.updatePage(page.id, { views: removed.page.views, stocks: removed.page.stocks })
    await cloud.roundTrip()
    const bucketPage = () => parseFile(s3.objects.get(`fake-stock-views/${DATA_KEY}`)!.body).side.pages.find(p => p.id === page.id)!
    expect(bucketPage().stocks![0]!.buyViewId).toBeUndefined()
    const restored = restoreStockView(data.pages[page.id]!, data.pages[page.id]!.stocks![0]!, 'buy', 'restored')!
    data.updatePage(page.id, { views: restored.views, stocks: restored.stocks })
    await cloud.roundTrip()
    expect(bucketPage().stocks![0]!.buyViewId).toBe('restored')
    const bucketRecord = parseFile(s3.objects.get(`fake-stock-views/${DATA_KEY}`)!.body).side.records.find(r => r.id === rec.id)!
    expect(bucketRecord.values).toEqual({ amount: 2, norm: 5 })
    expect(bucketRecord.stockUnits).toEqual({ amount: 'л' })
    cloud.disconnect()
  })
})
