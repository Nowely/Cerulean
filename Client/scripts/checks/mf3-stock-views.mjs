import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

const settings = p => p.getByRole('dialog').filter({ has: p.getByRole('heading', { name: 'Настроить вид', exact: true }) })

async function setup(p) {
  await open(p, '/', false)
  const ids = await store(p, (data) => {
    const page = data.createPage({ title: 'Проверка видов запасов' })
    const views = [
      { id: 'test-buy', name: 'Купить', layout: 'list', filter: [{ field: 'done', op: 'is', value: false }], groupBy: null, sort: 'name', shown: ['amount'], stock: { mode: 'buy', amountProp: 'amount', normProp: 'norm' } },
      { id: 'test-stock', name: 'Запасы', layout: 'list', filter: [{ field: 'amount', op: 'notEmpty' }], groupBy: null, sort: 'manual', shown: ['amount'], stock: { mode: 'stock', amountProp: 'amount', normProp: 'norm' } },
      { id: 'test-other', name: 'Мой вид', layout: 'list', filter: [], groupBy: null, sort: 'name', shown: ['amount'] }
    ]
    data.updatePage(page.id, { hasDone: true, props: [{ id: 'amount', name: 'Осталось', type: 'number', normProp: 'norm' }, { id: 'norm', name: 'Норма', type: 'number' }],
      stocks: [{ amountProp: 'amount', normProp: 'norm', buyViewId: 'test-buy', stockViewId: 'test-stock' }], views })
    const rec = data.addRecord({ pageId: page.id, text: 'Молоко тест', values: { amount: 2, norm: 5 }, stockUnits: { amount: 'л' }, stockBuy: { amount: true } })
    return { page: page.id, rec: rec.id }
  })
  await open(p, `/p/${ids.page}`, false)
  return ids
}

const snapshot = (p, ids) => store(p, (data, ids) => JSON.parse(JSON.stringify({ page: data.pages[ids.page], rec: data.records[ids.rec] })), ids)

async function openPageSettings(p, mobile) {
  await p.getByRole('button', { name: 'Действия со страницей' }).last().click()
  if (mobile) await p.getByRole('dialog').getByRole('button', { name: 'Настроить вид' }).click()
  else await p.getByRole('menuitem', { name: 'Настроить вид' }).click()
  await settings(p).waitFor()
}

async function exercise(p, mobile) {
  const ids = await setup(p)
  const before = await snapshot(p, ids)
  await p.getByRole('tab', { name: 'Купить', exact: true }).click()
  await settings(p).getByRole('button', { name: 'Удалить вид', exact: true }).click()
  await p.getByText('Вид «Купить» удалён').first().waitFor()
  let now = await snapshot(p, ids)
  expect(!('buyViewId' in now.page.stocks[0]) && now.page.stocks[0].stockViewId === 'test-stock', 'delete left a reference or changed the other')
  expect(JSON.stringify(now.rec) === JSON.stringify(before.rec), 'delete changed the record')
  await p.getByRole('button', { name: 'Отменить', exact: true }).click()
  now = await snapshot(p, ids)
  expect(JSON.stringify(now.page.views) === JSON.stringify(before.page.views) && now.page.stocks[0].buyViewId === 'test-buy'
    && now.page.stocks[0].stockViewId === 'test-stock', 'undo lost settings')

  await p.getByRole('button', { name: 'Найти на странице' }).click()
  await openPageSettings(p, mobile)
  await settings(p).getByRole('button', { name: 'Удалить вид', exact: true }).click()
  await p.getByText('Вид «Купить» удалён').first().waitFor()
  now = await snapshot(p, ids)
  expect(!('buyViewId' in now.page.stocks[0]), 'fallback left the buy reference')
  await p.getByRole('button', { name: 'Закрыть поиск' }).click()
  const stockTab = p.getByRole('tab', { name: 'Запасы', exact: true })
  if (await stockTab.getAttribute('aria-selected') !== 'true') await stockTab.click()
  await p.getByRole('button', { name: 'Осталось 2/5 л: Молоко тест' }).click()
  await p.getByRole('button', { name: 'Уменьшить остаток: Молоко тест' }).click()
  await p.getByText('Молоко тест: запас заканчивается').first().waitFor()
  await stockTab.click()
  await settings(p).getByRole('button', { name: 'Вернуть вид «Купить»', exact: true }).click()
  now = await snapshot(p, ids)
  expect(now.page.stocks[0].buyViewId && now.page.stocks[0].buyViewId !== 'test-buy', 'restore did not create a new explicit reference')
  expect(JSON.stringify(now.page.views.find(v => v.id === 'test-other')) === JSON.stringify(before.page.views.find(v => v.id === 'test-other')), 'other view changed')
  expect(now.rec.values.amount === 1 && now.rec.values.norm === 5 && now.rec.stockUnits.amount === 'л' && now.rec.stockBuy.amount, 'stock data changed unexpectedly')
  await p.keyboard.press('Escape')
  await p.getByRole('tab', { name: 'Купить', exact: true }).click()
  await p.getByRole('checkbox', { name: /«Молоко тест»/ }).click()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.rec) === 5, 'restored buy view did not refill on purchase')
}

async function tabMenu(p, mobile) {
  const ids = await setup(p)
  const before = await snapshot(p, ids)
  const tab = p.getByRole('tab', { name: 'Запасы', exact: true })
  if (mobile) {
    const box = await tab.boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await p.waitForTimeout(600)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.getByRole('dialog', { name: 'Запасы' }).getByRole('button', { name: 'Удалить вид' }).click()
  } else {
    await tab.click({ button: 'right' })
    await p.getByRole('menuitem', { name: /Удалить вид/ }).click()
  }
  await p.getByText('Вид «Запасы» удалён').first().waitFor()
  const after = await snapshot(p, ids)
  expect(!('stockViewId' in after.page.stocks[0]) && after.page.stocks[0].buyViewId === 'test-buy', 'tab menu left a reference')
  expect(JSON.stringify(after.rec) === JSON.stringify(before.rec), 'tab menu changed the record')
  await p.getByRole('button', { name: 'Отменить', exact: true }).click()
  const undone = await snapshot(p, ids)
  expect(JSON.stringify(undone.page.views) === JSON.stringify(before.page.views) && undone.page.stocks[0].stockViewId === 'test-stock', 'tab menu undo lost settings')
}

export default [
  { id: 'mf3-stock-views-phone', device: MOBILE, run: p => exercise(p, true) },
  { id: 'mf3-stock-views-desktop', device: DESKTOP, run: p => exercise(p, false) },
  { id: 'mf3-stock-views-menu-phone', device: MOBILE, run: p => tabMenu(p, true) },
  { id: 'mf3-stock-views-menu-desktop', device: DESKTOP, run: p => tabMenu(p, false) }
]
