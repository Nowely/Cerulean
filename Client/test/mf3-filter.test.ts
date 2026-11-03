import { describe, expect, it } from 'vitest'
import { collected } from '~/domain/collect'
import { FilterImportConflict, mergeSnapshot, parseSnapshot, toJSON, type Snapshot } from '~/domain/export'
import { DEFAULT_SETTINGS, newPage, newRecord } from '~/domain/factory'
import { enableStock } from '~/domain/stock'
import { listView } from '~/domain/templates'
import type { Page, Rec } from '~/domain/types'
import { filterRecords, sortRecords } from '~/domain/views'

const now = new Date(2026, 9, 19, 12).getTime()
const record = (id: string, values: Record<string, string | number | null>, extra: Partial<Rec> = {}) =>
  newRecord({ id, pageId: 'page', text: id, values, ...extra }, now)
const snapshot = (page: Page, records: Rec[] = []): Snapshot => ({
  app: 'cerulean', version: 1, exportedAt: now, pages: [page], records, sections: [], entries: [], settings: DEFAULT_SETTINGS, learned: {}
})

describe('mf3 filter compatibility', () => {
  it('keeps old rules on the same property as AND, even when they conflict', () => {
    const view = listView('Old', { filter: [{ field: 'dept', op: 'is', value: 'a' }, { field: 'dept', op: 'is', value: 'b' }] })
    expect(filterRecords([record('a', { dept: 'a' }), record('b', { dept: 'b' })], view, undefined, now)).toEqual([])
  })

  it('combines date chips with old done and property rules on own and collected records', () => {
    const view = listView('View', { filter: [{ field: 'done', op: 'is', value: false }, { field: 'dept', op: 'is', value: 'a' }], dues: ['today', 'none'] })
    const rows = [
      record('today', { dept: 'a' }, { due: { date: '2026-10-19' } }),
      record('undated', { dept: 'a' }, { pageId: 'other' }),
      record('different', { dept: 'b' }),
      record('done', { dept: 'a' }, { done: true }),
      record('tomorrow', { dept: 'a' }, { due: { date: '2026-10-20' } })
    ]
    expect(filterRecords(rows, view, undefined, now).map(r => r.id)).toEqual(['today', 'undated'])
    expect(collected({ ...view, from: 'all' }, rows, now).map(r => r.id)).toEqual(['today', 'undated'])
    expect(collected({ ...view, from: 'pick', pages: ['other'] }, rows, now).map(r => r.id)).toEqual(['undated'])
  })

  it('applies and clears clarification in all-page and selected-page collecting views', () => {
    const base = listView('Collect', { filter: [{ field: 'done', op: 'is', value: false }], dues: ['none'] })
    const rows = [
      record('clarify', {}, { tags: ['clarify'] }),
      record('other-page', {}, { pageId: 'other', tags: ['clarify'] }),
      record('normal', {}),
      record('done', {}, { done: true, tags: ['clarify'] })
    ]
    for (const view of [{ ...base, from: 'all' as const }, { ...base, from: 'pick' as const, pages: ['page'] }]) {
      const off = collected(view, rows, now).map(r => r.id)
      const on = collected({ ...view, asking: true }, rows, now).map(r => r.id)
      expect(on).toEqual(view.from === 'all' ? ['clarify', 'other-page'] : ['clarify'])
      expect(off).toContain('normal')
      expect(collected({ ...view, asking: false }, rows, now).map(r => r.id)).toEqual(off)
    }
  })

  it('retains stock and additional filters, including a leaving record', () => {
    const page = enableStock(newPage({ id: 'page' }, now), { amount: 'left', norm: 'norm', buy: 'buy', stock: 'stock' })
    const buy = page.views.find(v => v.id === 'buy')!
    const stock = page.views.find(v => v.id === 'stock')!
    const rows = [record('low', { left: 1, norm: 3 }), record('full', { left: 3, norm: 3 }), record('ordinary', {})]
    expect(filterRecords(rows, buy, undefined, now).map(r => r.id)).toEqual(['low', 'ordinary'])
    expect(filterRecords(rows, stock, undefined, now).map(r => r.id)).toEqual(['low', 'full'])
    expect(filterRecords([{ ...rows[0]!, done: true }], buy, { low: false }, now)).toHaveLength(1)
    expect(filterRecords(rows, { ...stock, dues: ['today'] }, undefined, now)).toEqual([])
  })

  it('sorts without mutating records or a different view', () => {
    const a = listView('A', { sort: 'name' })
    const b = listView('B', { sort: 'manual' })
    const rows = [record('z', {}, { order: 1 }), record('a', {}, { order: 2 })]
    expect(sortRecords(rows, a.sort).map(r => r.id)).toEqual(['a', 'z'])
    expect(sortRecords(rows, b.sort).map(r => r.id)).toEqual(['z', 'a'])
    expect(rows.map(r => r.id)).toEqual(['z', 'a'])
  })

  it('ORs choices within each property and ANDs properties with old, date and stock filters', () => {
    const page = enableStock(newPage({ id: 'page' }, now), { amount: 'left', norm: 'norm', buy: 'buy', stock: 'stock' })
    const base = page.views.find(v => v.id === 'buy')!
    const view = { ...base, dues: ['none' as const], selectFilters: { dept: ['a', 'b'], room: ['x', 'y'] } }
    const rows = [
      record('ax', { dept: 'a', room: 'x', left: 1, norm: 3 }),
      record('by', { dept: 'b', room: 'y' }),
      record('az', { dept: 'a', room: 'z' }),
      record('cx', { dept: 'c', room: 'x' }),
      record('full', { dept: 'a', room: 'x', left: 3, norm: 3 }),
      record('done', { dept: 'b', room: 'y' }, { done: true })
    ]
    expect(filterRecords(rows, view, undefined, now).map(r => r.id)).toEqual(['ax', 'by'])
    expect(collected({ ...view, from: 'all' }, rows, now).map(r => r.id)).toEqual(['ax', 'by'])
    expect(filterRecords(rows, { ...view, selectFilters: { dept: [], room: ['x'] } }, undefined, now).map(r => r.id)).toEqual(['ax', 'cx'])
  })

  it('retains stale IDs instead of broadening the result or binding by name', () => {
    const view = listView('Old', { selectFilters: { dept: ['deleted'], removed: ['old'] } })
    const rows = [record('former', { dept: 'deleted', removed: 'old' }), record('new', { dept: 'replacement', removed: 'old' })]
    expect(filterRecords(rows, view).map(r => r.id)).toEqual(['former'])
    expect(filterRecords(rows, { ...view, selectFilters: { dept: ['missing'] } })).toEqual([])
    expect(filterRecords(rows, { ...view, selectFilters: undefined })).toEqual(rows)
  })

  it('keeps choices per view in a copy and reads old views without the field', () => {
    const one = listView('One', { selectFilters: { dept: ['a', 'b'], room: ['x'] } })
    const two = listView('Two')
    const page = newPage({ id: 'page', views: [one, two] }, now)
    const restored = parseSnapshot(toJSON(snapshot(page), now)).pages[0]!
    expect(restored.views[0]!.selectFilters).toEqual(one.selectFilters)
    expect(restored.views[1]!.selectFilters).toBeUndefined()
    expect(filterRecords([record('a', { dept: 'a', room: 'x' }), record('b', { dept: 'b', room: 'z' })], restored.views[0]!).map(r => r.id)).toEqual(['a'])
    expect(filterRecords([record('a', {})], restored.views[1]!)).toHaveLength(1)
  })

  it('remaps property and option IDs on imported stock views without touching local views', () => {
    const sourceBase = newPage({ id: 'page', title: 'Page', props: [{ id: 'dept', name: 'Отдел', type: 'select', options: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }] }, now)
    const source = enableStock(sourceBase, { amount: 'left', norm: 'norm', buy: 'buy', stock: 'stock' })
    source.views.find(v => v.id === 'buy')!.selectFilters = { dept: ['a', 'b'] }
    const local = newPage({ id: 'page', title: 'Page', props: [{ id: 'local', name: 'Отдел', type: 'select', options: [{ id: 'other-a', name: 'A' }, { id: 'b', name: 'Other' }] }] }, now)
    const before = structuredClone(local)
    const merged = mergeSnapshot({ pages: [local], records: [], sections: [], learned: {} }, snapshot(source, [record('r', { dept: 'b' })]))
    const page = merged.changed[0]!
    const prop = page.props.find(p => p.id === 'local')!
    const b = prop.options!.find(o => o.name === 'B')!.id
    expect(b).not.toBe('b')
    const view = page.views.find(v => v.stock?.mode === 'buy')!
    expect(view.selectFilters).toEqual({ local: ['other-a', b] })
    expect(merged.records[0]!.values.local).toBe(b)
    expect(filterRecords(merged.records, view)).toHaveLength(1)
    expect(page.views[0]).toEqual(before.views[0])
    expect(local).toEqual(before)
  })

  it('stops before returning an import if a stock view contains unmappable or ambiguous choice IDs', () => {
    const base = newPage({ id: 'page', title: 'Page', props: [
      { id: 'p1', name: 'Отдел', type: 'select', options: [{ id: 'a', name: 'A' }] },
      { id: 'p2', name: 'Отдел', type: 'select', options: [{ id: 'b', name: 'B' }] }
    ] }, now)
    const source = enableStock(base, { amount: 'left', norm: 'norm', buy: 'buy', stock: 'stock' })
    const view = source.views.find(v => v.id === 'buy')!
    const local = newPage({ id: 'page', title: 'Page', props: [{ id: 'local', name: 'Отдел', type: 'select', options: [{ id: 'a', name: 'A' }] }] }, now)
    const before = structuredClone(local)
    for (const selectFilters of [{ missing: ['a'] }, { p1: ['deleted'] }, { p1: ['a'], p2: ['b'] }]) {
      view.selectFilters = selectFilters
      expect(() => mergeSnapshot({ pages: [local], records: [], sections: [], learned: {} }, snapshot(source))).toThrow(FilterImportConflict)
      expect(local).toEqual(before)
    }
  })
})
