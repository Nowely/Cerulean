import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const caption = (p, name) => p.locator('section').filter({ has: p.getByRole('heading', { name: new RegExp(`^${name}`) }) })
const dots = (p, name) => p.getByRole('button', { name: `Действия с секцией «${name}»` })

async function setup(p) {
  await open(p, '/', false)
  await store(p, (data) => {
    const home = data.createSection('Дом')
    data.createSection('Личное')
    for (const page of data.livePages.filter(x => ['Покупки', 'Задачи'].includes(x.title))) {
      data.updatePage(page.id, { sectionId: home.id })
    }
  })
}

async function menu(p, name) {
  await dots(p, name).click()
  await p.getByRole('button', { name: 'Новая секция', exact: true }).waitFor()
}

async function exercise(p) {
  await setup(p)
  const home = caption(p, 'Дом')
  expect(await shows(home.getByRole('button', { name: 'Новая страница' })), 'section has no add button')
  await home.getByRole('button', { name: /^Дом/ }).click()
  expect(await shows(home.getByRole('button', { name: 'Дом · 2' })), 'folded count missing')
  expect(!(await shows(home.getByText('Покупки', { exact: true }))), 'folded pages visible')
  await home.getByRole('button', { name: /^Дом/ }).click()

  await menu(p, 'Дом')
  for (const name of ['Переименовать', 'Изменить порядок', 'Новая секция', 'Удалить секцию']) {
    expect(await shows(p.getByRole('button', { name, exact: true })), `missing ${name}`)
  }
  const popup = p.getByRole('button', { name: 'Удалить секцию', exact: true }).locator('..').locator('..')
  await p.waitForTimeout(250)
  const geometry = await popup.boundingBox()
  expect(Math.abs(geometry.width - 232) < 2, `menu width ${geometry.width}`)
  await home.getByRole('button', { name: /^Дом/ }).click()
  await p.getByRole('button', { name: 'Удалить секцию', exact: true }).waitFor({ state: 'hidden' })
  await home.getByRole('button', { name: /^Дом/ }).click()

  await menu(p, 'Дом')
  await p.getByRole('button', { name: 'Удалить секцию', exact: true }).click()
  expect(await shows(p.getByText('Секция Дом удалена, 2 страницы в Моих страницах')), 'delete notice missing')
  expect(!(await shows(p.getByRole('heading', { name: 'Дом', exact: true }))), 'section not removed')
  expect(await shows(caption(p, 'Мои страницы').getByText('Покупки', { exact: true })), 'moved page missing from My pages')
  await p.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(await shows(caption(p, 'Дом').getByText('Покупки', { exact: true })), 'undo did not restore page')
  const state = await store(p, data => ({
    sections: data.sectionList.map(s => s.name),
    pages: data.livePages.filter(x => x.sectionId === data.sectionList.find(s => s.name === 'Дом').id).map(x => x.title)
  }))
  expect(state.sections.join(',') === 'Дом,Личное', 'undo changed section order')
  expect(state.pages.includes('Покупки') && state.pages.includes('Задачи'), 'undo did not restore both pages')

  await menu(p, 'Мои страницы')
  expect(!(await shows(p.getByRole('button', { name: 'Удалить секцию', exact: true }))), 'system section has delete')
  await p.getByRole('button', { name: 'Новая секция', exact: true }).click()
  const input = p.getByRole('textbox', { name: 'Название секции' })
  await input.waitFor()
  const selected = await input.evaluate(el => el === document.activeElement && el.selectionStart === 0 && el.selectionEnd === el.value.length)
  expect(selected, 'new section name is not selected')
  await input.fill('Работа')
  await input.press('Enter')
  const names = await store(p, data => data.sectionList.map(s => s.name))
  expect(names.join(',') === 'Работа,Дом,Личное', 'new section not first')

  await menu(p, 'Дом')
  await p.getByRole('button', { name: 'Новая секция', exact: true }).click()
  await input.waitFor()
  await input.press('Escape')
  const namesAfterEscape = await store(p, data => data.sectionList.map(s => s.name))
  expect(namesAfterEscape.join(',') === 'Работа,Дом,Новая секция,Личное', 'new section position or Escape changed')

  await caption(p, 'Дом').getByRole('button', { name: 'Новая страница' }).click()
  const title = p.getByRole('textbox', { name: 'Название страницы' })
  await title.waitFor()
  expect(await title.evaluate(el => document.activeElement === el), 'new page title is not focused')
  await title.fill('Дача')
  await title.blur()
  expect(await store(p, data => data.livePages.some(x => x.title === 'Дача' && x.sectionId === data.sectionList.find(s => s.name === 'Дом').id)), 'new page outside section')
}

async function favorites(p) {
  await open(p, '/', false)
  await store(p, data => data.toggleFavorite({ kind: 'page', id: data.livePages.find(x => x.title === 'Идеи').id }))
  await menu(p, 'Избранное')
  await p.keyboard.press('Escape')
  await caption(p, 'Избранное').getByRole('button', { name: 'Новая страница' }).click()
  const title = p.getByRole('textbox', { name: 'Название страницы' })
  await title.waitFor()
  await title.fill('Избранная страница')
  await title.blur()
  expect(await store(p, data => data.livePages.some(x => x.title === 'Избранная страница' && x.sectionId === null && x.favorite !== null)), 'new favorite missing or has a section')
}

export default [
  { id: 'mf3-sections-phone', device: MOBILE, run: exercise },
  { id: 'mf3-sections-desktop', device: DESKTOP, run: exercise },
  { id: 'mf3-sections-favorite-phone', device: MOBILE, run: favorites },
  { id: 'mf3-sections-favorite-desktop', device: DESKTOP, run: favorites }
]
