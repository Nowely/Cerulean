// v24 delta, the pages slice: the «Check:» lines of items 1 (the empty page is its own manual), 2 (a page just made),
// 15 («Сделать записью» from a page note) and 22 (the calendar-week glyph), and the desktop parts of D1 (the empty page,
// «Как показывать» and «Секция» at their rows), D2 (the ring's tooltip) and D8 (the toast above the editing bar).
// «На неделе» (the fifth starter and the page in Избранное) belongs to the collect slice: where it is not there yet,
// the checks say so in passing and test the rest.
import { DESKTOP, MOBILE, expect, open, send, shows, store } from './lib.mjs'

// ---------- helpers ----------

const isDesktop = p => p.viewportSize().width >= 1024

async function openPage(p, title) {
  await open(p, '/')
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(500)
}

/** A row of a page «⋯» or of a section «⋯»: a menu item on desktop, a sheet row on a phone */
const menuRow = (p, name) => p.getByRole('menuitem', { name }).or(p.getByRole('dialog').getByRole('button', { name })).first()

/** «Новая страница» from a section's «⋯» (Дом) or from Главная's, the title still focused */
async function newPage(p, from = 'Дом') {
  await open(p, '/')
  const more = from === 'Главная'
    ? p.getByRole('button', { name: 'Действия с Главной' })
    : p.getByRole('button', { name: `Действия с секцией «${from}»` }).filter({ visible: true })
  await more.first().click()
  await p.waitForTimeout(500)
  await menuRow(p, 'Новая страница').click()
  await p.waitForURL(/\/p\//)
  const title = p.getByRole('textbox', { name: 'Название страницы' })
  await title.and(p.locator(':focus')).waitFor({ timeout: 3000 })
  return title
}

/** «Ремонт на кухне», made from Дом's «⋯» and named, the keyboard down */
async function kitchen(p) {
  const title = await newPage(p)
  await title.fill('Ремонт на кухне')
  await title.blur()
  await p.mouse.move(0, 0)
  await p.waitForTimeout(600)
}

const manual = p => p.getByRole('group', { name: 'Начать страницу' })
const lines = p => manual(p).getByRole('button')
const howLine = p => manual(p).getByRole('button', { name: /^Настроить вид: как показывать/ })
// Not by role: an open menu hides the rest of the page from the accessibility tree
const sectionLine = p => p.locator('button[aria-label^="Секция: "]')
const starters = p => p.getByRole('group', { name: 'Начать с шаблона' }).getByRole('button')
const kitchenPage = p => store(p, data => data.livePages.find(x => x.title === 'Ремонт на кухне'))

/** The iconify name a glyph draws with (`i-lucide:lightbulb`), from the element or its first icon inside */
const iconOf = loc => loc.evaluate((el) => {
  const icon = el.matches('.iconify') ? el : el.querySelector('.iconify')
  return [...(icon?.classList ?? [])].find(c => c.startsWith('i-')) ?? null
})

/** A colour expression as the browser computes it */
const resolve = (p, expr, prop = 'backgroundColor') => p.evaluate(([e, k]) => {
  const s = document.createElement('span')
  s.style[k] = e
  document.body.append(s)
  const c = getComputedStyle(s)[k]
  s.remove()
  return c
}, [expr, prop])

const note = p => p.locator('.page-note .ProseMirror')
const bar = p => p.getByRole('toolbar', { name: 'Текст' })
const inNote = p => p.evaluate(() => !!document.activeElement?.closest('.page-note .ProseMirror'))

/** `text` selected in the page note, as a long press and a drag of the handles would leave it */
async function select(p, text) {
  const ed = note(p)
  await ed.waitFor({ timeout: 10000 })
  await ed.getByText(text, { exact: false }).first().click()
  await ed.evaluate((root, t) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.data.indexOf(t)
      if (i >= 0) {
        getSelection().setBaseAndExtent(n, i, n, i + t.length)
        return
      }
    }
    throw new Error(`no «${t}» in the note`)
  }, text)
  await p.waitForTimeout(300)
}

const METERS = 'Показания счётчиков отправлять до 25-го'
const KEYS = 'Ключи от щитка в верхнем ящике у двери.'

const firstRow = p => p.locator('main [data-row-text]').first()
const rowBox = p => firstRow(p).locator('xpath=ancestor::div[contains(@class, "group/row")][1]')
const toast = (p, text) => p.locator('[data-notice]', { hasText: text })

// ---------- 1. The empty page is its own manual ----------

/** «Under «Секция · Дом» exactly three lines in this order …; no «Пиши внизу…» line; the composer reads «Первая запись»» */
async function threeLines(p) {
  await kitchen(p)
  expect(await shows(manual(p)), 'no manual on «Ремонт на кухне»')
  const said = (await lines(p).allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
  expect(said.join(' / ') === 'Заметка к странице / Свойство / Как показывать Список', `the lines read ${said.join(' / ')}`)
  expect(await iconOf(lines(p).nth(1)) === 'i-lucide:plus', '«Свойство» does not wear «+»')
  expect(await iconOf(lines(p).nth(0)) === 'i-cer:note', '«Заметка к странице» does not wear the note glyph')
  expect(await iconOf(lines(p).nth(2)) === 'i-lucide:sliders-horizontal', '«Как показывать» does not wear the sliders')
  expect(await howLine(p).getAttribute('aria-label') === 'Настроить вид: как показывать, Список', 'the line\'s aria is not «… как показывать, Список»')
  const [sec, first] = [await sectionLine(p).boundingBox(), await lines(p).first().boundingBox()]
  expect(first.y >= sec.y + sec.height - 1, 'the lines are not under «Секция · Дом»')
  expect(!(await p.getByText(/Пиши внизу/).count()), 'a «Пиши внизу…» line shows beside the manual')
  const field = p.getByRole('textbox', { name: 'Новая запись' })
  expect(await field.getAttribute('placeholder') === 'Первая запись', `the composer reads «${await field.getAttribute('placeholder')}»`)
  // Faint, in rows of 44 (40 on desktop) with 18px glyphs; 16 (15 on desktop)
  const [faint, muted] = [await resolve(p, 'var(--faint)', 'color'), await resolve(p, 'var(--muted)', 'color')]
  const look = await lines(p).evaluateAll(bs => bs.map(b => ({ h: b.getBoundingClientRect().height, size: getComputedStyle(b).fontSize, color: getComputedStyle(b).color, icon: b.querySelector('.iconify').getBoundingClientRect().width })))
  const [h, size] = isDesktop(p) ? [40, '15px'] : [44, '16px']
  for (const l of look) {
    expect(l.h === h && l.size === size && l.icon === 18, `a line is ${l.h} high at ${l.size} with a ${l.icon}px glyph`)
  }
  expect(look.every(l => l.color === faint), `the lines are ${look.map(l => l.color).join(', ')}, not faint ${faint}`)
  const value = howLine(p).locator('span', { hasText: 'Список' })
  expect(await value.evaluate(e => getComputedStyle(e).color) === muted, '«Список» is not muted')
}

/** «Tap «Как показывать»: «Настроить вид» with «Новый вид»; pick «Доска» and close: «Как показывать · Доска»» */
async function howDoska(p) {
  await kitchen(p)
  const line = howLine(p)
  await line.click()
  await p.waitForTimeout(600)
  const sheet = p.getByRole('dialog', { name: /^Настроить вид/ })
  expect(await shows(sheet), '«Как показывать» did not open «Настроить вид»')
  expect(await sheet.getByRole('button', { name: 'Новый вид' }).count(), 'no «Новый вид» in «Настроить вид»')
  expect(await sheet.getByRole('radio', { name: 'Список' }).getAttribute('aria-checked') === 'true', '«Настроить вид» is not the first view\'s')
  await sheet.getByRole('radio', { name: 'Доска' }).click()
  await p.waitForTimeout(300)
  return { line, sheet }
}

async function afterDoska(p, line) {
  await p.waitForTimeout(500)
  expect(!(await p.getByRole('dialog', { name: /^Настроить вид/ }).count()), '«Настроить вид» did not close')
  expect((await line.innerText()).replace(/\s+/g, ' ').trim() === 'Как показывать Доска', `the line reads «${await line.innerText()}»`)
  expect(await line.getAttribute('aria-label') === 'Настроить вид: как показывать, Доска', 'the aria does not follow «Доска»')
  expect(await store(p, data => data.livePages.find(x => x.title === 'Ремонт на кухне').views[0].layout) === 'board', 'the first view is not a board')
}

/** «Tap «Свойство», name it «Комната», «Создать»: on in «Справа в строке», muted at the line's right» */
async function roomProp(p) {
  await kitchen(p)
  await manual(p).getByRole('button', { name: 'Добавить свойство' }).click()
  const sheet = p.getByRole('dialog', { name: /^Новое свойство/ })
  expect(await shows(sheet), '«Свойство» did not open «Новое свойство»')
  await sheet.getByRole('textbox', { name: 'Название', exact: true }).fill('Комната')
  await sheet.getByRole('button', { name: 'Создать' }).click()
  await p.waitForTimeout(600)
  const on = await store(p, (data) => {
    const page = data.livePages.find(x => x.title === 'Ремонт на кухне')
    const prop = page.props.find(x => x.name === 'Комната')
    return !!prop && page.views.every(v => v.shown.includes(prop.id))
  })
  expect(on, '«Комната» is not on in «Справа в строке»')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(400)
  const line = manual(p).getByRole('button', { name: 'Добавить свойство' })
  const value = line.locator('span', { hasText: 'Комната' })
  expect(await shows(value), '«Комната» does not show at the line\'s right')
  const [l, v] = [await line.boundingBox(), await value.boundingBox()]
  expect(Math.abs(l.x + l.width - (v.x + v.width)) <= (isDesktop(p) ? 9 : 1), '«Комната» is not at the right end')
  const muted = await resolve(p, 'var(--muted)', 'color')
  expect(await value.evaluate(e => getComputedStyle(e).color) === muted, '«Комната» is not muted')
  return { sheet }
}

export default [
  { id: 'p24-1-manual', device: MOBILE, run: threeLines },
  // MobileBlank: with the title focused there is no «Назови страницу, потом пиши внизу.»
  { id: 'p24-1-blank', device: MOBILE, run: async (p) => {
    await newPage(p)
    expect(await shows(manual(p)), 'no manual on a page just made')
    expect(!(await p.getByText(/Назови страницу/).count()), '«Назови страницу, потом пиши внизу.» shows')
    expect(!(await p.getByText(/Пиши внизу/).count()), '«Пиши внизу…» shows')
  } },
  { id: 'p24-1-how', device: MOBILE, run: async (p) => {
    const { line, sheet } = await howDoska(p)
    const done = sheet.getByRole('button', { name: 'Готово' })
    if (await done.count()) await done.click()
    else await p.keyboard.press('Escape')
    await afterDoska(p, line)
  } },
  { id: 'p24-1-prop', device: MOBILE, run: roomProp },
  // «Tap «Заметка к странице»: the caret is in the page body; type a word and the line is gone»
  { id: 'p24-1-note', device: MOBILE, run: async (p) => {
    await kitchen(p)
    await manual(p).getByRole('button', { name: 'Заметка к странице' }).click()
    await p.waitForTimeout(500)
    expect(await inNote(p), 'the caret is not in the page body')
    await p.keyboard.type('Плитка')
    await p.waitForTimeout(300)
    expect(!(await manual(p).getByRole('button', { name: 'Заметка к странице' }).count()), 'the line stayed after a word')
    await p.getByRole('textbox', { name: 'Название страницы' }).click()
    await p.waitForTimeout(800)
    expect(!(await manual(p).getByRole('button', { name: 'Заметка к странице' }).count()), 'the line came back with text in the body')
    expect((await lines(p).count()) === 2, 'the other two lines went too')
    // An untitled page puts the caret in its body too
    await newPage(p, 'Главная')
    await p.getByRole('textbox', { name: 'Название страницы' }).blur()
    await manual(p).getByRole('button', { name: 'Заметка к странице' }).click()
    await p.waitForTimeout(500)
    expect(await inNote(p), 'the caret is not in an untitled page\'s body')
  } },
  // «Write the first record: all lines go, and «⋯» still has «Заметка к странице» and «Настроить вид»»
  { id: 'p24-1-first', device: MOBILE, run: async (p) => {
    await kitchen(p)
    await send(p, 'Купить плитку')
    expect(await store(p, data => data.liveRecords.some(r => r.text === 'Купить плитку' && data.pages[r.pageId].title === 'Ремонт на кухне')), 'the first record did not land on the page')
    expect(!(await manual(p).count()), 'the lines stayed after the first record')
    expect(!(await p.getByText('Начать с шаблона').count()) && !(await p.getByText('Что сюда класть?').count()), 'the starters or the field stayed')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.waitForTimeout(500)
    expect(await menuRow(p, /^Заметка к странице/).count(), 'no «Заметка к странице» in «⋯»')
    expect(await menuRow(p, 'Настроить вид').count(), 'no «Настроить вид» in «⋯»')
  } },
  // «Сегодня, Входящие, Яйца and any preview show no lines»; a page emptied by hand shows them
  { id: 'p24-1-never', device: MOBILE, run: async (p) => {
    await open(p, '/')
    for (const kind of ['today', 'inbox']) {
      const id = await store(p, (data, k) => data.livePages.find(x => x.kind === k)?.id, kind)
      await open(p, `/p/${id}`)
      expect(!(await manual(p).count()), `the ${kind} page shows the manual`)
    }
    // Входящие emptied: still no lines
    await store(p, (data) => {
      const inbox = data.livePages.find(x => x.kind === 'inbox')
      data.removeRecords(data.liveRecords.filter(r => r.pageId === inbox.id).map(r => r.id))
    })
    expect(!(await manual(p).count()), 'an empty Входящие shows the manual')
    const egg = await store(p, data => data.liveRecords.find(r => r.text === 'Яйца').id)
    await open(p, `/r/${egg}`)
    await p.locator('.ProseMirror').first().waitFor({ timeout: 10000 })
    expect(!(await manual(p).count()), 'Яйца shows the manual')
    // Книги emptied by hand: the manual is back
    await openPage(p, 'Книги')
    expect(!(await manual(p).count()), 'Книги with records shows the manual')
    await store(p, (data) => {
      const books = data.livePages.find(x => x.title === 'Книги')
      data.removeRecords(data.liveRecords.filter(r => r.pageId === books.id).map(r => r.id))
    })
    expect(await shows(manual(p)), 'a page emptied by hand shows no manual')
  } },

  // ---------- 2. A page just made ----------

  { id: 'p24-2-new', device: MOBILE, run: async (p) => {
    await kitchen(p)
    expect((await sectionLine(p).innerText()).replace(/\s+/g, ' ').trim() === 'Секция Дом', `the line reads «${await sectionLine(p).innerText()}»`)
    expect(await iconOf(sectionLine(p)) === 'i-lucide:chevron-down', 'the line has no ⌄')
    const names = await starters(p).allInnerTexts()
    const want = ['Покупки', 'Задачи', 'Цели', 'Идеи']
    expect(names.slice(0, 4).join(' / ') === want.join(' / ') && (names.length === 4 || (names.length === 5 && names[4] === 'На неделе')), `the chips read ${names.join(' / ')}`)
    if (names.length === 5) expect(await iconOf(starters(p).nth(4)) === 'i-cer:calendar-week', '«На неделе» does not wear the calendar with three dots')
    const chipIdea = await iconOf(starters(p).nth(3))
    const field = p.getByRole('textbox', { name: /Что сюда класть/ }).or(p.getByPlaceholder('Слова через запятую')).first()
    expect(await field.getAttribute('placeholder') === 'Слова через запятую', 'the placeholder is not «Слова через запятую»')
    expect(await p.getByText('Записи с этими словами Авто положит сюда.', { exact: true }).count() === 1, 'no helper line «Записи с этими словами Авто положит сюда.»')
    expect(!(await p.getByText(/По этим словам сюда попадут/).count()), 'the old helper line shows')
    // A tap on «Секция» opens the «Секция» sheet
    await sectionLine(p).click()
    expect(await shows(p.getByRole('dialog', { name: 'Секция' })), '«Секция» did not open its sheet')
    await p.keyboard.press('Escape')
    // The «Идеи» chip wears what Идеи wears on Главная
    await open(p, '/')
    const ideas = p.locator('main').getByRole('link', { name: /^Идеи/ }).first()
    expect(chipIdea && chipIdea === await iconOf(ideas), `the «Идеи» chip wears ${chipIdea}, not ${await iconOf(ideas)}`)
    // Главная's «⋯» makes it in «Мои страницы»
    await newPage(p, 'Главная')
    expect(await sectionLine(p).getAttribute('aria-label') === 'Секция: Мои страницы. Выбрать другую', 'a page from Главная is not in «Мои страницы»')
  } },
  { id: 'p24-2-dark', device: { ...MOBILE, colorScheme: 'dark' }, run: async (p) => {
    await kitchen(p)
    const elev = await resolve(p, 'var(--chip-elev)')
    const fills = await starters(p).evaluateAll(bs => bs.map(b => getComputedStyle(b).backgroundColor))
    expect(fills.every(f => f === elev), `the chips are ${fills.join(', ')}, not chip-elev ${elev}`)
  } },
  // «On day one, Главная's card offers four starters»
  { id: 'p24-2-first-run', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const rows = p.locator('main section[aria-labelledby="cap-start"] [role="listitem"]')
    expect(await shows(rows), 'no first-run card')
    const names = (await rows.allInnerTexts()).map(t => t.split('\n')[0].trim())
    expect(names.join(' / ') === 'Покупки / Задачи / Цели / Идеи', `the card offers ${names.join(' / ')}`)
  } },

  // ---------- 15. «Сделать записью» ----------

  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `p24-15-to-record-${name}`, device, run: async (p) => {
    await openPage(p, 'Дела по дому')
    const pageId = await store(p, data => data.livePages.find(x => x.title === 'Дела по дому').id)
    const count = await store(p, (data, id) => data.recordsOf(id).length, pageId)
    expect(count === 2, `Дела по дому has ${count} records, not 2`)
    expect(await shows(p.locator('main').getByText(/^2 дела/)), 'the header does not read «2 дела»')
    await select(p, METERS)
    if (name === 'phone') {
      const names = await bar(p).getByRole('button').evaluateAll(bs => bs.map(x => x.getAttribute('aria-label') || x.innerText.trim()))
      expect(names.join(' · ') === 'Отменить ввод · Жирный · Курсив · Ссылка · Упомянуть · Сделать записью · Готово', `selection face: ${names.join(' · ')}`)
    }
    const ring = bar(p).getByRole('button', { name: 'Сделать записью' })
    // The glyph stays the empty checkbox ring
    expect(await ring.locator('span.rounded-full').count() === 1, 'the ring is not the empty checkbox ring')
    await ring.click()
    await p.waitForTimeout(700)
    // The note closes up, the caret after «двери.»
    const first = await note(p).locator('p').first().innerText()
    expect(first === KEYS, `the note's first paragraph reads «${first}»`)
    expect(await inNote(p), 'the body lost the caret')
    const before = await p.evaluate(() => {
      const s = getSelection()
      const r = document.createRange()
      r.selectNodeContents(s.anchorNode.parentElement.closest('p'))
      r.setEnd(s.anchorNode, s.anchorOffset)
      return s.isCollapsed ? r.toString() : null
    })
    expect(before === KEYS, `the caret is after «${before}»`)
    // The newest record of «Список», fresh, with no date and no group
    expect(await p.getByRole('tab', { name: 'Список' }).getAttribute('aria-selected') !== 'false', '«Список» is not the view shown')
    expect(await firstRow(p).innerText() === METERS, `the top row is «${await firstRow(p).innerText()}»`)
    expect((await rowBox(p).getAttribute('class')).includes('fresh-tint'), 'the row is not fresh')
    const rest = (await rowBox(p).innerText()).replace(METERS, '')
    expect(!/\d/.test(rest), `the row shows a date: «${rest.trim()}»`)
    const made = await store(p, (data, t) => {
      const r = data.liveRecords.find(x => x.text === t)
      return r && { due: r.due, values: Object.keys(r.values).length, parent: r.parentId ?? null }
    }, METERS)
    expect(made && made.due === null && made.values === 0 && made.parent === null, `the record is ${JSON.stringify(made)}`)
    expect(await shows(p.locator('main').getByText(/^3 дела/)), 'the header does not read «3 дела»')
    const t = toast(p, 'Строка стала записью')
    expect(await shows(t), 'no toast «Строка стала записью»')
    // «·» between the words and the action on desktop
    expect((await t.innerText()).replace(/[\s·]+/g, ' ').includes('Строка стала записью Отменить'), `the toast reads «${await t.innerText()}»`)
    if (name === 'desktop') {
      // D8: above the editing bar, at its right end
      const [a, b] = [await t.boundingBox(), await bar(p).boundingBox()]
      expect(a.y + a.height <= b.y + 1, 'the toast is not above the editing bar')
      expect(Math.abs(a.x + a.width - (b.x + b.width)) <= 16, `the toast ends at ${a.x + a.width}, the bar at ${b.x + b.width}`)
    }
    // «Отменить»: the sentence back, the row gone, «2 дела»
    await t.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(600)
    expect((await note(p).locator('p').first().innerText()).startsWith(`${KEYS} ${METERS}.`), '«Отменить» did not put the sentence back')
    expect(!(await store(p, (data, x) => data.liveRecords.some(r => r.text === x), METERS)), '«Отменить» left the record')
    expect(!(await p.locator('main [data-row-text]', { hasText: METERS }).count()), '«Отменить» left the row')
    expect(await shows(p.locator('main').getByText(/^2 дела/)), 'the header does not read «2 дела» after «Отменить»')
  } })),
  // «On Яйца the ring's label is still «Сделать подпунктом»»
  { id: 'p24-15-egg', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const egg = await store(p, data => data.liveRecords.find(r => r.text === 'Яйца').id)
    await open(p, `/r/${egg}`)
    const ed = p.locator('.ProseMirror').first()
    await ed.waitFor({ timeout: 10000 })
    await ed.getByText('десяток', { exact: false }).first().click()
    await ed.evaluate((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = n.data.indexOf('десяток')
        if (i >= 0) return getSelection().setBaseAndExtent(n, i, n, i + 7)
      }
    })
    await p.waitForTimeout(300)
    expect(await bar(p).getByRole('button', { name: 'Сделать подпунктом' }).count(), 'Яйца\'s ring is not «Сделать подпунктом»')
    expect(!(await bar(p).getByRole('button', { name: 'Сделать записью' }).count()), 'Яйца\'s ring reads «Сделать записью»')
  } },
  // D2: «on a page note the ring carries the tooltip «Сделать записью», with no shortcut»
  { id: 'p24-15-tip-desk', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Дела по дому')
    await select(p, METERS)
    await bar(p).getByRole('button', { name: 'Сделать записью' }).hover()
    const tip = p.getByRole('tooltip')
    expect(await shows(tip), 'no tooltip over the ring')
    const said = (await tip.first().innerText()).replace(/\s+/g, ' ').trim()
    expect(said === 'Сделать записью', `the tooltip says «${said}»`)
  } },

  // ---------- 22. The calendar-week glyph ----------

  { id: 'p24-22-week', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const home = p.locator('main')
    const today = await iconOf(home.getByRole('link', { name: /^Сегодня/ }).first())
    expect(today === 'i-lucide:calendar', `Сегодня wears ${today}`)
    const week = home.getByRole('link', { name: /^На неделе/ })
    if (await week.count()) {
      const w = await iconOf(week.first())
      expect(w === 'i-cer:calendar-week' && w !== today, `На неделе wears ${w}`)
    } else console.log('      (no «На неделе» on Главная yet: the collect slice adds it)')
    // «Значок и цвет» → «календ»: «Календарь», «Неделя»; 36 icons
    await openPage(p, 'Идеи')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.waitForTimeout(400)
    await menuRow(p, 'Значок и цвет').click()
    const sheet = p.getByRole('dialog', { name: /^Значок и цвет/ })
    expect(await shows(sheet), 'no «Значок и цвет»')
    const icons = sheet.getByRole('group', { name: 'Значок' }).getByRole('button')
    expect(await icons.count() === 36, `${await icons.count()} icons, not 36`)
    const all = await icons.evaluateAll(els => els.map(e => e.getAttribute('aria-label')))
    expect(all.indexOf('Неделя') === all.indexOf('Календарь') + 1, '«Неделя» does not follow «Календарь»')
    await sheet.getByRole('textbox', { name: 'Найти значок' }).fill('календ')
    await p.waitForTimeout(200)
    const found = await icons.evaluateAll(els => els.map(e => e.getAttribute('aria-label')))
    expect(found.join(', ') === 'Календарь, Неделя', `«календ» finds ${found.join(', ')}`)
    expect(await iconOf(icons.nth(1)) === 'i-cer:calendar-week', '«Неделя» is not the calendar with three dots')
  } },

  // ---------- Desktop D1: the empty page ----------

  { id: 'p24-1-manual-desk', device: DESKTOP, run: threeLines },
  // «Click «Как показывать»: «Настроить вид» opens anchored at that line, not at «⋯». Esc closes it.»
  { id: 'p24-1-how-desk', device: DESKTOP, run: async (p) => {
    const { line, sheet } = await howDoska(p)
    const [a, l, more] = [await sheet.boundingBox(), await line.boundingBox(), await p.getByRole('button', { name: 'Действия со страницей' }).first().boundingBox()]
    expect(Math.abs(a.x - l.x) <= 12 && (a.y >= l.y + l.height - 2 || a.y + a.height <= l.y + 2), `the popover is at ${a.x},${a.y}, the line at ${l.x},${l.y}`)
    expect(Math.abs(a.x + a.width - (more.x + more.width)) > 24, 'the popover sits at «⋯»')
    expect(!(await sheet.getByRole('button', { name: /^Закрыть/ }).count()), 'the popover has ×')
    await p.keyboard.press('Escape')
    await afterDoska(p, line)
  } },
  // «Свойство» opens «Новое свойство» as a dialog
  { id: 'p24-1-prop-desk', device: DESKTOP, run: async (p) => {
    const { sheet } = await roomProp(p)
    expect(!(await sheet.isVisible()), '«Новое свойство» is still open')
  } },
  // The dashed «Добавить значок» tile with its tooltip; the starter chips 36 high with a line edge in light
  { id: 'p24-1-tile-desk', device: DESKTOP, run: async (p) => {
    await kitchen(p)
    const tile = p.getByRole('button', { name: 'Добавить значок' })
    expect(await shows(tile), 'no «Добавить значок» tile')
    const look = await tile.evaluate(e => ({ w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, style: getComputedStyle(e).borderTopStyle }))
    expect(look.w === 36 && look.h === 36 && look.style === 'dashed', `the tile is ${look.w}×${look.h} ${look.style}`)
    await tile.hover()
    const tip = p.getByRole('tooltip')
    expect(await shows(tip), 'no tooltip over the tile')
    expect((await tip.first().innerText()).trim() === 'Добавить значок', `the tooltip says «${await tip.first().innerText()}»`)
    const heights = await starters(p).evaluateAll(bs => bs.map(b => b.getBoundingClientRect().height))
    expect(heights.every(h => h === 36), `the chips are ${heights.join(', ')} high`)
    const edge = await starters(p).first().evaluate(e => getComputedStyle(e).boxShadow)
    expect(edge && edge !== 'none', 'the chips have no line edge in light')
    await tile.click()
    expect(await shows(p.getByRole('dialog', { name: /^Значок и цвет/ })), 'the tile does not open «Значок и цвет»')
  } },
  // «Секция · Дом», a menu popover at that row; the pick moves the page and says so
  { id: 'p24-2-section-desk', device: DESKTOP, run: async (p) => {
    await kitchen(p)
    const line = sectionLine(p)
    await line.click()
    const menu = p.getByRole('menu')
    expect(await shows(menu), '«Секция» did not open a menu')
    const [m, l] = [await menu.boundingBox(), await line.boundingBox()]
    expect(Math.abs(m.x - l.x) <= 12 && m.y >= l.y + l.height - 2, `the menu is at ${m.x},${m.y}, the row at ${l.x},${l.y}`)
    const items = await menu.getByRole('menuitemcheckbox').allInnerTexts()
    expect(items[0]?.trim() === 'Мои страницы' && items.some(t => t.trim() === 'Дом'), `the menu offers ${items.join(' / ')}`)
    expect(await menu.getByRole('menuitemcheckbox', { name: 'Дом' }).getAttribute('aria-checked') === 'true', 'Дом is not ticked')
    await menu.getByRole('menuitemcheckbox', { name: 'Личное' }).click()
    await p.waitForTimeout(400)
    expect(await shows(p.getByText('Страница в секции «Личное»')), 'no «Страница в секции «Личное»»')
    expect((await line.innerText()).replace(/\s+/g, ' ').trim() === 'Секция Личное', 'the row does not follow the pick')
    const where = await kitchenPage(p).then(x => x.sectionId)
    expect(where === await store(p, data => data.sectionList.find(s => s.name === 'Личное').id), 'the page did not move to Личное')
  } },
  // «any preview shows no lines»: Найти's preview of an empty page
  { id: 'p24-1-never-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await store(p, data => data.createPage({ title: 'Ремонт на кухне' }))
    await p.keyboard.press('Control+k')
    await p.waitForTimeout(400)
    await p.getByRole('combobox', { name: 'Найти' }).fill('ремонт')
    await p.waitForTimeout(500)
    await p.getByRole('option', { name: /Ремонт на кухне/ }).first().hover()
    await p.waitForTimeout(400)
    expect(await shows(p.getByRole('button', { name: 'Открыть' })), 'no preview of «Ремонт на кухне»')
    expect(!(await manual(p).count()), 'the preview shows the manual')
  } }
]
