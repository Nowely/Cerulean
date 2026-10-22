// v24 delta, pages that collect records: the «Check:» lines of items 7–11, 17–21, 23–27, 30 and D1, D4, D5, D8
// («Откуда записи», «Фильтр», the rows of a collecting view, its composer, «На неделе», summaries that never cut a
// name, one demo world)
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')
const PHONE_320 = { ...MOBILE, viewport: { width: 320, height: 640 } }

/** Text as read, the glued short words (NBSP) read as plain spaces */
const plain = s => (s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
const desktop = p => p.viewportSize().width >= 1024

async function start(p, path = '/') {
  await p.clock.install({ time: NOW })
  await open(p, path)
}

async function openPage(p, title) {
  await start(p)
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(500)
}

/** «⋯» of the page → one of its rows */
async function pageMenu(p, item) {
  await p.getByRole('button', { name: 'Действия со страницей' }).last().click()
  await p.waitForTimeout(500)
  const row = desktop(p) ? p.getByRole('menuitem', { name: item }) : p.getByRole('dialog').getByRole('button', { name: item })
  await row.first().click()
  await p.waitForTimeout(900)
}

/** The rows of «⋯» of the page, read and closed again */
async function menuRows(p) {
  await p.getByRole('button', { name: 'Действия со страницей' }).last().click()
  await p.waitForTimeout(500)
  const rows = desktop(p)
    ? await p.getByRole('menuitem').allInnerTexts()
    : await p.getByRole('dialog').getByRole('button').allInnerTexts()
  await p.keyboard.press('Escape')
  await p.waitForTimeout(500)
  return rows.map(plain)
}

/** The collecting rows on screen: text, line 2 and the right column */
const collectRows = p => p.locator('[data-collect-row]').evaluateAll(rows => rows.map((r) => {
  const t = s => (s?.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  const button = r.querySelector('button.flex-col')
  return { text: t(button?.children[0]), home: t(button?.children[1]), end: t(r.querySelector('button.flex-col + span')), note: !!r.querySelector('[aria-label="есть заметка"]') }
}))

/** The «Фильтр» row of «Настроить вид», as its words read */
const filterRow = async p => plain((await p.getByRole('button', { name: /^Фильтр: / }).getAttribute('aria-label')).replace(/^Фильтр: /, ''))

/** Closes the sheet or popover on top */
async function closeTop(p) {
  await p.keyboard.press('Escape')
  await p.waitForTimeout(800)
}

const SEVEN = [
  ['Оплатить интернет', 'Задачи', 'было вчера'],
  ['Позвонить стоматологу', 'Задачи', 'сегодня, 10:00'],
  ['Пробежка 6 км', 'Полумарафон к маю', 'сегодня, 19:00'],
  ['Поменять фильтр воды', 'Дела по дому', 'ср'],
  ['Вызвать мастера', 'Дела по дому', 'пт'],
  ['Длинная пробежка 14 км', 'Полумарафон к маю', 'сб'],
  ['Вернуть книгу в библиотеку', 'Задачи', 'вс']
]

/** The summary under a page's name on Главная */
const summaryOf = (p, title) => p.evaluate((t) => {
  const row = [...document.querySelectorAll('main [role="listitem"]')].find(li => li.querySelector('a span.truncate')?.textContent.trim() === t)
  const col = row?.querySelector('a span.flex-col')
  const line = col && col.children.length > 1 ? col.lastElementChild : null
  return line ? { text: line.textContent, cut: [...line.querySelectorAll('span')].some(s => s.scrollWidth > s.clientWidth + 1) } : null
}, title)

const SUMMARIES_390 = {
  'Сегодня': '3 дела · оплатить интернет +2',
  'Задачи': '3 дела · оплатить интернет +2',
  'На неделе': '7 дел · оплатить интернет +6',
  'Покупки': '6 купить · хлеб, молоко, сыр +3',
  'Дела по дому': '2 дела · поменять фильтр воды, вызвать мастера'
}

/** The collecting view of На неделе, from the store */
const weekView = p => store(p, d => d.livePages.find(x => x.title === 'На неделе').views[0])

export default [
  // 7: «Задачи → «Настроить вид» shows «Откуда записи» under «Название вида», with «Эта страница» selected. Tap «Все
  // страницы»: the rows behind become records from every page, and the notice sits at the sheet's foot with no row
  // under it. «Отменить» brings back Задачи's own rows»
  { id: 'c24-07-from', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    await pageMenu(p, 'Настроить вид')
    const sheet = p.getByRole('dialog')
    const order = await sheet.evaluate((el) => {
      const caps = [...el.querySelectorAll('p, span')].map(x => x.textContent.trim())
      return [caps.indexOf('Название вида'), caps.indexOf('Откуда записи'), caps.indexOf('Как показывать')]
    })
    expect(order[0] >= 0 && order[0] < order[1] && order[1] < order[2], `«Откуда записи» sits under «Название вида»: ${order}`)
    expect(await sheet.getByRole('radio', { name: 'Эта страница' }).getAttribute('aria-checked') === 'true', '«Эта страница» is not selected')
    await sheet.getByRole('radio', { name: 'Все страницы' }).click()
    await p.waitForTimeout(700)
    const rows = (await collectRows(p)).map(r => r.text)
    expect(rows.includes('Поменять фильтр воды') && rows.includes('Пробежка 6 км'), `the rows are not from every page: ${rows}`)
    const notice = sheet.locator('[data-notice]')
    expect(await shows(notice), 'no notice at the sheet\'s foot')
    expect(plain(await notice.innerText()).startsWith('Вид «Список»: записи со всех страниц'), `notice: ${await notice.innerText()}`)
    // Nothing of the sheet's rows lies under the notice: the scroll area ends above it
    const over = await sheet.evaluate((el) => {
      const n = el.querySelector('[data-notice]').getBoundingClientRect()
      const area = el.querySelector('.fade-foot')
      return !area || area.getBoundingClientRect().bottom > n.top + 1
    })
    expect(!over, 'the scroll area runs under the notice')
    await notice.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(600)
    expect((await collectRows(p)).length === 0, 'Задачи still collects after «Отменить»')
    expect(await store(p, d => d.livePages.find(x => x.title === 'Задачи').views[0].from ?? 'self') === 'self', 'the view is not back to «Эта страница»')
  } },
  // 7: «Сегодня offers no «Откуда записи» anywhere»
  { id: 'c24-07-today', device: MOBILE, run: async (p) => {
    await openPage(p, 'Сегодня')
    const rows = await menuRows(p)
    expect(!rows.some(r => r.startsWith('Настроить вид')), `Сегодня's «⋯»: ${rows}`)
    expect(!(await p.getByRole('radio', { name: 'Все страницы' }).count()), 'Сегодня offers «Откуда записи»')
  } },
  // 8: «На неделе → «Настроить вид» → «Фильтр» opens «Фильтр» / «вид «Список»». «Просрочено» and «На неделе» are
  // ticked, «Не сделано» is selected, and «Ждут уточнения» is off. There is no «‹». Tap outside: «Настроить вид» is
  // back with «Фильтр · Просрочено · На неделе · не сделано»»
  { id: 'c24-08-filter', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    expect(await filterRow(p) === 'Просрочено · На неделе · не сделано', `the select reads «${await filterRow(p)}»`)
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(1200)
    const sheet = p.getByRole('dialog').filter({ has: p.locator('h2', { hasText: 'Фильтр' }) })
    const head = plain(await sheet.locator('h2[class]').first().innerText())
    const sub = plain(await sheet.locator('h2[class] + p').first().innerText())
    expect(head === 'Фильтр' && sub === 'вид «Список»', `the sheet reads «${head}» / «${sub}»`)
    const pressed = async name => (await sheet.getByRole('button', { name, exact: true }).getAttribute('aria-pressed')) === 'true'
    expect(await pressed('Просрочено') && await pressed('На неделе') && !(await pressed('Сегодня')), 'Срок chips are not «Просрочено», «На неделе»')
    expect(await sheet.getByRole('radio', { name: 'Не сделано' }).getAttribute('aria-checked') === 'true', '«Не сделано» is not selected')
    expect(!(await pressed('Ждут уточнения')), '«Ждут уточнения» is on')
    expect(!(await sheet.getByRole('button', { name: 'Назад' }).count()), 'the phone sheet has a «‹»')
    // A tap outside, above the sheet
    await p.mouse.click(200, 60)
    await p.waitForTimeout(1500)
    expect(await shows(p.getByRole('dialog').getByText('Настроить вид')), '«Настроить вид» is not back')
    expect(await filterRow(p) === 'Просрочено · На неделе · не сделано', `the select reads «${await filterRow(p)}»`)
  } },
  // 8: «On Задачи, set «Срок · Сегодня»: only «Позвонить стоматологу» stays»
  { id: 'c24-08-own', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(1200)
    await p.getByRole('dialog').getByRole('button', { name: 'Сегодня', exact: true }).click()
    await p.waitForTimeout(400)
    await closeTop(p)
    await closeTop(p)
    const rows = (await p.locator('[data-row-text]').allInnerTexts()).map(plain)
    expect(rows.length === 1 && rows[0].startsWith('Позвонить стоматологу'), `Задачи shows ${rows}`)
    const stored = await store(p, d => d.livePages.find(x => x.title === 'Задачи').views[0].dues)
    expect(JSON.stringify(stored) === '["today"]', `stored per page and view: ${JSON.stringify(stored)}`)
  } },
  // 9: «open На неделе. There are no captions, just seven rows in this order … Tap Поменять фильтр воды: its preview
  // opens over На неделе, and closing it returns there»
  { id: 'c24-09-rows', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    const rows = await collectRows(p)
    const got = rows.map(r => [r.text, r.home, r.end])
    expect(JSON.stringify(got) === JSON.stringify(SEVEN), `rows: ${JSON.stringify(got)}`)
    expect(rows.filter(r => r.note).map(r => r.text).join() === 'Вернуть книгу в библиотеку', 'the note glyph is not on Вернуть книгу alone')
    expect(!(await p.locator('[data-rows] h3').count()), 'the list has captions')
    const url = p.url()
    await p.getByRole('button', { name: /^Поменять фильтр воды/ }).click()
    await p.waitForTimeout(800)
    expect(/peek=r/.test(p.url()) && p.url().split('?')[0] === url.split('?')[0], `the preview is not over На неделе: ${p.url()}`)
    await p.goBack()
    await p.waitForTimeout(600)
    expect(!/peek=/.test(p.url()) && /\/p\//.test(p.url()), `closing does not return to На неделе: ${p.url()}`)
  } },
  // 10: «На неделе: the chip reads «Авто», the placeholder «Запись на неделю». Its picker has no «Эта страница» …
  // Type a text Авто files to Дела по дому: the line reads «→ Дела по дому · завтра». Send. A fresh row · «Дела по
  // дому» · «завтра» shows right after «Пробежка 6 км», the header counts «8 дел со всех страниц», and Дела по дому has
  // the record due завтра». The mockups type «купить лампочки», which this app's rules file to Покупки: «повесить
  // полку» is a line they file to Дела по дому
  { id: 'c24-10-composer', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    const hint = await field.evaluate(e => e.getAttribute('aria-placeholder') ?? e.getAttribute('placeholder'))
    expect(hint === 'Запись на неделю', `placeholder «${hint}»`)
    const chip = p.getByRole('button', { name: /^Куда: / })
    expect(plain(await chip.innerText()) === 'Авто', `the chip reads «${await chip.innerText()}»`)
    await chip.click()
    await p.waitForTimeout(900)
    const picker = p.getByRole('dialog')
    expect(!(await picker.getByRole('button', { name: /^Эта страница/ }).count()), 'the picker offers «Эта страница»')
    expect(!(await picker.getByText('Шаблоны').count()), 'the picker offers «Шаблоны»')
    expect(!(await picker.getByRole('button', { name: /^На неделе/ }).count()), 'the picker offers На неделе itself')
    await closeTop(p)
    await field.fill('повесить полку')
    await p.waitForTimeout(600)
    const line = p.locator('form').locator('xpath=preceding-sibling::p').last()
    expect(plain(await line.innerText()) === '→ Дела по дому · завтра', `the line reads «${await line.innerText()}»`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(1200)
    const rows = await collectRows(p)
    const at = rows.findIndex(r => r.text === 'Повесить полку')
    expect(at === 3 && rows[2].text === 'Пробежка 6 км', `Повесить полку is row ${at}: ${rows.map(r => r.text)}`)
    expect(rows[at].home === 'Дела по дому' && rows[at].end === 'завтра', `the row reads ${JSON.stringify(rows[at])}`)
    expect(await p.locator('[data-collect-row].fresh-tint').count() === 1, 'the new row has no fresh tint')
    const head = plain(await p.locator('h1 + * , p.text-meta').filter({ hasText: 'со всех страниц' }).first().innerText())
    expect(head.startsWith('8 дел со всех страниц'), `the header reads «${head}»`)
    const rec = await store(p, (d) => {
      const r = Object.values(d.records).find(x => x.text === 'Повесить полку')
      return r && { page: d.pages[r.pageId].title, due: r.due?.date }
    })
    expect(rec?.page === 'Дела по дому' && rec.due === '2026-10-20', `the record: ${JSON.stringify(rec)}`)
  } },
  // 10: «A day named in the text wins over the filter's: «забрать посылку в четверг» shows «чт»»
  { id: 'c24-10-own-day', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    await field.fill('забрать посылку в четверг')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(1500)
    const row = (await collectRows(p)).find(r => r.text.startsWith('Забрать посылку'))
    expect(row?.end === 'чт', `the row reads ${JSON.stringify(row)}`)
  } },
  // 11: «On «Ремонт на кухне» tap the «На неделе» starter. … «Что сюда класть?» go, the header reads «7 дел со всех
  // страниц · 1 просрочено», the chip reads «Авто». Tap «Задачи» instead: the lines and the field are back»
  { id: 'c24-11-starter', device: MOBILE, run: async (p) => {
    await start(p)
    const id = await store(p, d => d.createPage({ title: 'Ремонт на кухне' }).id)
    await open(p, `/p/${id}`, false)
    await p.waitForTimeout(400)
    expect(await shows(p.getByText('Что сюда класть?')), 'a new page has no «Что сюда класть?»')
    await p.getByRole('button', { name: 'На неделе', exact: true }).click()
    await p.waitForTimeout(700)
    expect(!(await p.getByText('Что сюда класть?').count()), '«Что сюда класть?» stays on a collecting page')
    const head = plain(await p.locator('p').filter({ hasText: 'со всех страниц' }).first().innerText())
    expect(head === '7 дел со всех страниц · 1 просрочено', `the header reads «${head}»`)
    expect(plain(await p.getByRole('button', { name: /^Куда: / }).innerText()) === 'Авто', 'the chip is not «Авто»')
    expect(await store(p, (d, pid) => d.pages[pid].title, id) === 'Ремонт на кухне', 'the title changed')
    await p.getByRole('button', { name: 'Задачи', exact: true }).click()
    await p.waitForTimeout(700)
    expect(await shows(p.getByText('Что сюда класть?')), 'the field is not back after «Задачи»')
    expect(!(await p.locator('[data-collect-row]').count()), 'Задачи still collects')
  } },
  // 11: «Главная: Избранное lists Сегодня, Полумарафон к маю, На неделе. На неделе's row reads «7 дел · оплатить
  // интернет +6», with no status word beside its name»
  { id: 'c24-11-home', device: MOBILE, run: async (p) => {
    await start(p)
    const fav = await p.evaluate(() => {
      const sec = [...document.querySelectorAll('main section')].find(s => s.querySelector('h2, h3, button')?.textContent.includes('Избранное'))
      return [...(sec?.querySelectorAll('[role="listitem"] a span.flex-col > span:first-child > span:first-child') ?? [])].map(s => s.textContent.trim()).filter(Boolean)
    })
    expect(JSON.stringify(fav.slice(0, 3)) === JSON.stringify(['Сегодня', 'Полумарафон к маю', 'На неделе']), `Избранное: ${fav}`)
    const week = await summaryOf(p, 'На неделе')
    expect(plain(week?.text) === '7 дел · оплатить интернет +6', `На неделе reads «${week?.text}»`)
    const badge = await p.evaluate(() => {
      const row = [...document.querySelectorAll('main [role="listitem"]')].find(li => li.querySelector('a span.truncate')?.textContent.trim() === 'На неделе')
      return row.querySelector('a span.flex-col > span:first-child').textContent.replace(/\s+/g, ' ').trim()
    })
    expect(badge === 'На неделе', `a status beside На неделе: «${badge}»`)
  } },
  // 17: «Главная at 390 reads: Сегодня «3 дела · оплатить интернет +2»; Задачи …; На неделе …; Покупки …; Дела по
  // дому …. No summary ends in «…», at 390 or at 320. Сегодня's own page reads «3 дела со всех страниц · 1 просрочено»»
  { id: 'c24-17-summaries', device: MOBILE, run: async (p) => {
    await start(p)
    for (const [title, want] of Object.entries(SUMMARIES_390)) {
      const got = await summaryOf(p, title)
      expect(plain(got?.text) === want && !got.cut, `${title} reads «${got?.text}»${got?.cut ? ', cut' : ''}`)
    }
    await p.getByRole('link', { name: /^Сегодня/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(500)
    const sub = plain(await p.locator('p').filter({ hasText: 'со всех страниц' }).first().innerText())
    expect(sub === '3 дела со всех страниц · 1 просрочено', `Сегодня reads «${sub}»`)
  } },
  { id: 'c24-17-summaries-320', device: PHONE_320, run: async (p) => {
    await start(p)
    const cut = await p.evaluate(() => [...document.querySelectorAll('main [role="listitem"] a span.flex-col > span:last-child')]
      .filter(l => [...l.querySelectorAll('span')].some(s => s.scrollWidth > s.clientWidth + 1) || l.textContent.includes('…'))
      .map(l => l.textContent))
    expect(!cut.length, `cut at 320: ${cut}`)
  } },
  // D4: «Сегодня reads «3 дела · оплатить интернет, позвонить стоматологу, пробежка 6 км». На неделе reads «7 дел ·
  // оплатить интернет, позвонить стоматологу, пробежка 6 км +4». Задачи reads «3 дела · …, вернуть книгу в библиотеку»»
  { id: 'c24-d4-summaries', device: DESKTOP, run: async (p) => {
    await start(p)
    const want = {
      'Сегодня': '3 дела · оплатить интернет, позвонить стоматологу, пробежка 6 км',
      'На неделе': '7 дел · оплатить интернет, позвонить стоматологу, пробежка 6 км +4',
      'Задачи': '3 дела · оплатить интернет, позвонить стоматологу, вернуть книгу в библиотеку'
    }
    for (const [title, line] of Object.entries(want)) {
      const got = await summaryOf(p, title)
      expect(plain(got?.text) === line && !got.cut, `${title} reads «${got?.text}»`)
    }
  } },
  // 18: «Сегодня shows «На неделе · 4 ›». Open it: ср, пт, сб, вс in that order, each with its home page on line 2.
  // Дела по дому: «Поменять фильтр воды · ср, 21 окт», «Вызвать мастера · пт, 23 окт»»
  { id: 'c24-18-world', device: MOBILE, run: async (p) => {
    await openPage(p, 'Сегодня')
    const fold = p.getByRole('button', { name: /^На неделе/ })
    expect(plain(await fold.innerText()) === 'На неделе · 4', `the fold reads «${await fold.innerText()}»`)
    await fold.click()
    await p.waitForTimeout(400)
    const week = await p.locator('section[aria-label="На неделе"]').evaluate(s => [...s.querySelectorAll('button.flex-col')].map(b => [...b.children].map(c => c.textContent.replace(/\u00a0/g, ' ').trim()).concat(b.parentElement.lastElementChild.textContent.trim())))
    const ends = week.map(r => r.at(-1))
    expect(JSON.stringify(ends) === JSON.stringify(['ср', 'пт', 'сб', 'вс']), `the fold holds ${JSON.stringify(week)}`)
    expect(JSON.stringify(week.map(r => r[1])) === JSON.stringify(['Дела по дому', 'Дела по дому', 'Полумарафон к маю', 'Задачи']), `line 2: ${JSON.stringify(week)}`)
    await open(p, '/')
    await p.getByRole('link', { name: /^Дела по дому/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(500)
    const rows = (await p.locator('[data-row-text]').evaluateAll(rs => rs.map(r => `${r.textContent.trim()} · ${r.nextElementSibling?.textContent.trim()}`))).map(plain)
    expect(rows.includes('Поменять фильтр воды · ср, 21 окт') && rows.includes('Вызвать мастера · пт, 23 окт'), `Дела по дому: ${rows}`)
  } },
  // 19: «На неделе → «Фильтр» → untick «Просрочено». Six rows remain, without Оплатить интернет»
  // 30: «In «Фильтр» untick «На неделе»: one row, Оплатить интернет. Tick it again: seven»
  { id: 'c24-19-week-chip', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(1200)
    const sheet = p.getByRole('dialog')
    await sheet.getByRole('button', { name: 'Просрочено', exact: true }).click()
    await p.waitForTimeout(400)
    let rows = (await collectRows(p)).map(r => r.text)
    expect(rows.length === 6 && !rows.includes('Оплатить интернет'), `without «Просрочено»: ${rows}`)
    await sheet.getByRole('button', { name: 'Просрочено', exact: true }).click()
    await sheet.getByRole('button', { name: 'На неделе', exact: true }).click()
    await p.waitForTimeout(400)
    rows = (await collectRows(p)).map(r => r.text)
    expect(rows.join() === 'Оплатить интернет', `without «На неделе»: ${rows}`)
    await sheet.getByRole('button', { name: 'На неделе', exact: true }).click()
    await p.waitForTimeout(400)
    expect((await collectRows(p)).length === 7, 'ticked again, not seven')
  } },
  // 20: «Tap «Сегодня»: three ticked. Close the sheet: the select reads «Просрочено · Сегодня · На неделе · не
  // сделано». Tap «Любой»: only «Любой» is selected, and the list holds every open record, dated or not. Tick
  // «Просрочено», then untick it: «Любой» again»
  { id: 'c24-20-multi', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(1200)
    const chip = name => p.getByRole('dialog').getByRole('button', { name, exact: true })
    await chip('Сегодня').click()
    await p.waitForTimeout(300)
    const ticked = await p.getByRole('dialog').locator('button[aria-pressed="true"]').allInnerTexts()
    expect(ticked.map(plain).join() === 'Просрочено,Сегодня,На неделе', `ticked: ${ticked}`)
    await closeTop(p)
    expect(await filterRow(p) === 'Просрочено · Сегодня · На неделе · не сделано', `the select reads «${await filterRow(p)}»`)
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(1200)
    await chip('Любой').click()
    await p.waitForTimeout(400)
    const on = await p.getByRole('dialog').locator('button[aria-pressed="true"]').allInnerTexts()
    expect(on.map(plain).join() === 'Любой', `after «Любой»: ${on}`)
    const rows = (await collectRows(p)).map(r => r.text)
    expect(rows.includes('Записаться на забег') && rows.includes('Хлеб'), `«Любой» holds ${rows.length} rows: ${rows}`)
    await chip('Просрочено').click()
    await chip('Просрочено').click()
    await p.waitForTimeout(300)
    expect((await chip('Любой').getAttribute('aria-pressed')) === 'true', '«Любой» does not come back')
  } },
  // 21: «На неделе: «Оплатить интернет» has «Задачи» and «было вчера» in muted, and «1 просрочено» in the header is
  // the only warn-coloured text. Задачи: «было вчера» is warn»
  { id: 'c24-21-one-warn', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    const look = await p.evaluate(() => {
      const warn = document.querySelector('main p .text-warn')
      const row = document.querySelector('[data-collect-row]')
      const home = row.querySelector('button.flex-col').children[1]
      const end = row.querySelector('button.flex-col + span')
      const others = [...document.querySelectorAll('main *')].filter(el => el !== warn && el.children.length === 0 && el.textContent.trim()
        && getComputedStyle(el).color === getComputedStyle(warn).color)
      return { warn: warn?.textContent.trim(), weight: getComputedStyle(warn).fontWeight, homeColor: getComputedStyle(home).color, endColor: getComputedStyle(end).color, endWeight: getComputedStyle(end).fontWeight, warnColor: getComputedStyle(warn).color, others: others.map(o => o.textContent.trim()) }
    })
    expect(look.warn === '1 просрочено' && look.weight === '500', `the header's warn: ${JSON.stringify(look)}`)
    expect(look.homeColor === look.endColor && look.endColor !== look.warnColor && look.endWeight === '500', `«было вчера» is not muted 500: ${JSON.stringify(look)}`)
    expect(!look.others.length, `other warn text: ${look.others}`)
    await open(p, '/')
    await p.getByRole('link', { name: /^Задачи/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(500)
    const late = p.getByText('было вчера').first()
    expect(await late.evaluate(el => el.classList.contains('text-warn')), 'Задачи\'s «было вчера» is not warn')
  } },
  // 23: «На неделе → «Настроить вид» → «Сортировка · По сроку», not changeable. Long-press a row: its menu opens and
  // nothing lifts»
  { id: 'c24-23-by-date', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    const sort = p.getByRole('group', { name: 'Сортировка: По сроку' })
    expect(await sort.getAttribute('aria-disabled') === 'true', '«Сортировка» is not fixed')
    expect(!(await p.getByRole('dialog').locator('select, [role="combobox"]').filter({ hasText: 'По сроку' }).count()), '«По сроку» is a select')
    await closeTop(p)
    const row = p.locator('[data-collect-row]').nth(3)
    const box = await row.boundingBox()
    // A long press with a touch pointer
    await row.dispatchEvent('pointerdown', { button: 0, pointerType: 'touch', clientX: box.x + 200, clientY: box.y + box.height / 2 })
    await p.waitForTimeout(700)
    const lifted = await p.locator('[data-lifted]').count()
    await row.dispatchEvent('pointerup', { button: 0, pointerType: 'touch' })
    await p.waitForTimeout(800)
    expect(!lifted, 'a row lifted')
    const sheet = p.getByRole('dialog')
    expect(await shows(sheet.getByRole('button', { name: 'Открыть' })), 'the row\'s menu did not open')
    expect(await sheet.getByRole('heading').first().innerText().then(plain) === 'Поменять фильтр воды', 'the menu is not the row\'s')
    // Item 28's words, as every record menu says them
    const rows = await sheet.getByRole('button').evaluateAll(bs => bs.map(b => b.innerText.replace(/\s+/g, ' ').trim()))
    expect(rows.includes('Переместить на другую страницу') && !rows.includes('Переместить'), `the row's menu reads ${rows.join(' / ')}`)
  } },
  // 23: «Задачи → «Настроить вид»: «Заметка» is on, and Вернуть книгу в библиотеку shows the note glyph. Switch it
  // off and the glyph goes. Задачи's own «Сортировка» stays «Вручную»»
  { id: 'c24-23-note', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    const glyph = () => p.locator('[data-row-text]').filter({ hasText: 'Вернуть книгу' }).locator('xpath=..').locator('[aria-label="есть заметка"]').count()
    expect(await glyph() === 1, 'Вернуть книгу shows no note glyph')
    await pageMenu(p, 'Настроить вид')
    const sw = p.getByRole('switch', { name: 'Заметка' })
    expect(await sw.getAttribute('aria-checked') === 'true', '«Заметка» is off')
    expect(plain(await p.getByRole('dialog').getByText('Вручную').first().innerText()) === 'Вручную', '«Сортировка» is not «Вручную»')
    await sw.click()
    await p.waitForTimeout(400)
    await closeTop(p)
    expect(await glyph() === 0, 'the glyph stays with «Заметка» off')
  } },
  // 24: «Задачи → «Выбранные». The picker does not open, and the row reads «Страницы · 1 ›». Tap it: «Откуда записи»
  // with Задачи checked and Входящие under «Системные». Tap Дела по дому: checked, the picker stays, and the row reads
  // «Страницы · 2 ›»»
  { id: 'c24-24-picked', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('radio', { name: 'Выбранные' }).click()
    await p.waitForTimeout(1200)
    const row = p.getByRole('button', { name: /^Страницы/ })
    expect(plain(await row.innerText()) === 'Страницы 1', `the row reads «${await row.innerText()}»`)
    expect(!(await p.getByRole('dialog').locator('h2', { hasText: 'Откуда записи' }).count()), 'the picker opened')
    await row.click()
    await p.waitForTimeout(1500)
    const picker = p.getByRole('dialog')
    expect(plain(await picker.locator('h2').first().innerText()) === 'Откуда записи', 'the picker is not «Откуда записи»')
    expect(plain(await picker.locator('h2[class] + p').first().innerText()) === 'вид «Список»', 'the picker has no «вид «Список»»')
    expect(await picker.getByRole('button', { name: /^Задачи/ }).first().getAttribute('aria-pressed') === 'true', 'Задачи is not checked')
    const system = await picker.locator('section[aria-label="Системные"]').innerText()
    expect(plain(system).includes('Входящие'), 'Входящие is not under «Системные»')
    expect(!(await picker.locator('section[aria-label="Открыто недавно"]').filter({ hasText: 'Входящие' }).count()), 'Входящие is among the recent')
    await picker.getByRole('button', { name: /^Дела по дому/ }).first().click()
    await p.waitForTimeout(500)
    expect(await shows(p.getByRole('dialog').locator('h2').filter({ hasText: 'Откуда записи' })), 'the picker closed on a tap')
    expect(await p.getByRole('dialog').getByRole('button', { name: /^Дела по дому/ }).first().getAttribute('aria-pressed') === 'true', 'Дела по дому is not checked')
    await closeTop(p)
    await p.waitForTimeout(800)
    expect(plain(await p.getByRole('button', { name: /^Страницы/ }).innerText()) === 'Страницы 2', 'the row does not count two')
  } },
  // 24: «На неделе → «Выбранные»: the picker opens at once with nothing checked, and На неделе is not in it. Close
  // it: «Страницы · не выбраны ›». Pick Задачи and Дела по дому instead: «Страницы · 2 ›», and the header reads «5 дел
  // с 2 страниц»»
  { id: 'c24-24-none', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('radio', { name: 'Выбранные' }).click()
    await p.waitForTimeout(1800)
    const picker = p.getByRole('dialog')
    expect(plain(await picker.locator('h2').first().innerText()) === 'Откуда записи', 'the picker did not open at once')
    expect(!(await picker.locator('[aria-pressed="true"]').count()), 'something is checked')
    expect(!(await picker.getByRole('button', { name: /^На неделе/ }).count()), 'На неделе is offered to itself')
    await closeTop(p)
    await p.waitForTimeout(800)
    expect(plain(await p.getByRole('button', { name: /^Страницы/ }).innerText()) === 'Страницы не выбраны', 'the row does not read «не выбраны»')
    await p.getByRole('button', { name: /^Страницы/ }).click()
    await p.waitForTimeout(1500)
    await p.getByRole('dialog').getByRole('button', { name: /^Задачи/ }).first().click()
    await p.getByRole('dialog').getByRole('button', { name: /^Дела по дому/ }).first().click()
    await p.waitForTimeout(300)
    await closeTop(p)
    await p.waitForTimeout(800)
    expect(plain(await p.getByRole('button', { name: /^Страницы/ }).innerText()) === 'Страницы 2', 'the row does not count two')
    await closeTop(p)
    const head = plain(await p.locator('p').filter({ hasText: 'страниц' }).first().innerText())
    expect(head.startsWith('5 дел с 2 страниц'), `the header reads «${head}»`)
  } },
  // 25: «На неделе «⋯» has no «Что сюда класть». Switch its view to «Эта страница»: the row is back with «не задано».
  // Задачи «⋯» has the row»
  { id: 'c24-25-what-goes', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    expect(!(await menuRows(p)).some(r => r.startsWith('Что сюда класть')), 'На неделе has «Что сюда класть»')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('radio', { name: 'Эта страница' }).click()
    await p.waitForTimeout(500)
    await closeTop(p)
    expect((await menuRows(p)).some(r => r.startsWith('Что сюда класть') && r.includes('не задано')), 'the row is not back with «не задано»')
    await open(p, '/')
    await p.getByRole('link', { name: /^Задачи/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(500)
    expect((await menuRows(p)).some(r => r.startsWith('Что сюда класть')), 'Задачи has no «Что сюда класть»')
  } },
  // 26: «На неделе at rest: «Авто · без дня — на завтра» above the pill, with no arrow. … Задачи and Сегодня at rest:
  // no line above the pill»
  { id: 'c24-26-rule', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    const line = () => p.locator('form').locator('xpath=preceding-sibling::p').allInnerTexts()
    expect((await line()).map(plain).join() === 'Авто · без дня — на завтра', `at rest: ${await line()}`)
    for (const title of ['Задачи', 'Сегодня']) {
      await open(p, '/')
      await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
      await p.waitForURL(/\/p\//)
      await p.waitForTimeout(500)
      expect(!(await line()).length, `${title} at rest: ${await line()}`)
    }
  } },
  // 27: «The «Фильтр» sheet reads «Фильтр» / «вид «Список»», and the Метка row is «Ждут уточнения»; no chip reads
  // «уточнить». On a view with «Все страницы» and Срок «Любой», tap «Ждут уточнения»: only Подарок маме на др and
  // Посмотреть тот сериал remain»
  { id: 'c24-27-asking', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(1200)
    const sheet = p.getByRole('dialog')
    expect(!(await sheet.getByRole('button', { name: 'уточнить' }).count()), 'a chip reads «уточнить»')
    await sheet.getByRole('button', { name: 'Любой', exact: true }).click()
    await sheet.getByRole('button', { name: 'Ждут уточнения', exact: true }).click()
    await p.waitForTimeout(500)
    const rows = (await collectRows(p)).map(r => r.text).sort()
    expect(rows.join() === 'Подарок маме на др,Посмотреть тот сериал', `rows: ${rows}`)
  } },
  // 30: «На неделе → «Настроить вид» → «Эта страница», then «Отменить»: the seven rows return»
  { id: 'c24-30-undo-from', device: MOBILE, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('radio', { name: 'Эта страница' }).click()
    await p.waitForTimeout(600)
    expect(!(await p.locator('[data-collect-row]').count()), 'rows stay after «Эта страница»')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(600)
    expect((await collectRows(p)).length === 7, 'the seven rows did not return')
  } },
  // D1: «Настроить вид», 420px at the page «⋯»; «Откуда записи» page picker at the same anchor, where Esc returns to
  // «Настроить вид»
  { id: 'c24-d1-anchor', device: DESKTOP, run: async (p) => {
    await openPage(p, 'На неделе')
    const dots = await p.getByRole('button', { name: 'Действия со страницей' }).last().boundingBox()
    await pageMenu(p, 'Настроить вид')
    const pop = p.getByRole('dialog').filter({ hasText: 'Настроить вид' })
    const box = await pop.boundingBox()
    expect(Math.abs(box.width - 420) <= 2, `the popover is ${box.width}px`)
    expect(box.y >= dots.y + dots.height - 2 && box.y - (dots.y + dots.height) < 24 && Math.abs(box.x + box.width - (dots.x + dots.width)) < 24, `not at «⋯»: ${JSON.stringify({ box, dots })}`)
    await p.getByRole('radio', { name: 'Выбранные' }).click()
    await p.waitForTimeout(1500)
    const picker = p.getByRole('dialog').filter({ hasText: 'Откуда записи' })
    const pbox = await picker.boundingBox()
    expect(pbox && Math.abs(pbox.y - box.y) < 24, `the picker is not at the same anchor: ${JSON.stringify(pbox)}`)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(1200)
    expect(await shows(p.getByRole('dialog').filter({ hasText: 'Настроить вид' })), 'Esc does not return to «Настроить вид»')
  } },
  // D5: «На неделе → «Настроить вид» → «Фильтр»: the same popover shows ‹, «Фильтр», «вид «Список»». ‹ goes back to
  // «Настроить вид». «Фильтр» again, then Esc goes back, and Esc again closes it. Click outside from the filter level:
  // everything closes»
  { id: 'c24-d5-levels', device: DESKTOP, run: async (p) => {
    await openPage(p, 'На неделе')
    await pageMenu(p, 'Настроить вид')
    const pop = p.getByRole('dialog')
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(500)
    expect(await pop.count() === 1, `${await pop.count()} popovers`)
    expect(plain(await pop.locator('h2').innerText()) === 'Фильтр' && plain(await pop.locator('h2 + p').innerText()) === 'вид «Список»', 'not «Фильтр» / «вид «Список»»')
    const chip = await pop.getByRole('button', { name: 'Просрочено', exact: true }).evaluate(el => el.className)
    expect(chip.includes('bg-accent-soft'), 'a picked chip is not chip-on')
    await pop.getByRole('button', { name: 'Назад' }).click()
    await p.waitForTimeout(400)
    expect(plain(await pop.locator('h2').innerText()) === 'Настроить вид', '‹ does not go back')
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(400)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    expect(await pop.count() === 1 && plain(await pop.locator('h2').innerText()) === 'Настроить вид', 'Esc does not go back')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(600)
    expect(!(await pop.count()), 'a second Esc does not close it')
    await pageMenu(p, 'Настроить вид')
    await p.getByRole('button', { name: /^Фильтр: / }).click()
    await p.waitForTimeout(400)
    await p.mouse.click(300, 700)
    await p.waitForTimeout(600)
    expect(!(await p.getByRole('dialog').count()), 'a click outside does not close both levels')
  } },
  // D8: «На неделе → «Настроить вид» → «Эта страница», then «Все страницы»: the notice shows above the composer, not
  // inside the popover. Close the popover: the notice stays, and «Отменить» works». Opened from the page «⋯» and from the
  // view bar's own button, which stands lower: the popover never covers the notice
  ...[['menu', 'the page «⋯»'], ['bar', 'the view bar']].map(([key, from]) => ({ id: key === 'menu' ? 'c24-d8-notice' : 'c24-d8-notice-bar', device: DESKTOP, run: async (p) => {
    await openPage(p, 'На неделе')
    if (key === 'menu') await pageMenu(p, 'Настроить вид')
    else {
      await p.getByRole('button', { name: 'Настроить вид', exact: true }).filter({ visible: true }).first().click()
      await p.waitForTimeout(900)
    }
    await p.getByRole('radio', { name: 'Эта страница' }).click()
    await p.waitForTimeout(400)
    await p.getByRole('radio', { name: 'Все страницы' }).click()
    await p.waitForTimeout(600)
    const notice = p.locator('[data-notice]')
    expect(plain(await notice.innerText()).startsWith('Вид «Список»: записи со всех страниц'), `notice: ${await notice.innerText()}`)
    expect(!(await p.getByRole('dialog').locator('[data-notice]').count()), 'the notice is inside the popover')
    const where = await p.evaluate(() => {
      const n = document.querySelector('[data-notice]').getBoundingClientRect()
      const form = document.querySelector('form').getBoundingClientRect()
      return { above: n.bottom <= form.top + 1, right: Math.abs(n.right - form.right) < 4 }
    })
    expect(where.above && where.right, `the notice is not above the composer at its right: ${JSON.stringify(where)}`)
    // Whole in view: nothing over its middle or its corners
    const covered = await p.evaluate(() => {
      const n = document.querySelector('[data-notice]').getBoundingClientRect()
      return [[n.left + n.width / 2, n.top + n.height / 2], [n.left + 4, n.top + 4], [n.right - 4, n.top + 4], [n.left + 4, n.bottom - 4], [n.right - 4, n.bottom - 4]]
        .filter(([x, y]) => !document.elementFromPoint(x, y)?.closest('[data-notice]')).length
    })
    expect(!covered, `opened from ${from}, the popover covers the notice (${covered} of 5 points)`)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(600)
    expect(await shows(notice), 'the notice went with the popover')
    await notice.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(500)
    expect((await weekView(p)).from === 'self', '«Отменить» does not take «Все страницы» back')
  } }))
]
