// The update banner (handoff/update-banner.md, U1): «Есть новая версия · Обновить» after a new version waited 30 minutes
// with the app in front. `pnpm dev` has no service worker, so the page makes the update «ready» with the dev hook
// (`__updateReady`, plugins/app-update.client.ts) and the clock is Playwright's. Ids ub-<check>-<what>
import { DESKTOP, MOBILE, expect, open } from './lib.mjs'
import { NOW, goPage, home, notice, openField, pill, tapFree, title, write } from './main-flow.mjs'

const banner = p => p.locator('[data-update-banner]')
const MIN = 60_000

/** Visibility the check can switch: «hidden» stands for the app in the background */
function fakeVisibility() {
  let state = 'visible'
  Object.defineProperty(document, 'visibilityState', { get: () => state, configurable: true })
  Object.defineProperty(document, 'hidden', { get: () => state === 'hidden', configurable: true })
  window.__setVis = (v) => {
    state = v
    document.dispatchEvent(new Event('visibilitychange'))
  }
}

/** A first run with a new version ready `after` visible minutes ago */
async function ready(p, after = 31) {
  await p.addInitScript(fakeVisibility)
  await p.clock.install({ time: NOW })
  await open(p, '/', false)
  await p.evaluate(() => window.__updateReady())
  if (after) await p.clock.runFor(after * MIN)
  await p.waitForTimeout(200)
}

async function looks(p) {
  const b = banner(p)
  const s = await b.evaluate((e) => {
    const cs = getComputedStyle(e)
    const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
    const probe = (n) => {
      const d = document.createElement('div')
      d.style.color = `var(${n})`
      document.body.append(d)
      const c = getComputedStyle(d).color
      d.remove()
      return c
    }
    return {
      h: e.getBoundingClientRect().height, bg: cs.backgroundColor, elev: probe('--elev'), edge: cs.borderTopColor,
      line2: probe('--line2'), width: cs.borderTopWidth, shadow: cs.boxShadow, radius: cs.borderTopLeftRadius, x: v('--elev') && 1
    }
  })
  expect(s.h === 48, `height ${s.h}`)
  expect(s.bg === s.elev && s.edge === s.line2 && s.width === '1px', `surface ${JSON.stringify(s)}`)
  expect(s.shadow === 'none' && s.radius === '12px', `shadow ${s.shadow}, radius ${s.radius}`)
  expect((await b.innerText()).replace(/\s+/g, ' ').trim() === 'Есть новая версия Обновить', `words: ${await b.innerText()}`)
  expect(await b.locator('svg, .iconify, [class*="i-lucide"]').count() >= 1, 'no glyph')
  // Over the closed field, at its width
  const bb = await b.boundingBox()
  const fb = await pill(p).boundingBox()
  expect(Math.abs(bb.width - fb.width) < 1 && bb.y + bb.height <= fb.y && fb.y - (bb.y + bb.height) < 16, `place ${JSON.stringify({ bb, fb })}`)
}

async function drag(p, dx) {
  const b = await banner(p).boundingBox()
  const y = b.y + b.height / 2
  await p.mouse.move(b.x + 40, y)
  await p.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await p.mouse.move(b.x + 40 + dx * i / 10, y)
    await p.clock.runFor(40)
  }
  await p.mouse.up()
  await p.clock.runFor(400)
  // The spring back is a CSS transition, on the real clock
  await p.waitForTimeout(400)
}

export default [
  // 1. After 30 visible minutes: over the closed field on Главная, as drawn, in both themes
  { id: 'ub-1-look', device: MOBILE, run: async (p) => {
    await ready(p)
    expect(await banner(p).isVisible(), 'no banner after 31 visible minutes')
    await looks(p)
    await p.emulateMedia({ colorScheme: 'dark' })
    await p.waitForTimeout(200)
    await looks(p)
  } },

  // 2. Not before 30 visible minutes; hidden time does not count
  { id: 'ub-2-when', device: MOBILE, run: async (p) => {
    await ready(p, 29)
    expect(!(await banner(p).count()), 'shown after 29 minutes')
    await p.evaluate(() => window.__setVis('hidden'))
    await p.clock.runFor(60 * MIN)
    await p.evaluate(() => window.__setVis('visible'))
    await p.clock.runFor(MIN / 2)
    await p.waitForTimeout(100)
    expect(!(await banner(p).count()), 'hidden time counted')
    await p.clock.runFor(2 * MIN)
    await p.waitForTimeout(100)
    expect(await banner(p).isVisible(), 'no banner after 31 visible minutes in all')
  } },

  // 3. Gone while the field is open, back when it closes
  { id: 'ub-3-field', device: MOBILE, run: async (p) => {
    await ready(p)
    await openField(p)
    expect(!(await banner(p).count()), 'shown over the open field')
    await tapFree(p)
    expect(await banner(p).isVisible(), 'not back after the field closed')
  } },

  // 4. A notice takes the slot for its time, then the banner is back
  { id: 'ub-4-notice', device: MOBILE, run: async (p) => {
    await ready(p)
    await write(p, 'Купить молоко')
    await tapFree(p)
    expect(await notice(p).isVisible() && !(await banner(p).count()), 'the notice and the banner together')
    await p.clock.runFor(6500)
    await p.waitForTimeout(150)
    expect(!(await notice(p).count()) && await banner(p).isVisible(), 'the banner is not back after the notice')
  } },

  // 5. Over a page's closed field; none on a record or in Настройки
  { id: 'ub-5-screens', device: MOBILE, run: async (p) => {
    await ready(p)
    await goPage(p, 'Покупки')
    expect(await banner(p).isVisible(), 'no banner on a page')
    await home(p)
    await p.goto(`${new URL(p.url()).origin}/settings`)
    await p.waitForSelector('main')
    await p.evaluate(() => window.__updateReady())
    await p.clock.runFor(31 * MIN)
    await p.waitForTimeout(150)
    expect(!(await banner(p).count()), 'a banner in Настройки')
  } },

  // 6. A drag past a third hides it until a reload; a short one springs back
  { id: 'ub-6-swipe', device: MOBILE, run: async (p) => {
    await ready(p)
    await drag(p, 60)
    expect(await banner(p).isVisible(), 'a short drag hid it')
    const x = (await banner(p).boundingBox()).x
    expect(Math.abs(x - 16) < 2, `not back in place: ${x}`)
    await drag(p, 160)
    expect(!(await banner(p).count()), 'a drag past a third did not hide it')
    await goPage(p, 'Покупки')
    expect(!(await banner(p).count()), 'back on a page')
  } },

  // 7. Computer: in the left column over its field; a mouse drag hides it
  { id: 'ub-7-computer', device: DESKTOP, run: async (p) => {
    await ready(p)
    const side = await p.locator('[data-side]').boundingBox()
    const b = await banner(p).boundingBox()
    expect(b && b.x >= side.x && b.x + b.width <= side.x + side.width, `not in the left column: ${JSON.stringify({ b, side })}`)
    await looks(p)
    await drag(p, -180)
    expect(!(await banner(p).count()), 'a mouse drag did not hide it')
  } },

  // 8. «Обновить» reloads on the same page and the field keeps its words
  { id: 'ub-8-update', device: MOBILE, run: async (p) => {
    await ready(p)
    await goPage(p, 'Покупки')
    const at = p.url()
    await openField(p)
    await title(p).fill('Хлеб и сыр')
    await p.locator('[data-field="open"]').evaluate(() => document.activeElement?.blur())
    await p.keyboard.press('Escape').catch(() => {})
    await tapFreePage(p)
    await banner(p).getByRole('button', { name: 'Обновить' }).click()
    await p.waitForEvent('load')
    await p.waitForSelector('main')
    await p.waitForTimeout(500)
    expect(p.url() === at, `another page: ${p.url()}`)
    expect((await pill(p).innerText()).includes('Хлеб и сыр'), `the words went: ${await pill(p).innerText()}`)
  } }
]

/** Puts a page's field away by a tap over the list */
async function tapFreePage(p) {
  if (!(await pill(p).isVisible())) await p.mouse.click(195, 300)
  await p.waitForTimeout(200)
}
