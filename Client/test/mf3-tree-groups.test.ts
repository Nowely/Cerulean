import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { applyView } from '~/domain/views'

const NOW = new Date('2026-11-02T12:00:00').getTime()
const plain = (v: unknown) => JSON.parse(JSON.stringify(v, (key, value) => key === 'updatedAt' ? undefined : value))

describe('tree moves in grouped and sorted views', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup(sort: 'manual' | 'name' | 'due' = 'manual') {
    const data = useDataStore()
    const page = data.createPage({ title: 'Tree', props: [{ id: 'group', name: 'Группа', type: 'select', options: [{ id: 'a', name: 'А' }, { id: 'b', name: 'Б' }] }] })
    data.updatePage(page.id, { views: [{ ...page.views[0]!, id: 'view', groupBy: 'group', sort }] })
    const parent = data.addRecord({ pageId: page.id, text: 'Борис', order: 50, due: { date: '2026-11-03' }, values: { group: 'b', parentValue: 'keep' } })
    const moved = data.addRecord({ pageId: page.id, text: 'Анна', order: 80, due: { date: '2026-11-02' }, values: { group: 'a', extra: 'original' } })
    const child = data.addRecord({ pageId: page.id, parentId: moved.id, text: 'Потомок', order: 7, values: { group: 'a', own: 42 } })
    const other = data.addRecord({ pageId: page.id, text: 'Вера', order: -10, due: { date: '2026-11-04' }, values: { group: 'b', other: 'untouched' } })
    const groups = () => applyView(page, data.recordsOf(page.id), page.views[0]!, NOW)
    return { data, page, parent, moved, child, other, groups }
  }

  it('nests across a select group, keeps descendant and parent values, and undoes without erasing later edits', () => {
    const { data, page, parent, moved, child, other, groups } = setup()
    const parentBefore = plain(parent)
    const childBefore = plain(child)
    const otherBefore = plain(other)
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    expect(result.ok).toBe(true)
    expect(moved).toMatchObject({ parentId: parent.id, values: { group: 'b', extra: 'original' } })
    expect(plain(parent)).toEqual(parentBefore)
    expect(plain(child)).toEqual(childBefore)
    expect(plain(other)).toEqual(otherBefore)
    data.updateRecord(moved.id, { values: { ...moved.values, extra: 'changed later' }, note: 'new note' })
    data.updateRecord(other.id, { values: { ...other.values, other: 'changed later' } })
    if (result.ok) expect(result.undo()).toBe('restored')
    expect(moved).toMatchObject({ parentId: null, order: 80, values: { group: 'a', extra: 'changed later' }, note: 'new note' })
    expect(other.values.other).toBe('changed later')
    expect(plain(parent)).toEqual(parentBefore)
    expect(plain(child)).toEqual(childBefore)
  })

  it('outdents into the visible select group and restores the child’s own prior value on undo', () => {
    const { data, page, parent, moved, child, groups } = setup()
    data.updateRecord(moved.id, { parentId: parent.id, order: 3, values: { group: 'a', extra: 'preserve' } })
    const parentBefore = plain(parent)
    const childBefore = plain(child)
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, null, 'b', 1, NOW)
    expect(result.ok).toBe(true)
    expect(moved).toMatchObject({ parentId: null, values: { group: 'b', extra: 'preserve' } })
    expect(plain(parent)).toEqual(parentBefore)
    expect(plain(child)).toEqual(childBefore)
    if (result.ok) expect(result.undo()).toBe('restored')
    expect(moved).toMatchObject({ parentId: parent.id, order: 3, values: { group: 'a', extra: 'preserve' } })
    expect(plain(child)).toEqual(childBefore)
  })

  it('outdents into the no-value group and restores the original select value', () => {
    const { data, page, parent, moved, groups } = setup()
    data.updateRecord(moved.id, { parentId: parent.id, order: 3, values: { group: 'a', extra: 'preserve' } })
    data.addRecord({ pageId: page.id, text: 'Без группы', values: {} })
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, null, 'none', 0, NOW)
    expect(result.ok).toBe(true)
    expect(moved).toMatchObject({ parentId: null, values: { group: null, extra: 'preserve' } })
    if (result.ok) expect(result.undo()).toBe('restored')
    expect(moved).toMatchObject({ parentId: parent.id, order: 3, values: { group: 'a', extra: 'preserve' } })
  })

  it.each(['name', 'due'] as const)('switches %s sorting to manual and undoes without overwriting later record or view edits', (sort) => {
    const { data, page, parent, moved, child, other, groups } = setup(sort)
    const oldOrders = Object.fromEntries([parent, moved, other].map(r => [r.id, r.order]))
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    expect(result.ok).toBe(true)
    expect(page.views[0]!.sort).toBe('manual')
    expect(moved.parentId).toBe(parent.id)
    expect(child.parentId).toBe(moved.id)
    data.updateRecord(other.id, { values: { ...other.values, other: 'later' } })
    data.updateRecord(moved.id, { values: { ...moved.values, extra: 'later' } })
    data.updatePage(page.id, { views: page.views.map(v => ({ ...v, name: 'Изменённое имя' })) })
    if (result.ok) expect(result.undo()).toBe('restored')
    expect(page.views[0]).toMatchObject({ sort, name: 'Изменённое имя' })
    expect(moved).toMatchObject({ parentId: null, order: oldOrders[moved.id], values: { group: 'a', extra: 'later' } })
    expect(parent.order).toBe(oldOrders[parent.id])
    expect(other).toMatchObject({ order: oldOrders[other.id], values: { other: 'later' } })
    expect(child.parentId).toBe(moved.id)
  })

  it('keeps a later explicit group change made before undo', () => {
    const { data, page, parent, moved, groups } = setup()
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    data.updateRecord(moved.id, { values: { ...moved.values, group: null, extra: 'later' } })
    if (result.ok) expect(result.undo()).toBe('partial')
    expect(moved).toMatchObject({ parentId: null, values: { group: null, extra: 'later' } })
  })

  it('does not restore an option removed after the drop', () => {
    const { data, page, parent, moved, groups } = setup()
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    data.removeOption(page.id, 'group', 'a')
    if (result.ok) expect(result.undo()).toBe('partial')
    expect(moved.parentId).toBeNull()
    expect(moved.values.group).toBe('b')
    expect(page.props.find(p => p.id === 'group')!.options!.map(o => o.id)).toEqual(['b'])
  })

  it('does not alter unrelated opaque values or per-record metadata', () => {
    const { data, page, parent, moved, child, groups } = setup()
    data.updateRecord(moved.id, { values: { ...moved.values, opaqueAmount: 7, opaqueNorm: 9 }, stockUnits: { opaqueAmount: 'уп' }, stockBuy: { opaqueAmount: true } })
    const before = plain({ values: moved.values, stockUnits: moved.stockUnits, stockBuy: moved.stockBuy, child })
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    expect(moved.values).toMatchObject({ opaqueAmount: 7, opaqueNorm: 9 })
    expect(moved.stockUnits).toEqual({ opaqueAmount: 'уп' })
    expect(moved.stockBuy).toEqual({ opaqueAmount: true })
    if (result.ok) result.undo()
    expect(plain({ values: moved.values, stockUnits: moved.stockUnits, stockBuy: moved.stockBuy, child })).toEqual(before)
  })

  it.each(['manual', 'name'] as const)('ordinary %s group drag undo preserves later edits', (sort) => {
    const { data, page, parent, moved, other, groups } = setup(sort)
    const result = data.placeRecord(page.id, 'view', groups(), moved.id, 'b', 0)
    expect(result).not.toBeNull()
    expect(moved.values.group).toBe('b')
    data.updateRecord(moved.id, { values: { ...moved.values, extra: 'later' } })
    data.updateRecord(parent.id, { values: { ...parent.values, parentValue: 'later' } })
    data.updateRecord(other.id, { values: { ...other.values, other: 'later' } })
    expect(result!.undo()).toBe('restored')
    expect(moved).toMatchObject({ parentId: null, order: 80, values: { group: 'a', extra: 'later' } })
    expect(parent.values.parentValue).toBe('later')
    expect(other.values.other).toBe('later')
    expect(page.views[0]!.sort).toBe(sort)
  })

  it('does not undo over a later structural move', () => {
    const { data, page, parent, moved, other, groups } = setup()
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    data.updateRecord(moved.id, { parentId: other.id, order: 100 })
    const before = plain(data.records)
    if (result.ok) expect(result.undo()).toBe('conflict')
    expect(plain(data.records)).toEqual(before)
  })

  it.each(['tree', 'ordinary'] as const)('refuses %s undo after another visible record was reordered', (mode) => {
    const { data, page, parent, moved, other, groups } = setup('name')
    const result = mode === 'tree'
      ? data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
      : data.placeRecord(page.id, 'view', groups(), moved.id, 'b', 0)
    data.updateRecord(other.id, { order: 777 })
    const before = plain({ records: data.records, page })
    const undo = result && ('ok' in result ? result.ok && result.undo : result.undo)
    expect(undo && undo()).toBe('conflict')
    expect(plain({ records: data.records, page })).toEqual(before)
  })

  it('does not overwrite a later sort choice on undo', () => {
    const { data, page, parent, moved, groups } = setup('name')
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    data.updatePage(page.id, { views: page.views.map(v => ({ ...v, sort: 'due' })) })
    if (result.ok) expect(result.undo()).toBe('partial')
    expect(page.views[0]!.sort).toBe('due')
    expect(moved.parentId).toBeNull()
    expect(moved.values.group).toBe('a')
  })

  it('rejects a due group mismatch without changing dates, records or view', () => {
    const { data, page, parent, moved } = setup()
    data.updateRecord(moved.id, { parentId: parent.id, due: { date: '2026-11-02' } })
    data.updatePage(page.id, { views: page.views.map(v => ({ ...v, groupBy: 'due', sort: 'name' })) })
    const groups = applyView(page, data.recordsOf(page.id), page.views[0]!, NOW)
    const before = plain({ records: data.records, page })
    expect(data.placeTreeRecord(page.id, 'view', groups, moved.id, null, 'tomorrow', 0, NOW)).toEqual({ ok: false, reason: 'due-group' })
    expect(plain({ records: data.records, page })).toEqual(before)
    data.updateRecord(moved.id, { due: { date: '2026-11-03' } })
    const accepted = data.placeTreeRecord(page.id, 'view', groups, moved.id, null, 'tomorrow', 0, NOW)
    expect(accepted.ok).toBe(true)
    expect(moved.due).toEqual({ date: '2026-11-03' })
    if (accepted.ok) accepted.undo()
    expect(moved).toMatchObject({ parentId: parent.id, due: { date: '2026-11-03' } })
  })

  it('rejects cycles and depth overflow without changing anything', () => {
    const { data, page, parent, moved, child, groups } = setup()
    const grandchild = data.addRecord({ pageId: page.id, parentId: child.id, text: 'deep' })
    const before = plain({ records: data.records, page })
    expect(data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)).toEqual({ ok: false, reason: 'invalid' })
    expect(data.placeTreeRecord(page.id, 'view', groups(), moved.id, grandchild.id, 'a', 0, NOW)).toEqual({ ok: false, reason: 'invalid' })
    expect(plain({ records: data.records, page })).toEqual(before)
  })

  it('refuses an ambiguous equal-order slot without rewriting old records', () => {
    const { data, page, parent, moved, other, groups } = setup()
    data.updateRecord(moved.id, { parentId: parent.id, order: 3 })
    data.updateRecord(other.id, { order: parent.order })
    const before = plain({ records: data.records, page })
    expect(data.placeTreeRecord(page.id, 'view', groups(), moved.id, null, 'b', 1, NOW)).toEqual({ ok: false, reason: 'order-conflict' })
    expect(plain({ records: data.records, page })).toEqual(before)
  })

  it('restores an originally absent select value, not an invented null', () => {
    const { data, page, parent, moved, groups } = setup()
    data.updateRecord(moved.id, { values: { extra: 'x' } })
    const result = data.placeTreeRecord(page.id, 'view', groups(), moved.id, parent.id, 'b', 0, NOW)
    expect(result.ok).toBe(true)
    if (result.ok) result.undo()
    expect(Object.hasOwn(moved.values, 'group')).toBe(false)
    expect(moved.values.extra).toBe('x')
  })
})
