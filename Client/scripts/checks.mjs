// Walks the «Check:» lines that can be scripted against a running app (pnpm dev) and prints pass or fail
// for each. It does not replace acceptance by the mockups thread; it catches regressions before it.
// Usage: pnpm dev, then: node scripts/checks.mjs [filter]   (SHOTS_CHROMIUM=/path/to/chromium if needed)
import { chromium, devices } from 'playwright'

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:3000'
const filter = process.argv[2]
const MOBILE = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }

async function open(page, path, demo = true) {
  await page.goto(`${BASE}${path}${demo ? `${path.includes('?') ? '&' : '?'}demo` : ''}`)
  await page.waitForSelector('main', { timeout: 15000 })
  await page.waitForTimeout(500)
}

async function send(page, text) {
  const field = page.getByRole('textbox', { name: 'Новая запись' })
  await field.fill(text)
  await page.keyboard.press('Enter')
  await field.blur()
  await page.waitForTimeout(500)
}

/** The data store, read in the page */
function store(page, fn, arg) {
  return page.evaluate(([src, a]) => {
    const data = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data')
    return new Function('data', 'a', `return (${src})(data, a)`)(data, a)
  }, [fn.toString(), arg])
}

const pageOf = (page, text) => store(page, (data, t) => {
  const r = Object.values(data.records).find(x => x.text.toLowerCase() === t && !x.deletedAt)
  return r ? data.pages[r.pageId]?.title : null
}, text)

/** Waits up to 5 s for something to be on screen */
const shows = locator => locator.first().waitFor({ timeout: 5000 }).then(() => true, () => false)

function expect(ok, why) {
  if (!ok) throw new Error(why)
}

const checks = [
  { id: 'v21-1', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await send(p, 'хлеб')
    expect(await p.getByText(/1 запись → Покупки/).count(), 'no receipt «1 запись → Покупки»')
    await p.getByRole('button', { name: /^Отменить/ }).first().click()
    await p.waitForTimeout(400)
    expect(!(await store(p, data => data.livePages.some(x => x.title === 'Покупки'))), 'Покупки is still there after «Отменить»')
    await send(p, 'прочитать Канемана')
    for (const t of ['Покупки', 'Дела', 'Цели', 'Заметки']) expect(await p.getByRole('button', { name: new RegExp(t) }).count(), `no starter «${t}»`)
  } },
  { id: 'v21-2', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'молоко')
    await p.getByRole('button', { name: /^Отменить/ }).first().click()
    await p.waitForTimeout(400)
    expect(await p.getByText(/только эта запись/).count(), 'the guess line does not say «только эта запись»')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(400)
    await send(p, 'позвонить маме')
    expect(await pageOf(p, 'позвонить маме') === 'Задачи', `«позвонить маме» went to ${await pageOf(p, 'позвонить маме')}`)
  } },
  { id: 'v21-3', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Продукты/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.getByRole('button', { name: /^Куда:/ }).click()
    await p.waitForTimeout(400)
    await p.getByRole('dialog').getByRole('button', { name: /^Авто/ }).click()
    await p.waitForTimeout(300)
    await send(p, 'позвонить маме')
    expect(await p.getByText(/1 запись → Задачи/).count(), 'no docked receipt «1 запись → Задачи»')
    expect(!(await p.locator('[data-sonner-toast], li[role="status"]').count()), 'a toast showed')
  } },
  { id: 'v21-7', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'позвонить стоматологу завтра в 10')
    await p.getByRole('button', { name: /^Срок: / }).first().click()
    await p.waitForTimeout(500)
    await p.getByRole('dialog').getByRole('button', { name: /^Сегодня/ }).click()
    await p.waitForTimeout(400)
    await open(p, '/')
    await p.getByRole('link', { name: /^Сегодня/ }).first().click()
    expect(await shows(p.getByText(/Позвонить стоматологу/)), 'the record is not in Сегодня')
  } },
  { id: 'v21-9', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Входящие/ }).first().click()
    await p.waitForURL(/\/p\//)
    const chip = p.getByRole('button', { name: /^→ |^Переместить в «/ }).first()
    expect(await shows(chip), 'no «→ Page» chip on a Входящие row')
    await chip.click()
    await p.waitForTimeout(300)
    expect(await shows(p.getByRole('button', { name: 'Отменить' })), 'no toast with «Отменить» after a pick')
  } },
  { id: 'v21-20', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    const side = p.getByRole('complementary', { name: 'Навигация' })
    expect(!(await side.getByRole('region', { name: 'Избранное' }).count()), 'the sidebar repeats the tree on Главная')
    await p.goto(`${BASE}/chat`)
    expect(await shows(side.getByRole('region', { name: 'Избранное' })), 'the sidebar has no tree off Главная')
  } },
  { id: 'B13-board', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Цели/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.getByRole('tab', { name: 'По статусу' }).click()
    await p.getByRole('tab', { name: /^В процессе/ }).click()
    await p.getByRole('button', { name: /^В «/ }).first().click()
    await p.waitForTimeout(300)
    expect(await p.getByText(/Полумарафон к маю → Достигнута/).count(), 'no move toast')
    expect(await p.getByRole('tab', { name: /^В процессе/, selected: true }).count(), 'the open column jumped')
  } },
  { id: 'v21-11', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Идеи/ }).first().click()
    const title = p.getByRole('textbox', { name: 'Название страницы' })
    await title.click()
    await p.keyboard.press('End')
    await p.keyboard.type(' и мысли')
    await title.blur()
    await p.waitForTimeout(300)
    expect(await store(p, data => data.livePages.some(x => x.title === 'Идеи и мысли')), 'leaving the field did not save the title')
    await title.click()
    await p.keyboard.type('xyz')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    expect(await title.inputValue() === 'Идеи и мысли', 'Esc did not put the old title back')
  } },
  { id: 'v21-10', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Сегодня/ }).first().click()
    await p.getByText(/^Пробежка 6 км$/).first().click()
    expect(await shows(p.getByRole('dialog')), 'a Сегодня row did not open the preview')
    expect(/peek=/.test(p.url()), 'the preview is not in the URL')
    await p.getByRole('button', { name: 'Закрыть' }).last().click()
    await p.waitForTimeout(500)
    expect(!/peek=/.test(p.url()) && /\/p\//.test(p.url()), '× did not return to the page')
  } },
  { id: 'B12', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Идеи/ }).first().click()
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.getByRole('button', { name: 'Новое свойство' }).click()
    await p.getByRole('textbox', { name: 'Название свойства' }).fill('Статус')
    await p.getByRole('radio', { name: 'Выбор' }).click()
    expect(await p.getByRole('button', { name: 'Добавить' }).isDisabled(), '«Добавить» works with no options')
    await p.getByRole('textbox', { name: 'Варианты' }).fill('Новая, Готово')
    expect(await p.getByRole('button', { name: 'Добавить' }).isEnabled(), '«Добавить» stays off with options')
  } },
  { id: 'B18', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Действия с Главной' }).click()
    await p.getByRole('dialog').getByRole('button', { name: 'Корзина' }).click()
    await p.waitForURL(/trash/)
    expect(await shows(p.getByRole('link', { name: /Главная/ })), 'Корзина does not go back to Главная')
  } },
  { id: 'B26', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Цели/ }).first().click()
    await p.getByRole('tab', { name: 'По статусу' }).click()
    await p.getByRole('button', { name: /^Действия: / }).first().click()
    const sheet = p.getByRole('dialog')
    expect(await shows(sheet.getByRole('button', { name: 'Открыть' })), 'the card «⋯» is not a sheet starting with «Открыть»')
    expect(await sheet.getByRole('button', { name: /^В «/ }).count() >= 2, 'the sheet does not list the columns')
  } },
  { id: 'B27', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const caption = p.getByRole('button', { name: /^Личное/ }).first()
    expect(await caption.evaluate(el => getComputedStyle(el.closest('.sticky') ?? el).position) === 'sticky', 'section captions are not sticky')
  } },
  { id: 'B28', device: MOBILE, run: async (p) => {
    await p.goto(`${BASE}/nonexistent`)
    expect(await shows(p.getByText('Такой страницы нет')), 'no Russian 404')
  } }
]

const browser = await chromium.launch({ executablePath: process.env.SHOTS_CHROMIUM ?? undefined })
let failed = 0
for (const c of checks.filter(c => !filter || c.id.toLowerCase().includes(filter.toLowerCase()))) {
  const context = await browser.newContext({ ...c.device, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
  const page = await context.newPage()
  try {
    await c.run(page)
    console.log(`pass  ${c.id}`)
  } catch (e) {
    failed++
    console.log(`FAIL  ${c.id}: ${e.message.split('\n')[0]}`)
    if (process.env.CHECKS_OUT) await page.screenshot({ path: `${process.env.CHECKS_OUT}/${c.id}.png` })
  }
  await context.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
