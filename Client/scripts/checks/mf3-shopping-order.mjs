import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { goPage } from './main-flow.mjs'

const expected = ['Название', 'Отдел', 'Количество', 'Осталось', 'Заметка', 'Добавлено']

async function headers(p) {
  const table = p.locator('[data-phone-table]')
  await table.waitFor()
  return (await table.locator('thead th').allTextContents()).map(s => s.trim()).filter(Boolean)
}

async function check(p, demo) {
  await open(p, '/', demo)
  const pageId = await store(p, async (data) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    data.updatePage(page.id, { views: page.views.map((v, i) => i === 0 ? { ...v, layout: 'table' } : v) })
    if (!data.recordsOf(page.id).length) data.addRecord({ pageId: page.id, text: 'Тестовый товар' })
    await data.flush()
    return page.id
  })
  await goPage(p, 'Покупки')
  let actual = await headers(p)
  expect(JSON.stringify(actual) === JSON.stringify(expected), `new headers: ${JSON.stringify(actual)}`)

  const saved = await store(p, async (data, id) => {
    const page = data.pages[id]
    const qty = page.props.find(prop => prop.name === 'Количество')
    data.moveProp(id, qty.id, 0)
    await data.flush()
    return JSON.parse(JSON.stringify({ props: data.pages[id].props, propOrder: data.pages[id].propOrder }))
  }, pageId)
  const custom = ['Название', 'Количество', 'Отдел', 'Осталось', 'Заметка', 'Добавлено']
  actual = await headers(p)
  expect(JSON.stringify(actual) === JSON.stringify(custom), `custom headers: ${JSON.stringify(actual)}`)
  await p.reload()
  await p.waitForSelector('main')
  actual = await headers(p)
  const reloaded = await store(p, (data, id) => ({ props: data.pages[id].props, propOrder: data.pages[id].propOrder }), pageId)
  expect(JSON.stringify(actual) === JSON.stringify(custom), `reloaded headers: ${JSON.stringify(actual)}`)
  expect(JSON.stringify(reloaded) === JSON.stringify(saved), 'saved properties or custom order changed on reload')
}

export default [
  ...[MOBILE, DESKTOP].flatMap((device, i) => [false, true].map(demo => ({
    id: `mf3-shopping-order-${i ? 'desktop' : 'phone'}-${demo ? 'demo' : 'first-run'}`,
    device,
    run: p => check(p, demo)
  })))
]
