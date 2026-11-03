import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { newPage } from '~/domain/factory'
import { enableStock } from '~/domain/stock'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function world() {
  const data = useDataStore()
  const base = newPage({ title: 'Запасы', props: [
    { id: 'ordinary', name: 'Осталось', type: 'number' },
    { id: 'ordinary-norm', name: 'Норма', type: 'number' },
    { id: 'linked-other', name: 'Другое', type: 'number', normProp: 'norm1' }
  ] })
  const page = data.createPage(enableStock(enableStock(base, { amount: 'left1', norm: 'norm1', buy: 'buy1', stock: 'stock1' }),
    { amount: 'left2', norm: 'norm2', buy: 'buy2', stock: 'stock2' }))
  const filled = data.addRecord({ pageId: page.id, text: 'Есть', values: { ordinary: 5, left1: 0.5, norm1: 2, left2: 7, norm2: 8 },
    stockUnits: { left1: 'л', left2: 'уп' }, stockBuy: { left1: true, left2: false } })
  const empty = data.addRecord({ pageId: page.id, text: 'Пусто', values: {} })
  const snap = () => clone({ page: data.pages[page.id], records: [data.records[filled.id], data.records[empty.id]], settings: data.settings })
  return { data, page: page.id, filled: filled.id, empty: empty.id, snap }
}

describe('stock property guard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each(['left1', 'norm1', 'left2', 'norm2'])('rejects deleting and retyping %s without writing anything', (id) => {
    const { data, page, snap } = world()
    const before = snap()
    expect(data.removeProp(page, id)).toBeNull()
    expect(data.retypeProp(page, id, 'text')).toBeNull()
    data.updateProp(page, id, { type: 'select' })
    data.updateProp(page, id, { type: undefined })
    expect(snap()).toEqual(before)
  })

  it('does not delete a protected norm through another property’s normProp', () => {
    const { data, page, snap } = world()
    const before = snap()
    expect(data.removeProp(page, 'linked-other')).toBeNull()
    expect(snap()).toEqual(before)
  })

  it('allows renaming a protected property, including a mixed direct patch, and editing record values', () => {
    const { data, page, filled, empty } = world()
    const configs = clone(data.pages[page]!.stocks)
    const views = clone(data.pages[page]!.views)
    data.updateProp(page, 'left1', { name: 'Запас дома', type: 'text' })
    data.updateProp(page, 'norm2', { name: 'Цель 2' })
    expect(data.pages[page]!.props.find(p => p.id === 'left1')).toMatchObject({ name: 'Запас дома', type: 'number' })
    expect(data.pages[page]!.props.find(p => p.id === 'norm2')).toMatchObject({ name: 'Цель 2', type: 'number' })
    data.updateRecord(filled, { values: { ...data.records[filled]!.values, left1: 1.5, norm2: 9 } })
    data.updateRecord(empty, { values: { left1: 0, norm1: 3 } })
    expect(data.records[filled]!.values).toMatchObject({ left1: 1.5, norm2: 9 })
    expect(data.records[empty]!.values).toEqual({ left1: 0, norm1: 3 })
    expect(data.records[filled]!.stockUnits).toEqual({ left1: 'л', left2: 'уп' })
    expect(data.records[filled]!.stockBuy).toEqual({ left1: true, left2: false })
    expect(data.pages[page]!.stocks).toEqual(configs)
    expect(data.pages[page]!.views).toEqual(views)
  })

  it('keeps an unrelated same-named property editable, deletable and undoable', () => {
    const { data, page, filled } = world()
    const before = snapOrdinary()
    function snapOrdinary() {
      return clone({ props: data.pages[page]!.props, views: data.pages[page]!.views, values: data.records[filled]!.values, stocks: data.pages[page]!.stocks })
    }
    const changed = data.retypeProp(page, 'ordinary', 'text')!
    expect(data.pages[page]!.props.find(p => p.id === 'ordinary')!.type).toBe('text')
    changed.undo()
    expect(snapOrdinary()).toEqual(before)
    const removed = data.removeProp(page, 'ordinary')!
    expect(data.pages[page]!.props.some(p => p.id === 'ordinary')).toBe(false)
    removed.undo()
    expect(snapOrdinary()).toEqual(before)
  })
})
