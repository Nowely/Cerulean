import { describe, expect, it } from 'vitest'
import { newPage, newRecord } from '../app/domain/factory'
import { enableStock } from '../app/domain/stock'
import type { Rec, StockConfig } from '../app/domain/types'
import { stepperPatch, stepperText } from '../app/components/record/stock-stepper'

const stock: StockConfig = { amountProp: 'amount', normProp: 'norm', buyViewId: 'buy', stockViewId: 'stock' }
const page = () => enableStock(newPage({ id: 'page' }, 1), { amount: 'amount', norm: 'norm', buy: 'buy', stock: 'stock' })
const record = (values: Rec['values'], extra: Partial<Rec> = {}) => newRecord({ id: 'r', pageId: 'page', text: 'Кола', values, ...extra }, 1)

describe('stock stepper', () => {
  it('formats closed and open values with the record unit and decimal comma', () => {
    const p = page()
    const rec = record({ amount: 0.5, norm: 2 })
    expect(stepperText(rec, p, stock, false)).toBe('0,5/2')
    expect(stepperText(rec, p, stock, true)).toBe('0,5/2 шт')
    const custom = { ...rec, stockUnits: { amount: 'уп' } }
    expect(stepperText(custom, p, stock, false)).toBe('0,5/2 уп')
    expect(stepperText(custom, p, stock, true)).toBe('0,5/2 уп')
    expect(stepperText(record({ amount: 2 }), p, stock, false)).toBe('2/—')
    expect(stepperText(record({ amount: null, norm: 2 }), p, stock, false)).toBe('')
  })

  it('uses the current record, preserves unrelated fields and units, and reports only entering low', () => {
    const rec = record({ amount: 2, norm: 5, other: 42 }, { done: true, stockUnits: { amount: 'уп' } })
    const before = structuredClone(rec)
    const change = stepperPatch(page(), rec, stock, -1, false)
    expect(change).toEqual({ patch: { values: { amount: 1, norm: 5, other: 42 }, done: false }, becameLow: true })
    expect(rec).toEqual(before)
    const low = { ...rec, ...change!.patch }
    expect(stepperPatch(page(), low, stock, -1, false)).toEqual({ patch: { values: { amount: 0, norm: 5, other: 42 } }, becameLow: false })
    expect(stepperPatch(page(), low, stock, 1, false)?.becameLow).toBe(false)
    expect(low.stockUnits).toEqual({ amount: 'уп' })
  })

  it('uses domain steps for fractions, zero and legacy values without clipping', () => {
    const p = page()
    expect(stepperPatch(p, record({ amount: 0.5, norm: 2 }), stock, -1, false)?.patch.values?.amount).toBe(0)
    expect(stepperPatch(p, record({ amount: 0, norm: 2 }), stock, -1, false)).toBeNull()
    expect(stepperPatch(p, record({ amount: -10, norm: 2 }), stock, -1, false)).toBeNull()
    expect(stepperPatch(p, record({ amount: -10, norm: 2 }), stock, 1, false)).toBeNull()
    expect(stepperPatch(p, record({ amount: 1000, norm: 2000 }), stock, 1, false)?.patch.values?.amount).toBe(1001)
    expect(stepperPatch(p, record({ amount: Number.MAX_VALUE, norm: 2 }), stock, 1, false)).toBeNull()
  })

  it('refuses missing, conflicting, deleted or moved data without writing a patch', () => {
    const p = page()
    const rec = record({ amount: 2, norm: 5 })
    expect(stepperPatch(undefined, rec, stock, -1, false)).toBeNull()
    expect(stepperPatch(p, undefined, stock, -1, false)).toBeNull()
    expect(stepperPatch(p, rec, stock, -1, true)).toBeNull()
    expect(stepperPatch({ ...p, deletedAt: 1 }, rec, stock, -1, false)).toBeNull()
    expect(stepperPatch(p, { ...rec, deletedAt: 1 }, stock, -1, false)).toBeNull()
    expect(stepperPatch(p, { ...rec, pageId: 'elsewhere' }, stock, -1, false)).toBeNull()
    expect(stepperPatch({ ...p, props: p.props.filter(prop => prop.id !== 'norm') }, rec, stock, -1, false)).toBeNull()
    expect(stepperPatch({ ...p, stocks: [] }, rec, stock, -1, false)).toBeNull()
    expect(stepperPatch({ ...p, stocks: [stock, { ...stock, normProp: 'other' }] }, rec, stock, -1, false)).toBeNull()
    expect(stepperPatch({ ...p, stocks: [{ ...stock, buyViewId: 'other' }] }, rec, stock, -1, false)).toBeNull()
    expect(stepperPatch(p, record({ norm: 5 }), stock, -1, false)).toBeNull()
  })
})
