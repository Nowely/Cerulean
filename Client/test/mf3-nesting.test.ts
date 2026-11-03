import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'

describe('nested record trees', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function tree() {
    const data = useDataStore()
    const page = data.createPage({ title: 'One' })
    const other = data.createPage({ title: 'Two' })
    const root = data.addRecord({ pageId: page.id, text: 'root' })
    const child = data.addRecord({ pageId: page.id, parentId: root.id, text: 'child' })
    const grandchild = data.addRecord({ pageId: page.id, parentId: child.id, text: 'grandchild' })
    return { data, page, other, root, child, grandchild }
  }

  it('moves and undoes a whole tree regardless of insertion order', () => {
    const { data, page, other, root, child, grandchild } = tree()
    data.records = Object.fromEntries([grandchild, child, root].map(r => [r.id, r]))
    const journal = useJournalStore()
    const { undo } = journal.undoable([root.id], () => data.moveRecords([root.id], other.id))
    expect([root, child, grandchild].map(r => data.records[r.id]!.pageId)).toEqual([other.id, other.id, other.id])
    undo()
    expect([root, child, grandchild].map(r => data.records[r.id]!.pageId)).toEqual([page.id, page.id, page.id])
    expect(data.records[child.id]!.parentId).toBe(root.id)
    expect(data.records[grandchild.id]!.parentId).toBe(child.id)
  })

  it('preserves and restores every descendant across different property schemas', () => {
    const { data, page, other, root, child, grandchild } = tree()
    data.updatePage(page.id, { props: [
      { id: 'source-choice', name: 'Комната', type: 'select', options: [{ id: 'source-kitchen', name: 'Кухня' }] },
      { id: 'source-number', name: 'Количество', type: 'number' },
      { id: 'source-private', name: 'Личное', type: 'text' },
      { id: 'source-stock', name: 'Осталось', type: 'number' },
      { id: 'source-norm', name: 'Норма', type: 'number' }
    ], stocks: [{ amountProp: 'source-stock', normProp: 'source-norm', buyViewId: 'a', stockViewId: 'b' }] })
    data.updatePage(other.id, { props: [
      { id: 'target-choice', name: 'Комната', type: 'select', options: [{ id: 'target-kitchen', name: 'Кухня' }] },
      { id: 'target-number', name: 'Количество', type: 'number' },
      { id: 'target-private', name: 'Личное', type: 'number' },
      { id: 'source-stock', name: 'Осталось', type: 'number' },
      { id: 'source-norm', name: 'Норма', type: 'number' }
    ], stocks: [{ amountProp: 'source-stock', normProp: 'source-norm', buyViewId: 'c', stockViewId: 'd' }] })
    for (const [i, rec] of [root, child, grandchild].entries()) {
      data.updateRecord(rec.id, {
        values: { 'source-choice': 'source-kitchen', 'source-number': i + 0.5, 'source-private': `private ${i}` },
        tags: ['clarify'], guesses: [page.id], note: `note ${i}`,
        body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `body ${i}` }] }] },
        links: [other.id], due: { date: '2026-11-02' }, order: i + 4,
        stockUnits: { 'source-stock': 'уп' }, stockBuy: { 'source-stock': true },
        deletedAt: i === 2 ? 42 : null
      })
    }
    const unrelated = data.addRecord({ pageId: other.id, text: 'untouched', values: { 'target-number': 9 } })
    const entry = data.addEntry({ id: 'nesting-entry', at: 1, text: 'grandchild', kind: 'ask', pageId: page.id, recordIds: [grandchild.id], note: 'slow' })
    data.records = Object.fromEntries([grandchild, child, root, unrelated].map(r => [r.id, r]))
    const plain = (value: unknown) => JSON.parse(JSON.stringify(value, (key, v) => key === 'updatedAt' ? undefined : v))
    const before = plain(data.records)
    const pages = plain(data.pages)
    const pageStamps = Object.fromEntries(Object.values(data.pages).map(p => [p.id, p.updatedAt]))
    const unrelatedStamp = unrelated.updatedAt
    const journal = useJournalStore()
    const { undo } = journal.undoable([root.id], () => {
      data.moveRecords([root.id], other.id, { teach: false })
      data.updateEntry(entry.id, { kind: 'routed', pageId: other.id, note: undefined })
    })

    for (const [i, rec] of [root, child, grandchild].entries()) {
      expect(data.records[rec.id]).toMatchObject({ pageId: other.id, values: {
        'source-choice': 'source-kitchen', 'source-number': i + 0.5, 'source-private': `private ${i}`,
        'target-choice': 'target-kitchen', 'target-number': i + 0.5
      }, stockUnits: { 'source-stock': 'уп' }, stockBuy: { 'source-stock': true } })
      expect(data.records[rec.id]!.values['target-private']).toBeUndefined()
    }
    expect(plain(data.pages)).toEqual(pages)
    expect(Object.fromEntries(Object.values(data.pages).map(p => [p.id, p.updatedAt]))).toEqual(pageStamps)
    expect(unrelated.updatedAt).toBe(unrelatedStamp)
    undo()
    expect(plain(data.records)).toEqual(before)
    expect(plain(data.pages)).toEqual(pages)
    expect(entry).toMatchObject({ kind: 'ask', pageId: page.id, note: 'slow' })
    expect(Object.fromEntries(Object.values(data.pages).map(p => [p.id, p.updatedAt]))).toEqual(pageStamps)
    expect(unrelated.updatedAt).toBe(unrelatedStamp)
  })

  it('restores ancestors before explicitly selected descendants', () => {
    const { data, page, other, root, child, grandchild } = tree()
    const journal = useJournalStore()
    const { undo } = journal.undoable([grandchild.id, root.id], () => data.moveRecords([root.id], other.id, { teach: false }))
    undo()
    expect([root, child, grandchild].map(r => r.pageId)).toEqual([page.id, page.id, page.id])
    expect(grandchild.parentId).toBe(child.id)
  })

  it('does not overwrite an existing value when property ids collide', () => {
    const { data, page, other, root } = tree()
    data.updatePage(page.id, { props: [
      { id: 'source-number', name: 'Количество', type: 'number' },
      { id: 'collision', name: 'Личное', type: 'text' }
    ] })
    data.updatePage(other.id, { props: [{ id: 'collision', name: 'Количество', type: 'number' }] })
    data.updateRecord(root.id, { values: { 'source-number': 3, 'collision': 'не перезаписывать' } })
    const { undo } = useJournalStore().undoable([root.id], () => data.moveRecords([root.id], other.id, { teach: false }))
    expect(root.values).toEqual({ 'source-number': 3, 'collision': 'не перезаписывать' })
    undo()
    expect(root.values).toEqual({ 'source-number': 3, 'collision': 'не перезаписывать' })
  })

  it('deletes and restores only descendants deleted with their parent', () => {
    const { data, root, child, grandchild } = tree()
    data.updateRecord(grandchild.id, { deletedAt: 42 })
    data.removeRecords([root.id])
    expect(data.records[child.id]!.deletedAt).toBe(data.records[root.id]!.deletedAt)
    expect(data.records[grandchild.id]!.deletedAt).toBe(42)
    data.restoreRecords([root.id])
    expect(data.records[child.id]!.deletedAt).toBeNull()
    expect(data.records[grandchild.id]!.deletedAt).toBe(42)
    expect(data.trash.some(item => item.kind === 'record' && item.rec.id === grandchild.id)).toBe(true)
  })

  it('keeps selected descendants attached when their parent is moved too', () => {
    const { data, other, root, child, grandchild } = tree()
    data.moveRecords([child.id, root.id, grandchild.id], other.id)
    expect(child.parentId).toBe(root.id)
    expect(grandchild.parentId).toBe(child.id)
    expect([root, child, grandchild].every(r => r.pageId === other.id)).toBe(true)
  })

  it('purges every descendant even if children precede their parents', () => {
    const { data, root, child, grandchild } = tree()
    data.records = Object.fromEntries([grandchild, child, root].map(r => [r.id, r]))
    data.purgeRecords([root.id])
    expect(Object.keys(data.records)).toEqual([])
  })

  it('rejects cycles and excessive depth, and restores parent and order on undo', () => {
    const { data, page, root, child, grandchild } = tree()
    const next = data.addRecord({ pageId: page.id, text: 'next', order: 10 })
    expect(data.placeSubtree(root.id, grandchild.id, 0)).toBeNull()
    expect(data.placeSubtree(root.id, next.id, 0)).toBeNull()
    expect(data.placeSubtree(next.id, grandchild.id, 0)).toBeNull()
    const old = { parentId: child.parentId, order: child.order }
    const moved = data.placeSubtree(child.id, null, 1)
    expect(moved).not.toBeNull()
    expect(child.parentId).toBeNull()
    expect(grandchild.parentId).toBe(child.id)
    moved!.undo()
    expect({ parentId: child.parentId, order: child.order }).toEqual(old)
  })
})
