import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { newPage } from '~/domain/factory'
import { enableStock, stockLow } from '~/domain/stock'
import { filterRecords } from '~/domain/views'
import { LEAVE_MS, useDataStore } from '~/stores/data'
import { stepperPatch } from '~/components/record/stock-stepper'
import type { Rec } from '~/domain/types'

function setup(values: Rec['values'] = { amount: 0, norm: 1 }, extra: Partial<Rec> = {}) {
  setActivePinia(createPinia())
  const data = useDataStore()
  const page = enableStock(newPage({ id: 'p', hasDone: true }, 1), { amount: 'amount', norm: 'norm', buy: 'buy', stock: 'stock' })
  data.pages[page.id] = page
  const rec = data.addRecord({ pageId: page.id, text: 'Кола', values, ...extra })
  return { data, page: data.pages.p!, rec, context: { pageId: 'p', viewId: 'buy' } }
}

afterEach(() => vi.useRealTimers())

describe('stock purchase', () => {
  it('refills 0/1, keeps the unit, and retains the previous filtered membership until timeout', () => {
    vi.useFakeTimers()
    const { data, page, rec, context } = setup({ amount: 0, norm: 1 }, { stockUnits: { amount: 'уп' } })
    const buy = page.views.find(v => v.id === 'buy')!
    const stock = page.views.find(v => v.id === 'stock')!
    const done = { ...buy, stock: undefined, filter: [{ field: 'done' as const, op: 'is' as const, value: true }] }
    data.toggleDone(rec.id, context)
    expect(rec.values.amount).toBe(1)
    expect(rec.stockUnits).toEqual({ amount: 'уп' })
    expect(rec.done).toBe(true)
    expect(data.leaving).toEqual({ [rec.id]: false })
    expect(filterRecords([rec], buy, data.leaving)).toEqual([rec])
    expect(filterRecords([rec], stock, data.leaving)).toEqual([rec])
    expect(filterRecords([rec], done, data.leaving)).toEqual([])
    const amountFilter = { ...buy, filter: [...buy.filter, { field: 'amount', op: 'is' as const, value: 0 }] }
    expect(filterRecords([rec], amountFilter, data.leaving)).toEqual([rec])
    vi.advanceTimersByTime(LEAVE_MS)
    expect(filterRecords([rec], buy, data.leaving)).toEqual([])
    expect(filterRecords([rec], done, data.leaving)).toEqual([rec])
  })

  it('undoes a forced full purchase without losing other edits or custom units', () => {
    vi.useFakeTimers()
    const { data, page, rec, context } = setup({ amount: 5, norm: 5, other: 2 }, { stockBuy: { amount: true, other: true }, stockUnits: { amount: 'л' } })
    const buy = page.views.find(v => v.id === 'buy')!
    data.toggleDone(rec.id, context)
    expect(rec.stockBuy).toEqual({ other: true })
    expect(filterRecords([rec], buy, data.leaving)).toEqual([rec])
    data.updateRecord(rec.id, { text: 'Новое', values: { ...rec.values, other: 8 }, stockUnits: { amount: 'уп' }, stockBuy: { ...rec.stockBuy, later: true } })
    expect(data.toggleDone(rec.id, context)).toBeUndefined()
    expect(rec).toMatchObject({ text: 'Новое', done: false, values: { amount: 5, norm: 5, other: 8 }, stockUnits: { amount: 'уп' }, stockBuy: { amount: true, other: true, later: true } })
    expect(data.leaving).toEqual({})
  })

  it('preserves a later amount edit if the full-stock purchase did not change the amount', () => {
    vi.useFakeTimers()
    const { data, rec, context } = setup({ amount: 5, norm: 5 }, { stockBuy: { amount: true } })
    data.toggleDone(rec.id, context)
    data.updateRecord(rec.id, { values: { ...rec.values, amount: 3 } })
    expect(data.toggleDone(rec.id, context)).toBeUndefined()
    expect(rec.values.amount).toBe(3)
    expect(rec.stockBuy).toEqual({ amount: true })
    expect(rec.done).toBe(false)
  })

  it('undoes a low purchase and restores only the fields it changed', () => {
    vi.useFakeTimers()
    const { data, rec, context } = setup({ amount: 0.5, norm: 2 }, { stockBuy: { amount: true } })
    data.toggleDone(rec.id, context)
    expect(rec.values.amount).toBe(2)
    data.updateRecord(rec.id, { values: { ...rec.values, norm: 3 } })
    data.toggleDone(rec.id, context)
    expect(rec.values).toEqual({ amount: 0.5, norm: 3 })
    expect(rec.stockBuy).toEqual({ amount: true })
    expect(rec.done).toBe(false)
  })

  it('rejects a conflicting amount, intent, tick or waiting version without overwriting it', () => {
    vi.useFakeTimers()
    for (const conflict of ['amount', 'buy', 'tick', 'waiting'] as const) {
      const { data, rec, context } = setup({ amount: 0, norm: 1 }, { stockBuy: { amount: true } })
      data.toggleDone(rec.id, context)
      if (conflict === 'amount') data.updateRecord(rec.id, { values: { ...rec.values, amount: 7 } })
      if (conflict === 'buy') data.updateRecord(rec.id, { stockBuy: { amount: false } })
      if (conflict === 'tick') data.updateRecord(rec.id, { done: false })
      if (conflict === 'waiting') data.waiting[rec.id] = { ...rec, text: 'Другая вкладка' }
      const before = JSON.stringify(rec)
      expect(data.toggleDone(rec.id, context)).toBe('conflict')
      expect(JSON.stringify(rec)).toBe(before)
      if (conflict === 'waiting') expect(data.waiting[rec.id]?.text).toBe('Другая вкладка')
    }
  })

  it('refuses invalid norms without writing, then buys after correction; zero is valid', () => {
    vi.useFakeTimers()
    for (const norm of [undefined, null, '', 'bad', -1, Infinity, NaN]) {
      const { data, rec, context } = setup({ amount: -2, norm: norm as number })
      const before = { ...rec, values: { ...rec.values } }
      expect(data.toggleDone(rec.id, context)).toBe('invalid-norm')
      expect(rec.values).toEqual(before.values)
      expect(rec.done).toBe(false)
      expect(rec.updatedAt).toBe(before.updatedAt)
      data.updateRecord(rec.id, { values: { ...rec.values, norm: 0 } })
      data.toggleDone(rec.id, context)
      expect(rec.values.amount).toBe(0)
      data.toggleDone(rec.id, context)
      expect(rec.values.amount).toBe(-2)
    }
  })

  it('keeps ordinary, no-context, stock-view, collecting and nested ticks ordinary', () => {
    vi.useFakeTimers()
    const ordinary = setup({ norm: 1 })
    ordinary.data.toggleDone(ordinary.rec.id, ordinary.context)
    expect(ordinary.rec.values).toEqual({ norm: 1 })
    expect(ordinary.rec.done).toBe(true)
    const cases = ['none', 'stock', 'collect', 'child'] as const
    for (const kind of cases) {
      const { data, page, rec, context } = setup()
      if (kind === 'collect') data.updatePage(page.id, { views: page.views.map(v => v.id === 'buy' ? { ...v, from: 'all' } : v) })
      if (kind === 'child') data.updateRecord(rec.id, { parentId: 'parent' })
      data.toggleDone(rec.id, kind === 'none' ? undefined : { ...context, viewId: kind === 'stock' ? 'stock' : 'buy' })
      expect(rec.values.amount).toBe(0)
      expect(rec.done).toBe(true)
    }
  })

  it('does not refill when the saved view or stock schema no longer proves the context', () => {
    vi.useFakeTimers()
    for (const kind of ['view', 'prop', 'ambiguous'] as const) {
      const { data, page, rec, context } = setup()
      if (kind === 'view') data.updatePage(page.id, { views: page.views.map(v => v.id === 'buy' ? { ...v, stock: { ...v.stock!, mode: 'stock' } } : v) })
      if (kind === 'prop') data.updatePage(page.id, { props: page.props.filter(p => p.id !== 'norm') })
      if (kind === 'ambiguous') data.updatePage(page.id, { stocks: [...page.stocks!, { ...page.stocks![0]!, normProp: 'other' }] })
      data.toggleDone(rec.id, context)
      expect(rec.values.amount).toBe(0)
      expect(rec.done).toBe(true)
    }
  })

  it('keeps the purchase snapshot when another record starts or finishes leaving', () => {
    vi.useFakeTimers()
    const { data, page, rec, context } = setup()
    const second = data.addRecord({ pageId: page.id, text: 'Другое' })
    const buy = page.views.find(v => v.id === 'buy')!
    data.toggleDone(rec.id, context)
    data.toggleDone(second.id)
    data.toggleDone(second.id)
    expect(filterRecords([rec], buy, data.leaving)).toEqual([rec])
    data.toggleDone(rec.id, context)
    expect(rec.values.amount).toBe(0)
  })

  it('retains the low threshold and a stepper change during leaving conflicts rather than being lost', () => {
    vi.useFakeTimers()
    const { data, page, rec, context } = setup({ amount: 1, norm: 5 })
    const stock = page.stocks![0]!
    expect(stockLow(rec, stock)).toBe(true)
    data.toggleDone(rec.id, context)
    const step = stepperPatch(page, rec, stock, -1, false)!
    data.updateRecord(rec.id, step.patch)
    expect(data.toggleDone(rec.id, context)).toBe('conflict')
    expect(rec.values.amount).toBe(4)
    expect(stockLow({ ...rec, values: { amount: 0.5, norm: 0.5 } }, stock)).toBe(false)
    expect(stockLow({ ...rec, values: { amount: 2, norm: 5 } }, stock)).toBe(false)
  })
})
