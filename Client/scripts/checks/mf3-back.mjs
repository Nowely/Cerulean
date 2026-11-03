// System Back checks use browser history, not a simulated phone edge gesture.
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const card = (p, name) => p.locator('[data-home] [role="listitem"]').filter({ has: p.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) })
const closed = p => p.locator('[data-field="closed"]')
const title = p => p.getByRole('textbox', { name: 'Запись', exact: true })
const places = p => p.locator('[data-places]')

async function shopping(p) {
  await open(p, '/', false)
  await card(p, 'Покупки').locator('a').click()
  await p.waitForURL(/\/p\//)
}

async function menu(p) {
  await p.getByRole('button', { name: 'Действия со страницей' }).click()
  await p.getByRole('dialog', { name: 'Покупки' }).waitFor()
}

async function holdShopping(p) {
  const row = card(p, 'Покупки').locator('a')
  const box = await row.boundingBox()
  const cdp = await p.context().newCDPSession(p)
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await p.waitForTimeout(500)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await p.locator('[data-home-hold-menu]').waitFor()
}

export default [
  { id: 'mf3-back-page-sheet', device: MOBILE, run: async (p) => {
    await shopping(p)
    const path = new URL(p.url()).pathname
    await menu(p)
    await p.goBack()
    expect(new URL(p.url()).pathname === path, 'Back left the page instead of closing its sheet')
    await p.getByRole('dialog', { name: 'Покупки' }).waitFor({ state: 'hidden' })
    await p.goBack()
    await p.waitForURL(/\/$/)
  } },
  { id: 'mf3-back-tap-clean', device: MOBILE, run: async (p) => {
    await shopping(p)
    await menu(p)
    await p.waitForTimeout(700)
    await p.mouse.click(10, 100)
    await p.getByRole('dialog', { name: 'Покупки' }).waitFor({ state: 'hidden' })
    await p.goBack()
    await p.waitForURL(/\/$/)
  } },
  { id: 'mf3-back-tap-immediate', device: MOBILE, run: async (p) => {
    await shopping(p)
    await menu(p)
    await p.waitForTimeout(700)
    await p.mouse.click(10, 100)
    await p.goBack()
    await p.waitForURL(/\/$/)
  } },
  { id: 'mf3-back-reload-open-sheet', device: MOBILE, run: async (p) => {
    await shopping(p)
    await menu(p)
    await p.reload()
    await p.getByRole('button', { name: 'Действия со страницей' }).waitFor()
    await p.goBack()
    await p.waitForURL(/\/$/)
  } },
  { id: 'mf3-back-reload-nested', device: MOBILE, run: async (p) => {
    await shopping(p)
    await closed(p).locator('button').nth(1).click()
    await title(p).fill('сыр')
    await p.locator('[data-chip="main"]').click()
    await places(p).waitFor()
    await p.reload()
    await p.getByRole('button', { name: 'Действия со страницей' }).waitFor()
    await p.goBack()
    await p.waitForURL(/\/$/)
  } },
  { id: 'mf3-back-field-draft', device: MOBILE, run: async (p) => {
    await shopping(p)
    const path = new URL(p.url()).pathname
    await closed(p).locator('button').nth(1).click()
    await title(p).fill('сыр')
    await p.goBack()
    expect(new URL(p.url()).pathname === path, 'Back left the page instead of closing the field')
    expect(await shows(closed(p)), 'field stayed open')
    await closed(p).locator('button').nth(1).click()
    expect(await title(p).innerText() === 'сыр', 'draft was lost')
  } },
  { id: 'mf3-back-places-lifo', device: MOBILE, run: async (p) => {
    await shopping(p)
    const path = new URL(p.url()).pathname
    await closed(p).locator('button').nth(1).click()
    await title(p).fill('сыр')
    await p.locator('[data-chip="main"]').click()
    await places(p).waitFor()
    await p.goBack()
    expect(new URL(p.url()).pathname === path, 'Back left the page instead of closing places')
    await places(p).waitFor({ state: 'hidden' })
    expect(await title(p).isVisible(), 'field closed before places')
    await p.goBack()
    expect(new URL(p.url()).pathname === path, 'Back left the page instead of closing the field')
    expect(await shows(closed(p)), 'field stayed open')
  } },
  { id: 'mf3-back-held-card', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const path = new URL(p.url()).pathname
    await holdShopping(p)
    await p.goBack()
    expect(new URL(p.url()).pathname === path, 'Back left home instead of closing the held-card menu')
    await p.locator('[data-home-hold-menu]').waitFor({ state: 'hidden' })
  } },
  { id: 'mf3-back-held-open-page', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await holdShopping(p)
    await p.locator('[data-home-hold-card]').click()
    await p.waitForURL(/\/p\//)
    await p.goBack()
    await p.waitForURL(/\/$/)
    await p.locator('[data-home-hold-menu]').waitFor({ state: 'hidden' })
  } },
  { id: 'mf3-back-record-property', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const id = await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Покупки')
      return data.addRecord({ pageId: page.id, text: 'Проверка свойства' }).id
    })
    await card(p, 'Покупки').locator('a').click()
    await p.waitForURL(/\/p\//)
    await p.locator('[data-row-text]').filter({ hasText: 'Проверка свойства' }).click()
    await p.waitForURL(new RegExp(`/r/${id}`))
    const path = new URL(p.url()).pathname
    await p.getByRole('button', { name: 'Добавить свойство' }).click()
    await p.getByRole('button', { name: /^Отдел/ }).click()
    await p.getByRole('dialog', { name: 'Отдел' }).waitFor()
    await p.goBack()
    expect(new URL(p.url()).pathname === path, 'Back left the record instead of closing the property')
    await p.getByRole('dialog', { name: 'Отдел' }).waitFor({ state: 'hidden' })
    await p.goBack()
    await p.waitForURL(/\/p\//)
  } },
  { id: 'mf3-back-desktop-escape', device: DESKTOP, run: async (p) => {
    await open(p, '/', false)
    await p.waitForURL(/\/p\//)
    await closed(p).locator('button').nth(1).click()
    await title(p).fill('сыр')
    await p.keyboard.press('Escape')
    expect(await shows(closed(p)), 'Escape did not close desktop field')
    await closed(p).locator('button').nth(1).click()
    expect(await title(p).innerText() === 'сыр', 'Escape lost the desktop draft')
  } },
  { id: 'mf3-back-desktop-keep-field', device: DESKTOP, run: async (p) => {
    await open(p, '/', false)
    await p.waitForURL(/\/p\//)
    await closed(p).locator('button').nth(1).click()
    await title(p).fill('сыр')
    await card(p, 'Задачи').locator('a').click()
    expect(await title(p).isVisible(), 'navigation closed the desktop field')
    expect(await title(p).innerText() === 'сыр', 'navigation lost the desktop draft')
    await card(p, 'Покупки').locator('a').click()
    expect(await title(p).isVisible(), 'second navigation closed the desktop field')
    expect(await title(p).innerText() === 'сыр', 'second navigation lost the desktop draft')
  } },
  { id: 'mf3-back-desktop-menu-escape', device: DESKTOP, run: async (p) => {
    await open(p, '/', false)
    await p.waitForURL(/\/p\//)
    const path = new URL(p.url()).pathname
    await p.locator('[data-page-dots]').getByRole('button', { name: 'Действия со страницей' }).click()
    const item = p.getByRole('menuitem', { name: 'Переименовать' })
    await item.waitFor()
    await p.keyboard.press('Escape')
    await item.waitFor({ state: 'hidden' })
    expect(new URL(p.url()).pathname === path, 'Escape left the page')
  } }
]
