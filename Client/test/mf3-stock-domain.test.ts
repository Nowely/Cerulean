import { describe, expect, it } from 'vitest'
import { newPage, newRecord, DEFAULT_SETTINGS } from '../app/domain/factory'
import { applyTemplate, listView } from '../app/domain/templates'
import { editStock, enableStock, matchesStock, purchaseStock, stepStock, stockLow, stockUnit, uniqueStockName, validStockNumber } from '../app/domain/stock'
import { filterRecords } from '../app/domain/views'
import { mergeSnapshot, parseSnapshot, StockImportConflict, toJSON, toMarkdown, type Merge, type Snapshot } from '../app/domain/export'
import { emptySide, fileOf, mergeSides, parseFile } from '../app/domain/bucket'
import type { Page, Rec, StockConfig } from '../app/domain/types'

const ids = { amount: 'left', norm: 'norm', buy: 'buy', stock: 'stock' }
const page = () => enableStock(newPage({ id: 'page', title: 'Покупки' }, 1), ids)
const config: StockConfig = { amountProp: ids.amount, normProp: ids.norm, buyViewId: ids.buy, stockViewId: ids.stock }
const rec = (amount: number | null, norm: number | null, extra: Partial<Rec> = {}) => newRecord({
  id: 'r', pageId: 'page', text: 'Молоко', values: { left: amount, norm }, ...extra
}, 1)
const snapshot = (p: Page, records: Rec[] = []): Snapshot => ({
  app: 'cerulean', version: 1, exportedAt: 1, pages: [p], records, sections: [], entries: [], settings: DEFAULT_SETTINGS, learned: {}
})
const applyMerge = (here: Pick<Snapshot, 'pages' | 'records' | 'sections' | 'learned'>, merge: Merge) => ({
  pages: [...here.pages.map(p => merge.changed.find(c => c.id === p.id) ?? p), ...merge.pages],
  records: [...here.records, ...merge.records], sections: [...here.sections, ...merge.sections], learned: { ...here.learned, ...merge.learned }
})

function conflict(run: () => unknown, reason: StockImportConflict['reason']) {
  try {
    run()
    throw new Error('Expected a stock import conflict')
  } catch (error) {
    expect(error).toBeInstanceOf(StockImportConflict)
    expect((error as StockImportConflict).reason).toBe(reason)
    expect((error as Error).message).toContain('Данные не изменены')
  }
}

describe('stock domain', () => {
  it('uses the threshold and does not confuse an empty value with zero', () => {
    for (const [amount, norm, low] of [[1, 1, false], [0, 1, true], [1, 5, true], [0.5, 2, true], [0.5, 0.5, false], [null, 1, false], [-3, 1, true], [1000, 2000, false]] as const) {
      expect(stockLow(rec(amount, norm), config)).toBe(low)
    }
    expect(stockLow(rec(NaN, 2), config)).toBe(false)
  })

  it('validates new numbers but preserves old numbers and units until explicitly edited', () => {
    for (const n of [-1, Infinity, -Infinity, NaN]) expect(validStockNumber(n)).toBe(false)
    for (const n of [0, 0.5, 1000, Number.MAX_VALUE]) expect(validStockNumber(n)).toBe(true)
    const old = rec(-10, 1000, { stockUnits: { left: 'уп' } })
    expect(editStock(old, config, { unit: '' })?.values).toEqual(old.values)
    expect(editStock(old, config, { amount: -1 })).toBeNull()
    expect(stepStock(old, config, -1)).toBeNull()
    expect(stepStock(old, config, 1)).toBeNull()
    expect(stepStock(rec(0, 3), config, -1)).toBeNull()
    expect(stepStock(rec(0.5, 3), config, -1)?.values.left).toBe(0)
    expect(stepStock(rec(100, 200), config, 1)?.values.left).toBe(101)
    expect(stockUnit(old, page(), 'left')).toBe('уп')
    expect(stockUnit(editStock(old, config, { unit: '' })!, page(), 'left')).toBe('шт')
    expect(stepStock(rec(Number.MAX_VALUE, 1), config, 1)).toBeNull()
  })

  it('reopens on entering low and refills on purchase', () => {
    const full = rec(2, 5, { done: true, stockUnits: { left: 'уп' } })
    const low = stepStock(full, config, -1)!
    expect(low.done).toBe(false)
    expect(matchesStock(low, { mode: 'buy', amountProp: 'left', normProp: 'norm' })).toBe(true)
    const purchased = purchaseStock(low, config, 42)!
    expect(purchased).toMatchObject({ done: true, doneAt: 42, values: { left: 5, norm: 5 }, stockUnits: { left: 'уп' } })
    expect(purchaseStock(rec(0, -1), config, 42)).toBeNull()
  })

  it('enables explicitly with unique names and keeps existing views and filters untouched', () => {
    const old = newPage({ props: [{ id: 'old', name: 'ОСТАЛОСЬ', type: 'number' }, { id: 'old-norm', name: 'Норма', type: 'text' }],
      views: [listView('Купить', { id: 'old-buy', filter: [{ field: 'old', op: 'empty' }] }), listView('Запасы', { id: 'old-stock' })] }, 1)
    const before = structuredClone(old)
    const enabled = enableStock(old, ids, old.views[0])
    expect(old).toEqual(before)
    expect(enabled.views.slice(0, 2)).toEqual(old.views)
    expect(enabled.props.slice(2).map(p => p.name)).toEqual(['Осталось 2', 'Норма 2'])
    expect(enabled.views.slice(2).map(v => v.name)).toEqual(['Купить с запасами', 'Запасы 2'])
    expect(uniqueStockName('Запасы', ['запасы', 'Запасы 2'])).toBe('Запасы 3')
    expect(() => enableStock(old, { ...ids, amount: 'old' })).toThrow()
  })

  it('filters buy and stock without overriding additional user filters', () => {
    const p = page()
    const buy = p.views.find(v => v.id === 'buy')!
    const stock = p.views.find(v => v.id === 'stock')!
    const rows = [rec(null, null, { id: 'ordinary' }), rec(1, 2, { id: 'low' }), rec(2, 2, { id: 'full' }), rec(0, 1, { id: 'done', done: true })]
    expect(filterRecords(rows, buy).map(r => r.id)).toEqual(['ordinary', 'low'])
    expect(filterRecords(rows, stock).map(r => r.id)).toEqual(['low', 'full', 'done'])
    expect(filterRecords(rows, { ...buy, filter: [...buy.filter, { field: 'left', op: 'empty' }] }).map(r => r.id)).toEqual(['ordinary'])
  })

  it('creates new shopping templates with explicit stock IDs', () => {
    const base = newPage({}, 1)
    const p = { ...base, ...applyTemplate(base, 'shop') }
    expect(p.stocks).toHaveLength(1)
    const s = p.stocks![0]!
    expect(p.props.find(x => x.id === s.amountProp)?.normProp).toBe(s.normProp)
    expect(p.views.find(x => x.id === s.buyViewId)?.stock?.mode).toBe('buy')
    expect(p.views.find(x => x.id === s.stockViewId)?.filter).toEqual([{ field: s.amountProp, op: 'notEmpty' }])
  })

  it('round trips JSON and merges separate stock configurations by ID, not by name', () => {
    const source = page()
    const row = rec(5, 5, { stockUnits: { left: 'уп' }, stockBuy: { left: true } })
    const copy = parseSnapshot(toJSON(snapshot(source, [row]), 2))
    expect(copy.pages[0]!.stocks).toEqual(source.stocks)
    expect(copy.records[0]).toEqual(row)
    expect(toMarkdown([source], [row], [])).toContain('Осталось: 5 уп')
    const target = enableStock(newPage({ id: 'target', title: 'Покупки' }, 1), { amount: 'a', norm: 'n', buy: 'b', stock: 's' })
    const merged = mergeSnapshot({ pages: [target], records: [], sections: [], learned: {} }, copy)
    const p = merged.changed[0]!
    expect(p.stocks).toHaveLength(2)
    const imported = p.stocks![1]!
    expect(imported.amountProp).not.toBe('a')
    expect(p.props.find(x => x.id === imported.amountProp)).toMatchObject({ name: 'Осталось 2', normProp: imported.normProp })
    expect(merged.records[0]!.stockUnits?.[imported.amountProp]).toBe('уп')
    expect(merged.records[0]!.stockBuy?.[imported.amountProp]).toBe(true)
    expect(p.views.find(v => v.id === imported.buyViewId)?.stock?.amountProp).toBe(imported.amountProp)
  })

  it('reads old snapshots without enabling or truncating anything', () => {
    const old = newPage({ id: 'old', title: 'Старое', props: [{ id: 'left', name: 'Осталось', type: 'number' }] }, 1)
    const data = parseSnapshot(JSON.stringify(snapshot(old, [rec(-1234, null)])))
    expect(data.pages[0]!.stocks).toBeUndefined()
    expect(data.records[0]!.values.left).toBe(-1234)
  })

  it('stops an entire import rather than merging an unrelated stock property with a colliding ID', () => {
    const source = page()
    const incoming = rec(3, 5, { id: 'incoming', stockUnits: { left: 'л' }, stockBuy: { left: true } })
    const target = newPage({ id: 'target', title: 'Покупки', props: [
      { id: 'left', name: 'Осталось', type: 'number' }, { id: 'norm', name: 'Норма', type: 'number' }
    ], views: [listView('Купить', { id: 'buy' }), listView('Запасы', { id: 'stock' })] }, 1)
    const existing = rec(null, null, { id: 'existing', pageId: 'target' })
    const before = structuredClone({ target, existing, source, incoming })
    conflict(() => mergeSnapshot({ pages: [target], records: [existing], sections: [], learned: {} }, snapshot(source, [incoming])), 'stock-schema')
    expect({ target, existing, source, incoming }).toEqual(before)
  })

  it('does not double a repeated import, including remapped view IDs, nested records and links', () => {
    const source = page()
    const parent = rec(3, 5, { id: 'parent', stockUnits: { left: 'л' }, stockBuy: { left: true }, links: ['child', 'page'] })
    const child = rec(null, null, { id: 'child', text: 'Деталь', parentId: 'parent', links: ['parent'] })
    const copy = snapshot(source, [parent, child])
    const target = newPage({ id: 'target', title: 'Покупки', views: [listView('Мой вид', { id: 'buy' })] }, 1)
    const here = { pages: [target], records: [], sections: [], learned: {} }
    const first = mergeSnapshot(here, copy)
    const mergedPage = first.changed[0]!
    const s = mergedPage.stocks![0]!
    expect(s.buyViewId).not.toBe('buy')
    expect(mergedPage.props.find(p => p.id === s.amountProp)?.normProp).toBe('norm')
    expect(first.records.find(r => r.id === 'parent')).toMatchObject({ values: { left: 3, norm: 5 }, stockUnits: { left: 'л' }, links: ['child', 'target'] })
    expect(first.records.find(r => r.id === 'child')).toMatchObject({ parentId: 'parent', links: ['parent'] })
    const applied = applyMerge(here, first)
    const again = mergeSnapshot(applied, copy)
    expect(again.pages).toEqual([])
    expect(again.records).toEqual([])
    expect(again.changed).toEqual([])
    expect(applied.pages[0]!.stocks).toHaveLength(1)
  })

  it('stops on different identities with the same name, including a nested match', () => {
    const source = page()
    const target = { ...source, id: 'target' }
    const parent = rec(2, 5, { id: 'parent' })
    const child = rec(null, null, { id: 'child', text: 'Подпункт', parentId: 'parent' })
    const here = { pages: [target], records: [{ ...parent, pageId: 'target' }, { ...child, id: 'other', pageId: 'target' }], sections: [], learned: {} }
    const before = structuredClone(here)
    conflict(() => mergeSnapshot(here, snapshot(source, [parent, child])), 'record-name')
    expect(here).toEqual(before)
    const renamedParent = { ...parent, id: 'different', pageId: 'target' }
    conflict(() => mergeSnapshot({ ...here, records: [renamedParent] }, snapshot(source, [parent])), 'record-name')
  })

  it('stops on equal record IDs with different amounts, norms, units or purchase intent', () => {
    const source = page()
    const target = { ...source, id: 'target' }
    const incoming = rec(3, 5, { id: 'same', stockUnits: { left: 'л' }, stockBuy: { left: true } })
    const original = { ...incoming, pageId: 'target' }
    const variants = [
      { ...original, values: { left: 4, norm: 5 } },
      { ...original, values: { left: 3, norm: 6 } },
      { ...original, stockUnits: { left: 'уп' } },
      { ...original, stockBuy: {} }
    ]
    for (const local of variants) {
      conflict(() => mergeSnapshot({ pages: [target], records: [local], sections: [], learned: {} }, snapshot(source, [incoming])), 'stock-data')
    }
    const ok = mergeSnapshot({ pages: [target], records: [original], sections: [], learned: {} }, snapshot(source, [incoming]))
    expect(ok.records).toEqual([])
    expect(ok.changed).toEqual([])
  })

  it('stops on equal IDs belonging to another page or parent, and on changed stock schema', () => {
    const source = page()
    const target = { ...source, id: 'target' }
    const incoming = rec(1, 2, { id: 'same' })
    const elsewhere = { ...incoming, pageId: 'elsewhere' }
    const here = { pages: [target], records: [elsewhere], sections: [], learned: {} }
    conflict(() => mergeSnapshot(here, snapshot(source, [incoming])), 'record-id')
    conflict(() => mergeSnapshot({ ...here, records: [{ ...elsewhere, pageId: 'target', parentId: 'someone' }] }, snapshot(source, [incoming])), 'record-id')
    const changedUnit = { ...target, props: target.props.map(p => p.id === 'left' ? { ...p, unit: 'л' } : p) }
    conflict(() => mergeSnapshot({ ...here, pages: [changedUnit], records: [] }, snapshot(source, [incoming])), 'stock-schema')
  })

  it('stops on ambiguous page names and record IDs already used by pages', () => {
    const source = page()
    const first = { ...source, id: 'first' }
    const second = { ...source, id: 'second' }
    const here = { pages: [first, second], records: [], sections: [], learned: {} }
    conflict(() => mergeSnapshot(here, snapshot(source)), 'page-name')
    const collision = rec(1, 2, { id: 'other-page' })
    const other = newPage({ id: 'other-page', title: 'Другая' }, 1)
    conflict(() => mergeSnapshot({ ...here, pages: [first, other] }, snapshot(source, [collision])), 'record-id')
  })

  it('uses an identical record ID rather than a different record with its old name', () => {
    const source = page()
    const target = { ...source, id: 'target' }
    const incoming = rec(3, 5, { id: 'same' })
    const renamed = { ...incoming, pageId: 'target', text: 'Новое название' }
    const namesake = { ...incoming, id: 'namesake', pageId: 'target' }
    const result = mergeSnapshot({ pages: [target], records: [renamed, namesake], sections: [], learned: {} }, snapshot(source, [incoming]))
    expect(result.records).toEqual([])
  })

  it('stops rather than losing an unresolved link or a changed link on an existing record', () => {
    const source = page()
    const target = { ...source, id: 'target' }
    const incoming = rec(1, 2, { id: 'same', links: ['missing'] })
    const here = { pages: [target], records: [], sections: [], learned: {} }
    conflict(() => mergeSnapshot(here, snapshot(source, [incoming])), 'record-links')
    const linked = { ...incoming, links: ['page'] }
    const local = { ...linked, pageId: 'target', links: [] }
    conflict(() => mergeSnapshot({ ...here, records: [local] }, snapshot(source, [linked])), 'record-links')
  })

  it('keeps stock fields through the bucket format and applies whole-object last-write-wins', () => {
    const remotePage = { ...page(), updatedAt: 3 }
    const remoteRecord = rec(1, 5, { updatedAt: 4, stockUnits: { left: 'уп' }, stockBuy: { left: true } })
    const remote = { ...emptySide(), pages: [remotePage], records: [remoteRecord] }
    const parsed = parseFile(JSON.stringify(fileOf(remote, 5))).side
    expect(parsed.pages[0]!.stocks).toEqual(remotePage.stocks)
    expect(parsed.records[0]).toEqual(remoteRecord)
    const local = { ...emptySide(), records: [rec(2, 5, { updatedAt: 2, stockUnits: { left: 'л' } })] }
    const merged = mergeSides(local, parsed)
    expect(merged.take.records).toEqual([remoteRecord])
  })
})
