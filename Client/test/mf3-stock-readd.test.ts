import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { readLine } from '~/domain/auto'

describe('new shopping input', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([true, false])('creates a separate record beside bought=%s full stock and undoes only the new record', (done) => {
    const data = useDataStore()
    const journal = useJournalStore()
    const page = data.createPage({ title: 'Покупки', template: 'shop', props: [{ id: 'qty', name: 'Количество', type: 'text' }], stocks: [{ amountProp: 'left', normProp: 'norm', buyViewId: 'buy', stockViewId: 'stock' }] })
    const rec = data.addRecord({ pageId: page.id, text: 'Молоко', done, values: { left: 5, norm: 5 }, stockUnits: { left: 'л' }, note: 'Заметка' })
    const child = data.addRecord({ pageId: page.id, parentId: rec.id, text: 'Подпункт' })
    const before = JSON.stringify(rec)
    const drafts = readLine('Молоко 2 л', '', { pages: [page], inboxId: page.id, learned: {}, recent: [], now: Date.now(), place: { pageId: page.id, by: 'page' } }).drafts
    const filed = journal.write('Молоко 2 л', drafts, { here: () => true })
    expect(filed.ids[0]).not.toBe(rec.id)
    expect(data.records[filed.ids[0]!]!.values.qty).toBe('2 л')
    expect(JSON.stringify(data.records[rec.id])).toBe(before)
    journal.undo(filed.entryId)
    expect(data.records[filed.ids[0]!]).toBeUndefined()
    expect(JSON.stringify(data.records[rec.id])).toBe(before)
    expect(data.records[child.id]?.parentId).toBe(rec.id)
  })
})
