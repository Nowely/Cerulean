import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

async function exercise(p, mobile) {
  await open(p, '/', false)
  const ids = await store(p, async (data) => {
    const page = data.createPage({ title: 'Проверка остатков' })
    const config = { amountProp: 'amount', normProp: 'norm', buyViewId: 'buy-view', stockViewId: 'stock-view' }
    data.updatePage(page.id, {
      props: [{ id: 'amount', name: 'Осталось', type: 'number', normProp: 'norm', unit: 'шт' }, { id: 'norm', name: 'Норма', type: 'number' }],
      stocks: [config],
      views: [
        { id: 'stock-view', name: 'Запасы', layout: 'list', filter: [{ field: 'amount', op: 'notEmpty' }], groupBy: null, sort: 'manual', shown: ['amount'], stock: { mode: 'stock', amountProp: 'amount', normProp: 'norm' } },
        { id: 'buy-view', name: 'Купить', layout: 'list', filter: [{ field: 'done', op: 'is', value: false }], groupBy: null, sort: 'manual', shown: ['amount'], stock: { mode: 'buy', amountProp: 'amount', normProp: 'norm' } }
      ]
    })
    const paper = data.addRecord({ pageId: page.id, text: 'Бумага', order: 0, addedAt: 1, values: { amount: 2, norm: 4 }, stockUnits: { amount: 'уп' } })
    const cola = data.addRecord({ pageId: page.id, text: 'Кола', order: 1, addedAt: 1, values: { amount: 2, norm: 5 } })
    const bread = data.addRecord({ pageId: page.id, text: 'Хлеб', order: 2, addedAt: 1, values: { amount: 1, norm: 5 } })
    data.addRecord({ pageId: page.id, parentId: bread.id, text: 'Вложенный хлеб', addedAt: 1 })
    const zero = data.addRecord({ pageId: page.id, text: 'Ноль', order: 3, addedAt: 1, values: { amount: 0, norm: 2 } })
    const old = data.addRecord({ pageId: page.id, text: 'Старый остаток', order: 4, addedAt: 1, values: { amount: -10, norm: 2000 } })
    const large = data.addRecord({ pageId: page.id, text: 'Большой остаток', order: 5, addedAt: 1, values: { amount: 1000, norm: 2000 } })
    const full = data.addRecord({ pageId: page.id, text: 'Полный', order: 6, addedAt: 1, values: { amount: 1, norm: 1 } })
    const editing = data.addRecord({ pageId: page.id, text: 'Кефир', order: 7, addedAt: 1, values: { amount: 2, norm: 4 } })
    const legacy = data.createPage({ title: 'Старый список', props: [
      { id: 'legacy-amount', name: 'Число', type: 'number', normProp: 'legacy-norm' },
      { id: 'legacy-norm', name: 'Норма', type: 'number' }
    ] })
    data.updatePage(legacy.id, { views: legacy.views.map(v => ({ ...v, shown: ['legacy-amount'] })) })
    data.addRecord({ pageId: legacy.id, text: 'Старый формат', values: { 'legacy-amount': 2, 'legacy-norm': 5 } })
    await data.flush()
    return { page: page.id, legacy: legacy.id, paper: paper.id, cola: cola.id, bread: bread.id, zero: zero.id, old: old.id, large: large.id, full: full.id, editing: editing.id }
  })
  await open(p, `/p/${ids.page}`, false)
  const get = (name, value) => p.getByRole('button', { name: `Осталось ${value}: ${name}` })
  const inc = name => p.getByRole('button', { name: `Увеличить остаток: ${name}` })
  const dec = name => p.getByRole('button', { name: `Уменьшить остаток: ${name}` })
  await get('Бумага', '2/4 уп').waitFor()
  const fullColor = await get('Полный', '1/1').evaluate(e => e.parentElement.className)
  expect(!fullColor.includes('text-warn-ink'), '1/1 should not be low')
  if (mobile) {
    const row = p.locator('li').filter({ has: p.locator('[data-row-text]').filter({ hasText: /^Бумага\s*$/ }) }).first()
    await row.scrollIntoViewIfNeeded()
    const box = await row.boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const y = box.y + box.height / 2
    const x = box.x + 210
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 12 * i, y }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    expect(await row.getByRole('button', { name: 'Переместить', exact: true }).isVisible(), 'stock row swipe did not open')
    await p.touchscreen.tap(box.x + 80, y)
  }
  await get('Бумага', '2/4 уп').click()
  await inc('Бумага').click()
  await dec('Бумага').click()
  expect(await p.getByText('2/4 уп', { exact: true }).isVisible(), 'custom unit did not survive steps')
  await get('Бумага', '2/4 уп').waitFor({ state: 'visible', timeout: 5000 })
  expect(!(await inc('Бумага').count()), 'stepper did not close after three seconds')

  await get('Кола', '2/5').click()
  await dec('Кола').click()
  await p.locator('[data-notice]').getByText('Кола теперь в «Купить»').waitFor()
  expect((await inc('Кола').evaluate(e => e.parentElement.className)).includes('text-warn-ink'), '1/5 is not low')
  await dec('Кола').click()
  await dec('Кола').click()
  expect(await p.getByText('0/5 шт', { exact: true }).isVisible(), 'zero was decremented below zero')
  await get('Кола', '0/5').waitFor({ state: 'visible', timeout: 5000 })
  expect(await get('Старый остаток', '-10/2000').isVisible(), 'negative legacy amount was clipped')
  expect(await get('Большой остаток', '1000/2000').isVisible(), 'large legacy amount was clipped')
  await get('Старый остаток', '-10/2000').click()
  await inc('Старый остаток').click()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.old) === -10, 'negative legacy value changed on step')
  await get('Старый остаток', '-10/2000').waitFor({ state: 'visible', timeout: 5000 })
  await get('Большой остаток', '1000/2000').click()
  await inc('Большой остаток').click()
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.large) === 1001, 'large legacy value was clipped on step')
  await get('Большой остаток', '1001/2000').waitFor({ state: 'visible', timeout: 5000 })
  await get('Кефир', '2/4').click()
  await store(p, (data, id) => data.updateRecord(id, { values: { amount: 7, norm: 9, other: 42 } }), ids.editing)
  expect(await p.getByText('7/9 шт', { exact: true }).isVisible(), 'open stepper displayed stale values')
  await dec('Кефир').click()
  expect(await store(p, (data, id) => JSON.stringify(data.records[id].values), ids.editing) === JSON.stringify({ amount: 6, norm: 9, other: 42 }), 'step overwrote newer values')
  await get('Кефир', '6/9').waitFor({ state: 'visible', timeout: 5000 })

  const untouched = await store(p, (data, ids) => JSON.stringify([data.records[ids.bread], data.records[ids.zero], data.records[ids.old], data.records[ids.large], data.records[ids.full]]), ids)
  await p.getByRole('tab', { name: 'Купить', exact: true }).click()
  await get('Хлеб', '1/5').waitFor()
  const names = () => p.locator('[data-rows] [data-row-text]').allTextContents()
  const order = await names()
  await get('Хлеб', '1/5').click()
  await inc('Хлеб').click()
  expect(await inc('Хлеб').isVisible(), 'row vanished while its stepper was open')
  expect(await p.locator('[data-row-text]').filter({ hasText: 'Вложенный хлеб' }).isVisible(), 'the open row lost its subitem')
  expect(JSON.stringify(await names()) === JSON.stringify(order), 'the list reordered while the stepper was open')
  expect(await store(p, (data, id) => data.records[id].values.amount, ids.bread) === 2, 'new amount was not saved immediately')
  await p.getByRole('button', { name: 'Осталось 2/5: Хлеб' }).waitFor({ state: 'hidden', timeout: 5000 })
  await p.locator('[data-row-text]').filter({ hasText: /^Хлеб\s*$/ }).waitFor({ state: 'detached', timeout: 5000 })
  const others = await store(p, (data, ids) => JSON.stringify([data.records[ids.zero], data.records[ids.old], data.records[ids.large], data.records[ids.full]]), ids)
  expect(others === JSON.stringify(JSON.parse(untouched).slice(1)), 'another record changed')

  await p.getByRole('tab', { name: 'Запасы', exact: true }).click()
  await get('Бумага', '2/4 уп').click()
  expect(await inc('Бумага').isVisible(), 'the stepper did not open before hiding')
  await store(p, (data, id) => {
    const page = data.pages[id]
    data.updatePage(id, { views: page.views.map(v => v.id === 'stock-view' ? { ...v, shown: [] } : v) })
  }, ids.page)
  expect(await p.getByRole('button', { name: /Осталось .*Бумага/ }).count() === 0, 'hidden property still has a stepper')
  expect(await inc('Бумага').count() === 0, 'hiding did not close the open stepper')
  expect(await p.locator('[data-row-text]').filter({ hasText: 'Бумага' }).isVisible(), 'hiding the property removed the row')
  await open(p, `/p/${ids.legacy}`, false)
  expect(await p.getByRole('button', { name: 'Меньше: Старый формат' }).isVisible(), 'the legacy row stepper changed')
  expect(await p.getByRole('button', { name: /Осталось .*Старый формат/ }).count() === 0, 'unconfigured property was treated as stock')
}

export default [
  { id: 'mf3-stock-list-phone', device: MOBILE, run: p => exercise(p, true) },
  { id: 'mf3-stock-list-desktop', device: DESKTOP, run: p => exercise(p, false) }
]
