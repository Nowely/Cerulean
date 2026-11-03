import { describe, expect, it } from 'vitest'
import { readLine, readModel } from '~/domain/auto'
import { parseSnapshot } from '~/domain/export'
import { DEFAULT_SETTINGS, newPage, newRecord } from '~/domain/factory'
import { propList } from '~/domain/props'
import { demo, firstRun } from '~/domain/seed'
import { applyTemplate, readPage } from '~/domain/templates'
import { filterRecords } from '~/domain/views'

const now = 1000
const names = (page: ReturnType<typeof newPage>) => page.props.map(p => p.name)
const ordered = ['Отдел', 'Количество', 'Осталось', 'Норма']

describe('shopping starter property order', () => {
  it('creates the same order for a starter, first run and demo, with stock and grouping linked by ID', () => {
    const base = newPage({}, now)
    const pages = [
      { ...base, ...applyTemplate(base, 'shop') },
      firstRun(now).pages.find(p => p.template === 'shop')!,
      demo(now).pages.find(p => p.template === 'shop')!
    ]
    for (const page of pages) {
      expect(names(page)).toEqual(ordered)
      const dept = page.props.find(p => p.name === 'Отдел')!
      const qty = page.props.find(p => p.name === 'Количество')!
      const left = page.props.find(p => p.name === 'Осталось')!
      const norm = page.props.find(p => p.id === left.normProp)!
      const buy = page.views.find(v => v.name === 'Купить')!
      const stock = page.views.find(v => v.name === 'Запасы')!
      expect(buy.groupBy).toBe(dept.id)
      expect(buy.shown).toEqual([qty.id, left.id])
      expect(page.stocks).toEqual([{ amountProp: left.id, normProp: norm.id, buyViewId: buy.id, stockViewId: stock.id }])
      const low = newRecord({ pageId: page.id, text: 'Тест', values: { [left.id]: 1, [norm.id]: 2 } }, now)
      const full = newRecord({ pageId: page.id, text: 'Тест 2', values: { [left.id]: 2, [norm.id]: 2 } }, now)
      expect(filterRecords([low, full], buy).map(r => r.id)).toEqual([low.id])
      expect(filterRecords([low, full], stock).map(r => r.id)).toEqual([low.id, full.id])
    }
  })

  it('maps rules and a fake model answer to the correct property IDs', () => {
    const pages = firstRun(now).pages
    const page = pages.find(p => p.template === 'shop')!
    const inbox = pages.find(p => p.kind === 'inbox')!
    const qty = page.props.find(p => p.name === 'Количество')!
    const dept = page.props.find(p => p.name === 'Отдел')!
    const dairy = dept.options!.find(o => o.name === 'Молочное')!
    const ctx = { pages, inboxId: inbox.id, learned: {}, recent: [], now, sort: true, place: { pageId: page.id, by: 'page' as const } }
    const local = readLine('молоко 2 л', '', ctx).drafts[0]!
    expect(local.values).toMatchObject({ [qty.id]: '2 л', [dept.id]: dairy.id })
    const result = { kind: 'record' as const, items: [{ text: 'Молоко', pageId: page.id, option: 'Молочное', qty: '2 л', note: '', date: null, time: null }] }
    expect(readModel(result, 'молоко 2 л', '', ctx)[0]!.values).toMatchObject({ [qty.id]: '2 л', [dept.id]: dairy.id })
  })

  it('preserves legacy property order and a custom order when reading and importing a snapshot', () => {
    const base = newPage({}, now)
    const page = { ...base, ...applyTemplate(base, 'shop') }
    const byName = (name: string) => page.props.find(p => p.name === name)!
    const old = { ...page, props: ['Количество', 'Отдел', 'Осталось', 'Норма'].map(byName) }
    const custom = { ...old, id: 'custom', propOrder: [byName('Осталось').id, byName('Норма').id, byName('Количество').id, byName('Отдел').id, 'due' as const, 'note' as const] }
    const before = structuredClone([old, custom])
    const snapshot = { app: 'cerulean', version: 1, exportedAt: now, pages: [old, custom], records: [], sections: [], entries: [], settings: DEFAULT_SETTINGS, learned: {} }
    const imported = parseSnapshot(JSON.stringify(snapshot)).pages
    expect([readPage(old), readPage(custom)]).toEqual(before)
    expect(imported).toEqual(before)
    expect(propList(imported[0]!).map(p => p.name)).toEqual(['Количество', 'Отдел', 'Осталось', 'Срок', 'Заметка'])
    expect(propList(imported[1]!).map(p => p.name)).toEqual(['Осталось', 'Количество', 'Отдел', 'Срок', 'Заметка'])
  })
})
