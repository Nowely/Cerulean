import { DESKTOP, MOBILE, expect, store } from './lib.mjs'
import { first, goPage } from './main-flow.mjs'

const heading = (p, name) => p.locator('h2[class]').filter({ hasText: new RegExp(`^${name}$`) })
const row = (p, name) => p.getByRole('button', { name: new RegExp(`^${name}\\s`) })
const check = (p, name) => p.getByRole('checkbox', { name: new RegExp(`^${name}`) })
const slider = p => p.getByRole('button', { name: 'Фильтр и сортировка', exact: true })

async function start(p, collects) {
  await first(p)
  await store(p, (data, collecting) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    const other = data.livePages.find(x => x.title === 'Задачи')
    data.updatePage(page.id, {
      props: [...page.props,
        { id: 'mf3-colour', name: 'Цвет тест', type: 'select', options: [{ id: 'mf3-red', name: 'Красный', color: 'pink' }, { id: 'mf3-blue', name: 'Синий', color: 'blue' }] },
        { id: 'mf3-room', name: 'Комната тест', type: 'select', options: [{ id: 'mf3-kitchen', name: 'Кухня' }, { id: 'mf3-hall', name: 'Зал' }] }],
      views: page.views.map((v, i) => i ? v : { ...v, ...(collecting ? { from: 'all' } : {}) })
    })
    data.addRecord({ pageId: page.id, text: 'Красный кухня', values: { 'mf3-colour': 'mf3-red', 'mf3-room': 'mf3-kitchen' } })
    data.addRecord({ pageId: page.id, text: 'Синий кухня', values: { 'mf3-colour': 'mf3-blue', 'mf3-room': 'mf3-kitchen' } })
    data.addRecord({ pageId: page.id, text: 'Синий зал', values: { 'mf3-colour': 'mf3-blue', 'mf3-room': 'mf3-hall' } })
    data.addRecord({ pageId: other.id, text: 'Другая кухня', values: { 'mf3-colour': 'mf3-red', 'mf3-room': 'mf3-kitchen' } })
  }, collects)
  await goPage(p, 'Покупки')
}

async function filterFlow(p, { theme, collects }) {
  await p.emulateMedia({ colorScheme: theme })
  await start(p, collects)
  expect(await p.evaluate(() => document.documentElement.classList.contains('dark')) === (theme === 'dark'), `theme is not ${theme}`)
  const before = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views)
  await slider(p).click()
  await heading(p, 'Фильтр и сортировка').waitFor()
  await row(p, 'Куплено').waitFor()
  await row(p, 'Срок').waitFor()
  if (collects) {
    expect(await p.getByRole('group', { name: 'Сортировка: По сроку' }).getAttribute('aria-disabled') === 'true', 'collecting sort changed')
  } else {
    const sort = p.getByRole('combobox', { name: 'Сортировка' })
    await sort.focus()
    await p.keyboard.press('Enter')
    await p.getByRole('option', { name: 'По названию' }).click()
  }
  await row(p, 'Куплено').click()
  await heading(p, 'Куплено').waitFor()
  expect(await p.getByRole('radio', { name: 'Не куплено' }).isChecked(), 'wrong done choice')
  await p.getByRole('radio', { name: 'Все', exact: true }).check()
  await p.getByRole('radio', { name: 'Не куплено' }).check()
  await p.getByRole('button', { name: 'Назад', exact: true }).click()
  await heading(p, 'Фильтр и сортировка').waitFor()
  await row(p, 'Цвет тест').click()
  await heading(p, 'Цвет тест').waitFor()
  const red = check(p, 'Красный')
  const redLabel = red.locator('..')
  expect((await redLabel.innerText()).trim().endsWith(collects ? '2' : '1'), 'wrong count')
  const color = await redLabel.locator('span').first().evaluate(el => getComputedStyle(el).backgroundColor)
  expect(color !== 'rgba(0, 0, 0, 0)', 'option has no colour')
  await red.focus()
  await p.keyboard.press('Space')
  await check(p, 'Синий').check()
  await p.getByRole('button', { name: 'Готово', exact: true }).click()
  await heading(p, 'Цвет тест').waitFor({ state: 'hidden' })
  await slider(p).click()
  await row(p, 'Комната тест').click()
  await check(p, 'Кухня').check()
  if (p.viewportSize().width >= 900) await p.keyboard.press('Escape')
  else await p.getByRole('button', { name: 'Назад', exact: true }).click()
  await heading(p, 'Фильтр и сортировка').waitFor()
  await row(p, 'Срок').click()
  await check(p, 'Без срока').check()
  await p.getByRole('button', { name: 'Готово', exact: true }).click()
  await heading(p, 'Фильтр и сортировка').waitFor({ state: 'hidden' })
  const chip = p.getByRole('button', { name: 'Цвет тест: Красный, Синий', exact: true })
  await chip.waitFor()
  await p.waitForTimeout(250)
  expect((await slider(p).getAttribute('class')).includes('text-accent-ink'), 'sliders not accented')
  const colors = await slider(p).evaluate((el) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--accent-ink)'
    el.appendChild(probe)
    const result = [getComputedStyle(el).color, getComputedStyle(probe).color]
    probe.remove()
    return result
  })
  expect(colors[0] === colors[1], `sliders do not use accent ink: ${colors}; ${await slider(p).getAttribute('class')}; expanded=${await slider(p).getAttribute('aria-expanded')}`)
  const rows = collects ? p.locator('[data-collect-row]') : p.locator('[data-row-text]')
  const names = await rows.allTextContents()
  expect(names.some(s => s.includes('Красный кухня')) && names.some(s => s.includes('Синий кухня')) && !names.some(s => s.includes('Синий зал')), `wrong filtered rows: ${names}`)
  expect(names.some(s => s.includes('Другая кухня')) === collects, 'wrong collecting source')
  await chip.click()
  await heading(p, 'Цвет тест').waitFor()
  expect(await red.isChecked(), 'chip did not open selected values')
  await p.getByRole('button', { name: 'Готово', exact: true }).click()
  await heading(p, 'Цвет тест').waitFor({ state: 'hidden' })
  await p.getByRole('tab', { name: 'Запасы' }).click()
  expect(await chip.count() === 0, 'filter followed another view')
  await p.getByRole('tab', { name: 'Купить' }).click()
  await chip.waitFor()
  await p.getByRole('button', { name: 'Убрать фильтр Цвет тест: Красный, Синий' }).click()
  expect(await chip.count() === 0, 'chip not removed')
  let saved = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views)
  expect(!saved[0].selectFilters['mf3-colour'] && saved[0].selectFilters['mf3-room'][0] === 'mf3-kitchen', 'remove changed another filter')
  expect(JSON.stringify(saved[0].filter) === JSON.stringify(before[0].filter) && JSON.stringify(saved[0].stock) === JSON.stringify(before[0].stock), 'legacy or stock rules changed')
  await slider(p).click()
  await p.getByRole('button', { name: 'Сбросить', exact: true }).click()
  await p.getByRole('button', { name: 'Готово', exact: true }).click()
  expect(!(await slider(p).getAttribute('class')).includes('text-accent-ink'), 'sliders still accented after reset')
  await p.waitForTimeout(300)
  await p.reload()
  await p.locator('main').waitFor()
  await p.getByRole('tab', { name: 'Купить' }).waitFor()
  await p.waitForTimeout(300)
  saved = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views)
  expect(!Object.keys(saved[0].selectFilters ?? {}).length && !(saved[0].dues ?? []).length, 'reset did not persist')
  expect(saved[0].sort === (collects ? before[0].sort : 'name'), 'sorting did not persist')
  await p.getByRole('tab', { name: 'Купить' }).click()
  await heading(p, 'Настроить вид').waitFor()
  await p.getByRole('button', { name: /^Фильтр: / }).click()
  await heading(p, 'Фильтр и сортировка').waitFor()
  await p.getByRole('button', { name: 'Назад', exact: true }).click()
  await heading(p, 'Настроить вид').waitFor()
}

async function staleChoices(p) {
  await start(p, false)
  await store(p, (data) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    data.updatePage(page.id, { views: page.views.map((v, i) => i ? v : { ...v, selectFilters: { 'mf3-colour': ['gone'], 'removed': ['old'] } }) })
  })
  await slider(p).click()
  await row(p, 'Цвет тест').click()
  expect(await p.getByRole('checkbox', { name: 'Удалённый вариант: gone' }).isChecked(), 'stale option hidden')
  await p.getByRole('button', { name: 'Назад', exact: true }).click()
  await p.getByRole('button', { name: 'Удалённое свойство: removed', exact: true }).click()
  expect(await p.getByRole('checkbox', { name: 'Удалённый вариант: old' }).isChecked(), 'stale property hidden')
  await p.getByRole('button', { name: 'Назад', exact: true }).click()
  const saved = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views[0].selectFilters)
  expect(JSON.stringify(saved) === JSON.stringify({ 'mf3-colour': ['gone'], 'removed': ['old'] }), 'viewing cleaned stale filters')
  await p.getByRole('button', { name: 'Сбросить', exact: true }).click()
  const cleared = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views[0].selectFilters)
  expect(!Object.keys(cleared).length, 'explicit reset did not clear stale filters')
}

async function stockSettings(p) {
  await start(p, false)
  await store(p, (data) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    data.updatePage(page.id, { stocks: [] })
  })
  await p.getByRole('tab', { name: 'Купить' }).click()
  await heading(p, 'Настроить вид').waitFor()
  await p.getByRole('button', { name: 'Включить запасы', exact: true }).click()
  await p.getByRole('heading', { name: 'Включить запасы?' }).waitFor()
  await p.getByRole('button', { name: 'Отмена', exact: true }).click()
  await p.getByRole('button', { name: 'Включить запасы', exact: true }).waitFor()
  const before = await store(p, data => data.livePages.find(x => x.title === 'Покупки').views)
  await p.getByRole('button', { name: 'Включить запасы', exact: true }).click()
  await p.getByRole('button', { name: 'Включить', exact: true }).click()
  await p.getByRole('button', { name: 'Новое свойство', exact: true }).waitFor()
  const after = await store(p, data => data.livePages.find(x => x.title === 'Покупки'))
  expect(after.stocks.length === 1 && after.views.length === before.length + 2, 'stock setup did not create views')
  expect(JSON.stringify(after.views.slice(0, before.length)) === JSON.stringify(before), 'stock setup changed existing views')
}

async function askingCollect(p, from) {
  await start(p, true)
  await store(p, (data, from) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    const other = data.livePages.find(x => x.title === 'Задачи')
    data.updatePage(page.id, { views: page.views.map((v, i) => i ? v : { ...v, from, ...(from === 'pick' ? { pages: [page.id, other.id] } : {}) }) })
    data.addRecord({ pageId: page.id, text: 'Уточнить первый', tags: ['clarify'] })
    data.addRecord({ pageId: other.id, text: 'Уточнить второй', tags: ['clarify'] })
    data.addRecord({ pageId: other.id, text: 'Обычный второй' })
  }, from)
  const views = () => store(p, data => data.livePages.find(x => x.title === 'Покупки').views)
  const before = await views()
  expect(!before[0].asking, 'asking was initially enabled')
  await slider(p).click()
  const asking = p.getByRole('checkbox', { name: 'Ждут уточнения', exact: true })
  expect(!(await asking.isChecked()), 'asking starts selected')
  expect(JSON.stringify(await views()) === JSON.stringify(before), 'opening the filter changed a view')
  await asking.check()
  let saved = await views()
  expect(saved[0].asking === true && JSON.stringify(saved.slice(1)) === JSON.stringify(before.slice(1)), 'asking did not stay on its view')
  const names = await p.locator('[data-collect-row]').allTextContents()
  expect(names.some(s => s.includes('Уточнить первый')) && names.some(s => s.includes('Уточнить второй')) && !names.some(s => s.includes('Обычный второй')), `wrong collected clarification rows: ${names}`)
  await store(p, data => data.flush())
  await p.reload()
  await p.getByRole('tab', { name: 'Купить' }).waitFor()
  await slider(p).click()
  expect(await asking.isChecked(), 'asking did not survive reload')
  saved = await views()
  expect(saved[0].from === from && saved[0].asking === true && JSON.stringify(saved[0].filter) === JSON.stringify(before[0].filter), 'reload changed collecting settings')
  await p.getByRole('button', { name: 'Сбросить', exact: true }).click()
  expect(!(await asking.isChecked()), 'reset did not clear asking')
  expect((await p.locator('[data-collect-row]').allTextContents()).some(s => s.includes('Обычный второй')), 'reset did not restore ordinary rows')
  await store(p, data => data.flush())
  await p.reload()
  await p.getByRole('tab', { name: 'Купить' }).waitFor()
  await slider(p).click()
  expect(!(await asking.isChecked()), 'reset did not survive reload')
  saved = await views()
  expect(saved[0].from === from && JSON.stringify(saved[0].stock) === JSON.stringify(before[0].stock) && JSON.stringify(saved.slice(1)) === JSON.stringify(before.slice(1)), 'reset changed stock or another view')
}

async function askingOrdinary(p) {
  await start(p, false)
  const views = () => store(p, data => data.livePages.find(x => x.title === 'Покупки').views)
  const before = await views()
  await slider(p).click()
  const asking = p.getByRole('checkbox', { name: 'Ждут уточнения', exact: true })
  expect(await asking.count() === 0, 'ordinary view gained a clarification row')
  expect(JSON.stringify(await views()) === JSON.stringify(before), 'opening the ordinary view changed its settings')
  await store(p, (data) => {
    const page = data.livePages.find(x => x.title === 'Покупки')
    data.updatePage(page.id, { views: page.views.map((v, i) => i ? v : { ...v, asking: true }) })
  })
  expect(await asking.isChecked(), 'a previously saved ordinary filter cannot be cleared')
  await asking.click()
  expect(await asking.count() === 0 && !(await views())[0].asking, 'cleared ordinary filter still shows')
}

export default [
  { id: 'mf3-filter-phone-light', device: MOBILE, run: p => filterFlow(p, { theme: 'light', collects: false }) },
  { id: 'mf3-filter-phone-dark', device: MOBILE, run: p => filterFlow(p, { theme: 'dark', collects: true }) },
  { id: 'mf3-filter-desktop-light', device: DESKTOP, run: p => filterFlow(p, { theme: 'light', collects: true }) },
  { id: 'mf3-filter-desktop-dark', device: DESKTOP, run: p => filterFlow(p, { theme: 'dark', collects: false }) },
  { id: 'mf3-filter-phone-stale', device: MOBILE, run: staleChoices },
  { id: 'mf3-filter-desktop-stale', device: DESKTOP, run: staleChoices },
  { id: 'mf3-filter-phone-stock-settings', device: MOBILE, run: stockSettings },
  { id: 'mf3-filter-desktop-stock-settings', device: DESKTOP, run: stockSettings },
  ...[MOBILE, DESKTOP].flatMap((device, i) => [
    ...['all', 'pick'].map(from => ({ id: `mf3-filter-${i ? 'desktop' : 'phone'}-asking-${from}`, device, run: p => askingCollect(p, from) })),
    { id: `mf3-filter-${i ? 'desktop' : 'phone'}-asking-ordinary`, device, run: askingOrdinary }
  ])
]
