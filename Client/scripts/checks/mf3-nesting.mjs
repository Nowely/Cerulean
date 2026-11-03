import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

export default [
  { id: 'mf3-nesting-move-undo', device: DESKTOP, run: async (p) => {
    await open(p, '/', false)
    const ids = await store(p, async (data) => {
      const source = data.createPage({ title: 'Источник вложенности', props: [
        { id: 'from-choice', name: 'Комната', type: 'select', options: [{ id: 'from-kitchen', name: 'Кухня' }] },
        { id: 'from-private', name: 'Личное', type: 'text' }
      ] })
      const target = data.createPage({ title: 'Цель вложенности', props: [
        { id: 'to-choice', name: 'Комната', type: 'select', options: [{ id: 'to-kitchen', name: 'Кухня' }] }
      ] })
      const root = data.addRecord({ pageId: source.id, text: 'Корень дерева', values: { 'from-choice': 'from-kitchen', 'from-private': 'root' } })
      const child = data.addRecord({ pageId: source.id, parentId: root.id, text: 'Первый подпункт', values: { 'from-choice': 'from-kitchen', 'from-private': 'child' } })
      const grandchild = data.addRecord({ pageId: source.id, parentId: child.id, text: 'Второй подпункт', note: 'бережная заметка', values: { 'from-choice': 'from-kitchen', 'from-private': 'grandchild' } })
      await data.flush()
      return { source: source.id, target: target.id, root: root.id, child: child.id, grandchild: grandchild.id }
    })
    await open(p, `/p/${ids.source}`, false)
    const before = await store(p, (data, ids) => {
      const records = data.records
      const order = [ids.grandchild, ids.child, ids.root]
      data.records = Object.fromEntries([...order.map(id => [id, records[id]]), ...Object.entries(records).filter(([id]) => !order.includes(id))])
      return order.map(id => JSON.parse(JSON.stringify(data.records[id], (key, value) => key === 'updatedAt' ? undefined : value)))
    }, ids)
    const root = p.locator('[data-row-text]').filter({ hasText: 'Корень дерева' })
    await root.hover()
    await p.getByRole('button', { name: 'Переместить «Корень дерева»' }).click()
    await p.getByRole('button', { name: /Цель вложенности/ }).click()
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).waitFor()
    const moved = await store(p, (data, ids) => [ids.root, ids.child, ids.grandchild].map(id => data.records[id]), ids)
    expect(moved.every(r => r.pageId === ids.target && r.values['to-choice'] === 'to-kitchen'), 'subtree properties were not mapped')
    expect(moved[2].values['from-private'] === 'grandchild' && moved[2].note === 'бережная заметка', 'unmatched property or note was lost')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    const after = await store(p, (data, ids) => [ids.grandchild, ids.child, ids.root].map(id => JSON.parse(JSON.stringify(data.records[id], (key, value) => key === 'updatedAt' ? undefined : value))), ids)
    expect(JSON.stringify(after) === JSON.stringify(before), 'undo did not restore the entire subtree')
    await store(p, data => data.flush())
    await p.reload()
    await p.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$pinia._s.get('data')?.ready)
    const reloaded = await store(p, (data, ids) => [ids.grandchild, ids.child, ids.root].map(id => JSON.parse(JSON.stringify(data.records[id], (key, value) => key === 'updatedAt' ? undefined : value))), ids)
    expect(JSON.stringify(reloaded) === JSON.stringify(before), 'restored subtree did not survive reload')
  } },
  { id: 'mf3-nesting-fold-reload', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const id = await store(p, async (data) => {
      const page = data.createPage({ title: 'Проверка подпунктов' })
      const root = data.addRecord({ pageId: page.id, text: 'Родитель' })
      data.addRecord({ pageId: page.id, parentId: root.id, text: 'Готовый подпункт', done: true })
      const child = data.addRecord({ pageId: page.id, parentId: root.id, text: 'Другой подпункт' })
      data.addRecord({ pageId: page.id, parentId: child.id, text: 'Третий уровень' })
      await data.flush()
      return page.id
    })
    await open(p, `/p/${id}`, false)
    const fold = p.getByRole('button', { name: 'Подпункты Родитель: 1 из 2' })
    await fold.waitFor()
    const done = p.locator('[data-row-text]').filter({ hasText: 'Готовый подпункт' })
    expect(await done.locator('.line-through').count() > 0, 'ticked child is not struck through')
    expect(await p.locator('[data-row-text]').filter({ hasText: 'Третий уровень' }).isVisible(), 'third level is missing')
    await fold.click()
    expect(await p.locator('[data-row-text]').filter({ hasText: 'Другой подпункт' }).count() === 0, 'children did not fold')
    await store(p, data => data.flush())
    await p.reload()
    await fold.waitFor()
    expect(await fold.getAttribute('aria-expanded') === 'false', 'fold did not survive reload')
    expect(await p.locator('[data-row-text]').filter({ hasText: 'Другой подпункт' }).count() === 0, 'children returned after reload')
    await fold.click()
    expect(await p.locator('[data-row-text]').filter({ hasText: 'Третий уровень' }).isVisible(), 'unfold did not restore descendants')
  } }
]
