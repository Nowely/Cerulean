import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

async function exercise(p) {
  await open(p, '/', false)
  const ids = await store(p, async (data) => {
    const page = data.createPage({ title: 'Покупка запасов' })
    data.updatePage(page.id, {
      props: [
        { id: 'amount', name: 'Осталось', type: 'number', normProp: 'norm', unit: 'шт' },
        { id: 'norm', name: 'Норма', type: 'number' },
        { id: 'dept', name: 'Отдел', type: 'select', options: [{ id: 'food', name: 'Еда', color: 'blue' }] }
      ],
      stocks: [{ amountProp: 'amount', normProp: 'norm', buyViewId: 'buy', stockViewId: 'stock' }],
      views: [
        { id: 'buy', name: 'Купить', layout: 'list', filter: [{ field: 'done', op: 'is', value: false }], groupBy: 'dept', sort: 'manual', shown: ['amount'], stock: { mode: 'buy', amountProp: 'amount', normProp: 'norm' } },
        { id: 'stock', name: 'Запасы', layout: 'list', filter: [{ field: 'amount', op: 'notEmpty' }], groupBy: null, sort: 'manual', shown: ['amount'], stock: { mode: 'stock', amountProp: 'amount', normProp: 'norm' } }
      ]
    })
    const add = (text, values, extra = {}) => data.addRecord({ pageId: page.id, text, values: { dept: 'food', ...values }, ...extra }).id
    const low = add('Товар 0', { amount: 0, norm: 1 }, { stockUnits: { amount: 'уп' } })
    const full = add('Полный товар', { amount: 5, norm: 5 }, { stockBuy: { amount: true } })
    const invalid = add('Без нормы', { amount: 0, norm: null }, { stockBuy: { amount: true } })
    const ordinary = add('Обычный', {})
    await data.flush()
    return { page: page.id, low, full, invalid, ordinary }
  })
  await open(p, `/p/${ids.page}`, false)
  const tick = name => p.getByRole('checkbox', { name: new RegExp(`«${name}»`) })
  await tick('Товар 0').waitFor()
  await p.getByRole('button', { name: 'Осталось 0/1 уп: Товар 0' }).click()
  await p.getByRole('button', { name: 'Увеличить остаток: Товар 0' }).waitFor({ state: 'visible', timeout: 3000 })
  await tick('Товар 0').click()
  expect(await tick('Товар 0').getAttribute('aria-checked') === 'true', 'tick did not show the live state')
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.low) === 1, 'purchase did not refill')
  await tick('Товар 0').click()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.low) === 0, 'second tick did not undo')
  expect(await store(p, (data, id) => data.records[id].stockUnits.amount, ids.low) === 'уп', 'unit changed')
  await tick('Полный товар').click()
  await tick('Полный товар').click()
  expect(await store(p, (data, id) => data.records[id].stockBuy.amount, ids.full) === true, 'forced intent was not restored')
  await p.getByRole('button', { name: 'Осталось 0/1 уп: Товар 0' }).click()
  await p.getByRole('button', { name: 'Увеличить остаток: Товар 0' }).waitFor({ state: 'visible', timeout: 3000 })
  await tick('Товар 0').click()
  await tick('Товар 0').waitFor({ state: 'detached', timeout: 2400 })
  await store(p, (data, id) => data.updateRecord(id, { done: false, doneAt: undefined, values: { ...data.records[id].values, amount: 0 } }), ids.low)
  await tick('Без нормы').click()
  await p.getByText('Укажите неотрицательную норму запаса перед покупкой').waitFor()
  expect(await store(p, (data, id) => data.records[id].done, ids.invalid) === false, 'invalid norm changed tick')
  await store(p, (data, id) => data.updateRecord(id, { values: { ...data.records[id].values, norm: 1 } }), ids.invalid)
  await tick('Без нормы').click()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.invalid) === 1, 'corrected norm did not work')
  await tick('Без нормы').waitFor({ state: 'detached', timeout: 5000 })
  await tick('Обычный').click()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.ordinary) === undefined, 'ordinary item became tracked')

  for (const layout of ['table', 'board', 'calendar']) {
    await store(p, (data, { pageId, id, layout }) => {
      const page = data.pages[pageId]
      data.updateRecord(id, { done: false, doneAt: undefined, values: { ...data.records[id].values, amount: 0, norm: 1 } })
      data.updatePage(pageId, { views: page.views.map(v => v.id === 'buy' ? { ...v, layout } : v) })
    }, { pageId: ids.page, id: ids.low, layout })
    await tick('Товар 0').waitFor()
    await tick('Товар 0').click()
    expect(await store(p, (data, id) => data.records[id].values.amount, ids.low) === 1, `${layout} did not refill`)
    await tick('Товар 0').click()
    expect(await store(p, (data, id) => data.records[id].values.amount, ids.low) === 0, `${layout} did not undo`)
  }
  await tick('Товар 0').click()
  await store(p, (data, id) => data.updateRecord(id, { values: { ...data.records[id].values, amount: 2 } }), ids.low)
  await tick('Товар 0').click()
  await p.getByText('Запись изменилась. Обновите её и попробуйте снова').waitFor()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.low) === 2, 'conflicting edit was overwritten')

  const today = await store(p, (data, id) => {
    const now = new Date()
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
    data.updateRecord(id, { done: false, doneAt: undefined, values: { ...data.records[id].values, amount: 0 }, due: { date } })
    return data.livePages.find(page => page.kind === 'today').id
  }, ids.low)
  await open(p, `/p/${today}`, false)
  await tick('Товар 0').click()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.low) === 0, 'Today refilled stock')

  if (p.viewportSize().width === 390) {
    await store(p, (data, { pageId, id }) => {
      const page = data.pages[pageId]
      data.updateRecord(id, { done: false, doneAt: undefined, values: { ...data.records[id].values, amount: 0 } })
      data.updatePage(pageId, { views: page.views.map(v => v.id === 'buy' ? { ...v, layout: 'table' } : v) })
    }, { pageId: ids.page, id: ids.low })
    await open(p, '/', false)
    await p.evaluate(id => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push({ query: { peek: `p:${id}` } }), ids.page)
    const preview = p.getByRole('dialog', { name: 'Превью' })
    await preview.getByRole('checkbox', { name: /«Товар 0»/ }).click()
    expect(await store(p, (data, id) => data.records[id].values.amount, ids.low) === 0, 'preview refilled stock')
  }
}

export default [
  { id: 'mf3-stock-purchase-phone', device: MOBILE, run: exercise },
  { id: 'mf3-stock-purchase-desktop', device: DESKTOP, run: exercise }
]
