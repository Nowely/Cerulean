import { describe, expect, it } from 'vitest'
import { insertView } from '~/components/page/viewTabsModel'
import { listView } from '~/domain/templates'
import type { Layout } from '~/domain/types'

describe('mf3 view tabs', () => {
  it.each<Layout>(['list', 'table', 'board', 'calendar'])('inserts a %s view after the current one with only its done filter', (layout) => {
    const before = listView('Купить', { filter: [{ field: 'done', op: 'is', value: false }, { field: 'due', op: 'is', value: 'today' }] })
    const after = listView('Куплено', { filter: [{ field: 'done', op: 'is', value: true }] })
    const result = insertView([before, after], before, layout)
    expect(result.views.map(v => v.id)).toEqual([before.id, result.view.id, after.id])
    expect(result.view.layout).toBe(layout)
    expect(result.view.filter).toEqual([{ field: 'done', op: 'is', value: false }])
    expect(result.view.filter[0]).not.toBe(before.filter[0])
  })

  it('names duplicate layouts and preserves a done-only view', () => {
    const before = listView('Таблица', { filter: [{ field: 'done', op: 'is', value: true }] })
    const result = insertView([before], before, 'table')
    expect(result.view.name).toBe('Таблица 2')
    expect(result.view.filter).toEqual(before.filter)
  })
})
