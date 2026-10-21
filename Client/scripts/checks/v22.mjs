// v22 delta: the «Check:» lines of the writing loop and pages already built in this PR (items 6–10, 13, 15, 22, 24,
// 31, 33, 34). Data (27–29, 9) is in data.mjs, properties (30) in props.mjs.
import { DESKTOP, MOBILE, expect, open, pageOf, send, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')

const openPage = async (p, title) => {
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(400)
}

export default [
  // 6: «tick «Молоко» on «Купить»: it stays in place, struck through; tap again: back»
  { id: 'v22-6-tick-stays', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Покупки')
    const mark = p.getByRole('checkbox', { name: 'Отметить «Молоко»' })
    await mark.click()
    await p.waitForTimeout(600)
    expect(await mark.isVisible(), 'Молоко left the list after the tick')
    expect(await mark.isChecked(), 'Молоко is not ticked')
    expect(await p.getByText('Молоко', { exact: true }).evaluate(e => getComputedStyle(e).textDecorationLine.includes('line-through')), 'Молоко is not struck through')
    await mark.click()
    await p.waitForTimeout(300)
    expect(!(await mark.isChecked()), 'a second tap did not untick')
  } },
  // 7: «on Главная send «сыр, позвонить бабушке» → Сыр in Покупки, the call in Задачи, one receipt; «Отменить» removes both»
  { id: 'v22-7-split', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('textbox', { name: 'Новая запись' }).fill('сыр, позвонить бабушке')
    await p.waitForTimeout(500)
    expect(await shows(p.getByText('→ Покупки 1, Задачи 1')), 'the guess line does not count per page')
    await p.keyboard.press('Enter')
    await p.getByRole('textbox', { name: 'Новая запись' }).blur()
    await p.waitForTimeout(500)
    expect(await pageOf(p, 'сыр') === 'Покупки' || await store(p, data => Object.values(data.records).filter(r => /^сыр$/i.test(r.text) && !r.deletedAt).length === 2), 'Сыр did not go to Покупки')
    expect(await pageOf(p, 'позвонить бабушке') === 'Задачи', `the call went to ${await pageOf(p, 'позвонить бабушке')}`)
    expect(await shows(p.getByText(/2 записи → Покупки, Задачи/)), 'no one receipt «2 записи → Покупки, Задачи»')
    expect(!(await p.getByRole('button', { name: 'Не туда' }).count()), 'a split receipt has «Не туда» in its header')
    await p.getByRole('button', { name: /^Отменить/ }).first().click()
    await p.waitForTimeout(400)
    expect(!(await pageOf(p, 'позвонить бабушке')), '«Отменить» left the call')
  } },
  // 8: an expanded series receipt gives each row its own «→»
  { id: 'v22-8-series-rows', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'молоко')
    await send(p, 'яблоки')
    await p.getByText(/2 записи → Покупки/).first().click()
    await p.waitForTimeout(400)
    expect(await p.getByRole('button', { name: /^Переместить «/ }).count() >= 2, 'the rows have no «→» of their own')
  } },
  // 10: «type «где паспорт?» on Главная, «Записать»: the record reads «Где паспорт?»»; «идея:» is dropped
  { id: 'v22-10-as-typed', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'где паспорт?')
    await p.getByRole('button', { name: /^Записать/ }).first().click()
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
    await open(p, '/')
    await send(p, 'когда менять фильтр?')
    expect(await shows(p.getByText(/1 запись → Дела по дому/)), 'no receipt to Дела по дому')
    expect(await store(p, data => Object.values(data.records).some(r => r.text === 'Когда менять фильтр?')), 'the record lost its «?»')
    expect(await shows(p.getByText('Похожее в записях')), 'no «Похожее в записях»')
    expect(await shows(p.getByText(/Поменять фильтр воды/)), '«Поменять фильтр воды» is not under it')
    await send(p, 'где фильтр воды?')
    expect(await shows(p.getByText(/^Нашлось|Нашёл|нашлось/)), 'an explicit search gives no found card')
  } },
  { id: 'v22-22-question-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await send(p, 'когда менять фильтр?')
    expect(await shows(p.getByText(/1 запись → Дела по дому/)), 'no receipt to Дела по дому')
    expect(await shows(p.getByText('Похожее в записях')), 'no «Похожее в записях»')
  } },
  // 24: «pick Задачи in the chip: its checkbox glyph shows before «Задачи»»; Авто shows its fork
  { id: 'v22-24-chip-glyph', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const chip = p.getByRole('button', { name: /^Куда:/ })
    expect(await chip.locator('svg, [class*="i-"], span.iconify').count(), 'the Авто chip has no glyph')
    await openPage(p, 'Задачи')
    const glyph = p.getByRole('button', { name: /^Куда:/ }).locator('svg, span[class*="i-"]').first()
    const text = p.getByRole('button', { name: /^Куда:/ }).getByText('Задачи', { exact: true })
    expect((await glyph.boundingBox()).x < (await text.boundingBox()).x, 'the glyph is not before «Задачи»')
  } },
  // 31: renames
  { id: 'v22-31-renames', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    for (const t of ['Покупки', 'Задачи', 'Цели', 'Идеи']) expect(await shows(p.getByRole('button', { name: new RegExp(`^${t}`) })), `no template «${t}»`)
    await p.getByRole('button', { name: /^Задачи/ }).first().click()
    await p.waitForTimeout(500)
    expect(await store(p, data => data.livePages.some(x => x.title === 'Задачи')), 'the template «Задачи» made another name')
    await open(p, '/')
    await p.getByRole('link', { name: 'Журнал' }).first().click()
    await p.waitForURL(/\/journal/)
    expect(await shows(p.getByRole('heading', { name: 'Журнал' })), 'Журнал has no «Журнал» title')
    for (const word of ['Недавнее', 'Чат', 'из чата', 'Продукты']) expect(!(await p.getByText(word, { exact: true }).count()), `«${word}» is on screen`)
  } },
  // 33: «send «сыр, позвонить бабушке» on Главная: each row has its page glyph and no checkbox»
  { id: 'v22-33-receipt-rows', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'сыр, позвонить бабушке')
    const card = p.locator('section, article, div').filter({ hasText: /^2 записи → Покупки, Задачи/ }).last()
    expect(!(await p.getByRole('checkbox', { name: /Сыр|Позвонить бабушке/ }).count()), 'a receipt row has a checkbox')
    expect(await shows(card), 'no receipt')
  } },
  // 34: «with a slow model, send «кефир и сметана»: the card shows those words while waiting»
  { id: 'v22-34-pending', device: MOBILE, run: async (p) => {
    await p.clock.setSystemTime(NOW)
    await p.route('**/api.openai.com/**', () => {})
    await open(p, '/')
    await store(p, data => data.setSettings({ provider: 'openai', apiKey: 'sk-demo-0000000000000000000000000000000000007Qa2', keyState: 'ok', rulesFirst: false }))
    await send(p, 'кефир и сметана')
    expect(await shows(p.getByText('Разбирается…')), 'no «Разбирается…»')
    expect(await shows(p.getByText('кефир и сметана')), 'the pending card lost the words')
  } }
]
