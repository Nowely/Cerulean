import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { goPage } from './main-flow.mjs'

const amount = 'mf3-editor-amount'
const norm = 'mf3-editor-norm'
const product = 'Молоко тест запасов'

async function setup(p) {
  await open(p, '/', false)
  return store(p, (data, ids) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    const stock = { amountProp: ids.amount, normProp: ids.norm, buyViewId: 'mf3-editor-buy', stockViewId: 'mf3-editor-stock' }
    data.updatePage(page.id, {
      props: [{ id: ids.amount, name: 'Осталось', type: 'number', unit: 'шт', normProp: ids.norm }, { id: ids.norm, name: 'Норма', type: 'number', unit: 'шт' }],
      propOrder: [ids.amount, ids.norm, 'note', 'due'],
      stocks: [stock],
      views: [{ ...page.views[0], name: 'Таблица', layout: 'table', shown: [ids.amount] }]
    })
    const rec = data.addRecord({ pageId: page.id, text: ids.product, values: { [ids.amount]: 3, [ids.norm]: 5 }, stockUnits: { [ids.amount]: 'л' } })
    const other = data.addRecord({ pageId: page.id, text: 'Другой товар тест запасов', values: { [ids.amount]: 9, [ids.norm]: 10 }, stockUnits: { [ids.amount]: 'кг' } })
    return { rec: rec.id, other: other.id }
  }, { amount, norm, product })
}

const row = p => p.locator('[data-phone-table] tbody tr').filter({ has: p.getByRole('button', { name: product, exact: true }) })
const cardValue = p => p.locator('[data-record-values]').getByRole('button', { name: /^Осталось:/ })
const cell = p => row(p).getByRole('button', { name: /^Осталось:/ })
const editor = p => p.getByRole('dialog').filter({ has: p.getByRole('textbox', { name: 'Единица', exact: true }) })

async function fields(p, expected) {
  const e = editor(p)
  await e.waitFor()
  for (const [name, value] of Object.entries(expected)) {
    const actual = await e.getByRole('textbox', { name, exact: true }).inputValue()
    expect(actual === value, `${name}: expected ${value}, got ${actual}`)
  }
}

async function fill(p, values) {
  for (const [name, value] of Object.entries(values)) await editor(p).getByRole('textbox', { name, exact: true }).fill(value)
}

async function snapshot(p, ids) {
  return store(p, (data, a) => {
    const pick = id => ({ values: data.records[id].values, stockUnits: data.records[id].stockUnits })
    return { rec: pick(a.rec), other: pick(a.other) }
  }, ids)
}

async function check(p, scheme) {
  const ids = await setup(p)
  expect(await p.locator('html').evaluate(el => el.classList.contains('dark')) === (scheme === 'dark'), `theme is not ${scheme}`)
  await goPage(p, 'Покупки')
  await row(p).waitFor()
  expect(await cell(p).innerText() === '3/5 л', 'initial table value or individual unit missing')
  await row(p).getByRole('button', { name: product, exact: true }).click()
  await p.waitForURL(/\/r\//)
  await cardValue(p).waitFor()
  expect(await cardValue(p).getAttribute('aria-label') === 'Осталось: 3 из 5 л', 'initial card value or individual unit missing')

  await cardValue(p).click()
  await fields(p, { Осталось: '3', Норма: '5', Единица: 'л' })
  await fill(p, { Осталось: '0,5', Норма: '2,5', Единица: 'уп' })
  await editor(p).getByRole('button', { name: 'Готово', exact: true }).click()
  await editor(p).waitFor({ state: 'hidden' })
  expect(await cardValue(p).getAttribute('aria-label') === 'Осталось: 0,5 из 2,5 уп', 'card did not show saved values')

  await p.goBack()
  await row(p).waitFor()
  expect(await cell(p).innerText() === '0,5/2,5 уп', 'table did not show card edit')
  await cell(p).click()
  await fields(p, { Осталось: '0,5', Норма: '2,5', Единица: 'уп' })
  await fill(p, { Осталось: '4,25', Норма: '8,5', Единица: 'кг' })
  await editor(p).getByRole('button', { name: 'Готово', exact: true }).click()
  await editor(p).waitFor({ state: 'hidden' })
  expect(await cell(p).innerText() === '4,25/8,5 кг', 'table did not show its edit')

  const saved = await snapshot(p, ids)
  expect(saved.rec.values[amount] === 4.25 && saved.rec.values[norm] === 8.5 && saved.rec.stockUnits[amount] === 'кг', `saved record: ${JSON.stringify(saved.rec)}`)
  expect(saved.other.values[amount] === 9 && saved.other.values[norm] === 10 && saved.other.stockUnits[amount] === 'кг', `another record changed: ${JSON.stringify(saved.other)}`)
  await row(p).getByRole('button', { name: product, exact: true }).click()
  await p.waitForURL(/\/r\//)
  await cardValue(p).waitFor()
  expect(await cardValue(p).getAttribute('aria-label') === 'Осталось: 4,25 из 8,5 кг', 'card did not show table edit')
  await cardValue(p).click()
  await fields(p, { Осталось: '4,25', Норма: '8,5', Единица: 'кг' })
  await fill(p, { Осталось: '7', Норма: '9', Единица: 'л' })
  await editor(p).getByRole('button', { name: 'Отмена', exact: true }).click()
  await editor(p).waitFor({ state: 'hidden' })
  expect(JSON.stringify(await snapshot(p, ids)) === JSON.stringify(saved), 'cancel changed data')
  expect(await cardValue(p).getAttribute('aria-label') === 'Осталось: 4,25 из 8,5 кг', 'cancel changed card')

  await cardValue(p).click()
  await fields(p, { Осталось: '4,25', Норма: '8,5', Единица: 'кг' })
  await fill(p, { Осталось: '-1', Норма: '20', Единица: 'уп' })
  await editor(p).getByRole('button', { name: 'Готово', exact: true }).click()
  expect(await editor(p).getByRole('alert').isVisible(), 'invalid negative amount was not rejected')
  expect(JSON.stringify(await snapshot(p, ids)) === JSON.stringify(saved), 'invalid edit partially changed data')
  await editor(p).getByRole('button', { name: 'Отмена', exact: true }).click()
  await editor(p).waitFor({ state: 'hidden' })
  expect(await cardValue(p).getAttribute('aria-label') === 'Осталось: 4,25 из 8,5 кг', 'invalid edit changed card')
}

export default [['phone', MOBILE], ['desktop', DESKTOP]].flatMap(([name, device]) => ['light', 'dark'].map(colorScheme => ({
  id: `mf3-stock-editor-${name}-${colorScheme}`,
  device: { ...device, colorScheme },
  run: p => check(p, colorScheme)
})))
