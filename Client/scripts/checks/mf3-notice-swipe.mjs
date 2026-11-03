import { DESKTOP, MOBILE, expect, open, pageOf, store } from './lib.mjs'
import { notice, tapFree, write } from './main-flow.mjs'

const banner = p => p.locator('[data-update-banner]')

async function showNotice(p, id = 10001) {
  await p.evaluate((id) => {
    const ui = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('ui')
    window.__swipeActions = 0
    ui.notice = { id, title: `Проверка ${id}`, duration: 60000, action: { label: 'Отменить', run: () => {
      window.__swipeActions++
    } } }
  }, id)
  await notice(p).waitFor()
  await p.waitForTimeout(200)
}

async function drag(p, locator, dx, duration = 400, start = 35) {
  const b = await locator.boundingBox()
  const x = b.x + start
  const y = b.y + b.height / 2
  await p.mouse.move(x, y)
  await p.mouse.down()
  await p.mouse.move(x + dx, y, { steps: 5 })
  await p.waitForTimeout(duration)
  await p.mouse.up()
}

async function readyBanner(p) {
  await p.clock.install()
  await open(p, '/', false)
  await p.evaluate(() => window.__updateReady())
  await p.clock.runFor(31 * 60_000)
  await banner(p).waitFor()
  await p.waitForTimeout(200)
}

export default [
  { id: 'mf3-notice-swipe-page-move', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const ids = await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Покупки')
      const section = data.createSection('Дом для проверки')
      return { page: page.id, section: section.id }
    })
    const row = p.locator('[data-home] [role="listitem"]').filter({ has: p.locator('[data-name]', { hasText: /^Покупки$/ }) }).first().locator('a')
    const box = await row.boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await p.waitForTimeout(500)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.locator('[data-home-hold-menu]').getByRole('menuitem', { name: 'Переместить в секцию' }).click()
    await p.getByRole('dialog', { name: 'Секция' }).getByRole('button', { name: 'Дом для проверки', exact: true }).click()
    const n = notice(p)
    await n.getByText('Страница в секции «Дом для проверки»').waitFor()
    const swipe = async (distance) => {
      const rect = await n.boundingBox()
      const start = { x: rect.x + 30, y: rect.y + rect.height / 2 }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, x: start.x + distance }] })
      await p.waitForTimeout(400)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await swipe(40)
    await p.waitForTimeout(200)
    expect(await n.isVisible(), 'short swipe dismissed the move notice')
    expect(await n.evaluate(e => !e.style.transform), 'short swipe did not return')
    await swipe(200)
    await cdp.detach()
    await n.waitFor({ state: 'hidden' })
    expect(await store(p, (data, id) => data.pages[id].sectionId, ids.page) === ids.section, 'swiping undid the page move')
  } },
  { id: 'mf3-notice-swipe-action', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await write(p, 'Проверка свайпа', undefined, 'Покупки')
    await tapFree(p)
    expect(await pageOf(p, 'проверка свайпа') === 'Покупки', 'record not written')
    await drag(p, notice(p), 40)
    await p.waitForTimeout(200)
    expect(await notice(p).count() === 1, 'short drag dismissed notice')
    expect(await notice(p).evaluate(e => Math.abs(e.getBoundingClientRect().left - e.parentElement.getBoundingClientRect().left) < 2), 'short drag did not return')
    await drag(p, notice(p), 200)
    expect(await notice(p).count() === 0, 'long drag did not dismiss notice')
    expect(await pageOf(p, 'проверка свайпа') === 'Покупки', 'swipe undid the write')
  } },
  { id: 'mf3-notice-swipe-speed', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await showNotice(p)
    await p.evaluate(() => {
      window.__swipeNow = 0
      Object.defineProperty(performance, 'now', { configurable: true, value: () => window.__swipeNow })
    })
    const b = await notice(p).boundingBox()
    await p.mouse.move(b.x + 35, b.y + b.height / 2)
    await p.mouse.down()
    await p.mouse.move(b.x + 90, b.y + b.height / 2)
    await p.evaluate(() => {
      window.__swipeNow = 100
    })
    await p.mouse.up()
    expect(await notice(p).count() === 0, '0.55 px/ms flick did not dismiss')
  } },
  { id: 'mf3-notice-swipe-motion', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await showNotice(p)
    const b = await notice(p).boundingBox()
    await p.mouse.move(b.x + 35, b.y + b.height / 2)
    await p.mouse.down()
    await p.mouse.move(b.x + 75, b.y + b.height / 2)
    const during = await notice(p).evaluate(e => ({ x: e.style.transform, opacity: Number(e.style.opacity) }))
    expect(during.x === 'translateX(40px)' && during.opacity < 1 && during.opacity > 0, `not following finger: ${JSON.stringify(during)}`)
    await p.waitForTimeout(300)
    await p.mouse.up()
    const duration = await notice(p).evaluate(e => getComputedStyle(e).transitionDuration)
    expect(duration.split(', ').every(v => v === '0.15s'), `return duration: ${duration}`)
  } },
  { id: 'mf3-notice-swipe-buttons-race', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await showNotice(p)
    const b = await notice(p).boundingBox()
    const button = notice(p).getByRole('button', { name: 'Отменить' })
    const bb = await button.boundingBox()
    await drag(p, notice(p), -100, 350, bb.x + bb.width / 2 - b.x)
    expect(await notice(p).count() === 1, 'drag from button dismissed notice')
    expect(await p.evaluate(() => window.__swipeActions) === 0, 'button drag ran action')
    await button.click()
    expect(await p.evaluate(() => window.__swipeActions) === 1, 'button tap did not run action')
    await showNotice(p, 10002)
    const r = await notice(p).boundingBox()
    await p.mouse.move(r.x + 35, r.y + r.height / 2)
    await p.mouse.down()
    await p.mouse.move(r.x + 120, r.y + r.height / 2)
    await showNotice(p, 10003)
    await p.mouse.up()
    expect((await notice(p).innerText()).includes('10003'), 'old gesture dismissed new notice')
    expect(await notice(p).evaluate(e => !e.style.transform), 'new notice inherited offset')
  } },
  { id: 'mf3-notice-swipe-banner', device: MOBILE, run: async (p) => {
    await readyBanner(p)
    const b = await banner(p).boundingBox()
    const button = await banner(p).getByRole('button', { name: 'Обновить' }).boundingBox()
    await drag(p, banner(p), -100, 350, button.x + button.width / 2 - b.x)
    expect(await banner(p).count() === 1, 'drag from update button dismissed banner')
    await drag(p, banner(p), 40)
    await p.clock.runFor(500)
    expect(await banner(p).count() === 1, 'short drag dismissed banner')
    await drag(p, banner(p), -160)
    expect(await banner(p).count() === 0, 'long drag did not dismiss banner')
  } },
  { id: 'mf3-notice-swipe-banner-touch', device: MOBILE, run: async (p) => {
    await readyBanner(p)
    await p.evaluate(() => {
      const scroller = document.querySelector('.scroll-fade')
      const spacer = document.createElement('div')
      spacer.style.height = '1500px'
      scroller.append(spacer)
      scroller.scrollTop = 200
    })
    const b = await banner(p).boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const x = b.x + 40
    const y = b.y + b.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 100 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const scroll = await p.locator('.scroll-fade').first().evaluate(e => e.scrollTop)
    expect(await banner(p).count() === 1 && scroll > 200, `banner vertical gesture: scroll ${scroll}`)
  } },
  { id: 'mf3-notice-swipe-desktop', device: DESKTOP, run: async (p) => {
    await open(p, '/', false)
    await showNotice(p)
    await drag(p, notice(p), -160)
    expect(await notice(p).count() === 0, 'desktop notice did not dismiss')
  } },
  { id: 'mf3-notice-swipe-touch-scroll', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await showNotice(p)
    await p.evaluate(() => {
      const scroller = document.querySelector('.scroll-fade')
      const spacer = document.createElement('div')
      spacer.style.height = '1500px'
      scroller.append(spacer)
      scroller.scrollTop = 200
    })
    const b = await notice(p).boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const x = b.x + 40
    const y = b.y + b.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 100 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.waitForTimeout(200)
    const scroll = await p.locator('.scroll-fade').first().evaluate(e => e.scrollTop)
    expect(await notice(p).count() === 1, 'vertical gesture dismissed notice')
    expect(scroll > 200, `vertical gesture did not scroll page (${scroll})`)
  } },
  { id: 'mf3-notice-swipe-touch-horizontal', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await showNotice(p)
    const b = await notice(p).boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const x = b.x + 35
    const y = b.y + b.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 50, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 200, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    expect(await notice(p).count() === 0, 'touch swipe did not dismiss notice')
  } }
]
