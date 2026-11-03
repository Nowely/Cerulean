import { describe, expect, it } from 'vitest'
import { newRecord } from '../app/domain/factory'
import type { Rec, StockConfig } from '../app/domain/types'
import { stockDraft, stockEditorPatch } from '../app/components/record/stock-editor'

const stock: StockConfig = { amountProp: 'amount', normProp: 'norm', buyViewId: 'buy', stockViewId: 'stock' }
const record = (values: Rec['values'] = {}): Rec => newRecord({ id: 'r', pageId: 'p', text: 'Молоко', values }, 1)

describe('stock editor draft and patch', () => {
  it('distinguishes empty from zero and accepts comma, fractions and large finite numbers', () => {
    const rec = record({ amount: 0, norm: null })
    const initial = stockDraft(rec, stock)
    expect(initial).toEqual({ amount: '0', norm: '', unit: '' })
    expect(stockEditorPatch(rec, stock, initial, { ...initial, amount: '', norm: '0,5' }))
      .toEqual({ values: { amount: null, norm: 0.5 } })
    expect(stockEditorPatch(rec, stock, initial, { ...initial, amount: '1e308', norm: '0' }))
      .toEqual({ values: { amount: 1e308, norm: 0 } })
  })

  it('rejects the entire edit for invalid or non-finite changed numbers', () => {
    const rec = record({ amount: 1, norm: 2 })
    const initial = stockDraft(rec, stock)
    for (const invalid of ['-1', 'Infinity', '1e309', '1,2,3', 'abc', '.', '0x10']) {
      expect(stockEditorPatch(rec, stock, initial, { ...initial, amount: invalid, unit: 'л' })).toBeNull()
      expect(stockEditorPatch(rec, stock, initial, { ...initial, norm: invalid, unit: 'л' })).toBeNull()
    }
    expect(rec).toEqual(record({ amount: 1, norm: 2 }))
  })

  it('preserves unchanged legacy negatives and large numbers while changing another field', () => {
    const rec = record({ amount: -1234, norm: Number.MAX_VALUE })
    const initial = stockDraft(rec, stock)
    expect(stockEditorPatch(rec, stock, initial, { ...initial, unit: 'уп' })).toEqual({ stockUnits: { amount: 'уп' } })
    expect(stockEditorPatch(rec, stock, initial, { ...initial, norm: '5' })).toEqual({ values: { amount: -1234, norm: 5 } })
    expect(stockEditorPatch(rec, stock, initial, { ...initial, amount: '-1234,0' })).toBeNull()
  })

  it('clears an override without changing numbers, and leaves an unchanged form alone', () => {
    const rec = { ...record({ amount: 3, norm: 5 }), stockUnits: { amount: 'л', other: 'кг' } }
    const initial = stockDraft(rec, stock)
    expect(stockEditorPatch(rec, stock, initial, initial)).toEqual({})
    expect(stockEditorPatch(rec, stock, initial, { ...initial, unit: ' ' })).toEqual({ stockUnits: { other: 'кг' } })
  })

  it('merges edited fields into the latest record and applies domain low-stock behavior', () => {
    const original = { ...record({ amount: 3, norm: 5, other: 1 }), done: true, stockUnits: { amount: 'л', other: 'кг' } }
    const initial = stockDraft(original, stock)
    const current = { ...original, values: { amount: 7, norm: 8, other: 99 }, stockUnits: { amount: 'уп', other: 'м' }, text: 'Новое имя' }
    expect(stockEditorPatch(current, stock, initial, { ...initial, amount: '0,5' })).toEqual({
      values: { amount: 0.5, norm: 8, other: 99 }, done: false
    })
    expect(stockEditorPatch(current, stock, initial, { ...initial, unit: 'шт' })).toEqual({ stockUnits: { amount: 'шт', other: 'м' } })
    expect(stockEditorPatch(current, stock, initial, initial)).toEqual({})
  })
})
