// v21 delta and the app-only QA bugs
import { BASE, DESKTOP, MOBILE, expect, open, pageOf, send, shows, store } from './lib.mjs'

export default [
  // 2, 7: receipts stay on Журнал's composer, off the main flow
  { id: 'v21-2', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    await send(p, 'молоко')
    await p.getByRole('button', { name: /^Отменить/ }).first().click()
    await p.waitForTimeout(400)
    expect(await p.getByText(/только эта запись/).count(), 'the guess line does not say «только эта запись»')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(400)
    await send(p, 'позвонить маме')
    expect(await pageOf(p, 'позвонить маме') === 'Задачи', `«позвонить маме» went to ${await pageOf(p, 'позвонить маме')}`)
  } },
  { id: 'v21-7', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
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
    await p.goto(`${BASE}/journal`)
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
    // v23 (F9): at rest «и» is glued to the next word with a no-break space
    expect((await title.inputValue()).replace(/\u00a0/g, ' ') === 'Идеи и мысли', 'Esc did not put the old title back')
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
    // v22: the property editor took the inline form's place, with the same guarantee
    await p.getByRole('textbox', { name: 'Название', exact: true }).fill('Статус')
    await p.getByRole('radio', { name: 'Выбор' }).click()
    expect(await p.getByRole('button', { name: 'Создать' }).isDisabled(), '«Создать» works with no options')
    await p.getByRole('button', { name: 'Вариант', exact: true }).click()
    await p.keyboard.type('Новая')
    expect(await p.getByRole('button', { name: 'Создать' }).isEnabled(), '«Создать» stays off with options')
  } },
  { id: 'B18', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Меню Главной' }).click()
    await p.locator('[data-home-menu]').getByRole('menuitem', { name: 'Корзина' }).click()
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
