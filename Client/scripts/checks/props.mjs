// v22 item 30: «Свойства» and «Свойство», «+ Свойство» on a record, and the weight of what they do
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

/** «Свойства» from the page «⋯», then one property's editor */
async function editor(p, name) {
  await open(p, '/')
  await p.getByRole('link', { name: /^Покупки/ }).first().click()
  await p.waitForURL(/\/p\//)
  await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
  await p.getByRole('dialog').or(p.getByRole('menu')).getByText(/^Свойства/).first().click()
  await p.getByRole('button', { name: `Изменить «${name}»` }).click()
  await p.waitForTimeout(500)
}

/** The notice: at the sheet's foot while a sheet is open, else above the composer */
const toast = (p, text) => p.locator('[data-notice]', { hasText: text }).first()

/** Records of Покупки with a value of Отдел (or with one option of it) */
const usage = (p, option) => store(p, (data, o) => {
  const page = data.livePages.find(x => x.title === 'Покупки')
  const dept = page.props.find(x => x.name === 'Отдел')
  const id = o ? dept.options.find(x => x.name === o).id : null
  return data.liveRecords.filter(r => r.pageId === page.id && (id ? r.values[dept.id] === id : r.values[dept.id] != null)).length
}, option)

const forms = n => n % 10 === 1 && n % 100 !== 11 ? 'запись' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'записи' : 'записей'

export default [
  { id: 'props-30-create', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Идеи/ }).first().click()
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.getByRole('button', { name: 'Новое свойство' }).click()
    await p.getByRole('textbox', { name: 'Название', exact: true }).fill('Статус')
    await p.getByRole('radio', { name: 'Выбор' }).click()
    const create = p.getByRole('button', { name: 'Создать' })
    expect(await create.isDisabled(), '«Создать» works with no options')
    expect(await shows(p.getByText('Нужен хотя бы один вариант')), 'no «Нужен хотя бы один вариант»')
    await p.getByRole('button', { name: 'Вариант', exact: true }).click()
    expect(await create.isDisabled(), '«Создать» works with an empty option')
    await p.keyboard.type('Новая')
    expect(await create.isEnabled(), '«Создать» stays off with an option')
    await create.click()
    expect(await shows(p.getByRole('dialog').getByText('Справа в строке')), '«Создать» did not go back to «Настроить вид»')
    expect(await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Идеи')
      const prop = page.props.find(x => x.name === 'Статус')
      return prop?.options.length === 1 && page.views.some(v => v.shown.includes(prop.id))
    }), 'the new property is not on in «Справа в строке»')
  } },
  { id: 'props-weight-option', device: MOBILE, run: async (p) => {
    await editor(p, 'Отдел')
    const n = await usage(p, 'Бытовая химия')
    await p.getByRole('button', { name: 'Удалить вариант «Бытовая химия»' }).click()
    const line = `Вариант «Бытовая химия» удалён, ${n} ${forms(n)} без отдела`
    expect(await shows(toast(p, line)), `no toast «${line}»`)
    expect(await toast(p, line).getByRole('button', { name: 'Отменить', includeHidden: true }).count(), 'the toast has no «Отменить»')
    await toast(p, line).locator('button', { hasText: 'Отменить' }).click()
    expect(await shows(p.getByRole('button', { name: 'Удалить вариант «Бытовая химия»' })), '«Отменить» did not bring the option back')
    expect(await usage(p, 'Бытовая химия') === n, '«Отменить» did not bring the values back')
    expect(await p.getByRole('dialog').count(), '«Отменить» closed the sheet')
  } },
  { id: 'props-weight-delete', device: MOBILE, run: async (p) => {
    await editor(p, 'Отдел')
    const n = await usage(p)
    await p.getByRole('button', { name: 'Удалить свойство' }).click()
    expect(await shows(p.getByText('Удалить «Отдел»?')), 'deleting a property with values does not ask')
    expect(await p.getByText(`Значения пропадут у ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'записи' : 'записей'}.`).count(), `the question does not name ${n}`)
    await p.getByRole('button', { name: 'Удалить', exact: true }).click()
    expect(await shows(toast(p, 'Свойство «Отдел» удалено')), 'no toast «Свойство «Отдел» удалено»')
    await toast(p, 'Свойство «Отдел» удалено').locator('button', { hasText: 'Отменить' }).click()
    expect(await usage(p) === n, '«Отменить» did not bring the values back')
    // A property without values goes at once
    await p.getByRole('button', { name: 'Новое свойство' }).click()
    await p.getByRole('textbox', { name: 'Название', exact: true }).fill('Магазин')
    await p.getByRole('button', { name: 'Создать' }).click()
    await p.getByRole('button', { name: 'Изменить «Магазин»' }).click()
    await p.getByRole('button', { name: 'Удалить свойство' }).click()
    expect(!(await p.getByText('Удалить «Магазин»?').count()), 'an empty property asks before it goes')
  } },
  { id: 'props-desk-record', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Покупки/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.getByRole('button', { name: 'Хлеб', exact: true }).first().click()
    await p.waitForURL(/\/r\//)
    await p.getByRole('button', { name: 'Свойство', exact: true }).click()
    const menu = p.getByRole('dialog')
    expect(await shows(menu.getByRole('button', { name: /Новое свойство/ })), 'no «Новое свойство…»')
    expect(!(await menu.getByRole('button', { name: /^Отдел/ }).count()), 'Отдел is offered though the record shows it')
    await menu.getByRole('button', { name: /^Осталось/ }).click()
    await p.waitForTimeout(400)
    const field = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    expect(field === 'Осталось', `the picked property did not open its field (focus on ${field})`)
    await p.keyboard.type('2,5')
    await p.keyboard.press('Enter')
    expect(await shows(p.getByRole('button', { name: 'Осталось: 2,5 шт. Изменить' })), 'the number did not save as «2,5 шт»')
  } }
]
