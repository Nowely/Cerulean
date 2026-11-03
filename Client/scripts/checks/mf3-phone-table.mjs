import { MOBILE, DESKTOP, expect, open, store } from './lib.mjs'
import { goPage } from './main-flow.mjs'

async function setup(p) {
  await open(p, '/', false)
  await store(p, (data) => {
    const page = data.livePages.find(p => p.title === 'Покупки')
    const dept = { id: 'table-dept', name: 'Отдел теста', type: 'select', options: [
      { id: 'coffee', name: 'Напитки', color: 'blue' },
      { id: 'other', name: 'Прочее', color: 'gray' }
    ] }
    const text = { id: 'table-text', name: 'Текст теста', type: 'text' }
    const amount = { id: 'table-amount', name: 'Осталось', type: 'number', unit: 'шт', normProp: 'table-norm' }
    const norm = { id: 'table-norm', name: 'Норма', type: 'number' }
    const extra = { id: 'table-extra', name: 'Ещё текст', type: 'text' }
    const more = { id: 'table-more', name: 'Другой текст', type: 'text' }
    data.updatePage(page.id, {
      props: [dept, text, amount, norm, extra, more], propOrder: [dept.id, text.id, amount.id, norm.id, extra.id, more.id, 'note', 'due'],
      views: [{ ...page.views[0], name: 'Таблица', layout: 'table', shown: [dept.id, text.id] }]
    })
    data.addRecord({ pageId: page.id, text: 'Кофе тест', values: { [dept.id]: 'coffee', [text.id]: 'Было. Да', [amount.id]: 1, [norm.id]: 2 } })
    data.addRecord({ pageId: page.id, text: 'Хлеб тест' })
  })
  await goPage(p, 'Покупки')
  await p.locator('[data-phone-table] tbody tr').first().waitFor()
}

async function tableCheck(p) {
  await setup(p)
  const theme = await p.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), requested: matchMedia('(prefers-color-scheme: dark)').matches }))
  expect(theme.dark === theme.requested, `theme: ${JSON.stringify(theme)}`)
  const scroller = p.locator('[data-phone-table]')
  const row = scroller.locator('tbody tr').filter({ hasText: 'Кофе тест' })
  expect(await row.getByText('1/2', { exact: true }).count() === 1, 'stock amount not displayed')
  expect((await row.getByText('1/2', { exact: true }).getAttribute('class')).includes('text-warn'), 'low stock not highlighted')
  expect(await scroller.getByRole('columnheader', { name: 'Норма', exact: true }).count() === 0, 'norm shown as a separate column')
  const dimensions = await scroller.evaluate((el) => {
    const th = el.querySelector('th')
    const td = el.querySelector('tbody td')
    return { width: td.getBoundingClientRect().width, header: th.getBoundingClientRect().height, row: td.getBoundingClientRect().height, overflow: el.scrollWidth - el.clientWidth }
  })
  expect(Math.abs(dimensions.width - 176) <= 1 && Math.abs(dimensions.header - 36) <= 1 && Math.abs(dimensions.row - 44) <= 1 && dimensions.overflow > 0, `table geometry: ${JSON.stringify(dimensions)}`)
  const before = await row.locator('td').evaluateAll(cells => cells.slice(0, 2).map(c => c.getBoundingClientRect().left))
  await scroller.evaluate(el => el.scrollLeft = 300)
  const after = await row.locator('td').evaluateAll(cells => cells.slice(0, 2).map(c => c.getBoundingClientRect().left))
  expect(Math.abs(after[0] - before[0]) < 1 && after[1] < before[1] - 100, `sticky: ${before} → ${after}`)
  await scroller.evaluate(el => el.scrollLeft = 0)
  await row.getByRole('button', { name: /Отдел теста:/ }).click()
  await p.getByRole('dialog').getByRole('button', { name: 'Прочее' }).click()
  expect((await row.innerText()).includes('Прочее'), 'choice not updated')
  await row.getByRole('button', { name: /Текст теста:/ }).click()
  await row.getByRole('textbox', { name: 'Текст теста — Кофе тест' }).fill('Новый текст')
  await p.keyboard.press('Enter')
  expect((await row.innerText()).includes('Новый текст'), 'text not updated')
  await row.getByRole('checkbox', { name: 'Отметить «Кофе тест»' }).click()
  expect(await row.getByRole('checkbox', { name: 'Купить снова «Кофе тест»' }).getAttribute('aria-checked') === 'true', 'tick did not apply')
  await scroller.getByRole('button', { name: 'Хлеб тест', exact: true }).click()
  await p.waitForURL(/\/r\//)
}

async function previewCheck(p) {
  await setup(p)
  const ids = await store(p, (data) => {
    const page = data.livePages.find(p => p.title === 'Покупки')
    const rec = data.recordsOf(page.id).find(r => r.text === 'Кофе тест')
    const number = { id: 'table-number', name: 'Число теста', type: 'number' }
    const date = { id: 'table-date', name: 'Дата теста', type: 'date' }
    data.updatePage(page.id, {
      props: [...page.props, number, date],
      propOrder: [...page.propOrder, number.id, date.id],
      views: page.views.map(v => ({ ...v, shown: [...v.shown, 'due'] }))
    })
    data.updateRecord(rec.id, { values: { ...rec.values, [number.id]: 7, [date.id]: '2099-11-02' }, due: { date: '2099-11-03' } })
    return { page: page.id, rec: rec.id }
  })
  // A page preview is a supported URL target, the same one a page link opens on a phone.
  await p.getByRole('link', { name: 'Главная' }).first().click()
  await p.waitForURL(u => new URL(u).pathname === '/')
  await p.evaluate(id => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push({ query: { peek: `p:${id}` } }), ids.page)
  const preview = p.getByRole('dialog', { name: 'Превью' })
  const table = preview.locator('[data-phone-table]')
  const row = table.locator('tbody tr').filter({ hasText: 'Кофе тест' })
  await row.waitFor()
  const headers = await table.locator('th').allTextContents()
  const cell = name => row.locator('td').nth(headers.findIndex(h => h.trim() === name))
  for (const name of ['Отдел теста', 'Текст теста', 'Число теста', 'Дата теста', 'Срок', 'Осталось']) {
    expect(headers.some(h => h.trim() === name), `missing column ${name}`)
    const current = cell(name)
    await current.scrollIntoViewIfNeeded()
    await current.click()
    expect(await p.getByRole('dialog').count() === 1, `${name} opened an editor in preview`)
    expect(await row.locator('input, textarea, [contenteditable="true"]').count() === 0, `${name} became editable in preview`)
  }
  expect(await cell('Текст теста').getByRole('button').isDisabled(), 'preview text control is not disabled')
  expect(await cell('Число теста').getByRole('button').isDisabled(), 'preview number control is not disabled')
  const unchanged = await store(p, (data, id) => ({ values: data.records[id].values, due: data.records[id].due }), ids.rec)
  expect(unchanged.values['table-dept'] === 'coffee' && unchanged.values['table-text'] === 'Было. Да' && unchanged.values['table-number'] === 7 && unchanged.values['table-date'] === '2099-11-02' && unchanged.due?.date === '2099-11-03', `preview changed values: ${JSON.stringify(unchanged)}`)

  await preview.getByRole('button', { name: 'Открыть', exact: true }).click()
  await p.waitForURL(/\/p\//)
  const fullRow = p.locator('[data-phone-table] tbody tr').filter({ hasText: 'Кофе тест' })
  await fullRow.getByRole('button', { name: /Отдел теста:/ }).click()
  await p.getByRole('dialog').getByRole('button', { name: 'Прочее' }).click()
  await fullRow.getByRole('button', { name: /Текст теста:/ }).click()
  await fullRow.getByRole('textbox', { name: 'Текст теста — Кофе тест' }).fill('Изменено на странице')
  await p.keyboard.press('Enter')
  const changed = await store(p, (data, id) => data.records[id].values, ids.rec)
  expect(changed['table-dept'] === 'other' && changed['table-text'] === 'Изменено на странице', `full page did not save edits: ${JSON.stringify(changed)}`)
}

async function glanceCheck(p) {
  await setup(p)
  await p.getByRole('button', { name: 'Найти', exact: true }).first().click()
  await p.getByRole('combobox', { name: 'Найти' }).fill('Покупки')
  const glance = p.getByRole('dialog', { name: 'Поиск' })
  await glance.locator('[data-rows]').getByText('Кофе тест', { exact: true }).waitFor()
  expect(await glance.locator('[data-phone-table]').count() === 0, 'glance unexpectedly shows a table')
  expect(await glance.getByRole('button', { name: /Отдел теста:|Текст теста:/ }).count() === 0, 'glance exposes property editors')
}

async function newPropertyCheck(p) {
  await setup(p)
  const table = p.locator('[data-phone-table]')
  await table.getByRole('button', { name: 'Новое свойство', exact: true }).click()
  const editor = p.getByRole('dialog', { name: 'Новое свойство' })
  await editor.getByRole('textbox', { name: 'Название', exact: true }).fill('Магазин теста')
  await editor.getByRole('button', { name: 'Создать', exact: true }).click()
  await table.getByRole('columnheader', { name: 'Магазин теста', exact: true }).waitFor()
  const pageId = await store(p, (data) => {
    const page = data.livePages.find(p => p.title === 'Покупки')
    return page.props.some(prop => prop.name === 'Магазин теста' && prop.type === 'text') ? page.id : null
  })
  expect(pageId, 'the new column was not saved as a text property')

  await p.getByRole('link', { name: 'Главная' }).first().click()
  await p.waitForURL(u => new URL(u).pathname === '/')
  await p.evaluate(id => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push({ query: { peek: `p:${id}` } }), pageId)
  const preview = p.getByRole('dialog', { name: 'Превью' })
  const previewTable = preview.locator('[data-phone-table]')
  await previewTable.getByRole('columnheader', { name: 'Магазин теста', exact: true }).waitFor()
  expect(await previewTable.getByRole('button', { name: 'Новое свойство', exact: true }).count() === 0, 'preview exposes the new property button')
}

export default [
  { id: 'mf3-phone-table-light', device: MOBILE, run: tableCheck },
  { id: 'mf3-phone-table-dark', device: { ...MOBILE, colorScheme: 'dark' }, run: tableCheck },
  { id: 'mf3-phone-table-desktop', device: DESKTOP, run: tableCheck },
  { id: 'mf3-phone-table-desktop-dark', device: { ...DESKTOP, colorScheme: 'dark' }, run: tableCheck },
  { id: 'mf3-phone-table-preview', device: MOBILE, run: previewCheck },
  { id: 'mf3-phone-table-glance', device: DESKTOP, run: glanceCheck },
  { id: 'mf3-phone-table-new-property', device: MOBILE, run: newPropertyCheck }
]
