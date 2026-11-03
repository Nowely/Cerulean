import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

const settings = p => p.getByRole('dialog').filter({ has: p.getByRole('heading', { name: 'Настроить вид', exact: true }) })
const snapshot = (p, ids) => store(p, (data, ids) => JSON.parse(JSON.stringify({
  views: data.pages[ids.page].views, stocks: data.pages[ids.page].stocks,
  props: data.pages[ids.page].props, own: data.records[ids.own], outside: data.records[ids.outside]
})), ids)
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

async function setup(p) {
  await open(p, '/', false)
  const ids = await store(p, (data) => {
    const page = data.createPage({ title: 'Источник запасов' })
    const other = data.createPage({ title: 'Другая страница' })
    const buy = { id: 'buy-source', name: 'Купить', layout: 'list', filter: [{ field: 'done', op: 'is', value: false }], groupBy: null, sort: 'manual', shown: ['amount'], stock: { mode: 'buy', amountProp: 'amount', normProp: 'norm' } }
    const stock = { ...buy, id: 'stock-source', name: 'Запасы', filter: [{ field: 'amount', op: 'notEmpty' }], stock: { ...buy.stock, mode: 'stock' } }
    const legacy = { ...buy, id: 'legacy-source', name: 'Старый вид', stock: undefined }
    const collecting = { ...legacy, id: 'collect-source', name: 'Собирающий', from: 'all' }
    data.updatePage(page.id, { hasDone: true, props: [{ id: 'amount', name: 'Осталось', type: 'number', normProp: 'norm' }, { id: 'norm', name: 'Норма', type: 'number' }],
      stocks: [{ amountProp: 'amount', normProp: 'norm', buyViewId: 'buy-source', stockViewId: 'stock-source' }], views: [buy, stock, legacy, collecting] })
    const own = data.addRecord({ pageId: page.id, text: 'Молоко источник', values: { amount: 1, norm: 5 }, stockUnits: { amount: 'л' }, stockBuy: { amount: true } })
    const outside = data.addRecord({ pageId: other.id, text: 'Хлеб источник' })
    return { page: page.id, own: own.id, outside: outside.id }
  })
  await open(p, `/p/${ids.page}`, false)
  return ids
}

async function exercise(p) {
  const ids = await setup(p)
  const before = await snapshot(p, ids)
  const tab = name => p.getByRole('tab', { name, exact: true })
  const sheet = settings(p)
  const view = (state, id) => state.views.find(v => v.id === id)
  const unchangedData = state => equal(state.props, before.props) && equal(state.stocks, before.stocks)
    && equal(state.own, before.own) && equal(state.outside, before.outside)

  await tab('Купить').click()
  await sheet.getByRole('radio', { name: 'Эта страница' }).waitFor()
  expect(equal(await snapshot(p, ids), before), 'opening settings changed saved data')
  const shown = sheet.getByRole('switch', { name: 'Осталось' })
  await shown.click()
  expect(await sheet.getByRole('radio', { name: 'Эта страница' }).isVisible(), 'hiding amount hid source')
  let state = await snapshot(p, ids)
  expect(view(state, 'buy-source').from === undefined && unchangedData(state), 'hiding amount changed source or data')
  await shown.click()
  expect(await sheet.getByRole('radio', { name: 'Эта страница' }).isVisible(), 'showing amount hid source')
  expect(equal(await snapshot(p, ids), before), 'toggling shown back changed the view or data')

  await sheet.getByRole('radio', { name: 'Все страницы' }).click()
  state = await snapshot(p, ids)
  expect(view(state, 'buy-source').from === 'all', 'explicit source selection was not saved')
  expect(equal(view(state, 'buy-source').filter, view(before, 'buy-source').filter)
    && equal(view(state, 'buy-source').stock, view(before, 'buy-source').stock) && unchangedData(state), 'source selection changed stock filter or data')
  await p.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(equal(await snapshot(p, ids), before), 'source undo did not restore the previous state')
  await p.keyboard.press('Escape')

  await tab('Запасы').click()
  await tab('Запасы').click()
  await sheet.getByRole('radio', { name: 'Эта страница' }).waitFor()
  expect(equal(await snapshot(p, ids), before), 'opening stock view settings changed data')
  await sheet.getByRole('radio', { name: 'Все страницы' }).click()
  state = await snapshot(p, ids)
  expect(view(state, 'stock-source').from === 'all' && equal(view(state, 'stock-source').filter, view(before, 'stock-source').filter)
    && equal(view(state, 'stock-source').stock, view(before, 'stock-source').stock) && unchangedData(state), 'stock source changed stock settings or data')
  await p.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(equal(await snapshot(p, ids), before), 'stock source undo changed data')
  await p.keyboard.press('Escape')

  for (const [name, choice] of [['Старый вид', 'Эта страница'], ['Собирающий', 'Все страницы']]) {
    await tab(name).click()
    await tab(name).click()
    const radio = sheet.getByRole('radio', { name: choice })
    await radio.waitFor()
    expect(await radio.getAttribute('aria-checked') === 'true', `${name}: source not preserved`)
    expect(equal(await snapshot(p, ids), before), `${name}: opening settings changed saved data`)
    await p.keyboard.press('Escape')
  }
}

export default [
  { id: 'mf3-stock-source-phone', device: MOBILE, run: exercise },
  { id: 'mf3-stock-source-desktop', device: DESKTOP, run: exercise }
]
