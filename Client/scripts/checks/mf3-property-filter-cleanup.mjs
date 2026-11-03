import { DESKTOP, MOBILE, expect, store } from './lib.mjs'
import { first, goPage } from './main-flow.mjs'

const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
  : item)

async function setup(p) {
  await first(p)
  const ids = await store(p, (data) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    const prop = { id: 'cleanup-colour', name: 'Цвет тест', type: 'select', options: [{ id: 'cleanup-red', name: 'Красный' }, { id: 'cleanup-blue', name: 'Синий' }] }
    const other = { id: 'cleanup-room', name: 'Комната тест', type: 'select', options: [{ id: 'cleanup-kitchen', name: 'Кухня' }] }
    data.updatePage(page.id, { props: [...page.props, prop, other], views: page.views.map((v, i) => i === 0
      ? { ...v, selectFilters: { 'cleanup-colour': ['cleanup-red', 'cleanup-blue'], 'cleanup-room': ['cleanup-kitchen'] } }
      : i === 1 ? { ...v, selectFilters: { 'cleanup-colour': ['cleanup-red'] } } : v) })
    const rec = data.addRecord({ pageId: page.id, text: 'Проверка фильтра', values: { 'cleanup-colour': 'cleanup-red', 'cleanup-room': 'cleanup-kitchen' }, stockUnits: { retained: 'уп' }, stockBuy: { retained: true } })
    return { page: page.id, rec: rec.id }
  })
  await goPage(p, 'Покупки')
  const before = await snapshot(p, ids)
  await p.locator('main').getByRole('button', { name: 'Действия со страницей' }).first().click()
  await p.getByRole('dialog').or(p.getByRole('menu')).getByText(/^Свойства/).first().click()
  await p.getByRole('button', { name: 'Изменить «Цвет тест»' }).click()
  return { ids, before }
}

function snapshot(p, ids) {
  return store(p, (data, ids) => {
    const page = data.pages[ids.page]
    const rec = data.records[ids.rec]
    return JSON.parse(JSON.stringify({ props: page.props, views: page.views, stocks: page.stocks, values: rec.values, stockUnits: rec.stockUnits, stockBuy: rec.stockBuy }))
  }, ids)
}

async function run(p, action) {
  const { ids, before } = await setup(p)
  if (action === 'option') {
    await p.getByRole('button', { name: 'Удалить вариант «Красный»' }).click()
  } else if (action === 'remove') {
    await p.getByRole('button', { name: 'Удалить свойство', exact: true }).click()
    await p.getByRole('alertdialog', { name: 'Удалить «Цвет тест»?' }).getByRole('button', { name: 'Удалить', exact: true }).click()
  } else {
    await p.getByRole('radio', { name: action === 'retype-text' ? 'Текст' : 'Число' }).click()
  }
  const changed = await snapshot(p, ids)
  const first = changed.views[0].selectFilters
  const second = changed.views[1].selectFilters
  expect(JSON.stringify(first['cleanup-room']) === JSON.stringify(['cleanup-kitchen']), 'unrelated choice removed')
  expect(JSON.stringify(first['cleanup-colour']) === JSON.stringify(action === 'option' ? ['cleanup-blue'] : undefined), 'wrong choice cleanup')
  expect(!second['cleanup-colour'], 'another view kept the removed choice')
  expect(JSON.stringify(changed.views.slice(2)) === JSON.stringify(before.views.slice(2)), 'other views changed')
  expect(JSON.stringify(changed.stocks) === JSON.stringify(before.stocks), 'stock configuration changed')
  expect(JSON.stringify(changed.stockUnits) === JSON.stringify(before.stockUnits) && JSON.stringify(changed.stockBuy) === JSON.stringify(before.stockBuy), 'stock metadata changed')
  const notice = p.locator('[data-notice]').filter({ hasText: action === 'option' ? 'Вариант «Красный» удалён' : action === 'remove' ? 'Свойство «Цвет тест» удалено' : 'Тип изменён' }).first()
  if (action.startsWith('retype')) {
    expect((await notice.innerText()).includes('фильтр свойства снят'), 'notice does not explain the removed filter')
    if (action === 'retype-text') {
      expect(changed.values['cleanup-colour'] === 'Красный', 'convertible value was lost')
      expect(!(await notice.innerText()).includes('не подошло'), 'notice incorrectly claims values were dropped')
    } else expect((await notice.innerText()).includes('не подошло'), 'notice does not explain the dropped value')
  }
  await notice.getByRole('button', { name: 'Отменить' }).click()
  const restored = await snapshot(p, ids)
  expect(stable(restored) === stable(before), `undo did not restore properties, views and records: ${stable(restored)} / ${stable(before)}`)
  await store(p, data => data.flush())
  await p.reload()
  await p.locator('main').waitFor()
  await p.waitForTimeout(400)
  expect(stable(await snapshot(p, ids)) === stable(before), 'undo did not persist')
}

async function withoutFilter(p, drops) {
  const { ids } = await setup(p)
  await store(p, (data, ids) => {
    const page = data.pages[ids.page]
    data.updatePage(page.id, { views: page.views.map(v => ({ ...v, selectFilters: { 'cleanup-colour': [], 'cleanup-room': ['cleanup-kitchen'] } })) })
  }, ids)
  const before = await snapshot(p, ids)
  await p.getByRole('radio', { name: drops ? 'Число' : 'Текст' }).click()
  await p.waitForTimeout(250)
  const changed = await snapshot(p, ids)
  expect(changed.props.find(prop => prop.id === 'cleanup-colour').type === (drops ? 'number' : 'text'), 'type did not change')
  const notice = p.locator('[data-notice]').filter({ hasText: 'Тип изменён' })
  if (drops) {
    expect((await notice.first().innerText()).includes('не подошло'), 'missing existing dropped-value notice')
    expect(!(await notice.first().innerText()).includes('фильтр свойства снят'), 'notice claims an empty filter was removed')
    await notice.first().getByRole('button', { name: 'Отменить' }).click()
    expect(stable(await snapshot(p, ids)) === stable(before), 'existing undo did not restore type and value')
  } else {
    expect(changed.values['cleanup-colour'] === 'Красный', 'convertible value was lost')
    expect(await notice.count() === 0, 'empty choice showed an undo notice')
  }
}

export default [MOBILE, DESKTOP].flatMap((device, i) => ['option', 'remove', 'retype', 'retype-text', 'no-filter', 'no-filter-dropped'].map(action => ({
  id: `mf3-property-filter-${i ? 'desktop' : 'phone'}-${action}`,
  device,
  run: p => action.startsWith('no-filter') ? withoutFilter(p, action === 'no-filter-dropped') : run(p, action)
})))
