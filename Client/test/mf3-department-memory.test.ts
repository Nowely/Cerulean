import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readLine, readModel, draftsFor, type LineContext } from '~/domain/auto'
import { applyDepartment, departmentStem } from '~/domain/departmentMemory'
import { mergeSnapshot, parseSnapshot, toJSON } from '~/domain/export'
import { emptySide, fileOf, mergeSides, parseFile } from '~/domain/bucket'
import { firstRun } from '~/domain/seed'
import { applyView } from '~/domain/views'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import type { ModelResult } from '~/domain/model'

const now = 1700000000000
function setup() {
  const data = useDataStore()
  const pages = firstRun(now).pages
  for (const page of pages) data.pages[page.id] = page
  const shop = pages.find(p => p.template === 'shop')!
  const prop = shop.props.find(p => p.type === 'select')!
  const other = prop.options!.find(o => o.name === 'Прочее')!.id
  const grocery = prop.options!.find(o => o.name === 'Бакалея')!.id
  const rec = data.addRecord({ pageId: shop.id, text: 'Кофе', values: { [prop.id]: grocery } })
  const change = (id: string, option: string | null) => {
    const r = data.records[id]!
    const before = r.values[prop.id]
    data.updateRecord(id, { values: { ...r.values, [prop.id]: option } })
    return data.teachDepartment(id, prop.id, before, option)
  }
  const ctx = (extra: Partial<LineContext> = {}): LineContext => ({ pages, inboxId: data.inbox.id, learned: {}, recent: [], now, place: { pageId: shop.id, by: 'page' }, ...extra })
  return { data, pages, shop: data.pages[shop.id]!, prop, other, grocery, rec, change, ctx }
}

beforeEach(() => setActivePinia(createPinia()))

describe('mf3 department memory', () => {
  it('normalizes the first word without skipping short words or using later ones', () => {
    expect(departmentStem('  Купить КОФЕ в зёрнах')).toBe('кофе')
    expect(departmentStem('Ёлки')).toBe('елки')
    expect(departmentStem('чай зелёный')).toBe('чай')
    expect(departmentStem('в кофе')).toBeUndefined()
  })

  it('overrides rules and model, including unsplit, while the switch is on', () => {
    const { shop, prop, other, grocery, change, rec, ctx } = setup()
    change(rec.id, other)
    expect(draftsFor('кофе в зёрнах', shop, now)[0]!.values[prop.id]).toBe(other)
    expect(readLine('кофе в зёрнах', '', ctx()).drafts[0]!.values[prop.id]).toBe(other)
    const result: ModelResult = { kind: 'record', items: [{ text: 'Кофе в зёрнах', pageId: shop.id, option: 'Бакалея', qty: null, date: null, time: null, note: '' }] }
    for (const split of [true, false]) {
      expect(readModel(result, 'кофе в зёрнах', '', ctx({ split }))[0]!.values[prop.id]).toBe(other)
      expect(readModel(result, 'кофе в зёрнах', '', ctx({ split, department: false }))[0]!.values[prop.id]).toBeUndefined()
    }
    expect(readLine('кофе в зёрнах', '', ctx({ department: false })).drafts[0]!.values[prop.id]).toBeUndefined()
    expect(applyDepartment(shop, 'чай', { [prop.id]: grocery })[prop.id]).toBe(grocery)
  })

  it('learns only explicit valid changes and keeps pages isolated', () => {
    const { data, shop, prop, rec, other, grocery, change } = setup()
    const stamp = shop.updatedAt
    data.updateRecord(rec.id, { values: { [prop.id]: other } })
    expect(shop.departmentMemory).toBeUndefined()
    data.teachDepartment(rec.id, prop.id, other, other)
    data.teachDepartment(rec.id, prop.id, other, 'missing')
    expect(shop.departmentMemory).toBeUndefined()
    change(rec.id, grocery)
    change(rec.id, other)
    expect(shop.updatedAt).toBeGreaterThan(stamp ?? 0)
    const another = data.createFromTemplate('shop', { title: 'Ещё покупки' })
    const secondProp = another.props.find(p => p.type === 'select')!
    expect(applyDepartment(another, 'кофе', {})[secondProp.id]).toBeUndefined()
    change(rec.id, null)
    expect(shop.departmentMemory?.[prop.id]?.кофе).toBe(other)
  })

  it('survives renames, ignores removed IDs and comes back on undo', () => {
    const { data, shop, prop, rec, other, change } = setup()
    change(rec.id, other)
    data.updatePage(shop.id, { title: 'Продукты' })
    data.updateProp(shop.id, prop.id, { name: 'Ряд', options: prop.options!.map(o => o.id === other ? { ...o, name: 'Другое' } : o) })
    expect(applyDepartment(shop, 'кофе', {})[prop.id]).toBe(other)
    const removed = data.removeOption(shop.id, prop.id, other)!
    expect(applyDepartment(shop, 'кофе', {})[prop.id]).toBeUndefined()
    removed.undo()
    expect(applyDepartment(shop, 'кофе', {})[prop.id]).toBe(other)
    const retyped = data.retypeProp(shop.id, prop.id, 'text')!
    expect(applyDepartment(shop, 'кофе', {})[prop.id]).toBeUndefined()
    retyped.undo()
    expect(applyDepartment(shop, 'кофе', {})[prop.id]).toBe(other)
  })

  it.each(['ordinary', 'tree'] as const)('learns %s group moves and safely undoes', (mode) => {
    const { data, shop, prop, rec, other, grocery, change } = setup()
    const view = shop.views[0]!
    const groups = () => applyView(shop, data.recordsOf(shop.id), view, now)
    data.addRecord({ pageId: shop.id, text: 'Якорь', values: { [prop.id]: other } })
    const move = () => mode === 'ordinary'
      ? data.placeRecord(shop.id, view.id, groups(), rec.id, other, 0)
      : data.placeTreeRecord(shop.id, view.id, groups(), rec.id, null, other, 0, now)
    const first = move()!
    expect(shop.departmentMemory?.[prop.id]?.кофе).toBe(other)
    if ('ok' in first) {
      expect(first.ok).toBe(true)
      if (first.ok) first.undo()
    } else first.undo()
    expect(shop.departmentMemory?.[prop.id]?.кофе).toBeUndefined()
    const second = move()!
    const another = data.addRecord({ pageId: shop.id, text: 'Кофе свежий', values: { [prop.id]: other } })
    change(another.id, grocery)
    if ('ok' in second) {
      if (second.ok) second.undo()
    } else second.undo()
    expect(shop.departmentMemory?.[prop.id]?.кофе).toBe(grocery)
    expect(rec.values[prop.id]).toBe(other)
  })

  it('applies the final title at write/refile and leaves a bought record unchanged', () => {
    const { data, shop, prop, rec, other, grocery, change } = setup()
    const journal = useJournalStore()
    change(rec.id, other)
    const draft = (text: string) => ({ pageId: shop.id, text, due: null, values: { [prop.id]: grocery }, note: '', by: 'page' as const })
    const created = journal.write('кофе в зёрнах', [draft('Кофе в зёрнах')], { here: () => false })!
    expect(data.records[created.ids[0]!]!.values[prop.id]).toBe(other)
    const changed = journal.refile(created, [draft('Кофе молотый')], { here: () => false })!
    expect(data.records[changed.ids[0]!]!.values[prop.id]).toBe(other)
    data.updateRecord(rec.id, { done: true, values: { [prop.id]: grocery } })
    const before = JSON.stringify(rec)
    const next = journal.write('кофе', [draft('Кофе')], { here: () => false })!
    expect(next.ids).toHaveLength(1)
    expect(next.ids[0]).not.toBe(rec.id)
    expect(data.records[next.ids[0]!]!.values[prop.id]).toBe(other)
    expect(JSON.stringify(rec)).toBe(before)
    expect(rec.done).toBe(true)
    expect(rec.values[prop.id]).toBe(grocery)
  })

  it('round trips JSON and ordinary S3 page LWW without connection secrets', () => {
    const { data, shop, prop, rec, other, change } = setup()
    change(rec.id, other)
    data.setSettings({ apiKey: 'private-fake-key' })
    const json = toJSON(data.snapshot())
    expect(json).not.toContain('private-fake-key')
    expect(parseSnapshot(json).pages.find(p => p.id === shop.id)?.departmentMemory?.[prop.id]?.кофе).toBe(other)
    const remote = parseFile(JSON.stringify(fileOf(data.side()))).side
    expect(JSON.stringify(remote)).not.toContain('private-fake-key')
    expect(mergeSides(emptySide(), remote).take.pages.find(p => p.id === shop.id)?.departmentMemory?.[prop.id]?.кофе).toBe(other)
  })

  it('remaps add-import property and option IDs without replacing local words', () => {
    const { data, shop, prop, rec, other, change } = setup()
    change(rec.id, other)
    const local = data.snapshot()
    const source = structuredClone(parseSnapshot(toJSON(local)))
    const page = source.pages.find(p => p.id === shop.id)!
    const sourceProp = page.props.find(p => p.id === prop.id)!
    sourceProp.id = 'foreign-prop'
    sourceProp.options = sourceProp.options!.map((o, i) => ({ ...o, id: `foreign-${i}` }))
    page.departmentMemory = { 'foreign-prop': { кофе: sourceProp.options[0]!.id, чай: sourceProp.options.find(o => o.name === 'Прочее')!.id } }
    source.records = []
    const merged = mergeSnapshot(local, source)
    const updated = merged.changed.find(p => p.id === shop.id)!
    expect(updated.departmentMemory?.[prop.id]).toEqual({ кофе: other, чай: other })
    const added = data.addSnapshot(source)
    expect(shop.departmentMemory?.[prop.id]?.чай).toBe(other)
    data.takeBack(added)
    expect(shop.departmentMemory?.[prop.id]).toEqual({ кофе: other })
    const old = parseSnapshot(JSON.stringify({ ...source, pages: source.pages.map(({ departmentMemory: _memory, ...p }) => p) }))
    expect(old.pages.find(p => p.id === shop.id)?.departmentMemory).toBeUndefined()
  })
})
