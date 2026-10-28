// The computer (handoff/computer-delta.md, canvas 84, states Д1–Д9, ДГ1–ДГ3, ДИ1–ДИ3, ДС1–ДС6): each check is one item's
// «Check:» line, ids pc-<item>-<what>. Every check starts from a real first run at 1440×900 with a mouse, no `?demo`, unless
// it says otherwise; the checks that name colours run in both themes. Item 23's phone half runs at 390×844.
import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { card, closedChip, fakeModel, form, isFocused, mainChip, note, notice, pill, pillText, places, READINGS, recs, text, title } from './main-flow.mjs'
import { BUCKET, KEY_ID, SECRET, fakeBucket } from './sync.mjs'

const side = p => p.locator('aside[data-side]')
const right = p => p.locator('main')
const box = l => l.evaluate((e) => {
  const r = e.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }
})
const bg = l => l.evaluate(e => getComputedStyle(e).backgroundColor)
const hex = h => `rgb(${[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ')})`
const rowOf = (p, name) => p.locator('main [data-rows] .group\\/row').filter({ has: p.locator('[data-row-text]', { hasText: name }) })
const rowNames = p => p.locator('main [data-rows] [data-row-text]').allInnerTexts().then(t => t.map(x => x.split('\n')[0].replace(/\u00a0/g, ' ').trim()))
const plate = (p, name) => card(p, name).locator('[data-plate]')
const marked = (p, name) => card(p, name).evaluate(e => e.getAttribute('aria-current') === 'page')
const pageTitle = p => p.title().then(t => t.replace(/ · Cerulean$/, ''))
/** The left edge of the first line of text inside an element */
const textLeft = l => l.evaluate((el) => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 3 })
  const n = w.nextNode()
  const r = document.createRange()
  r.selectNodeContents(n)
  return r.getBoundingClientRect().left
})

/** A first run on a computer: `/` opens «Быстрый старт» on the right */
async function first(p, device = 'desk') {
  await open(p, '/', false)
  if (device === 'desk') {
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(300)
  }
}
async function openCard(p, name) {
  await card(p, name).locator('a').click()
  await p.waitForFunction(n => document.title.startsWith(`${n} ·`), name)
  await p.waitForTimeout(300)
}
async function openField(p) {
  await pillText(p).click()
  await p.waitForTimeout(150)
}
/** Picks a place on the open field's chip */
async function pick(p, name) {
  if (!(await pill(p).count())) await mainChip(p).click()
  else await closedChip(p).click()
  await places(p).getByRole('button', { name, exact: true }).click()
  await p.waitForTimeout(120)
}
/** Types a line in Главная's field and sends it with Enter; the field stays open */
async function write(p, words, to) {
  if (await pill(p).count()) await openField(p)
  if (to) await pick(p, to)
  await title(p).fill('')
  await title(p).click()
  await p.keyboard.type(words)
  await p.keyboard.press('Enter')
  await p.waitForTimeout(300)
}
/** A click on the right side, below what the page shows */
async function clickRight(p) {
  await p.mouse.click(1000, 820)
  await p.waitForTimeout(200)
}
const noticeText = p => notice(p).first().innerText().then(t => t.replace(/\s+/g, ' ').trim(), () => '')

/** Hovers a control and reads the tooltip that comes, or its `title` */
async function tip(p, l) {
  await p.mouse.move(5, 895)
  await p.waitForTimeout(150)
  await l.hover()
  const t = p.locator('[role="tooltip"]').first()
  if (await t.waitFor({ timeout: 2500 }).then(() => true, () => false)) return (await t.innerText()).replace(/\s+/g, ' ').trim()
  return await l.getAttribute('title') ?? ''
}

// ---------- sync ----------

/** «Синхронизация», the first row of «Данные»: the whole row on a phone, its button on a computer */
const syncRow = p => p.locator('main section[aria-labelledby="s-data"] button').first()
const syncWindow = p => p.getByRole('dialog', { name: 'Синхронизация' })
const syncField = (p, name) => syncWindow(p).getByLabel(name, { exact: true })
async function connect(p, secret = SECRET) {
  await syncRow(p).click()
  await syncWindow(p).waitFor()
  await syncField(p, 'Бакет').fill(BUCKET)
  await syncField(p, 'ID ключа').fill(KEY_ID)
  await syncField(p, 'Секретный ключ').fill(secret)
  await syncWindow(p).getByRole('button', { name: /^(Подключить|Проверка…)$/ }).click()
}

export default [
  // 1 (Д1, КК1). Главная is the left column: one list of pages, the field at its foot, no 260 px sidebar
  { id: 'pc-1-frame', device: DESKTOP, run: async (p) => {
    await first(p)
    const s = await box(side(p))
    expect(s.x === 0 && s.w === 390 && s.h === 900, `the left column: ${JSON.stringify(s)}`)
    expect(await p.locator('[data-home]').count() === 1, 'Главная shows twice')
    const asides = await p.locator('aside, nav').evaluateAll(xs => xs.filter(x => x.getBoundingClientRect().width > 0).length)
    expect(asides === 1, `${asides} side panels`)
    const names = await p.locator('[data-name]').allInnerTexts()
    expect(names.length === new Set(names).size, `a page is listed twice: ${names}`)
    expect(!(await right(p).locator('[data-home], [data-name]').count()), 'the right side lists pages')
    const f = await box(pill(p))
    expect(f.x >= 0 && f.r <= 390 && s.b - f.b <= 20, `the field is not at the column's foot: ${JSON.stringify(f)}`)
    // The open page in a 752 px column centred in what is left
    const col = await p.locator('main .lg\\:max-w-204').first().evaluate((e) => {
      const r = e.getBoundingClientRect()
      const c = getComputedStyle(e)
      return { l: r.left + parseFloat(c.paddingLeft), w: r.width - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight) }
    })
    expect(col.w === 752 && Math.abs(col.l - (390 + (1050 - 752) / 2)) <= 1, `the content column: ${JSON.stringify(col)}`)
    // Найти is the magnifier in the left header, and Ctrl K stays
    expect(await side(p).getByRole('button', { name: 'Найти', exact: true }).isVisible(), 'no magnifier in the left header')
    await p.keyboard.press('Control+k')
    expect(await p.getByRole('combobox', { name: 'Найти' }).isVisible({ timeout: 3000 }).catch(() => false) || await p.getByRole('dialog').first().isVisible(), 'Ctrl K opened nothing')
  } },

  // 2 (Д1, ДГ1). Something is always open on the right: «Быстрый старт» on a first run, then the page opened last,
  // then Входящие
  { id: 'pc-2-open', device: DESKTOP, run: async (p) => {
    await first(p)
    expect(await pageTitle(p) === 'Быстрый старт', `first run: ${await pageTitle(p)}`)
    expect(await marked(p, 'Быстрый старт'), 'its card is not marked')
    await openCard(p, 'Покупки')
    await p.reload()
    await p.waitForSelector('main')
    await p.waitForFunction(() => document.title.startsWith('Покупки ·'))
    expect(await marked(p, 'Покупки'), 'after a reload Покупки is not marked')
    // `/` opens it too
    await p.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/'))
    await p.waitForTimeout(500)
    expect(await pageTitle(p) === 'Покупки', `\`/\` opened ${await pageTitle(p)}`)
    await p.locator('[data-page-dots] button').click()
    await p.getByRole('menuitem', { name: 'Удалить' }).click()
    await p.waitForFunction(() => document.title.startsWith('Входящие ·'))
    expect(await marked(p, 'Входящие'), 'Входящие is not marked')
    // The card's own «⋯» deletes the page open on the right: Входящие again
    await openCard(p, 'Задачи')
    await card(p, 'Задачи').hover()
    await card(p, 'Задачи').getByRole('button', { name: /Действия|⋯|Ещё/ }).first().click()
    await p.getByRole('menuitem', { name: 'Удалить' }).click()
    await p.waitForFunction(() => document.title.startsWith('Входящие ·'))
  } },

  // 3 (Д1, ДГ1, КК1). The left column's own surface: open card darker than the hovered one, plates lifted, in both themes
  ...[['light', { side: '#F1F1EF', hover: '#E9E9E7', sel: '#E2E2E0' }], ['dark', { side: '#0B1216', hover: '#131B21', sel: '#1D282F' }]].map(([scheme, c]) => ({ id: `pc-3-surface-${scheme}`, device: { ...DESKTOP, colorScheme: scheme }, run: async (p) => {
    await first(p)
    expect(await bg(side(p)) === hex(c.side), `the column: ${await bg(side(p))}`)
    const edge = await side(p).evaluate(e => [getComputedStyle(e).borderRightWidth, getComputedStyle(e).borderRightColor])
    const line = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--line').trim())
    expect(edge[0] === '1px', `no 1 px line on its right edge: ${edge}`)
    expect(await bg(right(p)) !== await bg(side(p)), 'the two columns have one surface')
    await card(p, 'Покупки').hover()
    await p.waitForTimeout(250)
    const open = await bg(card(p, 'Быстрый старт'))
    const hovered = await bg(card(p, 'Покупки'))
    expect(open === hex(c.sel) && hovered === hex(c.hover), `open ${open}, hovered ${hovered} (${line})`)
    // The open card stays so under the pointer
    await card(p, 'Быстрый старт').hover()
    await p.waitForTimeout(250)
    expect(await bg(card(p, 'Быстрый старт')) === hex(c.sel), 'the open card changed under the pointer')
    const tile = await bg(plate(p, 'Покупки'))
    const want = await p.evaluate(s => getComputedStyle(document.documentElement).getPropertyValue(s === 'dark' ? '--chip' : '--elev').trim(), scheme)
    expect(tile === hex(want), `the plate: ${tile}, want ${want}`)
    // The field's card stays --elev with its border
    const elev = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--elev').trim())
    expect(await bg(pill(p)) === hex(elev), `the field: ${await bg(pill(p))}`)
  } })),

  // 4 (Д5, Д7, КК2, КК3). No «‹ Главная» on a computer; «⋯» at the window's top-right; a record has «‹ <its page>»
  { id: 'pc-4-headers', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', 'Покупки')
    await openCard(p, 'Покупки')
    expect(!(await right(p).getByRole('link', { name: /Главная/ }).filter({ visible: true }).count()), 'a page has a way back')
    const dots = await box(p.locator('main [data-page-dots]').filter({ visible: true }).first())
    expect(Math.abs(dots.r - (1440 - 12)) <= 1 && Math.round(dots.y) === 12 && dots.w === 44, `the page «⋯»: ${JSON.stringify(dots)}`)
    await rowOf(p, 'Молоко').locator('[data-row-text]').click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(300)
    const back = p.locator('main [data-record-back]').filter({ visible: true })
    expect((await text(back)) === 'Покупки', `back: ${await text(back)}`)
    const b = await box(back)
    expect(Math.abs(b.x - (390 + (1050 - 752) / 2)) <= 6 && b.y <= 16, `back is not top-left of the column: ${JSON.stringify(b)}`)
    const rd = await box(p.locator('main [data-page-dots]').filter({ visible: true }).first())
    expect(Math.abs(rd.r - 1428) <= 1, `the record «⋯»: ${JSON.stringify(rd)}`)
    await back.click()
    await p.waitForFunction(() => document.title.startsWith('Покупки ·'))
  } },

  // 5 (Д5, КК2). The page's icon over the check circles, its title where the record names start
  { id: 'pc-5-align', device: DESKTOP, run: async (p) => {
    await first(p)
    const ta = p.getByRole('textbox', { name: 'Название страницы' })
    const m = await ta.evaluate((t) => {
      const row = t.closest('.items-center')
      const tile = [...row.querySelectorAll('*')].find(e => e.getBoundingClientRect().width === 28)
      const r = tile.getBoundingClientRect()
      return r.left + r.width / 2
    })
    const circle = await p.locator('main [data-rows] button[role="checkbox"]').first().evaluate((e) => {
      const r = e.getBoundingClientRect()
      return r.left + r.width / 2
    })
    const t = await textLeft(ta.locator('xpath=preceding-sibling::span[1]'))
    const n = await textLeft(p.locator('main [data-row-text]').first())
    expect(Math.abs(m - circle) <= 1, `icon centre ${m}, circle centre ${circle}`)
    expect(Math.abs(t - n) <= 1, `title starts at ${t}, names at ${n}`)
  } },

  // 6 (Д2–Д5). The field is Главная's: its chip never follows the page open on the right
  { id: 'pc-6-place', device: DESKTOP, run: async (p) => {
    await first(p)
    await openCard(p, 'Покупки')
    expect(await text(closedChip(p)) === 'Входящие', `chip with Покупки open: ${await text(closedChip(p))}`)
    await write(p, 'Купить хлеб')
    expect((await recs(p, 'Входящие')).some(r => r.text === 'Купить хлеб'), `not in Входящие: ${JSON.stringify(await recs(p))}`)
    await write(p, 'Купить сыр', 'Покупки')
    expect((await recs(p, 'Покупки')).length === 1, `not in Покупки: ${JSON.stringify(await recs(p))}`)
    await openCard(p, 'Задачи')
    expect(await text(closedChip(p)) === 'Покупки', `chip after Задачи: ${await text(closedChip(p))}`)
  } },

  // 7 (Д1, Д5, ДГ1). «Записать…» after the first record; the page's row keeps «+ Новая запись»; no mic, ↑ with words
  { id: 'pc-7-words', device: DESKTOP, run: async (p) => {
    // A browser that can dictate: the computer still shows no mic
    await p.addInitScript(() => {
      window.webkitSpeechRecognition = window.SpeechRecognition = class { start() {} stop() {} abort() {} addEventListener() {} }
    })
    await first(p)
    expect((await text(pillText(p))).startsWith('Позвонить маме'), `before the first record: ${await text(pillText(p))}`)
    await write(p, 'Купить молоко')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(await text(pillText(p)) === 'Записать…', `closed: ${await text(pillText(p))}`)
    await openCard(p, 'Задачи')
    expect(await right(p).getByRole('button', { name: 'Новая запись' }).isVisible(), 'the page has no «+ Новая запись»')
    expect(!(await p.getByRole('button', { name: /^Надиктовать/ }).count()), 'a mic on the closed field')
    await openField(p)
    expect(await title(p).getAttribute('placeholder') === 'Записать…' || (await form(p).innerText()).includes('Записать…'), 'the open field does not say «Записать…»')
    expect(!(await p.getByRole('button', { name: /^Надиктовать/ }).count()), 'a mic on the open field')
    expect(!(await form(p).getByRole('button', { name: 'Записать', exact: true }).isVisible().catch(() => false)), '↑ before any words')
    await p.keyboard.type('К')
    expect(await form(p).getByRole('button', { name: 'Записать', exact: true }).isVisible(), 'no ↑ after a letter')
  } },

  // 8 (Д2). Opens in place, focus as a --ring border, Enter sends, the field stays open, empty and focused; nothing dims
  { id: 'pc-8-in-place', device: DESKTOP, run: async (p) => {
    await first(p)
    await openField(p)
    expect(!(await p.locator('.field-wash').count()), 'a wash behind the field')
    const ring = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ring').trim())
    const border = await form(p).evaluate(e => getComputedStyle(e).borderTopColor)
    expect(border === hex(ring), `focus border ${border}, --ring ${ring}`)
    expect(await note(p).isVisible() && await mainChip(p).isVisible(), 'no «Заметка» or chip')
    await p.keyboard.type('Позвонить в банк')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    expect((await recs(p, 'Входящие')).length === 1, 'Enter did not send')
    expect(await form(p).isVisible() && (await title(p).innerText()).trim() === '' && await isFocused(title(p)), 'the field is not open, empty and focused')
    // Nothing covers the right side
    const at = await p.evaluate(() => document.elementFromPoint(1000, 400)?.closest('main, aside')?.tagName)
    expect(at === 'MAIN', `the right side is covered: ${at}`)
  } },

  // 9 (Д5). Empty, it closes on a click outside and keeps its chip; with words it stays; Esc closes and keeps the draft
  { id: 'pc-9-close', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', 'Покупки')
    await card(p, 'Задачи').locator('a').click()
    await p.waitForTimeout(300)
    expect(await pill(p).isVisible(), 'a click on a card left the empty field open')
    expect(await text(closedChip(p)) === 'Покупки', `chip: ${await text(closedChip(p))}`)
    await openField(p)
    await p.keyboard.type('Купить')
    await clickRight(p)
    expect(await form(p).isVisible() && (await title(p).innerText()).trim() === 'Купить', 'a click on the right closed the draft')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(await pill(p).isVisible() && await text(pillText(p)) === 'Купить', `after Esc: ${await text(pill(p)).catch(() => 'no pill')}`)
  } },

  // 10 (Д3). The places list: Esc closes only the list, the caret back in the title; a click outside closes it
  { id: 'pc-10-places', device: DESKTOP, run: async (p) => {
    await first(p)
    await openField(p)
    await p.keyboard.type('Купить')
    await mainChip(p).click()
    await places(p).waitFor()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(!(await places(p).count()), 'Esc left the list open')
    expect(await form(p).isVisible() && await isFocused(title(p)), 'the field closed or lost the caret')
    await mainChip(p).click()
    await places(p).waitFor()
    await clickRight(p)
    expect(!(await places(p).count()), 'a click on the right left the list open')
  } },

  // 11 (Д4, КК1). The notice: above the field, its full width, 48 px; it stays while cards are opened; «Отменить» works
  { id: 'pc-11-notice', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Позвонить в банк')
    const n = notice(p).first()
    await n.waitFor()
    const nb = await box(n)
    const fb = await box(form(p))
    const sb = await box(side(p))
    expect(nb.h === 48, `notice height ${nb.h}`)
    expect(nb.r <= sb.r && Math.abs(nb.x - fb.x) <= 1 && Math.abs(nb.w - fb.w) <= 1 && nb.b <= fb.y, `notice ${JSON.stringify(nb)}, field ${JSON.stringify(fb)}`)
    expect(await noticeText(p) === 'Добавлено во Входящие Отменить', `notice: ${await noticeText(p)}`)
    await card(p, 'Задачи').locator('a').click()
    await p.waitForTimeout(300)
    await card(p, 'Идеи').locator('a').click()
    await p.waitForTimeout(300)
    expect(await n.isVisible(), 'the notice went with the cards')
    await n.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(300)
    expect(!(await recs(p)).length, 'the record stayed')
    expect(await form(p).isVisible() && (await title(p).innerText()).trim() === 'Позвонить в банк', 'the words did not come back')
    // Without «Отменить» it is 48 px too, and it goes after 6 s
    await p.keyboard.press('Escape')
    await write(p, 'Купить хлеб')
    await p.waitForTimeout(6300)
    expect(!(await notice(p).count()) || !(await n.isVisible()), 'the notice stayed past 6 s')
  } },

  // 12 (Д4, Д5). A record sent to the page open on the right shows there at once, with the bar; elsewhere, nothing
  { id: 'pc-12-lands', device: DESKTOP, run: async (p) => {
    await first(p)
    await openCard(p, 'Покупки')
    await write(p, 'Купить хлеб', 'Покупки')
    const row = rowOf(p, 'Хлеб')
    expect(await row.count() === 1, `not on the right: ${await rowNames(p)}`)
    expect(await row.evaluate(e => e.className.includes('fresh-bar') && !e.className.includes('fresh-tint')), 'no bar on the new row')
    expect((await text(card(p, 'Покупки'))).includes('хлеб'), `the card line: ${await text(card(p, 'Покупки'))}`)
    const before = await rowNames(p)
    await pick(p, 'Входящие')
    await title(p).click()
    await p.keyboard.type('Подарок Оле')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    expect(JSON.stringify(await rowNames(p)) === JSON.stringify(before), `the right changed: ${await rowNames(p)}`)
    expect((await noticeText(p)).startsWith('Добавлено во Входящие'), `notice: ${await noticeText(p)}`)
  } },

  // 13 (Д4, ДГ1, КК1, КК2). «New» is the plate and the bar, never a fill; both go after 4 s + 1 s
  ...['light', 'dark'].map(scheme => ({ id: `pc-13-new-${scheme}`, device: { ...DESKTOP, colorScheme: scheme }, run: async (p) => {
    await first(p)
    const fill = await bg(card(p, 'Покупки'))
    await write(p, 'Купить молоко', 'Покупки')
    const vars = await p.evaluate(() => ['--accent-soft', '--accent'].map(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim()))
    await p.waitForTimeout(150)
    expect(await bg(plate(p, 'Покупки')) === hex(vars[0]), `the plate: ${await bg(plate(p, 'Покупки'))}, --accent-soft ${vars[0]}`)
    expect(await plate(p, 'Покупки').locator('.text-accent').count() === 1, 'the icon is not in the accent')
    expect(await bg(card(p, 'Покупки')) === fill && !(await card(p, 'Покупки').evaluate(e => e.className.includes('fresh-tint'))), 'the card is filled')
    await openCard(p, 'Покупки')
    const row = rowOf(p, 'Молоко')
    const bar = () => row.evaluate((e) => {
      const s = getComputedStyle(e, '::before')
      return { on: e.className.includes('fresh-bar'), w: s.width, top: s.top, bottom: s.bottom, bg: s.backgroundColor, op: +s.opacity, fill: getComputedStyle(e).backgroundColor }
    })
    const b = await bar()
    expect(b.on && b.w === '3px' && b.top === '10px' && b.bottom === '10px' && b.bg === hex(vars[1]) && b.op === 1, `the bar: ${JSON.stringify(b)}`)
    // The row keeps the page's own ground (rows are opaque for the swipe), never the fresh fill
    const ground = await p.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(b.fill === 'rgba(0, 0, 0, 0)' || b.fill === ground, `the row is filled: ${b.fill}, the page ${ground}`)
    await p.mouse.move(5, 5)
    await p.waitForTimeout(5600)
    expect((await bar()).op < 0.05, `the bar stayed: ${JSON.stringify(await bar())}`)
    expect(await bg(plate(p, 'Покупки')) !== hex(vars[0]), 'the plate stayed blue')
  } })),

  // 14 (Д4). «во» before в or ф and a consonant
  { id: 'pc-14-vo', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Позвонить в банк')
    expect((await noticeText(p)).startsWith('Добавлено во Входящие'), `notice: ${await noticeText(p)}`)
    await write(p, 'Книга про ветер', 'Идеи')
    expect((await noticeText(p)).startsWith('Добавлено в Идеи'), `notice: ${await noticeText(p)}`)
  } },

  // 15 (Д5, Д9). A card opens its page; an untitled empty page left behind goes; the column does not scroll
  { id: 'pc-15-card', device: DESKTOP, run: async (p) => {
    await first(p)
    await side(p).getByRole('button', { name: 'Новая страница' }).click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(400)
    expect(await card(p, 'Без названия').count() === 1, 'no «Без названия»')
    const scroll = await p.locator('[data-home]').evaluate(e => (e.closest('.overflow-y-auto') ?? e).scrollTop)
    await card(p, 'Задачи').locator('a').click()
    await p.waitForFunction(() => document.title.startsWith('Задачи ·'))
    await p.waitForTimeout(300)
    expect(!(await card(p, 'Без названия').count()), '«Без названия» stayed')
    expect(await marked(p, 'Задачи'), 'Задачи is not marked')
    expect(await p.locator('[data-home]').evaluate(e => (e.closest('.overflow-y-auto') ?? e).scrollTop) === scroll, 'the column scrolled')
  } },

  // 16 (Д7). A record opens on the right in place of its page; its card stays marked; Esc goes back
  { id: 'pc-16-record', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', 'Покупки')
    await p.keyboard.press('Escape')
    await openCard(p, 'Покупки')
    await rowOf(p, 'Молоко').locator('[data-row-text]').click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(300)
    expect(await marked(p, 'Покупки'), 'Покупки is not marked on the record')
    expect(!(await p.locator('[data-preview], [aria-label="Предпросмотр"]').count()), 'a preview panel')
    const panes = await p.locator('main').evaluate(m => [...m.parentElement.children].filter(c => c.getBoundingClientRect().width > 0).length)
    expect(panes === 2, `${panes} panes`)
    await p.mouse.click(1000, 860)
    await p.keyboard.press('Escape')
    await p.waitForFunction(() => document.title.startsWith('Покупки ·'))
  } },

  // 17 (Д8). Text without a bar: the caret where clicked, markdown starts, Esc ends editing, the next Esc goes back
  { id: 'pc-17-text', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', 'Покупки')
    await p.keyboard.press('Escape')
    await openCard(p, 'Покупки')
    await rowOf(p, 'Молоко').locator('[data-row-text]').click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(300)
    await p.locator('main .body-text').first().click()
    await p.keyboard.type('2,5%, большую пачку')
    await p.keyboard.press('Enter')
    await p.keyboard.type('- если нет, то 3,2%')
    expect(!(await p.getByRole('button', { name: 'Готово' }).filter({ visible: true }).count()), '«Готово» on a computer')
    expect(!(await p.getByRole('toolbar', { name: 'Текст' }).count()), 'an editing bar while typing')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    expect(p.url().includes('/r/'), 'the first Esc left the record')
    expect(await p.locator('main .body-text ul li', { hasText: 'если нет, то 3,2%' }).count() === 1, 'the line is not a list')
    await p.keyboard.press('Escape')
    await p.waitForFunction(() => document.title.startsWith('Покупки ·'))
    const note = await store(p, data => JSON.stringify(data.liveRecords.find(r => r.text === 'Молоко')?.body ?? null))
    expect(note.includes('2,5%, большую пачку') && note.includes('если нет, то 3,2%') && note.includes('bulletList'), `the text: ${note}`)
  } },

  // 18 (Д9, КК2). «+» makes a page on the right with the caret in the title, «Начать с» under it; the field stays
  { id: 'pc-18-new-page', device: DESKTOP, run: async (p) => {
    await first(p)
    const field = await text(pill(p))
    await side(p).getByRole('button', { name: 'Новая страница' }).click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(400)
    const t = p.getByRole('textbox', { name: 'Название страницы' })
    expect(await isFocused(t), 'the caret is not in the title')
    const starters = right(p).locator('[data-starters]')
    expect(JSON.stringify(await starters.locator('button').allInnerTexts()) === JSON.stringify(['Список', 'Список покупок', 'Список дел']), 'no chips under the title')
    const tb = await box(t)
    const sb = await box(starters)
    expect(sb.y >= tb.b && sb.y - tb.b <= 24, `«Начать с» is not under the title: ${JSON.stringify([tb, sb])}`)
    expect(!(await side(p).locator('[data-starters]').count()) && await text(pill(p)) === field, 'the field changed')
    await p.keyboard.type('Книги')
    await starters.getByRole('button', { name: 'Список', exact: true }).click()
    await p.waitForTimeout(300)
    await p.keyboard.type('Мастер и Маргарита')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    expect((await recs(p, 'Книги')).some(r => r.text === 'Мастер и Маргарита'), `Книги: ${JSON.stringify(await recs(p))}`)
    expect((await text(card(p, 'Книги'))).includes('Маргарита'), `the card: ${await text(card(p, 'Книги')).catch(() => 'none')}`)
  } },

  // 19 (Д6). Входящие: the move button on hover, focus and while its list is open; Esc or a click outside closes the list
  { id: 'pc-19-inbox', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко')
    await write(p, 'Подарок Оле')
    await p.keyboard.press('Escape')
    await openCard(p, 'Входящие')
    await p.mouse.move(1000, 860)
    await p.waitForTimeout(250)
    const moves = right(p).locator('[data-move]')
    const shown = () => moves.evaluateAll(xs => xs.map(x => +getComputedStyle(x).opacity))
    expect((await shown()).length === 2 && (await shown()).every(o => o === 0), `move buttons before a hover: ${await shown()}`)
    await rowOf(p, 'Подарок Оле').hover()
    await p.waitForTimeout(250)
    expect((await shown()).filter(o => o === 1).length === 1, `on hover: ${await shown()}`)
    expect(await tip(p, rowOf(p, 'Подарок Оле').locator('[data-move]')) === 'Переместить', 'the move button has no name on hover')
    await rowOf(p, 'Подарок Оле').locator('[data-move]').click()
    await places(p).waitFor()
    await p.mouse.move(1000, 860)
    await p.waitForTimeout(250)
    expect(await rowOf(p, 'Подарок Оле').locator('[data-move]').evaluate(e => +getComputedStyle(e).opacity) === 1, 'the button hid while its list is open')
    await p.getByRole('textbox', { name: 'Название страницы' }).or(right(p).locator('h1')).first().click()
    await p.waitForTimeout(200)
    expect(!(await places(p).count()), 'a click on the title left the list open')
    await rowOf(p, 'Подарок Оле').hover()
    await rowOf(p, 'Подарок Оле').locator('[data-move]').click()
    await places(p).waitFor()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(!(await places(p).count()), 'Esc left the list open')
    await rowOf(p, 'Подарок Оле').hover()
    await rowOf(p, 'Подарок Оле').locator('[data-move]').click()
    await places(p).getByRole('button', { name: 'Идеи', exact: true }).click()
    await p.waitForTimeout(300)
    expect(await noticeText(p) === 'Перемещено в Идеи Отменить', `notice: ${await noticeText(p)}`)
    // Keyboard focus shows it too
    await rowOf(p, 'Купить молоко').locator('[data-row-text]').focus().catch(() => {})
    await p.keyboard.press('Tab')
    await p.waitForTimeout(150)
    const focused = await p.evaluate(() => document.activeElement?.hasAttribute('data-move') ? +getComputedStyle(document.activeElement).opacity : null)
    expect(focused === null || focused === 1, `a focused move button is hidden: ${focused}`)
  } },

  // 20. Esc closes what is on top, one thing at a time; icon-only buttons are named on hover
  { id: 'pc-20-esc', device: DESKTOP, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', 'Покупки')
    await p.keyboard.press('Escape')
    await openCard(p, 'Покупки')
    await rowOf(p, 'Молоко').locator('[data-row-text]').click()
    await p.waitForURL(/\/r\//)
    await side(p).getByRole('button', { name: 'Меню Главной' }).click()
    const menu = p.getByRole('menu').or(p.locator('[data-home-menu]')).first()
    await menu.waitFor()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(250)
    expect(!(await menu.isVisible().catch(() => false)), 'Esc left the menu open')
    expect(p.url().includes('/r/'), 'the first Esc also left the record')
    await p.keyboard.press('Escape')
    await p.waitForFunction(() => document.title.startsWith('Покупки ·'))
  } },
  { id: 'pc-20-tooltips', device: DESKTOP, run: async (p) => {
    await first(p)
    const names = {
      'Найти': side(p).getByRole('button', { name: 'Найти', exact: true }),
      'Меню Главной': side(p).getByRole('button', { name: 'Меню Главной' }),
      'Новая страница': side(p).getByRole('button', { name: 'Новая страница' }),
      'Действия со страницей': p.locator('main [data-page-dots] button').first()
    }
    const got = {}
    for (const [k, l] of Object.entries(names)) got[k] = await tip(p, l)
    expect(got['Найти'].startsWith('Найти'), `magnifier: ${got['Найти']}`)
    expect(got['Меню Главной'].length > 0 && got['Новая страница'] === 'Новая страница' && got['Действия со страницей'].length > 0, `tooltips: ${JSON.stringify(got)}`)
  } },
  // 20 with ДС6: the cloud names its state on hover
  { id: 'pc-20-cloud', device: DESKTOP, run: async (p) => {
    const b = fakeBucket()
    await b.attach(p.context())
    await open(p, '/settings', false)
    await connect(p)
    await syncWindow(p).waitFor({ state: 'hidden', timeout: 10000 })
    b.keys = {}
    for (let i = 0; i < 3; i++) await p.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('cloud').roundTrip())
    await p.waitForTimeout(200)
    const cloud = side(p).locator('[data-sync-sign]').filter({ visible: true })
    await cloud.waitFor()
    expect(await tip(p, cloud) === 'Синхронизация остановлена', `cloud: ${await tip(p, cloud)}`)
    // The key's eye in the window
    await cloud.click()
    await syncWindow(p).waitFor()
    await syncWindow(p).getByRole('button', { name: 'Ввести ключ заново' }).click().catch(() => {})
    const eye = syncWindow(p).getByRole('button', { name: /ключ$/ }).filter({ hasText: '' }).last()
    expect(/Показать ключ|Скрыть ключ/.test(await tip(p, eye)), 'the eye has no name on hover')
  } },

  // 21 (ДС1). Settings on the right from Главная's «⋯»; the left column stays; no back
  { id: 'pc-21-settings', device: DESKTOP, run: async (p) => {
    await first(p)
    await side(p).getByRole('button', { name: 'Меню Главной' }).click()
    await p.getByRole('menuitem', { name: 'Настройки' }).click()
    await p.waitForURL(/\/settings/)
    await p.waitForTimeout(300)
    expect(await side(p).isVisible() && await p.locator('[data-home]').isVisible(), 'Главная left the left column')
    expect(await right(p).getByRole('heading', { name: 'Настройки' }).filter({ visible: true }).count() === 1, 'no Настройки on the right')
    expect(!(await right(p).getByRole('link', { name: /Главная/ }).filter({ visible: true }).count()), 'Настройки have a back')
    expect(await syncRow(p).isVisible(), 'no «Синхронизация» row')
  } },

  // 22 (ДС2–ДС6, КК4). The sync form is a 440 px window, top at 160 px; an error does not move it; Esc is «Отмена»
  ...['light', 'dark'].map(scheme => ({ id: `pc-22-window-${scheme}`, device: { ...DESKTOP, colorScheme: scheme }, run: async (p) => {
    const b = fakeBucket()
    await b.attach(p.context())
    await first(p)
    await p.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/settings'))
    await p.waitForURL(/\/settings/)
    await p.waitForTimeout(300)
    await syncRow(p).click()
    const w = syncWindow(p)
    await w.waitFor()
    await p.waitForTimeout(350)
    const box0 = await box(w)
    expect(Math.round(box0.y) === 160 && Math.round(box0.w) === 440 && Math.abs(box0.x + box0.w / 2 - 720) <= 1, `window: ${JSON.stringify(box0)}`)
    const look = await w.evaluate((e) => {
      const c = getComputedStyle(e)
      return { r: c.borderTopLeftRadius, ring: c.boxShadow }
    })
    expect(look.r === '16px', `radius ${look.r}`)
    if (scheme === 'dark') {
      const line2 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--line2').trim())
      expect(look.ring.includes(`${hex(line2)} 0px 0px 0px 1px`), `dark edge: ${JSON.stringify(look)}, --line2 ${line2}`)
      const chip = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--chip-elev').trim())
      expect(await bg(w.getByRole('button', { name: 'Отмена' })) === hex(chip), `«Отмена»: ${await bg(w.getByRole('button', { name: 'Отмена' }))}, --chip-elev ${chip}`)
    }
    expect(!(await w.locator('[data-grab], .grab').filter({ visible: true }).count()), 'a grab handle')
    // The scrim covers both columns
    const scrim = await p.evaluate(() => document.elementFromPoint(100, 450)?.closest('aside') === null)
    expect(scrim, 'the left column is not under the scrim')
    await syncField(p, 'Бакет').fill(BUCKET)
    await syncField(p, 'ID ключа').fill(KEY_ID)
    await syncField(p, 'Секретный ключ').fill('YCPbadsecret')
    await w.getByRole('button', { name: 'Подключить' }).click()
    await w.getByText('Неверный ключ: ID или секрет не подходят').waitFor()
    const box1 = await box(w)
    expect(Math.round(box1.y) === 160 && box1.h > box0.h - 1, `the window moved: ${JSON.stringify([box0, box1])}`)
    await p.keyboard.press('Escape')
    await w.waitFor({ state: 'hidden' })
    const on = await p.evaluate(() => !!document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('cloud').on)
    expect(!on && !b.objects.size, 'Esc saved something')
    expect((await p.locator('main section[aria-labelledby="s-data"]').innerText()).includes('Выключена'), 'the row is not «Выключена»')
  } })),

  // 23, phone. The notice is 48 px with or without «Отменить»; the sheet's «Отмена» is --chip-elev in dark; «во»
  { id: 'pc-23-phone-notice', device: MOBILE, run: async (p) => {
    await first(p, 'phone')
    await openField(p)
    await p.keyboard.type('Позвонить в банк')
    await p.keyboard.press('Enter')
    const n = notice(p).first()
    await n.waitFor()
    const withUndo = (await box(n)).h
    expect(await noticeText(p) === 'Добавлено во Входящие Отменить', `notice: ${await noticeText(p)}`)
    // A notice without an action, as «Из бакета добавлено…»: «Скопировать как текст» says it copied, or could not
    await p.keyboard.press('Escape')
    await openCard(p, 'Быстрый старт')
    await p.getByRole('button', { name: 'Действия со страницей' }).filter({ visible: true }).first().click()
    await p.getByRole('button', { name: 'Скопировать как текст' }).or(p.getByRole('menuitem', { name: 'Скопировать как текст' })).first().click()
    await n.waitFor()
    const plain = (await box(n)).h
    expect(!(await n.getByRole('button').count()), `the copy notice has an action: ${await noticeText(p)}`)
    expect(withUndo === 48 && plain === 48, `with «Отменить» ${withUndo}, without ${plain}`)
  } },
  { id: 'pc-23-phone-cancel-dark', device: { ...MOBILE, colorScheme: 'dark' }, run: async (p) => {
    await open(p, '/settings', false)
    await syncRow(p).click()
    const sheet = syncWindow(p)
    await sheet.waitFor()
    await p.waitForTimeout(400)
    const chip = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--chip-elev').trim())
    const c = await bg(sheet.getByRole('button', { name: 'Отмена' }))
    expect(c === hex(chip), `«Отмена»: ${c}, --chip-elev ${chip}`)
  } },
  // 23. «Быстрый старт» names the field by the layout it was made in
  { id: 'pc-23-quick-start', device: DESKTOP, run: async (p) => {
    await first(p)
    expect((await rowNames(p))[0] === 'Запишите что-нибудь в поле слева внизу', `computer: ${(await rowNames(p))[0]}`)
    const ctx = await p.context().browser().newContext({ ...MOBILE, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
    const q = await ctx.newPage()
    await open(q, '/', false)
    await openCard(q, 'Быстрый старт')
    expect((await rowNames(q))[0] === 'Запишите что-нибудь в поле внизу', `phone: ${(await rowNames(q))[0]}`)
    await ctx.close()
  } },

  // 24. Widths: 1280 two columns (390), 1000 a 320 px column, 860 the phone layout; nothing scrolls sideways
  ...[[1440, 900, 390], [1280, 800, 390], [1000, 800, 320], [900, 800, 320], [860, 800, 0]].map(([w, h, col]) => ({ id: `pc-24-width-${w}`, device: { viewport: { width: w, height: h }, deviceScaleFactor: 1 }, run: async (p) => {
    await open(p, '/', false)
    await p.waitForTimeout(400)
    const s = await side(p).count() ? await box(side(p)) : null
    expect((s?.w ?? 0) === col, `the left column at ${w}: ${s?.w ?? 'none'}`)
    if (col) {
      const f = await box(pill(p))
      expect(f.r <= col && s.b - f.b <= 20, `the field at ${w}: ${JSON.stringify(f)}`)
      const pad = await p.locator('main .lg\\:max-w-204').first().evaluate(e => getComputedStyle(e).paddingLeft)
      expect(pad === '32px', `side padding ${pad}`)
    } else {
      expect(new URL(p.url()).pathname === '/' && await p.locator('[data-home]').isVisible(), 'not Главная first')
      await openCard(p, 'Покупки')
      expect(await p.getByRole('link', { name: /Главная/ }).filter({ visible: true }).count() === 1, 'no «‹ Главная»')
    }
    const wide = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth)
    expect(wide <= 0, `scrolls sideways by ${wide}`)
  } })),

  // 25 (ДИ1–ДИ3). With a model, the left field splits one line into two records, files both, one «Отменить», two plates
  { id: 'pc-25-model', device: DESKTOP, run: async (p) => {
    await first(p)
    await fakeModel(p, READINGS)
    await openField(p)
    await p.keyboard.type('Купить молоко 2,5% большую пачку и позвонить маме завтра в 10')
    const draft = form(p).locator('[aria-label^="Будет добавлено"]')
    await draft.waitFor({ timeout: 8000 })
    const t = (await form(p).innerText()).replace(/\s+/g, ' ')
    expect(t.includes('Молоко') && t.includes('Покупки') && t.includes('Позвонить маме') && t.includes('Задачи'), `the field: ${t}`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(500)
    expect((await noticeText(p)).startsWith('Добавлено в Покупки и Задачи'), `notice: ${await noticeText(p)}`)
    const soft = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-soft').trim())
    expect(await bg(plate(p, 'Покупки')) === hex(soft) && await bg(plate(p, 'Задачи')) === hex(soft), 'both plates are not blue')
    await notice(p).first().getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(300)
    expect(!(await recs(p)).length, 'one «Отменить» did not take both back')
  } }
]
