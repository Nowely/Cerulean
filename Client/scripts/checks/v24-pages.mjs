// v24 delta, the pages slice: the «Check:» lines of items 1 (the empty page is its own manual), 2 (a page just made),
// 15 («Сделать записью» from a page note) and 22 (the calendar-week glyph), and the desktop parts of D1 (the empty page,
// «Как показывать» and «Секция» at their rows), D2 (the ring's tooltip) and D8 (the toast above the editing bar).
// «На неделе» (the fifth starter and the page in Избранное) belongs to the collect slice: where it is not there yet,
// the checks say so in passing and test the rest.
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

// ---------- helpers ----------

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

/** The iconify name a glyph draws with (`i-lucide:lightbulb`), from the element or its first icon inside */
const iconOf = loc => loc.evaluate((el) => {
  const icon = el.matches('.iconify') ? el : el.querySelector('.iconify')
  return [...(icon?.classList ?? [])].find(c => c.startsWith('i-')) ?? null
})

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

export default [
  // ---------- 15. «Сделать записью» ----------

  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `p24-15-to-record-${name}`, device, run: async (p) => {
    await openPage(p, 'Дела по дому')
    const pageId = await store(p, data => data.livePages.find(x => x.title === 'Дела по дому').id)
    const count = await store(p, (data, id) => data.recordsOf(id).length, pageId)
    expect(count === 2, `Дела по дому has ${count} records, not 2`)
    // Main flow, acceptance 1: no count or source line under the title, only the warn word
    expect(!(await p.locator('main').getByText(/^2 дела/).count()), 'a count under the title')
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
    // On a computer «new» is the bar at the row's left edge, never the tint (computer delta, item 13)
    expect((await rowBox(p).getAttribute('class')).includes(name === 'phone' ? 'fresh-tint' : 'fresh-bar'), 'the row is not fresh')
    const rest = (await rowBox(p).innerText()).replace(METERS, '')
    expect(!/\d/.test(rest), `the row shows a date: «${rest.trim()}»`)
    const made = await store(p, (data, t) => {
      const r = data.liveRecords.find(x => x.text === t)
      return r && { due: r.due, values: Object.keys(r.values).length, parent: r.parentId ?? null }
    }, METERS)
    expect(made && made.due === null && made.values === 0 && made.parent === null, `the record is ${JSON.stringify(made)}`)
    expect(await store(p, (data, id) => data.recordsOf(id).length, pageId) === 3, 'Дела по дому does not have 3 records')
    const t = toast(p, 'Строка стала записью')
    expect(await shows(t), 'no toast «Строка стала записью»')
    // «·» between the words and the action on desktop
    expect((await t.innerText()).replace(/[\s·]+/g, ' ').includes('Строка стала записью Отменить'), `the toast reads «${await t.innerText()}»`)
    if (name === 'desktop') {
      // D8 was «above the editing bar, at its right end»; since the computer round (item 11) the one notice is over
      // Главная's field in the left column
      const [a, f] = [await t.boundingBox(), await p.locator('aside[data-side] [data-field]').first().boundingBox()]
      expect(a.y + a.height <= f.y && Math.abs(a.x + a.width - (f.x + f.width)) <= 2, 'the toast is not over Главная\'s field')
    }
    // «Отменить»: the sentence back, the row gone, «2 дела»
    await t.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(600)
    expect((await note(p).locator('p').first().innerText()).startsWith(`${KEYS} ${METERS}.`), '«Отменить» did not put the sentence back')
    expect(!(await store(p, (data, x) => data.liveRecords.some(r => r.text === x), METERS)), '«Отменить» left the record')
    expect(!(await p.locator('main [data-row-text]', { hasText: METERS }).count()), '«Отменить» left the row')
    expect(await store(p, (data, id) => data.recordsOf(id).length, pageId) === 2, 'Дела по дому does not have 2 records after «Отменить»')
  } })),
  // v24 acceptance, outside the Check lines (1): ↶ in the editing bar, or Ctrl Z, right after the ring undoes the whole of
  // it as «Отменить» does: the sentence back once, the row gone, the notice closed. ↶ again never cuts the words a second
  // time, nor after «Отменить». The desktop ↶ run (p24-15-undo-desktop) retired in the computer round (item 17): with the
  // caret alone a computer shows no bar, so its ↶ is Ctrl Z (p24-15-undo-desktop-keys)
  ...[['phone', MOBILE, 'bar'], ['desktop-keys', DESKTOP, 'keys']].map(([name, device, how]) => ({ id: `p24-15-undo-${name}`, device, run: async (p) => {
    await openPage(p, 'Дела по дому')
    const undo = async () => {
      const button = bar(p).getByRole('button', { name: 'Отменить ввод' })
      // With nothing left to undo ↶ is off, and a tap does nothing
      if (how === 'keys') await p.keyboard.press('Control+z')
      else if (await button.isEnabled()) await button.click()
      await p.waitForTimeout(600)
    }
    const whole = async (when) => {
      const first = await note(p).locator('p').first().innerText()
      expect(first.startsWith(`${KEYS} ${METERS}.`) && first.split(METERS).length === 2, `${when}, the note's first paragraph reads «${first}»`)
      expect(!(await store(p, (data, x) => data.liveRecords.some(r => r.text === x), METERS)), `${when}, the record stays`)
    }
    for (const round of ['↶', '«Отменить»']) {
      await select(p, METERS)
      await bar(p).getByRole('button', { name: 'Сделать записью' }).click()
      await p.waitForTimeout(700)
      expect(await store(p, (data, x) => data.liveRecords.some(r => r.text === x), METERS), 'the ring made no record')
      if (round === '↶') {
        if (how === 'bar') expect(await bar(p).getByRole('button', { name: 'Отменить ввод' }).isEnabled(), '↶ is off right after the ring')
        await undo()
        await whole('after ↶')
        expect(!(await toast(p, 'Строка стала записью').count()), 'the notice stays after ↶')
        expect(!(await p.locator('main [data-row-text]', { hasText: METERS }).count()), 'the row stays after ↶')
        expect(await inNote(p), 'the body lost the caret after ↶')
      } else {
        await toast(p, 'Строка стала записью').getByRole('button', { name: 'Отменить' }).click()
        await p.waitForTimeout(600)
        await whole('after «Отменить»')
        await note(p).click()
        await p.waitForTimeout(200)
      }
      await undo()
      await undo()
      await whole(`after ${round} and ↶ twice more`)
    }
  } })),
  // v24 re-check (1): ↶ takes the cut back only while its notice shows and the row is as the cut made it. After the notice
  // has gone, or once the row is ticked, the cut is final: ↶ and Ctrl Z never delete the row, nor put the words back
  ...[['gone-phone', MOBILE, 'gone'], ['gone-desktop', DESKTOP, 'gone'], ['ticked-desktop', DESKTOP, 'ticked']].map(([name, device, why]) => ({ id: `p24-15-undo-late-${name}`, device, run: async (p) => {
    await openPage(p, 'Дела по дому')
    await select(p, METERS)
    await bar(p).getByRole('button', { name: 'Сделать записью' }).click()
    await p.waitForTimeout(700)
    const made = () => store(p, (data, x) => {
      const r = data.liveRecords.find(y => y.text === x)
      return r ? { done: r.done } : null
    }, METERS)
    expect(await made(), 'the ring made no record')
    if (why === 'gone') {
      await p.mouse.move(5, 5)
      await p.waitForTimeout(9000)
      expect(!(await toast(p, 'Строка стала записью').count()), 'the notice did not go')
    } else {
      await store(p, (data, x) => data.toggleDone(data.liveRecords.find(y => y.text === x).id), METERS)
      await p.waitForTimeout(400)
    }
    const button = bar(p).getByRole('button', { name: 'Отменить ввод' })
    if (device === MOBILE) {
      if (await button.isEnabled()) await button.click()
    } else {
      expect(await inNote(p), 'the note lost the caret')
      await p.keyboard.press('Control+z')
    }
    await p.waitForTimeout(600)
    const after = await made()
    expect(after && (why === 'gone' || after.done), `after a late ↶ the record is ${JSON.stringify(after)}`)
    const first = await note(p).locator('p').first().innerText()
    expect(!first.includes(METERS), `a late ↶ put the words back: «${first}»`)
  } })),
  // The same on a record: ↶ right after «Сделать подпунктом» takes the subitem away and puts the words back
  { id: 'p24-15-undo-sub', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const egg = await store(p, data => data.liveRecords.find(r => r.text === 'Яйца').id)
    await open(p, `/r/${egg}`)
    const ed = p.locator('.ProseMirror').first()
    await ed.waitFor({ timeout: 10000 })
    const words = 'Проверить, что ни одно не треснуло.'
    await ed.getByText('треснуло', { exact: false }).first().click()
    await ed.evaluate((root, t) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = n.data.indexOf(t)
        if (i >= 0) return getSelection().setBaseAndExtent(n, i, n, i + t.length)
      }
    }, words)
    await p.waitForTimeout(300)
    const subs = () => store(p, (data, rid) => data.subitemsOf(rid).map(x => x.text), egg)
    const count = (await subs()).length
    await bar(p).getByRole('button', { name: 'Сделать подпунктом' }).click()
    await p.waitForTimeout(600)
    expect((await subs()).length === count + 1, 'the ring made no subitem')
    await bar(p).getByRole('button', { name: 'Отменить ввод' }).click()
    await p.waitForTimeout(600)
    const text = await ed.innerText()
    expect(text.split('треснуло').length === 2 && text.includes(`подойдут С1. ${words}`), `after ↶ the text reads «${text.slice(0, 100)}»`)
    expect((await subs()).length === count, 'the subitem stays after ↶')
  } },
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

  // v24 re-check (2): on an empty page «⋯» → «Настроить вид» mounts the popover already open; at 1280×720 it still stops
  // above the notice its «Все страницы» raises
  { id: 'p24-1-how-notice-desk', device: { ...DESKTOP, viewport: { width: 1280, height: 720 } }, run: async (p) => {
    await kitchen(p)
    await p.locator('main').getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.waitForTimeout(500)
    await p.getByRole('menuitem', { name: 'Настроить вид' }).first().click()
    await p.waitForTimeout(900)
    const sheet = p.getByRole('dialog', { name: /^Настроить вид/ })
    expect(await shows(sheet), '«⋯» did not open «Настроить вид»')
    await sheet.getByRole('radio', { name: 'Все страницы' }).click()
    await p.waitForTimeout(700)
    const notice = p.locator('[data-notice]')
    expect(await shows(notice), 'no notice after «Все страницы»')
    const covered = await p.evaluate(() => {
      const n = document.querySelector('[data-notice]').getBoundingClientRect()
      return [[n.left + n.width / 2, n.top + n.height / 2], [n.left + 4, n.top + 4], [n.right - 4, n.top + 4], [n.left + 4, n.bottom - 4], [n.right - 4, n.bottom - 4]]
        .filter(([x, y]) => !document.elementFromPoint(x, y)?.closest('[data-notice]')).length
    })
    expect(!covered, `the popover covers the notice (${covered} of 5 points)`)
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
