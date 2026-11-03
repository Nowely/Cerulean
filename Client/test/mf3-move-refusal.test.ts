import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { useRecordActions } from '~/composables/useRecordActions'

describe('stock move preflight', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup() {
    const data = useDataStore()
    const source = data.createPage({ title: 'Исходная', description: 'Например: «уточнить»', props: [
      { id: 'left', name: 'Осталось', type: 'number', normProp: 'norm' }, { id: 'norm', name: 'Норма', type: 'number' }
    ], stocks: [{ amountProp: 'left', normProp: 'norm', buyViewId: 'buy', stockViewId: 'stock' }] })
    const target = data.createPage({ title: 'Другая', props: [
      { id: 'other-left', name: 'Осталось', type: 'number', normProp: 'other-norm' }, { id: 'other-norm', name: 'Норма', type: 'number' }
    ], stocks: [{ amountProp: 'other-left', normProp: 'other-norm', buyViewId: 'buy2', stockViewId: 'stock2' }] })
    const safe = data.addRecord({ pageId: source.id, text: 'Обычная', tags: ['clarify'] })
    const root = data.addRecord({ pageId: source.id, text: 'Запас', tags: ['clarify'] })
    const child = data.addRecord({ pageId: source.id, parentId: root.id, text: 'Потомок', values: { left: 1, norm: 4 }, stockUnits: { left: 'уп' }, stockBuy: { left: true }, note: 'заметка' })
    const entry = data.addEntry({ id: 'clarification', at: 1, text: 'уточнить', kind: 'ask', pageId: source.id, recordIds: [safe.id, root.id], learned: true, note: 'slow', made: true })
    data.learned = { example: { pageId: source.id } } as typeof data.learned
    const journal = useJournalStore()
    const ui = useUiStore()
    const state = () => JSON.stringify({ records: data.records, entries: data.entries, pages: data.pages, learned: data.learned })
    return { data, source, target, safe, root, child, entry, journal, ui, state }
  }

  const refused = (ui: ReturnType<typeof useUiStore>) => {
    expect(ui.notice?.title).toBe('Не удалось переместить: настройки запасов на страницах несовместимы.')
    expect(ui.notice?.action).toBeUndefined()
  }

  it.each(['choose', 'chooseOne', 'chooseForRecord', 'chooseAll'] as const)('%s refuses without changing data or resolving the journal', (method) => {
    const { data, target, safe, root, entry, journal, ui, state } = setup()
    const second = data.addEntry({ id: 'second-entry', at: 2, text: 'ещё', kind: 'routed', pageId: entry.pageId, recordIds: [safe.id] })
    const before = state()
    const choice = { pageId: target.id }
    const calls = {
      choose: () => journal.choose(entry.id, choice),
      chooseOne: () => journal.chooseOne(entry.id, root.id, choice),
      chooseForRecord: () => journal.chooseForRecord(root.id, choice),
      chooseAll: () => journal.chooseAll([second.id, entry.id], choice)
    }
    const result = calls[method]()
    expect(result).toBeUndefined()
    expect(state()).toBe(before)
    refused(ui)
  })

  it.each([{ newPage: 'Новая' }, { newList: 'Новая' }, { template: 'shop' as const }])('refuses $choice without creating a page', (choice) => {
    const { root, journal, ui, state } = setup()
    const before = state()
    expect(journal.chooseForRecord(root.id, choice)).toBeUndefined()
    expect(state()).toBe(before)
    refused(ui)
  })

  it.each(['choose', 'chooseOne', 'chooseAll'] as const)('%s rejects a new page before any write', (method) => {
    const { safe, root, entry, journal, ui, state } = setup()
    const calls = {
      choose: () => journal.choose(entry.id, { newPage: 'Покупки' }),
      chooseOne: () => journal.chooseOne(entry.id, root.id, { newPage: 'Покупки' }),
      chooseAll: () => journal.chooseAll([entry.id], { newPage: 'Покупки' })
    }
    const before = state()
    expect(calls[method]()).toBeUndefined()
    expect(state()).toBe(before)
    expect(safe.tags).toEqual(['clarify'])
    refused(ui)
  })

  it('refuses a mixed selection and the other records in its clarification before moving anything', () => {
    const { safe, target, ui, state } = setup()
    const before = state()
    useRecordActions().move([safe.id])
    ui.picker!.run({ pageId: target.id })
    expect(state()).toBe(before)
    refused(ui)
  })

  it('refuses a new destination before creating it from a mixed selection', () => {
    const { safe, root, ui, state } = setup()
    const before = state()
    useRecordActions().move([safe.id, root.id])
    ui.picker!.run({ newPage: 'Новая' })
    expect(state()).toBe(before)
    refused(ui)
  })

  it('reports a missing destination without changing the data', () => {
    const { data, root, journal, ui, state } = setup()
    const before = state()
    expect(data.moveRecords([root.id], 'missing')).toEqual({ ok: false, reason: 'missing-target' })
    expect(journal.chooseForRecord(root.id, { pageId: 'missing' })).toBeUndefined()
    expect(ui.notice?.title).toBe('Не удалось переместить: страница не найдена.')
    expect(state()).toBe(before)
  })

  it('moves a non-stock clarification and undo restores every record in it', () => {
    const { data, source, safe, root, child, entry, ui } = setup()
    data.updateRecord(child.id, { values: {}, stockUnits: undefined, stockBuy: undefined })
    const target = data.createPage({ title: 'Без запасов' })
    const before = JSON.stringify([safe, root, child, entry], (key, value) => key === 'updatedAt' ? undefined : value)
    useRecordActions().move([safe.id])
    ui.picker!.run({ pageId: target.id })
    expect([safe, root, child].every(r => r.pageId === target.id)).toBe(true)
    expect(ui.notice?.title).toContain('→ Без запасов')
    ui.notice!.action!.run()
    expect([safe, root, child].every(r => r.pageId === source.id)).toBe(true)
    expect(JSON.stringify([safe, root, child, entry], (key, value) => key === 'updatedAt' ? undefined : value)).toBe(before)
  })

  it('creates a new plain list after successful preflight and undo removes it', () => {
    const { data, source, journal } = setup()
    const rec = data.addRecord({ pageId: source.id, text: 'обычная' })
    const { result: page, undo } = journal.undoable([rec.id], () => journal.chooseForRecord(rec.id, { newList: 'новая страница' }))
    expect(page).toMatchObject({ title: 'Новая страница', glyph: 'list' })
    expect(rec.pageId).toBe(page!.id)
    undo()
    expect(rec.pageId).toBe(source.id)
    expect(data.pages[page!.id]).toBeUndefined()
  })
})
