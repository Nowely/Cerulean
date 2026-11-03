import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

const card = (p, name) => p.locator('[data-home] [role="listitem"]').filter({ has: p.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) }).first()
const menu = p => p.locator('[data-home-hold-menu]')
async function touch(p, locator, motion = 0) {
  const box = await locator.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  if (motion) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + motion }] })
    await p.waitForTimeout(500)
  } else {
    await p.waitForTimeout(500)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

export default [
  { id: 'mf3-home-hold-repeat-tap', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const row = card(p, 'Покупки')
    await touch(p, row.locator('a'))
    await menu(p).waitFor()
    expect(new URL(p.url()).pathname === '/', 'hold opened the page')
    const labels = await menu(p).getByRole('menuitem').allTextContents()
    expect(labels.map(x => x.trim()).join('|') === 'Переименовать|Значок и цвет|Добавить в избранное|Переместить в секцию|Скопировать как текст|Удалить', `menu: ${labels}`)
    await p.locator('[data-home-hold-veil]').click({ position: { x: 5, y: 5 } })
    await menu(p).waitFor({ state: 'hidden' })
    await touch(p, row.locator('a'))
    await menu(p).waitFor()
    expect(new URL(p.url()).pathname === '/', 'second hold opened the page')
    await p.locator('[data-home-hold-card]').click()
    await p.waitForURL(/\/p\//)
  } },
  { id: 'mf3-home-hold-move-section-undo', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const ids = await store(p, async (data) => {
      const page = data.livePages.find(x => x.title === 'Покупки')
      const section = data.createSection('Тестовая секция')
      await data.flush()
      return { page: page.id, section: section.id, from: page.sectionId }
    })
    const chooseSection = async () => {
      await touch(p, card(p, 'Покупки').locator('a'))
      const move = menu(p).getByRole('menuitem', { name: 'Переместить в секцию' })
      expect(await move.isEnabled(), 'move action is disabled')
      await move.click()
      await menu(p).waitFor({ state: 'hidden' })
      expect(await p.locator('[data-home-hold-veil]').count() === 0, 'hold veil still blocks the sheet')
      const sheet = p.getByRole('dialog', { name: 'Секция' })
      await sheet.waitFor()
      await sheet.getByRole('button', { name: 'Тестовая секция', exact: true }).click()
      await sheet.waitFor({ state: 'hidden' })
    }
    await chooseSection()
    expect(await store(p, (data, id) => data.pages[id].sectionId, ids.page) === ids.section, 'page section was not saved')
    const target = p.locator('section').filter({ has: p.getByRole('heading', { name: 'Тестовая секция', exact: true }) })
    await target.getByText('Покупки', { exact: true }).waitFor()
    const notice = p.locator('[data-notice]')
    await notice.getByText('Страница в секции «Тестовая секция»').waitFor()
    await notice.getByRole('button', { name: 'Отменить' }).click()
    expect(await store(p, (data, id) => data.pages[id].sectionId, ids.page) === ids.from, 'undo did not restore the original section')
    await card(p, 'Покупки').waitFor()
    await chooseSection()
    await store(p, data => data.flush())
    await p.reload()
    await p.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$pinia._s.get('data')?.ready)
    expect(await store(p, (data, id) => data.pages[id].sectionId, ids.page) === ids.section, 'move did not survive reload')
    await touch(p, card(p, 'Покупки').locator('a'))
    await menu(p).getByRole('menuitem', { name: 'Переместить в секцию' }).click()
    const sheet = p.getByRole('dialog', { name: 'Секция' })
    await sheet.getByRole('button', { name: 'Мои страницы', exact: true }).click()
    expect(await store(p, (data, id) => data.pages[id].sectionId, ids.page) === null, 'page did not move out of section')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await store(p, (data, id) => data.pages[id].sectionId, ids.page) === ids.section, 'undo did not restore the section')
  } },
  { id: 'mf3-home-hold-scroll-system', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await store(p, (data) => {
      for (let i = 0; i < 12; i++) data.createPage({ title: `Проверочная страница ${i}` })
      data.toggleFolded('recent:expanded')
    })
    await p.waitForTimeout(200)
    const scroller = p.locator('.scroll-fade').first()
    const box = await p.locator('[data-home] [role="listitem"] a').nth(3).boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const x = box.x + 50
    const y = box.y + box.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let dy = 20; dy <= 140; dy += 20) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - dy }] })
      await p.waitForTimeout(40)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.waitForTimeout(600)
    expect(await scroller.evaluate(e => e.scrollTop) > 0, 'ordinary swipe did not scroll the list')
    expect(await menu(p).count() === 0, 'movement before hold opened the menu')
    await scroller.evaluate((e) => {
      e.scrollTop = 0
    })
    const before = await store(p, data => data.livePages.filter(x => ['inbox', 'today'].includes(x.kind)).map(x => ({ id: x.id, section: x.sectionId })))
    const inbox = await card(p, 'Входящие').locator('a').boundingBox()
    const ix = inbox.x + 50
    const iy = inbox.y + inbox.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ix, y: iy }] })
    await p.waitForTimeout(500)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ix, y: iy - 60 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
    await menu(p).waitFor()
    expect(await scroller.evaluate(e => e.scrollTop) === 0, 'list scrolled after the lift')
    const labels = await menu(p).getByRole('menuitem').allTextContents()
    expect(labels.map(x => x.trim()).join('|') === 'Добавить в избранное|Скопировать как текст', `system menu: ${labels}`)
    const after = await store(p, data => data.livePages.filter(x => ['inbox', 'today'].includes(x.kind)).map(x => ({ id: x.id, section: x.sectionId })))
    expect(JSON.stringify(before) === JSON.stringify(after), 'system page moved')
    await p.locator('[data-home-hold-veil]').click({ position: { x: 5, y: 5 } })
    await card(p, 'Входящие').locator('a').click()
    await p.waitForURL(/\/p\//)
  } },
  { id: 'mf3-home-hold-dark-above', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await p.evaluate(() => document.documentElement.classList.add('dark'))
    const row = card(p, 'Идеи')
    await touch(p, row.locator('a'))
    const lifted = await p.locator('[data-home-hold-card]').boundingBox()
    const popover = await menu(p).boundingBox()
    expect(popover.y + popover.height <= lifted.y, 'lower card menu did not open above the card')
    expect(Math.round(popover.width) === 256, `menu width: ${popover.width}`)
    const fills = await p.evaluate(() => ({
      veil: getComputedStyle(document.querySelector('[data-home-hold-veil]')).backdropFilter,
      card: getComputedStyle(document.querySelector('[data-home-hold-card]')).backgroundColor,
      expected: getComputedStyle(document.documentElement).getPropertyValue('--elev').trim()
    }))
    expect(fills.veil.includes('6px'), `veil blur: ${fills.veil}`)
    expect(fills.card === 'rgb(26, 35, 41)' && fills.expected.toLowerCase() === '#1a2329', `dark lifted surface: ${JSON.stringify(fills)}`)
  } },
  { id: 'mf3-home-hold-actions', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const row = card(p, 'Покупки')
    await touch(p, row.locator('a'))
    await menu(p).getByRole('menuitem', { name: 'Добавить в избранное' }).click()
    expect(await store(p, data => data.livePages.find(x => x.title === 'Покупки').favorite !== null), 'favorite did not persist')
    await touch(p, card(p, 'Покупки').locator('a'))
    await menu(p).getByRole('menuitem', { name: 'Удалить' }).click()
    expect(!await store(p, data => data.livePages.some(x => x.title === 'Покупки')), 'page was not deleted')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await store(p, data => data.livePages.some(x => x.title === 'Покупки')), 'undo did not restore the page')
  } },
  { id: 'mf3-home-hold-today', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const before = await store(p, data => JSON.stringify(data.livePages.find(x => x.kind === 'today')))
    await touch(p, card(p, 'Сегодня').locator('a'))
    const labels = await menu(p).getByRole('menuitem').allTextContents()
    expect(labels.map(x => x.trim()).join('|') === 'Добавить в избранное|Скопировать как текст', `today menu: ${labels}`)
    const after = await store(p, data => JSON.stringify(data.livePages.find(x => x.kind === 'today')))
    expect(before === after, 'holding Сегодня changed it')
  } },
  { id: 'mf3-home-hold-desktop-menu', device: DESKTOP, run: async (p) => {
    await open(p, '/', false)
    const row = card(p, 'Покупки')
    await row.hover()
    await row.getByRole('button', { name: 'Действия со страницей' }).click()
    await p.getByRole('menuitem', { name: 'Переименовать' }).waitFor()
    await p.keyboard.press('Escape')
    await p.getByRole('menuitem', { name: 'Переименовать' }).waitFor({ state: 'hidden' })
    expect(await menu(p).count() === 0, 'desktop opened the phone hold menu')
  } }
]
