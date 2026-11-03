import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

async function fixture(p, sort = 'manual', dueGroups = false) {
  await open(p, '/', false)
  const ids = await store(p, async (data, config) => {
    const page = data.createPage({ title: 'Вложенность и группы', props: [{ id: 'group', name: 'Группа', type: 'select', options: [{ id: 'a', name: 'Группа А' }, { id: 'b', name: 'Группа Б' }] }] })
    data.updatePage(page.id, { views: [{ ...page.views[0], id: 'tree-view', groupBy: config.dueGroups ? 'due' : 'group', sort: config.sort }] })
    const parent = data.addRecord({ pageId: page.id, text: 'Стены', order: 20, addedAt: 1, due: { date: '2100-01-01' }, values: { group: 'b', parentOther: 'сохранить' } })
    const nested = data.addRecord({ pageId: page.id, parentId: parent.id, text: 'Насос', order: 0, addedAt: 1, due: { date: '2000-01-01' }, values: { group: 'a', nestedOther: 'своё' } })
    const grandchild = data.addRecord({ pageId: page.id, parentId: nested.id, text: 'Деталь', order: 0, addedAt: 1, values: { group: 'a', deep: 42 } })
    const moving = data.addRecord({ pageId: page.id, text: 'Краска', order: 60, addedAt: 1, due: { date: '2000-01-01' }, values: { group: 'a', own: 'исходное' } })
    const movingChild = data.addRecord({ pageId: page.id, parentId: moving.id, text: 'Оттенок', order: 0, addedAt: 1, values: { group: 'a', childOther: 8 } })
    const anchor = data.addRecord({ pageId: page.id, text: 'Плитка', order: 90, addedAt: 1, due: { date: '2100-01-02' }, values: { group: 'b', other: 'не трогать' } })
    await data.flush()
    return { page: page.id, parent: parent.id, nested: nested.id, grandchild: grandchild.id, moving: moving.id, movingChild: movingChild.id, anchor: anchor.id }
  }, { sort, dueGroups })
  await open(p, `/p/${ids.page}`, false)
  return ids
}

const row = (p, id) => p.locator(`[data-tree-row="${id}"]`)
async function drag(p, from, to, zone, xOffset = 120) {
  const source = row(p, from).locator('[data-row-text]')
  await source.scrollIntoViewIfNeeded()
  const a = await source.boundingBox()
  const b = await row(p, to).boundingBox()
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x + Math.min(80, a.width / 2), y: a.y + a.height / 2 }] })
  await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
  const y = zone === 'inside' ? b.y + b.height / 2 : zone === 'before' ? b.y + 3 : b.y + b.height - 3
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + xOffset, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
const snapshot = (p, ids) => store(p, (data, ids) => JSON.stringify([ids.parent, ids.nested, ids.grandchild, ids.moving, ids.movingChild, ids.anchor].map(id => data.records[id]), (key, value) => key === 'updatedAt' ? undefined : value), ids)

export default [
  { id: 'mf3-tree-groups-nest-outdent', device: MOBILE, run: async (p) => {
    const ids = await fixture(p)
    const before = await snapshot(p, ids)
    await drag(p, ids.moving, ids.parent, 'inside')
    const nested = await store(p, (data, ids) => ({ moved: data.records[ids.moving], child: data.records[ids.movingChild], parent: data.records[ids.parent] }), ids)
    expect(nested.moved.parentId === ids.parent && nested.moved.values.group === 'b', 'cross-group nesting failed')
    expect(nested.child.parentId === ids.moving && nested.child.values.group === 'a' && nested.parent.values.parentOther === 'сохранить', 'nesting modified descendants or parent')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await snapshot(p, ids) === before, 'nest undo did not restore the tree')

    await drag(p, ids.nested, ids.anchor, 'before', 20)
    const out = await store(p, (data, ids) => ({ moved: data.records[ids.nested], child: data.records[ids.grandchild] }), ids)
    expect(out.moved.parentId === null && out.moved.values.group === 'b', 'outdent did not adopt the target select group')
    expect(out.child.parentId === ids.nested && out.child.values.group === 'a', 'outdent altered its subtree')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await snapshot(p, ids) === before, 'outdent undo did not restore original values and order')

    await drag(p, ids.moving, ids.anchor, 'before')
    const ordinary = await store(p, (data, ids) => data.records[ids.moving], ids)
    expect(ordinary.parentId === null && ordinary.values.group === 'b', 'ordinary edge drag between groups failed')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await snapshot(p, ids) === before, 'ordinary group drag undo failed')
  } },
  ...['name', 'due'].map(sort => ({ id: `mf3-tree-groups-sort-${sort}`, device: MOBILE, run: async (p) => {
    const ids = await fixture(p, sort)
    await drag(p, ids.moving, ids.parent, 'inside')
    const changed = await store(p, (data, ids) => ({ sort: data.pages[ids.page].views[0].sort, parent: data.records[ids.moving].parentId, group: data.records[ids.moving].values.group }), ids)
    expect(changed.sort === 'manual' && changed.parent === ids.parent && changed.group === 'b', `${sort}: grouping or manual sort failed`)
    expect((await p.locator('[data-notice]').innerText()).includes('порядок: вручную'), `${sort}: manual sort change was not announced`)
    await store(p, (data, ids) => {
      const rec = data.records[ids.moving]
      const other = data.records[ids.anchor]
      data.updateRecord(rec.id, { values: { ...rec.values, own: 'позднее' } })
      data.updateRecord(other.id, { values: { ...other.values, other: 'позднее' } })
    }, ids)
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    const restored = await store(p, (data, ids) => ({ sort: data.pages[ids.page].views[0].sort, moved: data.records[ids.moving], child: data.records[ids.movingChild], other: data.records[ids.anchor] }), ids)
    expect(restored.sort === sort && restored.moved.parentId === null && restored.moved.values.group === 'a' && restored.moved.values.own === 'позднее', `${sort}: undo failed or lost another edit`)
    expect(restored.child.parentId === ids.moving && restored.other.order === 90 && restored.other.values.other === 'позднее', `${sort}: unrelated record changed`)
  } })),
  { id: 'mf3-tree-groups-undo-later-group', device: MOBILE, run: async (p) => {
    const ids = await fixture(p)
    await drag(p, ids.moving, ids.parent, 'inside')
    await store(p, (data, id) => data.updateRecord(id, { values: { ...data.records[id].values, group: null } }), ids.moving)
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    await p.locator('[data-notice]').getByText('Отменено частично: более поздние изменения сохранены.').waitFor()
    const rec = await store(p, (data, id) => data.records[id], ids.moving)
    expect(rec.parentId === null && rec.values.group === null, 'partial undo lost a later group choice')
  } },
  { id: 'mf3-tree-groups-undo-later-order', device: MOBILE, run: async (p) => {
    const ids = await fixture(p, 'name')
    await drag(p, ids.moving, ids.parent, 'inside')
    await store(p, (data, id) => data.updateRecord(id, { order: 777 }), ids.anchor)
    const before = await snapshot(p, ids)
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    await p.locator('[data-notice]').getByText('Не удалось отменить: записи или порядок изменились.').waitFor()
    expect(await snapshot(p, ids) === before, 'undo overwrote a later reorder')
    expect(await store(p, (data, id) => data.pages[id].views[0].sort === 'manual', ids.page), 'undo changed the sort after a later reorder')
  } },
  { id: 'mf3-tree-groups-undo-conflict', device: MOBILE, run: async (p) => {
    const ids = await fixture(p)
    await drag(p, ids.moving, ids.parent, 'inside')
    await store(p, (data, ids) => data.updateRecord(ids.moving, { parentId: ids.anchor, order: 99 }), ids)
    const before = await snapshot(p, ids)
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    await p.locator('[data-notice]').getByText('Не удалось отменить: записи или порядок изменились.').waitFor()
    expect(await snapshot(p, ids) === before, 'conflicting undo overwrote the later move')
  } },
  { id: 'mf3-tree-groups-due-refusal', device: MOBILE, run: async (p) => {
    const ids = await fixture(p, 'manual', true)
    const before = await snapshot(p, ids)
    await drag(p, ids.nested, ids.anchor, 'before', 20)
    await p.locator('[data-notice]').getByText('Нельзя переместить: срок записи не соответствует выбранной группе.').waitFor()
    expect(await snapshot(p, ids) === before, 'due mismatch altered data')
    await drag(p, ids.nested, ids.moving, 'before', 20)
    let rec = await store(p, (data, id) => data.records[id], ids.nested)
    expect(rec.parentId === null && rec.due.date === '2000-01-01', 'matching cross-group drop changed the date or did not happen')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await snapshot(p, ids) === before, 'cross-group due undo failed')
    await store(p, (data, id) => data.updateRecord(id, { due: { date: '2100-01-04' } }), ids.nested)
    const matching = await snapshot(p, ids)
    await drag(p, ids.nested, ids.anchor, 'before', 20)
    rec = await store(p, (data, id) => data.records[id], ids.nested)
    expect(rec.parentId === null && rec.due.date === '2100-01-04', 'matching due group move changed the date or did not happen')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await snapshot(p, ids) === matching, 'matching due group undo failed')
  } },
  { id: 'mf3-tree-groups-desktop', device: DESKTOP, run: async (p) => {
    const ids = await fixture(p)
    const text = row(p, ids.moving).locator('[data-row-text]')
    await text.focus()
    await p.keyboard.press('Alt+ArrowDown')
    const rec = await store(p, (data, id) => data.records[id], ids.moving)
    expect(rec.parentId === null && rec.values.group === 'b', 'desktop keyboard group move regressed')
    await text.click({ button: 'right' })
    await p.getByRole('menuitem', { name: 'Переместить на другую страницу' }).waitFor()
  } }
]
