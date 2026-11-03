import { DESKTOP, MOBILE, expect, store } from './lib.mjs'
import { first, goPage } from './main-flow.mjs'

const overlay = (p, name) => p.locator('[role="dialog"]').filter({ has: p.getByRole('heading', { name, exact: true }) })

async function shop(p) {
  await first(p)
  await store(p, (data) => {
    const page = data.livePages.find(p => p.title === 'Покупки')
    data.addRecord({ pageId: page.id, text: 'Молоко' })
  })
  await goPage(p, 'Покупки')
}

async function createAndUndo(p) {
  await shop(p)
  const tabs = p.getByRole('tab')
  const original = (await tabs.allTextContents()).map(name => name.trim())
  expect(JSON.stringify(original) === JSON.stringify(['Купить', 'Запасы', 'Куплено']), `wrong initial tabs: ${JSON.stringify(original)}`)
  await p.getByRole('button', { name: 'Новый вид', exact: true }).click()
  const picker = overlay(p, 'Новый вид')
  await picker.waitFor()
  for (const name of ['Список', 'Таблица', 'Доска', 'Календарь']) {
    expect(await picker.getByRole('button', { name, exact: true }).isVisible(), `no tile ${name}`)
  }
  await picker.getByRole('button', { name: 'Таблица', exact: true }).click()
  await picker.waitFor({ state: 'hidden' })
  const names = (await tabs.allTextContents()).map(name => name.trim())
  expect(JSON.stringify(names) === JSON.stringify(['Купить', 'Таблица', 'Запасы', 'Куплено']), `wrong tab order: ${JSON.stringify(names)}`)
  expect(await p.getByRole('tab', { name: 'Таблица' }).getAttribute('aria-selected') === 'true', 'new view not selected')
  const stored = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views.map(v => ({ name: v.name, layout: v.layout, filter: v.filter })))
  expect(stored[1].layout === 'table' && JSON.stringify(stored[1].filter) === JSON.stringify(stored[0].filter), 'wrong layout or done filter')
  await p.getByRole('tab', { name: 'Таблица' }).click()
  const settings = overlay(p, 'Настроить вид')
  await settings.waitFor()
  expect(await settings.locator('input').first().inputValue() === 'Таблица', 'wrong view in settings')
  await settings.getByRole('button', { name: 'Удалить вид' }).click()
  await p.getByText('Вид «Таблица» удалён').first().waitFor()
  expect(await p.getByRole('tab', { name: 'Таблица' }).count() === 0, 'view was not removed')
  await p.getByRole('button', { name: 'Отменить' }).click()
  await p.getByRole('tab', { name: 'Таблица' }).waitFor()
  const restored = (await tabs.allTextContents()).map(name => name.trim())
  expect(JSON.stringify(restored) === JSON.stringify(names), `undo changed tab order: ${JSON.stringify(restored)}`)
  expect(await p.getByRole('tab', { name: 'Таблица' }).getAttribute('aria-selected') === 'true', 'undo did not select restored view')
}

export default [
  { id: 'mf3-view-tabs-phone-create-undo', device: MOBILE, run: createAndUndo },
  { id: 'mf3-view-tabs-desktop-create-undo', device: DESKTOP, run: createAndUndo },
  { id: 'mf3-view-tabs-phone-hold-menu', device: MOBILE, run: async (p) => {
    await shop(p)
    const tab = p.getByRole('tab', { name: 'Куплено' })
    const box = await tab.boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await p.waitForTimeout(550)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const menu = p.getByRole('dialog', { name: 'Куплено' })
    await menu.waitFor()
    await menu.getByRole('button', { name: 'Новый вид' }).click()
    const picker = overlay(p, 'Новый вид')
    await picker.getByRole('button', { name: 'Доска' }).click()
    const stored = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views)
    expect(JSON.stringify(stored.map(v => v.name)) === JSON.stringify(['Купить', 'Запасы', 'Куплено', 'Доска']), 'menu did not insert after held tab')
    expect(stored[3].filter[0].value === true, 'new view did not keep the held tab’s done filter')
  } },
  { id: 'mf3-view-tabs-desktop-context-menu', device: DESKTOP, run: async (p) => {
    await shop(p)
    await p.getByRole('tab', { name: 'Куплено' }).click({ button: 'right' })
    await p.getByRole('menuitem', { name: 'Настроить вид' }).click()
    const settings = overlay(p, 'Настроить вид')
    await settings.waitFor()
    expect(await settings.locator('input').first().inputValue() === 'Куплено', 'context menu used wrong tab')
    await settings.getByRole('button', { name: 'Новый вид' }).click()
    await overlay(p, 'Новый вид').getByRole('button', { name: 'Календарь' }).click()
    expect(await p.getByRole('tab', { name: 'Календарь' }).getAttribute('aria-selected') === 'true', 'settings did not open picker')
  } }
]
