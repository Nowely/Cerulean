import { describe, expect, it } from 'vitest'
import { newPage, newRecord } from '../app/domain/factory'
import { enableStock } from '../app/domain/stock'
import { collected, collects } from '../app/domain/collect'
import { filterRecords } from '../app/domain/views'

describe('stock views and collecting', () => {
  it('keeps the stock filter and records unchanged when a source is selected', () => {
    const page = enableStock(newPage({ id: 'shop' }, 1), { amount: 'amount', norm: 'norm', buy: 'buy', stock: 'stock' })
    const buy = page.views.find(v => v.id === 'buy')!
    const stock = page.views.find(v => v.id === 'stock')!
    const own = newRecord({ id: 'own', pageId: 'shop', text: 'Молоко', values: { amount: 1, norm: 5 } }, 1)
    const full = newRecord({ id: 'full', pageId: 'shop', text: 'Кола', values: { amount: 4, norm: 5 } }, 1)
    const outside = newRecord({ id: 'outside', pageId: 'other', text: 'Хлеб', values: {} }, 1)
    const records = [own, full, outside]
    const before = JSON.stringify({ page, records })
    const all = { ...buy, from: 'all' as const }
    const picked = { ...buy, from: 'pick' as const, pages: ['other'] }
    expect(collects(buy)).toBe(false)
    expect(collects(all)).toBe(true)
    expect(collected(all, records, 1).map(r => r.id)).toEqual(['own', 'outside'])
    expect(collected(picked, records, 1).map(r => r.id)).toEqual(['outside'])
    expect(filterRecords(records.filter(r => r.pageId === 'shop'), buy).map(r => r.id)).toEqual(['own'])
    expect(collected({ ...stock, from: 'all' }, records, 1).map(r => r.id)).toEqual(['own', 'full'])
    expect(all.stock).toEqual(buy.stock)
    expect(all.filter).toEqual(buy.filter)
    expect(JSON.stringify({ page, records })).toBe(before)
  })
})
