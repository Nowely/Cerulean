import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

async function setup(p) {
  await open(p, '/', false)
  return store(p, (data) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    const old = page.views[0]
    data.updatePage(page.id, {
      stocks: [],
      props: [
        { id: 'old-amount', name: 'Осталось', type: 'number', unit: 'л' },
        { id: 'old-norm', name: 'Норма', type: 'text' }
      ],
      propOrder: ['note', 'old-norm', 'old-amount', 'due'],
      views: [
        { ...old, id: 'old-buy', name: 'Купить', filter: [{ field: 'old-amount', op: 'empty' }], shown: ['old-amount'] },
        { ...old, id: 'old-week', name: 'На неделю', sort: 'name', shown: ['old-norm'] },
        { ...old, id: 'old-stock', name: 'Запасы' },
        { ...old, id: 'old-buy-stock', name: 'Купить с запасами' }
      ]
    })
    const rec = data.addRecord({ pageId: page.id, text: 'Молоко для проверки запасов', values: { 'old-amount': 5, 'old-norm': 'прежнее значение' } })
    return { pageId: page.id, recId: rec.id }
  })
}

async function snapshot(p, ids) {
  return store(p, (data, a) => {
    const page = data.pages[a.pageId]
    return JSON.parse(JSON.stringify({ props: page.props, propOrder: page.propOrder, views: page.views, stocks: page.stocks, description: page.description, rec: data.records[a.recId] }))
  }, ids)
}

async function check(p) {
  const ids = await setup(p)
  await p.locator(`a[href="/p/${ids.pageId}"]`).first().click()
  await p.getByRole('tab', { name: 'Купить', exact: true }).waitFor()
  const selected = () => p.locator('[role="tab"]').filter({ hasText: /^Купить$/ }).getAttribute('aria-selected')
  await p.getByRole('tab', { name: 'Купить', exact: true }).click()
  await p.getByRole('button', { name: 'Включить запасы', exact: true }).click()
  const before = await snapshot(p, ids)
  const confirmation = p.getByRole('heading', { name: 'Включить запасы?' })
  await confirmation.waitFor()
  for (const name of ['Осталось 2', 'Норма 2', 'Купить с запасами 2', 'Запасы 2']) {
    expect(await p.getByText(name, { exact: false }).isVisible(), `confirmation misses ${name}`)
  }
  await p.getByRole('button', { name: 'Отмена', exact: true }).click()
  expect(JSON.stringify(await snapshot(p, ids)) === JSON.stringify(before), 'cancel changed data')
  expect(await selected() === 'true', 'cancel changed the current tab')

  await p.getByRole('button', { name: 'Включить запасы', exact: true }).click()
  await store(p, (data, a) => {
    const page = data.pages[a.pageId]
    data.updatePage(a.pageId, { description: 'изменено во время подтверждения', props: [...page.props, { id: 'late-prop', name: 'Осталось 2', type: 'text' }] })
  }, ids)
  await p.getByRole('button', { name: 'Включить', exact: true }).click()
  expect(await p.getByRole('status').filter({ hasText: 'Имена изменились' }).isVisible(), 'changed names were not reconfirmed')
  expect((await snapshot(p, ids)).stocks.length === 0, 'enabled before reconfirmation')
  expect(await p.getByText('Осталось 3', { exact: false }).isVisible(), 'updated name not shown')
  const fresh = await snapshot(p, ids)
  await p.getByRole('button', { name: 'Включить', exact: true }).click()
  await p.getByRole('button', { name: 'Новое свойство', exact: true }).waitFor()
  const after = await snapshot(p, ids)
  expect(JSON.stringify(after.props.slice(0, fresh.props.length)) === JSON.stringify(fresh.props), 'existing properties changed')
  expect(JSON.stringify(after.views.slice(0, fresh.views.length)) === JSON.stringify(fresh.views), 'existing views changed')
  expect(JSON.stringify(after.propOrder) === JSON.stringify(fresh.propOrder) && after.description === fresh.description, 'existing page settings changed')
  expect(JSON.stringify(after.rec) === JSON.stringify(fresh.rec), 'existing record was changed or filled')
  expect(after.props.slice(-2).map(x => x.name).join('|') === 'Осталось 3|Норма 2', 'new property names differ')
  expect(after.views.slice(-2).map(x => x.name).join('|') === 'Купить с запасами 2|Запасы 2', 'new view names differ')
  expect(after.stocks.length === 1 && after.stocks[0].amountProp !== 'old-amount' && after.stocks[0].normProp !== 'old-norm', 'old data was bound or multiple configs created')
  expect(await selected() === 'true', 'confirmation changed the current tab')
  expect(await p.getByRole('button', { name: 'Включить запасы', exact: true }).count() === 0, 'repeat enable still offered')

  await store(p, (data, a) => data.updatePage(a.pageId, { stocks: [] }), ids)
  await p.getByRole('button', { name: 'Включить запасы', exact: true }).click()
  await store(p, (data, a) => data.updatePage(a.pageId, { stocks: a.stocks }), { ...ids, stocks: after.stocks })
  const concurrent = await snapshot(p, ids)
  await p.getByRole('button', { name: 'Включить', exact: true }).click()
  expect(JSON.stringify(await snapshot(p, ids)) === JSON.stringify(concurrent), 'a concurrent enable created duplicates')
  expect(await p.getByRole('button', { name: 'Включить запасы', exact: true }).count() === 0, 'concurrent enable still offered')

  await p.keyboard.press('Escape')
  await p.getByRole('tab', { name: 'Купить с запасами 2', exact: true }).click()
  await p.locator('[data-row-text]').filter({ hasText: 'Молоко для проверки запасов' }).click()
  await p.waitForURL(new RegExp(`/r/${ids.recId}$`))
  await p.getByRole('button', { name: 'Добавить свойство', exact: true }).click()
  await p.getByRole('button', { name: 'Осталось 3 число', exact: true }).click()
  const editor = p.getByRole('dialog').filter({ has: p.getByRole('textbox', { name: 'Единица', exact: true }) })
  await editor.getByRole('textbox', { name: 'Осталось', exact: true }).fill('0,5')
  await editor.getByRole('textbox', { name: 'Норма', exact: true }).fill('2')
  await editor.getByRole('textbox', { name: 'Единица', exact: true }).fill('уп')
  await editor.getByRole('button', { name: 'Готово', exact: true }).click()
  await editor.waitFor({ state: 'hidden' })
  await p.goBack()
  await p.getByRole('tab', { name: 'Запасы 2', exact: true }).click()
  const row = p.locator(`[data-tree-row="${ids.recId}"]`)
  await row.waitFor()
  expect(await row.locator('[data-row-text]').filter({ hasText: 'Молоко для проверки запасов' }).isVisible(), 'existing record missing from stock view')
  expect(await row.getByRole('button', { name: 'Осталось 0,5/2 уп: Молоко для проверки запасов', exact: true }).isVisible(), 'stock view does not show the saved quantity and unit')
  const saved = await snapshot(p, ids)
  const config = after.stocks[0]
  expect(saved.rec.id === ids.recId && saved.rec.values[config.amountProp] === 0.5 && saved.rec.values[config.normProp] === 2 && saved.rec.stockUnits[config.amountProp] === 'уп', 'stock values were not saved on the existing record')
  expect(saved.rec.values['old-amount'] === fresh.rec.values['old-amount'] && saved.rec.values['old-norm'] === fresh.rec.values['old-norm'], 'existing values changed after setting stock')
  expect(JSON.stringify(saved.props.slice(0, fresh.props.length)) === JSON.stringify(fresh.props), 'existing properties changed after setting stock')
  expect(JSON.stringify(saved.views.slice(0, fresh.views.length)) === JSON.stringify(fresh.views), 'existing views changed after setting stock')
}

export default [['phone', MOBILE], ['desktop', DESKTOP]].flatMap(([name, device]) => ['light', 'dark'].map(colorScheme => ({
  id: `mf3-stock-enable-${name}-${colorScheme}`,
  device: { ...device, colorScheme },
  run: check
})))
