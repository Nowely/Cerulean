// v22 delta: the «Check:» lines of Josh's points and the writing loop and pages (items 1, 4–10, 13, 15, 22, 24, 31, 33,
// 34). Data (27–29, 9) is in data.mjs, properties (30) in props.mjs, the writing loop's notices in writing.mjs,
// navigation in nav.mjs.
import { DESKTOP, MOBILE, expect, open, send, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')

const openPage = async (p, title) => {
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(400)
}

/** Rows of the page on screen that end above the field */
const rowsInView = p => p.evaluate(() => {
  const top = document.querySelector('[data-field="closed"]').getBoundingClientRect().top
  return [...document.querySelectorAll('main li')].filter((li) => {
    const r = li.getBoundingClientRect()
    return li.querySelector('[role="checkbox"]') && r.top >= 0 && r.bottom <= top + 1
  }).length
})

export default [
  // 1: «Покупки at 390×844 with four groups shows at least 11 rows above the composer without scrolling»
  { id: 'v22-1-density', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    // The long list of MobileLong: 24 open records in five groups
    await store(p, (data) => {
      const pg = data.livePages.find(x => x.title === 'Покупки')
      const dept = pg.props.find(x => x.name === 'Отдел')
      const opt = n => dept.options.find(o => o.name === n).id
      const rows = [['Батон', 'Хлеб и выпечка'], ['Лаваш', 'Хлеб и выпечка'], ['Кефир', 'Молочное'], ['Сметана', 'Молочное'], ['Творог', 'Молочное'], ['Йогурт', 'Молочное'],
        ['Огурцы', 'Овощи и фрукты'], ['Картошка', 'Овощи и фрукты'], ['Лук', 'Овощи и фрукты'], ['Яблоки', 'Овощи и фрукты'], ['Гречка', 'Бакалея'], ['Рис', 'Бакалея']]
      rows.forEach(([text, group], i) => data.addRecord({ pageId: pg.id, text, order: 100 + i, addedAt: Date.now() - 3600000, values: { [dept.id]: opt(group) } }))
    })
    await openPage(p, 'Покупки')
    const n = await rowsInView(p)
    expect(n >= 11, `${n} rows above the composer`)
    const row = await p.locator('main li').filter({ has: p.getByRole('checkbox') }).first().boundingBox()
    expect(Math.round(row.height) === 44, `a row is ${row.height} px`)
  } },
  // 2: «Покупки: tap «Купить» twice → «Удалить вид» → the tab goes with «Отменить»; «Отменить» → three tabs, «Купить» selected»
  { id: 'v22-2-delete-view', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Покупки')
    // «Купить» is already the current tab, so one tap opens its menu
    const buy = p.getByRole('tab', { name: 'Купить' })
    await buy.click()
    await p.waitForTimeout(500)
    // The dev tools pill can sit over the sheet's last item, so the click is dispatched
    await p.getByRole('menuitem', { name: /Удалить вид/ }).or(p.getByRole('button', { name: /Удалить вид/ })).first().dispatchEvent('click')
    await p.waitForTimeout(500)
    // The tab leaves with a short fade
    const tabs = p.locator('main [role="tab"]:visible')
    for (let i = 0; i < 10 && await tabs.count() !== 2; i++) await p.waitForTimeout(200)
    expect(await tabs.count() === 2, `${await tabs.count()} tabs after «Удалить вид»`)
    const undo = p.locator('[data-notice]', { hasText: 'Вид «Купить» удалён' }).getByRole('button', { name: 'Отменить' })
    expect(await shows(undo), 'no «Вид «Купить» удалён · Отменить»')
    await undo.click()
    for (let i = 0; i < 10 && await tabs.count() !== 3; i++) await p.waitForTimeout(200)
    expect(await tabs.count() === 3, `${await tabs.count()} tabs after «Отменить»`)
    expect(await buy.getAttribute('aria-selected') === 'true', '«Купить» is not selected after «Отменить»')
  } },
  // 2 on desktop: a right-click on a tab opens the same menu
  { id: 'v22-2-desk-menu', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Покупки')
    await p.getByRole('tab', { name: 'Запасы' }).click({ button: 'right' })
    await p.waitForTimeout(500)
    expect(await shows(p.getByRole('menuitem', { name: /Удалить вид/ })), 'a right-click on «Запасы» opened no view menu')
    expect(await shows(p.getByRole('menuitem', { name: /Новый вид/ })), 'the view menu has no «Новый вид»')
  } },
  // 4: «open five pages with «Сделано» (v22: «Готово») and Главная with two pages: no tip appears»
  { id: 'v22-4-no-tips', device: MOBILE, run: async (p) => {
    const tip = /смахни|смахнуть|удерживай|подержи|наведи|подсказка|совет:/i
    await open(p, '/')
    for (const t of ['Покупки', 'Дела по дому', 'Задачи', 'Цели', 'Идеи']) {
      await openPage(p, t)
      expect(!tip.test(await p.evaluate(() => document.body.innerText)), `a tip on ${t}`)
      await p.goBack()
      await p.waitForTimeout(300)
    }
  } },
  // 4, day one: Главная with its three pages (main flow, item 1) and each of them
  { id: 'v22-4-no-tips-day-one', device: MOBILE, run: async (p) => {
    const tip = /смахни|смахнуть|удерживай|подержи|наведи|подсказка|совет:/i
    await open(p, '/', false)
    expect(!tip.test(await p.evaluate(() => document.body.innerText)), 'a tip on Главная on day one')
    for (const t of ['Покупки', 'Задачи', 'Идеи']) {
      await openPage(p, t)
      expect(!tip.test(await p.evaluate(() => document.body.innerText)), `a tip on ${t}`)
      await p.goBack()
      await p.waitForTimeout(300)
    }
  } },
  // 5: «on Покупки send «молоко 2 л»: the row shows «2 л» at once and no «только что»» (кефир: Молоко is in the demo)
  { id: 'v22-5-props-not-time', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Покупки')
    await send(p, 'кефир 1 л')
    const row = p.locator('main li').filter({ hasText: 'Кефир' }).first()
    expect(await shows(row.getByText('1 л', { exact: true })), 'the row does not show «1 л»')
    expect(!(await p.getByText(/только что/).count()), '«только что» on screen')
  } },
  // 6 retired in main flow 2 (item 9): a tick leaves the list after a moment (mf2-9-tick replaces U2)
  // 8, 10, 22, 33, 34: receipts, series and found cards stay on Журнал's composer, off the main flow
  // 8: an expanded series receipt gives each row its own «→»
  { id: 'v22-8-series-rows', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    // Not on Покупки yet: a duplicate row offers «Объединить» in place of its «→» (item 25)
    await send(p, 'сметана')
    await send(p, 'творог')
    await p.getByText(/2 записи → Покупки/).first().click()
    await p.waitForTimeout(400)
    expect(await p.getByRole('button', { name: /^Переместить «/ }).count() >= 2, 'the rows have no «→» of their own')
  } },
  // 10: «type «где паспорт?» on Главная, «Записать»: the record reads «Где паспорт?»»; «идея:» is dropped
  { id: 'v22-10-as-typed', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    await send(p, 'где паспорт?')
    // Журнал keeps an older found card above: the newest is the last
    await p.getByRole('button', { name: /^Записать/ }).last().click()
    await p.waitForTimeout(500)
    expect(await store(p, data => Object.values(data.records).some(r => r.text === 'Где паспорт?' && !r.deletedAt)), 'no record «Где паспорт?»')
    await send(p, 'идея: календарь для кота')
    expect(await store(p, data => Object.values(data.records).some(r => r.text === 'Календарь для кота' && !r.deletedAt)), 'the prefix «идея:» stayed')
  } },
  // 13: «fold «Хлеб и выпечка», open another page and come back: still folded, count shown»
  { id: 'v22-13-fold', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: /^Хлеб и выпечка/ }).click()
    await p.waitForTimeout(300)
    await p.goBack()
    await p.waitForURL(u => new URL(u).pathname === '/')
    await openPage(p, 'Задачи')
    await p.goBack()
    await openPage(p, 'Покупки')
    const caption = p.getByRole('button', { name: /^Хлеб и выпечка/ })
    expect(await caption.getAttribute('aria-expanded') === 'false', 'the group is open again')
    expect(/· 1/.test(await caption.innerText()), 'the folded caption shows no count')
  } },
  // 15: a new view is named after its type and follows it until renamed
  { id: 'v22-15-view-name', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Идеи')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.getByRole('button', { name: 'Новый вид' }).click()
    await p.waitForTimeout(500)
    // The tab is under the sheet's scrim; the view itself is what counts
    expect(await store(p, data => data.livePages.find(x => x.title === 'Идеи').views.some(v => v.name === 'Список 2' && !v.named)), 'the new view is not «Список 2»')
  } },
  // 22: «send «когда менять фильтр?»: a receipt to Дела по дому, the record reads «Когда менять фильтр?», and
  // «Поменять фильтр воды» shows under it»
  { id: 'v22-22-question', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    await send(p, 'когда менять фильтр?')
    expect(await shows(p.getByText(/1 запись → Дела по дому/)), 'no receipt to Дела по дому')
    expect(await store(p, data => Object.values(data.records).some(r => r.text === 'Когда менять фильтр?')), 'the record lost its «?»')
    expect(await shows(p.getByText('Похожее в записях')), 'no «Похожее в записях»')
    expect(await shows(p.getByText(/Поменять фильтр воды/)), '«Поменять фильтр воды» is not under it')
    await send(p, 'где фильтр воды?')
    expect(await shows(p.getByText(/^Нашлось|Нашёл|нашлось/)), 'an explicit search gives no found card')
  } },
  { id: 'v22-22-question-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/journal')
    await send(p, 'когда менять фильтр?')
    expect(await shows(p.getByText(/1 запись → Дела по дому/)), 'no receipt to Дела по дому')
    expect(await shows(p.getByText('Похожее в записях')), 'no «Похожее в записях»')
  } },
  // 31: renames; day one's pages are Быстрый старт, Покупки, Задачи and Идеи (main flow, item 1; main flow 2, item 3),
  // Журнал is in Главная's «⋯» (item 20)
  { id: 'v22-31-renames', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const names = await store(p, data => data.livePages.filter(x => x.kind === 'page').map(x => x.title).join(', '))
    expect(names === 'Быстрый старт, Покупки, Задачи, Идеи', `day one's pages are ${names}`)
    await open(p, '/')
    await p.getByRole('button', { name: 'Меню Главной' }).click()
    await p.locator('[data-home-menu]').getByRole('menuitem', { name: 'Журнал' }).click()
    await p.waitForURL(/\/journal/)
    expect(await shows(p.getByRole('heading', { name: 'Журнал' })), 'Журнал has no «Журнал» title')
    for (const word of ['Недавнее', 'Чат', 'из чата', 'Продукты']) expect(!(await p.getByText(word, { exact: true }).count()), `«${word}» is on screen`)
  } },
  // 33: «send «сыр, позвонить бабушке» on Главная: each row has its page glyph and no checkbox»
  { id: 'v22-33-receipt-rows', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    await send(p, 'сыр, позвонить бабушке')
    const card = p.locator('section, article, div').filter({ hasText: /^2 записи → Покупки, Задачи/ }).last()
    expect(!(await p.getByRole('checkbox', { name: /Сыр|Позвонить бабушке/ }).count()), 'a receipt row has a checkbox')
    expect(await shows(card), 'no receipt')
  } },
  // 34: «with a slow model, send «кефир и сметана»: the card shows those words while waiting»
  { id: 'v22-34-pending', device: MOBILE, run: async (p) => {
    await p.clock.setSystemTime(NOW)
    await p.route('**/api.openai.com/**', () => {})
    await open(p, '/journal')
    await store(p, data => data.setSettings({ provider: 'openai', apiKey: 'sk-demo-0000000000000000000000000000000000007Qa2', keyState: 'ok', rulesFirst: false }))
    await send(p, 'кефир и сметана')
    expect(await shows(p.getByText('Разбирается…')), 'no «Разбирается…»')
    expect(await shows(p.getByText('кефир и сметана')), 'the pending card lost the words')
  } }
]
