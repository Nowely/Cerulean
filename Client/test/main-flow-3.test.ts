import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { LineDraft } from '~/domain/auto'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { cardLine, lowStock } from '~/domain/summary'
import { newRecord } from '~/domain/factory'

let n = 0
async function fresh() {
  setActivePinia(createPinia())
  const data = useDataStore()
  await data.init({ dbName: `main-flow-3-${++n}` })
  return { data, journal: useJournalStore() }
}

const draft = (pageId: string, text: string): LineDraft => ({ pageId, text, due: null, values: {}, note: '', by: 'page' })

describe('main flow iteration 3: field order', () => {
  it('appends field records per page in the order written, without changing existing order', async () => {
    const { data, journal } = await fresh()
    const shop = data.livePages.find(p => p.title === 'Покупки')!
    const inbox = data.inbox
    data.addRecord({ pageId: shop.id, text: 'Сыр', order: -3 })
    data.addRecord({ pageId: shop.id, text: 'Яйца', order: -1 })
    data.addRecord({ pageId: inbox.id, text: 'Позвонить', order: 4 })

    const filed = journal.write('несколько', [draft(shop.id, 'Молоко'), draft(inbox.id, 'Лампа'), draft(shop.id, 'Кефир')], { here: () => true })
    const names = (id: string) => data.recordsOf(id).slice().sort((a, b) => a.order - b.order).map(r => r.text)
    expect(names(shop.id)).toEqual(['Сыр', 'Яйца', 'Молоко', 'Кефир'])
    expect(names(inbox.id)).toEqual(['Позвонить', 'Лампа'])
    expect(filed.ids.map(id => data.records[id]!.text)).toEqual(['Молоко', 'Лампа', 'Кефир'])
  })

  it('appends a record to its new page when a later model reading moves it', async () => {
    const { data, journal } = await fresh()
    const shop = data.livePages.find(p => p.title === 'Покупки')!
    data.addRecord({ pageId: shop.id, text: 'Сыр', order: 6 })
    const filed = journal.write('молоко', [draft(data.inbox.id, 'Молоко')], { here: () => false })

    const refiled = journal.refile(filed, [draft(shop.id, 'Молоко')], { here: () => false })
    expect(refiled?.ids).toEqual(filed.ids)
    expect(data.recordsOf(shop.id).slice().sort((a, b) => a.order - b.order).map(r => r.text)).toEqual(['Сыр', 'Молоко'])
  })

  it('keeps the home summary dated first, then newest first, independently of manual list order', async () => {
    const { data } = await fresh()
    const shop = data.livePages.find(p => p.title === 'Покупки')!
    const make = (text: string, order: number, addedAt: number, due: string | null = null) => newRecord({
      pageId: shop.id, text, order, addedAt, due: due ? { date: due } : null
    })
    const rows = [
      make('Сыр', 0, 1000),
      make('Молоко', 1, 2000),
      make('Хлеб', 2, 500, '2026-11-03')
    ]
    expect(cardLine(shop, rows, new Date(2026, 10, 2, 12).getTime()).line).toBe('завтра хлеб, молоко, сыр')
  })

  it('uses the same low-stock threshold in summaries, including for existing number properties', async () => {
    const { data } = await fresh()
    const page = data.createPage({ props: [
      { id: 'left', name: 'Осталось', type: 'number', normProp: 'norm' },
      { id: 'norm', name: 'Норма', type: 'number' }
    ] })
    const amounts = [[1, 1], [0, 1], [1, 5], [0.5, 2], [0.5, 0.5], [2, 5]]
    const rows = amounts.map(([amount, norm], index) => newRecord({
      pageId: page.id, text: String(index), values: { left: amount!, norm: norm! }
    }))
    expect(lowStock(page, rows).map(row => row.text)).toEqual(['1', '2', '3'])
  })
})
