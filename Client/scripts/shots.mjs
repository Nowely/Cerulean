// Screenshots of the running app for comparing with the mockups.
// Usage: pnpm dev, then `pnpm shots [filter]` (SHOTS_URL, SHOTS_OUT to override).
// Every shot starts from a fresh browser profile with the demo data and the clock at 19 Oct 2026, 9:14,
// the moment the mockups show; light and dark come from the system preference.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.env.SHOTS_URL ?? 'http://127.0.0.1:3000'
const OUT = process.env.SHOTS_OUT ?? 'shots'
const filter = process.argv[2]
const NOW = new Date('2026-10-19T09:14:00+03:00')

const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }

/** @type {{ name: string, device: object, run: (page: import('playwright').Page) => Promise<void> }[]} */
const scenarios = [
  { name: 'MobileHome', device: MOBILE, run: p => openHome(p) },
  { name: 'MobileCompact', device: MOBILE, run: async (p) => {
    await open(p, '/settings')
    await p.getByRole('radio', { name: 'Компактно' }).click()
    await p.getByRole('link', { name: 'Главная' }).click()
    await dismissKeyCard(p)
  } },
  { name: 'MobileFirst', device: MOBILE, run: p => open(p, '/', false) },
  { name: 'MobileChat', device: MOBILE, run: p => open(p, '/chat') },
  { name: 'MobileChatEmpty', device: MOBILE, run: p => open(p, '/chat', false) },
  { name: 'MobileList', device: MOBILE, run: p => openPage(p, 'Продукты') },
  { name: 'MobileToday', device: MOBILE, run: p => openPage(p, 'Сегодня', false) },
  { name: 'MobileInbox', device: MOBILE, run: p => openPage(p, 'Входящие') },
  { name: 'MobileTasks', device: MOBILE, run: p => openPage(p, 'Задачи') },
  { name: 'MobileItem', device: MOBILE, run: async (p) => {
    await openPage(p, 'Продукты')
    await p.getByRole('button', { name: /^Яйца/ }).click()
    await p.waitForURL(/\/r\//)
    await settle(p, 400)
  } },
  { name: 'MobileGoal', device: MOBILE, run: p => openPage(p, 'Полумарафон к маю') },
  { name: 'MobilePageMenu', device: MOBILE, run: async (p) => {
    await openPage(p, 'Продукты')
    await p.getByRole('button', { name: 'Действия со страницей' }).click()
    await settle(p, 600)
  } },
  { name: 'MobileView', device: MOBILE, run: async (p) => {
    await openPage(p, 'Продукты')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await settle(p)
  } },
  { name: 'MobileFind', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Найти' }).click()
    await settle(p)
  } },
  { name: 'MobileFindTyped', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Найти' }).click()
    await p.getByRole('searchbox', { name: 'Найти' }).fill('кни')
    await settle(p)
  } },
  { name: 'MobileWrite', device: MOBILE, run: async (p) => {
    await openHome(p)
    await p.getByRole('textbox', { name: 'Новая запись' }).fill('купить молоко и хлеб')
    await settle(p, 400)
  } },
  { name: 'MobileSent', device: MOBILE, run: async (p) => {
    await openHome(p)
    await p.getByRole('textbox', { name: 'Новая запись' }).fill('купить молоко и хлеб')
    await p.keyboard.press('Enter')
    await settle(p, 400)
  } },
  { name: 'MobileSheet', device: MOBILE, run: async (p) => {
    await open(p, '/chat')
    await p.locator('button', { hasText: 'Продукты' }).last().click()
    await settle(p, 600)
  } },
  { name: 'MobileSettings', device: MOBILE, run: p => open(p, '/settings') },
  { name: 'MobileTrash', device: MOBILE, run: p => open(p, '/settings/trash') },

  { name: 'Home', device: DESKTOP, run: p => openHome(p) },
  { name: 'Page', device: DESKTOP, run: p => openPage(p, 'Продукты') },
  { name: 'Board', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Цели')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.getByRole('radio', { name: 'Доска' }).click()
    await p.keyboard.press('Escape')
    await settle(p, 400)
  } },
  { name: 'MobileBoard', device: MOBILE, run: async (p) => {
    await openPage(p, 'Цели')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.getByRole('radio', { name: 'Доска' }).click()
    await p.getByRole('button', { name: 'Закрыть' }).click()
    await settle(p, 600)
  } },
  { name: 'MobileCalendar', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.getByRole('radio', { name: 'Календарь' }).click()
    await p.getByRole('button', { name: 'Закрыть' }).click()
    await settle(p, 600)
  } },
  { name: 'Item', device: DESKTOP, run: p => openPage(p, 'Полумарафон к маю') },
  { name: 'Chat', device: DESKTOP, run: p => open(p, '/chat') },
  { name: 'Palette', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await p.keyboard.press('Control+k')
    await p.getByRole('combobox', { name: 'Найти' }).fill('мол')
    await settle(p)
  } },
  { name: 'Settings', device: DESKTOP, run: p => open(p, '/settings') }
]

async function settle(page, ms = 250) {
  await page.waitForTimeout(ms)
}

async function open(page, path, demo = true) {
  await page.goto(`${BASE}${path}${demo ? `${path.includes('?') ? '&' : '?'}demo` : ''}`)
  await page.waitForSelector('main, [data-app-ready]', { timeout: 15000 }).catch(() => {})
  await page.evaluate(() => document.fonts.ready)
  await settle(page, 400)
}

/** Главная as the mockups show it: with a key, so without the one-time «Без ключа…» card */
async function openHome(page) {
  await open(page, '/')
  await dismissKeyCard(page)
}

async function dismissKeyCard(page) {
  await page.getByRole('region', { name: 'Без ключа работают только простые правила' }).getByRole('button', { name: 'Закрыть' }).click()
  await page.mouse.move(0, 0)
  await settle(page)
}

/** Opens a page by its title from Главная (or the sidebar on desktop) */
async function openPage(page, title, exact = true) {
  await open(page, '/')
  await page.getByRole('link', { name: new RegExp(exact ? `^${title}` : title) }).first().click()
  await page.waitForURL(/\/(p|r)\//)
  await settle(page, 400)
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.SHOTS_CHROMIUM ?? undefined })
const failed = []
for (const s of scenarios.filter(s => !filter || s.name.toLowerCase().includes(filter.toLowerCase()))) {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...s.device, colorScheme: scheme, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => m.type() === 'error' && errors.push(m.text()))
    // The clock starts at NOW and keeps running, so timers and animations behave as usual
    await page.clock.setSystemTime(NOW)
    // The dev server's DevTools button is not part of the app
    await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.textContent = '#nuxt-devtools-container { display: none !important }'
      document.head.append(style)
    }))
    try {
      await s.run(page)
      await page.screenshot({ path: `${OUT}/${s.name}-${scheme}.png` })
      console.log(`✓ ${s.name}-${scheme}${errors.length ? `  (${errors.length} console errors: ${errors[0]})` : ''}`)
    } catch (e) {
      failed.push(`${s.name}-${scheme}`)
      console.log(`✗ ${s.name}-${scheme}: ${e.message.split('\n')[0]}`)
      await page.screenshot({ path: `${OUT}/${s.name}-${scheme}.png` }).catch(() => {})
    }
    await context.close()
  }
}
await browser.close()
if (failed.length) process.exitCode = 1
