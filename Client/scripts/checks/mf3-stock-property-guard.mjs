import { DESKTOP, MOBILE, expect, store } from './lib.mjs'
import { first, goPage } from './main-flow.mjs'

async function setup(p, empty) {
  await first(p)
  const ids = await store(p, (data, empty) => {
    const page = data.livePages.find(p => p.title === 'Покупки')
    const first = page.stocks[0]
    const second = { amountProp: 'guard-left2', normProp: 'guard-norm2', buyViewId: 'guard-buy2', stockViewId: 'guard-stock2' }
    const buy = page.views.find(v => v.id === first.buyViewId)
    const stock = page.views.find(v => v.id === first.stockViewId)
    data.updatePage(page.id, {
      props: [...page.props,
        { id: 'guard-ordinary', name: 'Осталось', type: 'number' },
        { id: second.amountProp, name: 'Осталось 2', type: 'number', normProp: second.normProp },
        { id: second.normProp, name: 'Норма 2', type: 'number' }],
      views: [...page.views,
        { ...buy, id: second.buyViewId, name: 'Купить 2', stock: { mode: 'buy', amountProp: second.amountProp, normProp: second.normProp } },
        { ...stock, id: second.stockViewId, name: 'Запасы 2', filter: [{ field: second.amountProp, op: 'notEmpty' }], stock: { mode: 'stock', amountProp: second.amountProp, normProp: second.normProp } }],
      stocks: [...page.stocks, second]
    })
    const values = empty ? {} : { [first.amountProp]: 0.5, [first.normProp]: 2, [second.amountProp]: 3, [second.normProp]: 4, 'guard-ordinary': 5 }
    const rec = data.addRecord({ pageId: page.id, text: 'Проверка запаса', values, stockUnits: { [first.amountProp]: 'л', [second.amountProp]: 'уп' }, stockBuy: { [first.amountProp]: true, [second.amountProp]: false } })
    return { page: page.id, rec: rec.id, first, second }
  }, empty)
  await goPage(p, 'Покупки')
  return ids
}

async function editor(p, page, prop) {
  await p.evaluate(async ({ page, prop }) => {
    const source = await (await fetch('/_nuxt/components/page/PropSheets.vue')).text()
    const module = source.match(/from "([^"]*\/composables\/usePropSheets\.ts[^"]*)"/)?.[1]
    if (!module) throw new Error('Property sheet module was not found')
    const { usePropSheets } = await import(module)
    usePropSheets().sheet.value = { pageId: page, screen: 'edit', propId: prop, from: 'record' }
  }, { page, prop })
  await p.locator('#prop-name').waitFor()
}

function snapshot(p, ids) {
  return store(p, (data, ids) => JSON.parse(JSON.stringify({ page: data.pages[ids.page], rec: data.records[ids.rec], settings: data.settings })), ids)
}

async function protectedProperty(p, which) {
  const ids = await setup(p, which.includes('2'))
  const prop = which === 'left1' ? ids.first.amountProp : which === 'norm1' ? ids.first.normProp : which === 'left2' ? ids.second.amountProp : ids.second.normProp
  await editor(p, ids.page, prop)
  const before = await snapshot(p, ids)
  const explanation = 'Свойство используется для запасов: его нельзя удалить или изменить его тип. Название и значения можно менять.'
  expect(await p.getByText(explanation, { exact: true }).count() > 0, 'no explanation')
  await p.getByRole('radio', { name: 'Текст', exact: true }).click()
  expect(await p.getByRole('radio', { name: 'Число', exact: true }).getAttribute('aria-checked') === 'true', 'type changed')
  await p.getByRole('button', { name: 'Удалить свойство', exact: true }).click()
  expect(await p.locator('[data-notice]').filter({ hasText: explanation }).count() > 0, 'no explanation on refusal')
  expect(await p.getByRole('alertdialog').count() === 0, 'deletion confirmation appeared')
  expect(await p.locator('#prop-name').isVisible(), 'editor closed on refusal')
  expect(JSON.stringify(await snapshot(p, ids)) === JSON.stringify(before), 'refused operation changed data')
  const name = p.locator('#prop-name')
  await name.fill(`Переименовано ${which}`)
  await name.blur()
  const after = await snapshot(p, ids)
  expect(after.page.props.find(p => p.id === prop).name === `Переименовано ${which}`, 'rename blocked')
  expect(after.page.props.find(p => p.id === prop).type === 'number', 'rename changed type')
  expect(JSON.stringify(after.page.views) === JSON.stringify(before.page.views) && JSON.stringify(after.page.stocks) === JSON.stringify(before.page.stocks), 'rename changed views or stock config')
  expect(JSON.stringify(after.rec) === JSON.stringify(before.rec) && JSON.stringify(after.settings) === JSON.stringify(before.settings), 'rename changed record or settings')
}

async function ordinaryProperty(p) {
  const ids = await setup(p, false)
  await editor(p, ids.page, 'guard-ordinary')
  const before = await snapshot(p, ids)
  expect(await p.getByText('Свойство используется для запасов:', { exact: false }).count() === 0, 'ordinary same-named property was blocked')
  await p.getByRole('radio', { name: 'Дата', exact: true }).click()
  const changed = await snapshot(p, ids)
  expect(changed.page.props.find(p => p.id === 'guard-ordinary').type === 'date', 'ordinary type did not change')
  await p.locator('[data-notice]').filter({ hasText: 'Тип изменён' }).first().getByRole('button', { name: 'Отменить' }).click()
  expect((await snapshot(p, ids)).rec.values['guard-ordinary'] === 5, 'type undo lost value')
  await p.getByRole('button', { name: 'Удалить свойство', exact: true }).click()
  await p.getByRole('alertdialog').getByRole('button', { name: 'Удалить', exact: true }).click()
  expect(!(await snapshot(p, ids)).page.props.some(p => p.id === 'guard-ordinary'), 'ordinary property was not removed')
  await p.locator('[data-notice]').filter({ hasText: 'Свойство «Осталось» удалено' }).first().getByRole('button', { name: 'Отменить' }).click()
  const restored = await snapshot(p, ids)
  expect(JSON.stringify(restored.page.props) === JSON.stringify(before.page.props), 'undo did not restore ordinary property')
  expect(JSON.stringify(restored.page.views) === JSON.stringify(before.page.views) && JSON.stringify(restored.page.stocks) === JSON.stringify(before.page.stocks), 'undo changed stock views or configurations')
  expect(restored.rec.values['guard-ordinary'] === 5 && JSON.stringify(restored.rec.stockUnits) === JSON.stringify(before.rec.stockUnits) && JSON.stringify(restored.rec.stockBuy) === JSON.stringify(before.rec.stockBuy), 'undo changed record data')
}

export default [MOBILE, DESKTOP].flatMap((device, i) => [
  ...['left1', 'norm1', 'left2', 'norm2'].map(which => ({ id: `mf3-stock-property-guard-${i ? 'desktop' : 'phone'}-${which}`, device, run: p => protectedProperty(p, which) })),
  { id: `mf3-stock-property-guard-${i ? 'desktop' : 'phone'}-ordinary`, device, run: ordinaryProperty }
])
