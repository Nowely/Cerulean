import { describe, expect, it } from 'vitest'
import { readLine, readModel, type LineContext } from '~/domain/auto'
import { DEFAULT_SETTINGS } from '~/domain/factory'
import { firstRun } from '~/domain/seed'
import type { ModelItem, ModelResult } from '~/domain/model'

const now = new Date(2026, 9, 19, 9, 14).getTime()
const pages = firstRun(now).pages
const inbox = pages.find(p => p.kind === 'inbox')!
const shop = pages.find(p => p.title === 'Покупки')!
const todo = pages.find(p => p.title === 'Задачи')!
const department = shop.props.find(p => p.type === 'select')!
const ctx = (extra: Partial<LineContext> = {}): LineContext => ({ pages, inboxId: inbox.id, learned: {}, recent: [], now, sort: true, ...extra })
const item = (text: string, pageId: string | null, option: string | null = null): ModelItem => ({ text, pageId, option, qty: null, note: '', date: null, time: null })
const result = (...items: ModelItem[]): ModelResult => ({ kind: 'record', items })

describe('mf3-ai: independent field functions', () => {
  it('defaults to enabled and retains an explicit off when a key is removed and restored', () => {
    const settings = { ...DEFAULT_SETTINGS, apiKey: 'fake-key', aiSplit: false }
    const removed = { ...settings, apiKey: '' }
    const restored = { ...removed, apiKey: 'another-fake-key' }
    expect([DEFAULT_SETTINGS.aiRoute, DEFAULT_SETTINGS.aiSplit, DEFAULT_SETTINGS.aiDepartment, DEFAULT_SETTINGS.aiIcon]).toEqual([true, true, true, true])
    expect(restored.aiSplit).toBe(false)
  })

  it('routes one unsplit line locally and ignores multiple model items without losing text', () => {
    const title = 'хлеб и позвонить маме'
    const options = ctx({ route: true, split: false })
    expect(readLine(title, '', options).drafts).toHaveLength(1)
    const drafts = readModel(result(item('Хлеб', shop.id), item('Позвонить маме', todo.id)), title, '', options)
    expect(drafts).toHaveLength(1)
    expect(drafts[0]!.text.toLowerCase()).toContain('позвонить маме')
    expect(drafts[0]!.pageId).toBe(shop.id)
    const abbreviated = readModel(result(item('Хлеб', shop.id, 'Хлеб и выпечка')), title, '', options)
    expect(abbreviated[0]!.text.toLowerCase()).toContain('позвонить маме')
    expect(abbreviated[0]!.values[department.id]).toBeDefined()
  })

  it('splits without moving away from the chosen page or inbox', () => {
    const options = ctx({ route: false, split: true, place: { pageId: shop.id, by: 'page' } })
    expect(readLine('хлеб, молоко', '', options).drafts.map(d => d.pageId)).toEqual([shop.id, shop.id])
    const answer = result(item('Хлеб', shop.id), item('Позвонить маме', todo.id))
    expect(readModel(answer, 'хлеб и позвонить маме', '', options).map(d => d.pageId)).toEqual([shop.id, shop.id])
    expect(readModel(answer, 'хлеб и позвонить маме', '', ctx({ route: false, split: true })).map(d => d.pageId)).toEqual([inbox.id, inbox.id])
  })

  it('turns off both rule and model department assignment without disabling the other functions', () => {
    const options = ctx({ route: true, split: true, department: false, place: { pageId: shop.id, by: 'page' } })
    const local = readLine('молоко, хлеб', '', options).drafts
    expect(local).toHaveLength(2)
    expect(local.every(d => d.values[department.id] === undefined)).toBe(true)
    const model = readModel(result(item('Молоко', shop.id, 'Молочное')), 'молоко', '', options)
    expect(model[0]!.values[department.id]).toBeUndefined()
    expect(readLine('молоко', '', { ...options, department: true }).drafts[0]!.values[department.id]).toBeDefined()
    expect(readModel(result(item('Молоко', shop.id, 'Молочное')), 'молоко', '', { ...options, department: true })[0]!.values[department.id]).toBeDefined()
  })

  it.each([false, true].flatMap(key => [false, true].flatMap(split => [false, true].map(enabled => ({ key, split, enabled })))))('reads an add-row line on its chosen page with key=$key, split=$split, department=$enabled', ({ key, split, enabled }) => {
    const drafts = readLine('молоко, позвонить маме', '', ctx({
      place: { pageId: shop.id, by: 'page' },
      split: key && split,
      department: enabled
    })).drafts
    expect(drafts).toHaveLength(key && split ? 2 : 1)
    expect(drafts.every(d => d.pageId === shop.id)).toBe(true)
    expect(drafts[0]!.values[department.id] !== undefined).toBe(enabled)
  })
})
