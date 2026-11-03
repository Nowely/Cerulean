import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { LineContext, LineDraft } from '~/domain/auto'
import type { ModelResult } from '~/domain/model'
import { askModel } from '~/domain/model'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'

vi.mock('~/domain/model', async importOriginal => ({
  ...await importOriginal<typeof import('~/domain/model')>(),
  askModel: vi.fn()
}))

let n = 0
async function fresh(key = true) {
  setActivePinia(createPinia())
  const data = useDataStore()
  await data.init({ dbName: `mf3-ai-journal-${++n}` })
  if (key) data.setSettings({ apiKey: 'fake-key', keyState: 'ok', rulesFirst: false })
  return { data, journal: useJournalStore(), shop: data.livePages.find(p => p.title === 'Покупки')!, todo: data.livePages.find(p => p.title === 'Задачи')! }
}

function response(items: { text: string, pageId: string | null, option?: string }[]): ModelResult {
  return { kind: 'record', items: items.map(item => ({ ...item, option: item.option ?? null, note: '', qty: null, date: null, time: null })) }
}

function deferred() {
  let resolve!: (result: ModelResult) => void
  const promise = new Promise<ModelResult>((r) => {
    resolve = r
  })
  vi.mocked(askModel).mockReturnValueOnce(promise)
  return resolve
}

const line = (pageId: string, text: string, note = ''): LineDraft => ({ pageId, text, note, due: null, values: {}, by: 'auto' })
const context = (data: ReturnType<typeof useDataStore>): LineContext => ({ pages: data.livePages, inboxId: data.inbox.id, learned: data.learned, recent: data.recent, now: Date.now(), route: true, split: true, department: true })

beforeEach(() => vi.mocked(askModel).mockReset())

describe('mf3-ai-journal', () => {
  it('keeps the legacy no-key split and creates new records for repeats', async () => {
    const { journal, shop } = await fresh(false)
    const first = await journal.send('молоко, молоко', shop.id)
    const second = await journal.send('молоко', shop.id)
    expect(first.recordIds).toHaveLength(2)
    expect(new Set([...first.recordIds!, ...second.recordIds!]).size).toBe(3)
    expect(askModel).not.toHaveBeenCalled()
  })

  it('respects independent switches and the chosen destination', async () => {
    const { data, journal, shop, todo } = await fresh()
    const prop = shop.props.find(p => p.type === 'select')!
    data.setSettings({ aiRoute: false, aiSplit: true, aiDepartment: false })
    vi.mocked(askModel).mockResolvedValueOnce(response([{ text: 'Молоко', pageId: shop.id }, { text: 'Позвонить', pageId: todo.id }]))
    const entry = await journal.send('молоко, позвонить', 'auto')
    expect(entry.recordIds).toHaveLength(2)
    expect(entry.recordIds!.every(id => data.records[id]!.pageId === data.inbox.id)).toBe(true)
    const chosen = await journal.send('молоко, хлеб', shop.id)
    expect(chosen.recordIds).toHaveLength(2)
    expect(chosen.recordIds!.every(id => data.records[id]!.pageId === shop.id && !data.records[id]!.values[prop.id])).toBe(true)
    const inbox = await journal.send('молоко, хлеб', data.inbox.id)
    expect(inbox.recordIds).toHaveLength(2)
    expect(inbox.recordIds!.every(id => data.records[id]!.pageId === data.inbox.id)).toBe(true)
    data.setSettings({ aiRoute: true, aiSplit: false, aiDepartment: true })
    vi.mocked(askModel).mockResolvedValueOnce(response([{ text: 'Молоко', pageId: shop.id }, { text: 'Позвонить', pageId: todo.id }]))
    const one = await journal.send('молоко и позвонить маме', 'auto')
    expect(one.recordIds).toHaveLength(1)
    expect(data.records[one.recordIds![0]!]!.text.toLowerCase()).toContain('позвонить маме')
    expect(journal.previewFor('молоко, хлеб')).toMatchObject({ kind: 'page', count: 1 })
  })

  it('uses switches as they stand when a journal response arrives', async () => {
    const { data, journal, shop, todo } = await fresh()
    const resolve = deferred()
    const sending = journal.send('молоко и позвонить', 'auto')
    data.setSettings({ aiRoute: false, aiSplit: false, aiDepartment: false })
    resolve(response([{ text: 'Молоко', pageId: shop.id }, { text: 'Позвонить', pageId: todo.id }]))
    const entry = await sending
    expect(entry.recordIds).toHaveLength(1)
    const record = data.records[entry.recordIds![0]!]!
    expect(record.pageId).toBe(data.inbox.id)
    expect(record.text.toLowerCase()).toContain('позвонить')
  })

  it('late response uses current switches without moving the already filed record', async () => {
    const { data, journal, shop, todo } = await fresh()
    const filed = journal.write('молоко и звонок', [line(shop.id, 'Молоко и звонок')], { here: () => false })
    const resolve = deferred()
    const then = vi.fn()
    const reading = journal.lateRead(filed, 'молоко и звонок', '', context(data), { here: () => false, keepTitle: d => d }, then)
    data.setSettings({ aiRoute: false, aiSplit: false, aiDepartment: false })
    resolve(response([{ text: 'Молоко', pageId: shop.id, option: 'Молочное' }, { text: 'Звонок', pageId: todo.id }]))
    await reading
    const record = data.records[filed.ids[0]!]!
    expect(record.pageId).toBe(shop.id)
    expect(record.text.toLowerCase()).toContain('звонок')
    expect(record.values[shop.props.find(p => p.type === 'select')!.id]).toBeUndefined()
    expect(data.liveRecords.filter(r => filed.ids.includes(r.id))).toHaveLength(1)
  })

  it('keeps a destination chosen by hand when the late response splits the line', async () => {
    const { data, journal, shop, todo } = await fresh()
    const filed = journal.write('молоко и звонок', [line(shop.id, 'Молоко и звонок')], { here: () => false })
    const resolve = deferred()
    const ctx = { ...context(data), place: { pageId: shop.id, by: 'user' as const } }
    const reading = journal.lateRead(filed, 'молоко и звонок', '', ctx, { here: () => false, keepTitle: d => d }, () => {})
    resolve(response([{ text: 'Молоко', pageId: shop.id }, { text: 'Звонок', pageId: todo.id }]))
    await reading
    const entry = data.entries.find(e => e.id === filed.entryId)!
    expect(entry.recordIds).toHaveLength(2)
    expect(entry.recordIds!.every(id => data.records[id]!.pageId === shop.id)).toBe(true)
  })

  it.each(['text', 'values', 'move', 'delete'] as const)('ignores a late response after manual %s', async (change) => {
    const { data, journal, shop, todo } = await fresh()
    const filed = journal.write('молоко', [line(shop.id, 'Молоко')], { here: () => false })
    const resolve = deferred()
    const then = vi.fn()
    const reading = journal.lateRead(filed, 'молоко', '', context(data), { here: () => false, keepTitle: d => d }, then)
    const id = filed.ids[0]!
    if (change === 'text') data.updateRecord(id, { text: 'Мой текст' })
    if (change === 'values') data.updateRecord(id, { values: { custom: 'manual' } })
    if (change === 'move') data.moveRecords([id], todo.id)
    if (change === 'delete') data.purgeRecords([id])
    const before = JSON.stringify(data.records[id])
    resolve(response([{ text: 'Модель', pageId: todo.id }]))
    await reading
    expect(JSON.stringify(data.records[id])).toBe(before)
    expect(then).not.toHaveBeenCalled()
  })

  it('captures the typed title and note before the next field is edited', async () => {
    const { data, journal, shop, todo } = await fresh()
    const filed = journal.write('мой заголовок', [line(shop.id, 'Мой заголовок', 'Моя заметка')], { here: () => false })
    const resolve = deferred()
    let typed = 'Мой заголовок'
    const reading = journal.lateRead(filed, 'мой заголовок', 'Моя заметка', context(data), { here: () => false, keepTitle: d => ({ ...d, text: typed, note: 'Моя заметка' }) }, () => {})
    typed = 'Следующая запись'
    resolve(response([{ text: 'Модель', pageId: todo.id }]))
    await reading
    expect(data.records[filed.ids[0]!]!.text).toBe('Мой заголовок')
    expect(JSON.stringify(data.records[filed.ids[0]!]!.body)).toContain('Моя заметка')
  })

  it('applies an enabled department even when nothing else changes', async () => {
    const { data, journal, shop } = await fresh()
    const prop = shop.props.find(p => p.type === 'select')!
    const option = prop.options![0]!
    const filed = journal.write('молоко', [line(shop.id, 'Молоко')], { here: () => false })
    const resolve = deferred()
    const reading = journal.lateRead(filed, 'молоко', '', context(data), { here: () => false, keepTitle: d => d }, () => {})
    resolve(response([{ text: 'Молоко', pageId: shop.id, option: option.name }]))
    await reading
    expect(data.records[filed.ids[0]!]!.values[prop.id]).toBe(option.id)
  })
})
