// v23 delta, option colours, words and page icons: the «Check:» lines of items 12, 22, 23, 24 and 25 on the phone,
// and of D4, D5 and D6 on desktop
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')

/** A page from Главная (phone) or the sidebar (desktop) */
async function openPage(p, title) {
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/(p|r)\//)
  await p.waitForTimeout(500)
}

/** The page «⋯» and one of its rows: a sheet on the phone, a menu on desktop */
async function pageMenu(p, item) {
  await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
  await p.waitForTimeout(400)
  await p.getByRole('menuitem', { name: item }).or(p.getByRole('dialog').getByRole('button', { name: item })).first().click()
  await p.waitForTimeout(700)
}

/** A colour expression as the browser computes it, to compare with what an element shows */
const resolve = (p, expr, prop = 'color') => p.evaluate(([e, k]) => {
  const s = document.createElement('span')
  s.style[k] = e
  document.body.append(s)
  const out = getComputedStyle(s)[k]
  s.remove()
  return out
}, [expr, prop])

/** The colour of the first icon inside a locator */
const glyphColor = loc => loc.locator('.iconify').first().evaluate(el => getComputedStyle(el).color)

/** A pill's fill and text colour, by its name inside a locator */
const pillOf = (loc, name) => loc.locator('span.rounded-opt', { hasText: name }).first()
const pillColors = pill => pill.evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color])
async function isPill(p, pill, color) {
  if (!(await shows(pill))) return false
  const [bg, ink] = await pillColors(pill)
  return bg === await resolve(p, `var(--b-${color})`, 'backgroundColor') && ink === await resolve(p, `var(--c-${color}-ink)`)
}

/** The page tile next to the title: its fill and its glyph colour */
const tile = p => p.locator('main [aria-label="Значок страницы"] > span').first()
async function tileIs(p, color) {
  const t = tile(p)
  const bg = await t.evaluate(el => getComputedStyle(el).backgroundColor)
  const ink = await glyphColor(t)
  return bg === await resolve(p, `var(--b-${color ?? 'gray'})`, 'backgroundColor') && ink === await resolve(p, color ? `var(--c-${color})` : 'var(--muted)')
}

/** The composer chip's glyph */
const chipGlyph = p => glyphColor(p.getByRole('button', { name: /^Куда/ }).first())

/** Glyph colours of Главная's page rows (phone) or the sidebar's page rows (desktop), by title */
async function rowColors(p, titles, where) {
  const out = {}
  for (const t of titles) out[t] = await glyphColor(where.getByRole('link', { name: new RegExp(`^${t}`) }).first())
  return out
}

/** No screen in the app calls the words for Авто «описание» (v23, Josh 21 Oct 06:40) */
async function noDescription(p, where) {
  const text = await p.locator('body').innerText()
  expect(!/описани/i.test(text), `«описание» on ${where}`)
}

/** A word left only on buttons: every place it shows is (inside) a button */
async function onlyButtons(p, word, where) {
  const outside = await p.getByText(word, { exact: true }).evaluateAll(els => els.filter(e => e.checkVisibility() && !e.closest('button')).length)
  expect(!outside, `«${word}» outside a button on ${where}`)
}

const PAGES = ['Сегодня', 'Полумарафон к маю', 'Покупки', 'Дела по дому', 'Задачи', 'Цели', 'Идеи', 'Книги']

export default [
  // 12: «page «⋯» → «Значок и цвет» → type «маш» → the car; tap it → the page tile changes at once»
  { id: 'l-12-icon', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Идеи')
    await pageMenu(p, 'Значок и цвет')
    const sheet = p.getByRole('dialog', { name: 'Значок и цвет' })
    expect(await shows(sheet), 'no sheet «Значок и цвет»')
    expect(await sheet.getByText('Идеи', { exact: true }).count(), 'the sheet does not name the page')
    const icons = sheet.getByRole('group', { name: 'Значок' }).getByRole('button')
    expect(await icons.count() === 35, `${await icons.count()} icons, not 35`)
    const sizes = await icons.first().boundingBox()
    expect(sizes.height >= 48, `icon buttons are ${sizes.height} high`)
    const row = await icons.evaluateAll(els => els.slice(0, 7).map(e => Math.round(e.getBoundingClientRect().top)))
    expect(row.slice(0, 6).every(t => t === row[0]) && row[6] > row[0], 'not six icons to a row')
    const colours = sheet.getByRole('group', { name: 'Цвет' }).getByRole('button')
    expect((await colours.allInnerTexts()).length === 8, 'not eight colours')
    expect(await colours.first().getAttribute('aria-label') === 'Без цвета', '«Без цвета» is not first')
    expect(await colours.first().getAttribute('aria-pressed') === 'true', '«Без цвета» is not selected on a page without a colour')
    await sheet.getByRole('textbox', { name: 'Найти значок' }).fill('маш')
    const found = await icons.evaluateAll(els => els.map(e => e.getAttribute('aria-label')))
    expect(found.length === 1 && found[0] === 'Машина', `«маш» finds ${found.join(', ')}`)
    await icons.first().click()
    expect(await store(p, data => data.livePages.find(x => x.title === 'Идеи').glyph) === 'car', 'the icon did not change')
    expect(await sheet.isVisible(), 'the sheet closed after a tap')
    expect(await tile(p).locator('.iconify').first().evaluate(el => el.className.includes('car')), 'the tile did not change at once')
    await sheet.getByRole('textbox', { name: 'Найти значок' }).fill('ёлка')
    expect(await shows(sheet.getByText('Такого значка нет. Попробуй другое слово.')), 'no line when nothing is found')
  } },
  // D6/12 on desktop: a popover at the page «⋯», the search field ready for typing
  { id: 'l-12-icon-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Идеи')
    const more = p.getByRole('button', { name: 'Действия со страницей' }).first()
    await pageMenu(p, 'Значок и цвет')
    const pop = p.getByRole('dialog', { name: /^Значок и цвет/ })
    expect(await shows(pop), 'no popover «Значок и цвет»')
    const [a, b] = [await pop.boundingBox(), await more.boundingBox()]
    expect(a.y >= b.y + b.height - 2 && Math.abs(a.x + a.width - (b.x + b.width)) < 24, 'the popover is not at the page «⋯»')
    expect(await p.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Найти значок', 'the search field is not focused')
    await p.keyboard.type('маш')
    const icons = pop.getByRole('group', { name: 'Значок' }).getByRole('button')
    expect(await icons.count() === 1 && await icons.first().getAttribute('aria-label') === 'Машина', '«маш» does not find only the car')
    await icons.first().click()
    expect(await store(p, data => data.livePages.find(x => x.title === 'Идеи').glyph) === 'car', 'the icon did not change')
    expect(await pop.isVisible(), 'the popover closed after a click')
  } },

  // 25: «Главная → only Покупки (green basket) and Книги (purple book) are coloured, every other glyph grey; …»
  { id: 'l-25-grey', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const muted = await resolve(p, 'var(--muted)')
    const home = p.locator('main')
    const colors = await rowColors(p, PAGES, home)
    for (const t of PAGES) {
      const want = t === 'Покупки' ? await resolve(p, 'var(--c-green)') : t === 'Книги' ? await resolve(p, 'var(--c-purple)') : muted
      expect(colors[t] === want, `${t} on Главная is ${colors[t]}, not ${want}`)
    }
    await openPage(p, 'Задачи')
    expect(await tileIs(p, null), 'Задачи\'s tile is not neutral')
    expect(await chipGlyph(p) === muted, 'the chip\'s glyph is not grey on Задачи')
    await pageMenu(p, 'Значок и цвет')
    const sheet = p.getByRole('dialog', { name: 'Значок и цвет' })
    const colour = n => sheet.getByRole('group', { name: 'Цвет' }).getByRole('button', { name: n })
    expect(await colour('Без цвета').getAttribute('aria-pressed') === 'true', '«Без цвета» is not selected')
    await colour('Синий').click()
    await p.waitForTimeout(300)
    expect(await tileIs(p, 'blue'), 'the tile did not turn blue')
    expect(await chipGlyph(p) === await resolve(p, 'var(--c-blue)'), 'the chip\'s glyph did not turn blue')
    await colour('Без цвета').click()
    await p.waitForTimeout(300)
    expect(await tileIs(p, null), 'the tile is not neutral again')
    await colour('Синий').click()
    await p.keyboard.press('Escape')
    await p.goBack()
    await p.waitForTimeout(600)
    expect((await rowColors(p, ['Задачи'], home))['Задачи'] === await resolve(p, 'var(--c-blue)'), 'Задачи on Главная did not turn blue')
    // The chip keeps its accent-ink label; Покупки shows its green basket
    await openPage(p, 'Покупки')
    expect(await chipGlyph(p) === await resolve(p, 'var(--c-green)'), 'the chip on Покупки is not green')
    // A Поиск hit keeps the muted glyph
    // Back on Главная before the tap: under load the first tap could land on Покупки's header on its way out
    await p.goBack()
    await p.waitForURL(u => new URL(u).pathname === '/')
    const box = p.getByRole('searchbox', { name: 'Найти' })
    await p.getByRole('button', { name: 'Найти' }).first().click()
    if (!await shows(box)) await p.getByRole('button', { name: 'Найти' }).first().click()
    await box.fill('Покупки')
    await p.waitForTimeout(500)
    const hit = p.getByRole('dialog').getByRole('button', { name: /^Покупки/ }).first()
    expect(await shows(hit), 'no Поиск hit for «Покупки»')
    expect(await glyphColor(hit) === muted, 'a Поиск hit is coloured')
  } },
  // D6: «Главная and the sidebar → only Покупки (green) and Книги (purple) coloured; …»
  { id: 'l-25-grey-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    const muted = await resolve(p, 'var(--muted)')
    const want = async t => t === 'Покупки' ? resolve(p, 'var(--c-green)') : t === 'Книги' ? resolve(p, 'var(--c-purple)') : muted
    const home = await rowColors(p, PAGES, p.locator('main'))
    for (const t of PAGES) expect(home[t] === await want(t), `${t} on Главная is ${home[t]}`)
    // The sidebar lists the pages once a page is open
    await openPage(p, 'Цели')
    const side = p.locator('aside[aria-label="Навигация"]')
    const colors = await rowColors(p, PAGES, side)
    for (const t of PAGES) expect(colors[t] === await want(t), `${t} in the sidebar is ${colors[t]}`)
    expect(await tileIs(p, null), 'Цели\'s tile is not neutral')
    expect(await chipGlyph(p) === muted, 'the chip\'s glyph is not grey on Цели')
    await openPage(p, 'Книги')
    expect(await tileIs(p, 'purple'), 'Книги\'s tile is not purple')
    await pageMenu(p, 'Значок и цвет')
    const pop = p.getByRole('dialog', { name: /^Значок и цвет/ })
    const colours = pop.getByRole('group', { name: 'Цвет' }).getByRole('button')
    expect(await colours.first().getAttribute('aria-label') === 'Без цвета', '«Без цвета» is not first')
    expect(await pop.getByRole('button', { name: 'Фиолетовый' }).getAttribute('aria-pressed') === 'true', 'purple is not selected on Книги')
    await colours.first().click()
    await p.waitForTimeout(300)
    expect(await tileIs(p, null), 'the tile is not neutral after «Без цвета»')
    expect((await rowColors(p, ['Книги'], side))['Книги'] === muted, 'Книги in the sidebar is not grey')
    expect(await chipGlyph(p) === muted, 'the chip is not grey')
  } },

  // 22: «Покупки → the captions … are yellow, blue, green and purple pills; …»
  { id: 'l-22-pills', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Покупки')
    const main = p.locator('main')
    const captions = [['Хлеб и выпечка', 'yellow'], ['Молочное', 'blue'], ['Овощи и фрукты', 'green'], ['Бытовая химия', 'purple']]
    for (const [name, color] of captions) {
      expect(await isPill(p, pillOf(main.locator('h3'), name), color), `the caption «${name}» is not a ${color} pill`)
    }
    // The grouped-by property never shows in its rows
    expect(!(await main.locator('li span.rounded-opt').count()), 'a row shows the property it is grouped by')
    // The editor: the same pill with the name typed inside, no dot; a tap puts the caret in and opens 8 colours
    await pageMenu(p, 'Свойства')
    await p.getByRole('button', { name: 'Изменить «Отдел»' }).click()
    await p.waitForTimeout(500)
    expect(!(await p.getByRole('button', { name: /^Цвет варианта/ }).count()), 'an option still has its colour dot')
    const names = await p.locator('input[aria-label="Название варианта"]').evaluateAll(els => els.map(e => e.value))
    expect(names.includes('Молочное'), 'no option «Молочное» in the editor')
    const milk = p.locator('input[aria-label="Название варианта"]').nth(names.indexOf('Молочное'))
    const pill = milk.locator('xpath=..')
    expect(await pill.evaluate(el => getComputedStyle(el).backgroundColor) === await resolve(p, 'var(--b-blue)', 'backgroundColor'), 'the editor\'s «Молочное» is not its blue pill')
    await pill.click()
    expect(await milk.evaluate(el => el === document.activeElement), 'a tap on the pill does not put the caret in it')
    const teal = p.getByRole('button', { name: 'Бирюзовый' })
    expect(await shows(teal), 'no colours under the option')
    await teal.first().click()
    await p.waitForTimeout(300)
    expect(await isPill(p, pillOf(main.locator('h3'), 'Молочное'), 'teal'), 'the caption did not turn teal at once')
    await p.keyboard.press('Escape')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    // Яйца: «Отдел» is the «Молочное» pill (teal now)
    await p.getByRole('button', { name: /^Яйца/ }).first().click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(500)
    expect(await isPill(p, pillOf(p.locator('main'), 'Молочное'), 'teal'), 'Яйца\'s «Отдел» is not the «Молочное» pill')
  } },
  { id: 'l-22-board', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Цели')
    await p.getByRole('tab', { name: 'По статусу' }).click()
    await p.waitForTimeout(500)
    const main = p.locator('main')
    for (const n of ['В процессе', 'Достигнута', 'Отложена']) {
      expect(await pillOf(main, n).count(), `the column «${n}» is not a pill`)
    }
    const columns = main.getByRole('tablist').filter({ has: p.locator('span.rounded-opt') })
    const none = columns.getByRole('tab', { name: /^Без статуса/ })
    if (await none.count()) expect(!(await none.locator('span.rounded-opt').count()), '«Без статуса» is a pill')
    const raised = await columns.locator('[aria-selected="true"]').first().evaluate(el => getComputedStyle(el).backgroundColor)
    expect(raised === await resolve(p, 'var(--seg-on)', 'backgroundColor'), 'the selected column is not raised')
    await p.getByRole('tab', { name: 'Список' }).click()
    await p.waitForTimeout(400)
    const row = main.locator('li', { hasText: 'Полумарафон к маю' }).first()
    expect(await isPill(p, pillOf(row, 'В процессе'), await store(p, (data) => {
      const pg = data.livePages.find(x => x.title === 'Цели')
      const st = pg.props.find(x => x.name === 'Статус')
      const o = st.options.find(x => x.name === 'В процессе')
      return o.color ?? ['green', 'blue', 'brown', 'yellow', 'pink', 'purple', 'gray', 'teal'][st.options.indexOf(o) % 8]
    })), 'Полумарафон к маю does not show the «В процессе» pill')
  } },
  // D4: «Покупки → yellow, blue, green, purple caption pills; drag Порошок over «Молочное» → a ring round the pill; …»
  { id: 'l-22-pills-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Покупки')
    const main = p.locator('main')
    for (const [name, color] of [['Хлеб и выпечка', 'yellow'], ['Молочное', 'blue'], ['Овощи и фрукты', 'green'], ['Бытовая химия', 'purple']]) {
      expect(await isPill(p, pillOf(main.locator('h3'), name), color), `the caption «${name}» is not a ${color} pill`)
    }
    // Drag Порошок by its handle over «Молочное»: the pill keeps its colours and takes the accent ring
    const row = main.locator('li', { hasText: 'Порошок' }).first()
    await row.hover()
    const grip = row.locator('[style*="grab"]').first()
    const g = await grip.boundingBox()
    const target = await pillOf(main.locator('h3'), 'Молочное').boundingBox()
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
    await p.mouse.down()
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      await p.mouse.move(g.x + g.width / 2, g.y + (target.y + 30 - g.y) * i / steps)
      await p.waitForTimeout(30)
    }
    await p.waitForTimeout(300)
    const ring = await pillOf(main.locator('h3'), 'Молочное').evaluate(el => getComputedStyle(el).boxShadow)
    const accent = await resolve(p, 'var(--accent)')
    await p.keyboard.press('Escape')
    await p.mouse.up()
    expect(ring.includes(accent), `no accent ring round «Молочное» as a drop target (${ring})`)
    expect(await isPill(p, pillOf(main.locator('h3'), 'Молочное'), 'blue'), 'the drop target lost its colours')
    // The editor types the name inside the pill at 13px
    await pageMenu(p, 'Свойства')
    await p.getByRole('button', { name: 'Изменить «Отдел»' }).click()
    await p.waitForTimeout(500)
    const size = await p.locator('input[aria-label="Название варианта"]').first().evaluate(el => getComputedStyle(el).fontSize)
    expect(size === '13px', `the option is typed at ${size}`)
  } },

  // 23: «Покупки «⋯» → the row «Что сюда класть» shows «еда, напитки, бытовая х…»; …»
  { id: 'l-23-words', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    expect(await p.getByRole('button', { name: /^Куда: Авто/ }).count(), 'the chip on Главная does not read «Авто»')
    await noDescription(p, 'Главная')
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.waitForTimeout(500)
    const sheet = p.getByRole('dialog')
    const row = sheet.getByRole('button', { name: /^Что сюда класть/ })
    expect(await shows(row), 'no row «Что сюда класть» in the page «⋯»')
    expect((await row.innerText()).includes('еда, напитки, бытовая'), 'the row does not show the words')
    await noDescription(p, 'the page «⋯»')
    await row.click()
    expect(await shows(p.getByRole('dialog', { name: /^Что сюда класть: Покупки/ })), 'no «Что сюда класть: Покупки»')
    await noDescription(p, 'the «Что сюда класть» editor')
    await p.keyboard.press('Escape')
    // «Запомнить» after an Уточнение answered with Задачи
    await open(p, '/journal')
    const card = p.locator('main').getByText('Куда положить «подарок маме на др»?').locator('xpath=ancestor::*[.//button[contains(., "Ещё")]][1]')
    await card.getByRole('button', { name: 'Задачи', exact: true }).click()
    const line = p.getByText('Запомнить: такое класть в «Задачи».')
    expect(await shows(line), 'no «Запомнить» line')
    await line.locator('..').getByRole('button', { name: 'Запомнить' }).click()
    expect(await shows(p.getByText('Запомнено: такое класть в «Задачи».')), 'no «Запомнено: такое класть в «Задачи».»')
    await noDescription(p, 'Журнал')
    // Настройки: «Раскладка» first, ending with «Что класть на страницы · 6 из 6»
    await open(p, '/settings')
    const first = await p.locator('main h2').first().innerText()
    expect(first.trim() === 'Раскладка', `the first group is «${first}»`)
    const rows = p.locator('section[aria-labelledby="s-auto"]')
    expect((await rows.innerText()).includes('Что класть на страницы'), 'no «Что класть на страницы»')
    expect((await rows.innerText()).includes('По этим словам решается, куда положить запись'), 'no line 2 of «Что класть на страницы»')
    expect(/6 из 6/.test(await rows.innerText()), 'no «6 из 6»')
    await noDescription(p, 'Настройки')
    await p.getByText('Что класть на страницы').first().click()
    await p.waitForURL(/descriptions/)
    await p.waitForTimeout(400)
    await noDescription(p, '«Что класть на страницы»')
    // A new page asks «Что сюда класть?» with its one helper line
    await open(p, '/')
    await p.getByRole('button', { name: 'Действия с Главной' }).click()
    await p.waitForTimeout(400)
    await p.getByRole('dialog').getByRole('button', { name: 'Новая страница' }).click()
    await p.waitForURL(/\/p\//)
    expect(await shows(p.getByText('Что сюда класть?')), 'no «Что сюда класть?» on a new page')
    expect(await p.getByText('По этим словам сюда попадут подходящие записи.').count(), 'no helper line on a new page')
    await noDescription(p, 'a new page')
    // The picker of the composer: Авто «разложится по страницам» with nothing typed
    await open(p, '/')
    await p.getByRole('button', { name: /^Куда: / }).click()
    await p.waitForTimeout(500)
    expect(await shows(p.getByRole('dialog').getByText('разложится по страницам')), 'no «разложится по страницам» under Авто')
    await noDescription(p, 'the page picker')
  } },
  // D5: «Покупки → the aside reads «Что сюда класть»; Настройки → the first group «Раскладка», «6 из 6 ›» → a page → «Что сюда класть: …»; …»
  { id: 'l-23-words-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await openPage(p, 'Покупки')
    expect(await shows(p.getByRole('heading', { name: 'Что сюда класть' })), 'the aside does not read «Что сюда класть»')
    await noDescription(p, 'Покупки')
    await open(p, '/settings')
    expect((await p.locator('main h2').first().innerText()).trim() === 'Раскладка', 'the first group is not «Раскладка»')
    await p.getByRole('button', { name: /6 из 6/ }).click()
    await p.waitForTimeout(400)
    expect(await p.getByRole('columnheader', { name: 'Что сюда класть' }).count(), 'no column «Что сюда класть»')
    await p.getByRole('button', { name: 'Изменить «Что сюда класть»: Покупки' }).click()
    expect(await shows(p.getByRole('dialog', { name: /^Что сюда класть: Покупки/ })), 'no dialog «Что сюда класть: Покупки»')
    await noDescription(p, 'Настройки')
  } },

  // 24: «Задачи → tabs «Список · Календарь · Сделано»; tap «Сделано» → …»
  { id: 'l-24-done', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Задачи')
    const tabs = await p.getByRole('tab').allInnerTexts()
    expect(tabs.join(' · ') === 'Список · Календарь · Сделано', `Задачи's tabs are ${tabs.join(' · ')}`)
    await p.getByRole('tab', { name: 'Сделано' }).click()
    await p.waitForTimeout(400)
    const main = p.locator('main')
    expect(await shows(main.getByRole('heading', { name: 'Сделано', exact: true })), 'no caption «Сделано»')
    const struck = await main.getByText('Отправить документы').first().evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(struck.includes('line-through'), '«Отправить документы» is not struck through')
    expect(await main.getByRole('button', { name: 'Очистить сделанное' }).count(), 'no «Очистить сделанное»')
    await onlyButtons(p, 'Готово', 'Задачи')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.waitForTimeout(500)
    // v24 item 8: «Фильтр» is a row that names the filter and opens it
    const filter = p.getByRole('dialog').getByRole('button', { name: /^Фильтр/ })
    expect((await filter.innerText()).includes('Сделано'), '«Настроить вид» does not say «Фильтр · Сделано»')
    await onlyButtons(p, 'Готово', '«Настроить вид» on «Сделано»')
    await p.keyboard.press('Escape')
    // Полумарафон к маю: «3 сделано ›»
    await open(p, '/')
    await openPage(p, 'Полумарафон к маю')
    expect(await shows(p.getByRole('button', { name: /^3 сделано/ })), 'no «3 сделано ›»')
    // Покупки keeps its words
    await open(p, '/')
    await openPage(p, 'Покупки')
    const shop = await p.getByRole('tab').allInnerTexts()
    expect(shop.join(' · ') === 'Купить · Запасы · Куплено', `Покупки's tabs are ${shop.join(' · ')}`)
    // A new page with a checkbox: «Список · Сделано»; Входящие too
    await open(p, '/')
    await openPage(p, 'Входящие')
    const inbox = await p.getByRole('tab').allInnerTexts()
    expect(!inbox.length || inbox.join(' · ') === 'Список · Сделано', `Входящие's tabs are ${inbox.join(' · ')}`)
    const made = await store(p, (data) => {
      const pg = data.createFromTemplate('goal', { title: 'Проверка' })
      return pg.views.map(v => v.name).join(' · ')
    })
    expect(made === 'Список · Сделано', `a new page with a checkbox has ${made}`)
    // The Доска hint names «Сделано»
    await open(p, '/')
    await openPage(p, 'Идеи')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await p.getByRole('radio', { name: 'Доска' }).or(p.getByRole('button', { name: 'Доска' })).first().click()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    expect(await shows(p.getByText('например «Надо», «В процессе», «Сделано».')), 'the Доска hint does not name «Сделано»')
  } },
  // 24: a page stored with «Готово» reads as «Сделано» with no step over the data
  { id: 'l-24-old-data', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await store(p, (data) => {
      const pg = data.livePages.find(x => x.title === 'Задачи')
      data.updatePage(pg.id, { views: pg.views.map(v => v.name === 'Сделано' ? { ...v, name: 'Готово' } : v) })
    })
    await p.waitForTimeout(800)
    await p.reload()
    await p.waitForSelector('main')
    await p.waitForTimeout(500)
    await openPage(p, 'Задачи')
    expect(await p.getByRole('tab', { name: 'Сделано' }).count(), 'a stored «Готово» does not read as «Сделано»')
    expect(!(await p.getByRole('tab', { name: 'Готово' }).count()), 'the tab still reads «Готово»')
  } },
  // D5: «Полумарафон к маю → «3 сделано ›»; Дела по дому → «Список · Сделано»»
  { id: 'l-24-done-desk', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Дела по дому')
    const tabs = await p.getByRole('tab').allInnerTexts()
    expect(tabs.join(' · ') === 'Список · Сделано', `Дела по дому's tabs are ${tabs.join(' · ')}`)
    await openPage(p, 'Полумарафон к маю')
    expect(await shows(p.getByRole('button', { name: /^3 сделано/ })), 'no «3 сделано ›»')
  } }
]
