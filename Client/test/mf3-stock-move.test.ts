import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import type { Page } from '~/domain/types'

function stockPage(prefix: string): Partial<Page> {
  return {
    title: prefix,
    props: [
      { id: `${prefix}-amount`, name: 'Осталось', type: 'number', normProp: `${prefix}-norm` },
      { id: `${prefix}-norm`, name: 'Норма', type: 'number' },
      { id: `${prefix}-ordinary`, name: 'Магазин', type: 'text' }
    ],
    stocks: [{ amountProp: `${prefix}-amount`, normProp: `${prefix}-norm`, buyViewId: `${prefix}-buy`, stockViewId: `${prefix}-stock` }]
  }
}

describe('moving stock records', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('rejects different stock configurations, then moves and undoes with the identical pair', () => {
    const data = useDataStore()
    const source = data.createPage(stockPage('from'))
    const target = data.createPage(stockPage('to'))
    const init = { values: { 'from-amount': 0.5, 'from-norm': 5, 'from-ordinary': 'рынок' }, stockUnits: { 'from-amount': 'уп' }, stockBuy: { 'from-amount': true } }
    const root = data.addRecord({ pageId: source.id, text: 'Молоко', ...init })
    const child = data.addRecord({ pageId: source.id, parentId: root.id, text: 'Вложенное', ...init })
    const existing = data.addRecord({ pageId: target.id, text: 'Молоко', values: { 'to-amount': 2, 'to-norm': 4 }, stockUnits: { 'to-amount': 'л' }, stockBuy: { 'to-amount': false } })
    const compatible = data.createPage(stockPage('from'))
    const originalPage = JSON.stringify(data.pages[target.id])
    const originalExisting = JSON.stringify(existing)
    const before = JSON.stringify({ records: data.records, pages: data.pages, learned: data.learned })
    expect(data.moveRecords([root.id], target.id, { teach: false })).toEqual({ ok: false, reason: 'stock-conflict' })
    expect(JSON.stringify({ records: data.records, pages: data.pages, learned: data.learned })).toBe(before)
    const { result, undo } = useJournalStore().undoable([root.id], () => data.moveRecords([root.id], compatible.id, { teach: false }))
    expect(result).toEqual({ ok: true })
    for (const rec of [root, child]) {
      expect(rec.pageId).toBe(compatible.id)
      expect(rec.values).toEqual(init.values)
      expect(rec.stockUnits).toEqual(init.stockUnits)
      expect(rec.stockBuy).toEqual(init.stockBuy)
    }
    expect(JSON.stringify(existing)).toBe(originalExisting)
    expect(JSON.stringify(data.pages[target.id])).toBe(originalPage)
    data.moveRecords([root.id], source.id, { teach: false })
    expect(root.pageId).toBe(source.id)
    expect(root.values['from-amount']).toBe(0.5)
    expect(root.values['from-norm']).toBe(5)
    expect(root.stockUnits?.['from-amount']).toBe('уп')
    expect(root.stockBuy?.['from-amount']).toBe(true)
    undo()
    expect([root, child].every(r => r.pageId === source.id)).toBe(true)
    for (const rec of [root, child]) {
      expect(rec.values).toEqual(init.values)
      expect(rec.stockUnits).toEqual(init.stockUnits)
      expect(rec.stockBuy).toEqual(init.stockBuy)
    }
    expect(child.parentId).toBe(root.id)
    expect(JSON.stringify(existing)).toBe(originalExisting)
    expect(JSON.stringify(data.pages[target.id])).toBe(originalPage)
  })

  it('does not map ordinary or unconfigured stock metadata into a stock property by name', () => {
    const data = useDataStore()
    const source = data.createPage({ props: [
      { id: 'ordinary', name: 'Осталось', type: 'number' },
      { id: 'legacy', name: 'Норма', type: 'number' }
    ] })
    const target = data.createPage(stockPage('to'))
    const rec = data.addRecord({ pageId: source.id, text: 'x', values: { ordinary: 2, legacy: 9 }, stockUnits: { legacy: 'уп' }, stockBuy: { legacy: true } })
    expect(data.moveRecords([rec.id], target.id, { teach: false })).toEqual({ ok: false, reason: 'stock-conflict' })
    expect(rec.values).toEqual({ ordinary: 2, legacy: 9 })
    expect(rec.stockUnits).toEqual({ legacy: 'уп' })
    expect(rec.stockBuy).toEqual({ legacy: true })
    const ordinary = data.addRecord({ pageId: source.id, text: 'ordinary', values: { ordinary: 2, legacy: 9 } })
    expect(data.moveRecords([ordinary.id], target.id, { teach: false })).toEqual({ ok: true })
    expect(ordinary.pageId).toBe(target.id)
  })

  it('refuses a destination without stock and preserves stock values and metadata', () => {
    const data = useDataStore()
    const source = data.createPage(stockPage('from'))
    const target = data.createPage({ props: [
      { id: 'ordinary-amount', name: 'Осталось', type: 'number' },
      { id: 'ordinary-norm', name: 'Норма', type: 'number' },
      { id: 'ordinary-shop', name: 'Магазин', type: 'text' }
    ] })
    const rec = data.addRecord({ pageId: source.id, text: 'x', values: { 'from-amount': 1, 'from-norm': 3, 'from-ordinary': 'рынок' }, stockUnits: { 'from-amount': 'л' } })
    expect(data.moveRecords([rec.id], target.id, { teach: false })).toEqual({ ok: false, reason: 'stock-conflict' })
    expect(rec.pageId).toBe(source.id)
    expect(rec.values).toEqual({ 'from-amount': 1, 'from-norm': 3, 'from-ordinary': 'рынок' })
    expect(rec.stockUnits).toEqual({ 'from-amount': 'л' })
  })

  it('keeps identical explicit stock IDs available without creating aliases', () => {
    const data = useDataStore()
    const source = data.createPage(stockPage('shared'))
    const target = data.createPage(stockPage('shared'))
    const rec = data.addRecord({ pageId: source.id, text: 'x', values: { 'shared-amount': 1, 'shared-norm': 2 }, stockUnits: { 'shared-amount': 'л' }, stockBuy: { 'shared-amount': true } })
    data.moveRecords([rec.id], target.id, { teach: false })
    expect(rec).toMatchObject({ pageId: target.id, values: { 'shared-amount': 1, 'shared-norm': 2 }, stockUnits: { 'shared-amount': 'л' }, stockBuy: { 'shared-amount': true } })
  })

  it('refuses the whole move when stock configurations share an ID but not their identity', () => {
    const data = useDataStore()
    const source = data.createPage(stockPage('from'))
    const target = data.createPage({
      props: [{ id: 'from-amount', name: 'Осталось', type: 'number' }, { id: 'other-norm', name: 'Норма', type: 'number' }],
      stocks: [{ amountProp: 'from-amount', normProp: 'other-norm', buyViewId: 'buy', stockViewId: 'stock' }]
    })
    const root = data.addRecord({ pageId: source.id, text: 'parent' })
    const child = data.addRecord({ pageId: source.id, parentId: root.id, text: 'child', values: { 'from-amount': 2, 'from-norm': 4 } })
    const another = data.addRecord({ pageId: source.id, text: 'another' })
    const before = JSON.stringify({ records: data.records, pages: data.pages })
    data.moveRecords([another.id, root.id], target.id, { teach: false })
    expect(JSON.stringify({ records: data.records, pages: data.pages })).toBe(before)
    expect(child.pageId).toBe(source.id)
    expect(another.pageId).toBe(source.id)
  })
})
