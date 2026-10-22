// v24 delta, the mention slice: the «Check:» lines of items 12 («@» in every composer), 13 (what the send makes),
// 14 (the opaque dock), 16 («Открыто недавно») and of D2, D3, D6 on desktop. Здоровье and its record Стоматолог exist
// in the mockups only in the states that need them, so the checks that need them seed them through the store.
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')
/** Where the mockup's keyboard starts on a 390×844 phone */
const KEYBOARD_TOP = 557

/** Здоровье (heart, no colour) in Личное after Книги, with Стоматолог and its body (the delta's intro) */
const seedHealth = p => store(p, (data) => {
  if (data.livePages.some(x => x.title === 'Здоровье' && !x.deletedAt)) return
  const books = data.livePages.find(x => x.title === 'Книги')
  const page = data.createPage({ title: 'Здоровье', glyph: 'heart', sectionId: books.sectionId, hasDone: false, openedAt: books.openedAt - 1 })
  const rec = data.addRecord({ pageId: page.id, text: 'Стоматолог' })
  data.setBody({ kind: 'record', id: rec.id }, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Клиника на Садовой, 12. Ирина Павловна, звонить с 9 до 18.' }] }] })
  data.updatePage(page.id, { seenAt: Date.now() + 1 })
})

/** iOS's keyboard: the visual viewport ends where the keys start (before the first open) */
const withKeyboard = p => p.addInitScript(() => {
  const own = Object.getOwnPropertyDescriptor(VisualViewport.prototype, 'height')
  Object.defineProperty(VisualViewport.prototype, 'height', { configurable: true, get() {
    return window.__keyboardTop ?? own.get.call(this)
  } })
})
const keyboardUp = p => p.evaluate((top) => {
  window.__keyboardTop = top
  window.visualViewport.dispatchEvent(new Event('resize'))
}, KEYBOARD_TOP)

/** Главная, seeded, with the composer focused */
async function home(p, keys = false) {
  await p.clock.install({ time: NOW })
  if (keys) await withKeyboard(p)
  await open(p, '/')
  await seedHealth(p)
  const hide = p.getByRole('button', { name: 'Скрыть строку про ключ' })
  if (await hide.count()) await hide.click()
  await field(p).click()
  if (keys) await keyboardUp(p)
  await p.waitForTimeout(300)
}

const field = p => p.getByRole('textbox', { name: 'Новая запись' })
/** The composer's words, a chip read as its name */
const words = p => field(p).evaluate(e => (e.value ?? e.textContent).replace(/\u00a0/g, ' '))
const chips = p => field(p).locator('.mention')
/** Empties the field and keeps the caret in it (Ctrl A is «line start» to the editor on an iPhone) */
const clear = async (p) => {
  await field(p).fill('')
  // With a chip in it the selection stays: Backspace takes it
  if (await words(p)) await p.keyboard.press('Backspace')
  await p.waitForTimeout(200)
}
const row = p => p.locator('[data-mention-row]')
/** The chips of the «@» row (not «Ещё…»), each with its aria and whether it is marked */
const rowChips = p => row(p).locator('button:not([aria-haspopup])').evaluateAll(bs => bs.map(b => ({
  name: b.textContent.trim(),
  aria: b.getAttribute('aria-label'),
  marked: b.classList.contains('bg-chip-pressed'),
  width: b.getBoundingClientRect().width,
  cut: (() => {
    const s = b.querySelector('span.truncate')
    return s.scrollWidth > s.clientWidth + 1
  })(),
  glyph: b.querySelector('.iconify, svg')?.getAttribute('class') ?? ''
})))
const guessLine = p => p.locator('main p[aria-hidden="true"]').filter({ hasText: /^\s*→/ }).first()
const typeIn = async (p, text) => {
  await p.keyboard.type(text)
  await p.waitForTimeout(350)
}
const pickChip = async (p, name) => {
  await row(p).getByRole('button', { name: new RegExp(`^Упомянуть «${name}»`) }).click()
  await p.waitForTimeout(300)
}
const recordsWith = (p, marker) => store(p, (data, m) => Object.values(data.records).filter(r => !r.deletedAt && r.text.includes(m))
  .map(r => ({ id: r.id, text: r.text, page: data.pages[r.pageId]?.title, links: (r.links ?? []).map(id => data.nameOf(id)) })), marker)

/** «Связано» of the record on screen: each row's two lines */
const related = p => p.getByRole('region', { name: 'Связано' }).or(p.getByRole('complementary', { name: 'Связано' })).first().locator('li')
  .evaluateAll(lis => lis.map(li => li.innerText.replace(/\s+/g, ' ').trim()))

/**
 * Item 14: where the list ends above the dock, nothing is cut. Returns the visible bottom of the list, the lines a cut
 * would split (empty when none), and whether the bottom fade is on
 */
const dockEdge = p => p.evaluate(() => {
  const box = document.querySelector('.scroll-fade')
  const bb = box.getBoundingClientRect()
  const cover = document.querySelector('[data-dock-cover]')
  const dock = box.nextElementSibling
  // The dock's first visible line is under its 6px of open top padding
  const edge = cover ? cover.getBoundingClientRect().top : Math.min(bb.bottom, dock.getBoundingClientRect().top + 6)
  const cut = []
  const range = document.createRange()
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
  const take = (q, what) => {
    if (q.height > 2 && q.width > 0 && q.top >= bb.top && q.top < edge - 1 && q.bottom > edge + 1) cut.push(what)
  }
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || n.parentElement.closest('.sr-only')) continue
    range.selectNodeContents(n)
    for (const q of range.getClientRects()) take(q, n.nodeValue.trim().slice(0, 30))
  }
  box.querySelectorAll('svg, .iconify, [role="checkbox"]').forEach(el => take(el.getBoundingClientRect(), `glyph ${el.getAttribute('aria-label') ?? el.tagName}`))
  const whole = (text) => {
    const el = [...box.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === text)
    return !!el && el.getBoundingClientRect().bottom <= edge + 1
  }
  // What fits wholly above the dock's own line stays: the cover never hides a whole row (a caption left with no row
  // under it is covered on purpose)
  const line = dock.getBoundingClientRect().top + 6
  const hidden = [...box.querySelectorAll('[role="listitem"]')].filter((e) => {
    const r = e.getBoundingClientRect()
    return r.height > 0 && r.top >= bb.top && r.bottom <= line + 1 && r.bottom > edge + 1
  }).map(e => e.textContent.trim().slice(0, 20))
  return { edge, cut, hidden, fade: box.hasAttribute('data-fade-bottom'), last: whole('Дела по дому') }
})

export default [
  // 12: «type «позвонить @сто» on Главная: a row with no pill frame shows «Стоматолог» (heart glyph), «Позвонить с…»
  // (check glyph, cut at 136pt) and «Ещё…» at the right; «позвонить @сто» is still visible in the field»
  { id: 'm24-12-row', device: MOBILE, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    expect(await row(p).count() === 1, 'no «@» row')
    const frame = await row(p).evaluate((e) => {
      const s = getComputedStyle(e)
      return s.borderTopWidth !== '0px' || s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.boxShadow !== 'none'
    })
    expect(!frame, 'the row has a frame of its own')
    const list = await rowChips(p)
    expect(list.map(c => c.name).join(' | ') === 'Стоматолог | Позвонить стоматологу', `the row offers ${list.map(c => c.name).join(', ')}`)
    expect(list[0].glyph.includes('heart'), 'Стоматолог does not wear the heart')
    expect(list[1].glyph.includes('square-check') || list[1].glyph.includes('check'), 'Позвонить стоматологу does not wear Задачи\'s check')
    expect(list[1].cut && list[1].width <= 136.5, `«Позвонить с…» is ${Math.round(list[1].width)}px and ${list[1].cut ? '' : 'not '}cut`)
    const more = row(p).getByRole('button', { name: 'Ещё…' })
    const [m, r] = [await more.boundingBox(), await row(p).boundingBox()]
    expect(m && Math.abs(m.x + m.width - (r.x + r.width)) < 2, '«Ещё…» is not at the right end')
    // The row in the guess line's place: the chips' bottom 8 above the pill, the row 44 tall
    const pill = await p.locator('form').filter({ has: field(p) }).boundingBox()
    const chip = await row(p).locator('button').first().boundingBox()
    expect(Math.round(r.height) === 44 && Math.round(chip.height) === 36, `the row is ${r.height}, its chips ${chip.height}`)
    expect(Math.abs(pill.y - (chip.y + chip.height) - 8) <= 1, `the chips end ${pill.y - chip.y - chip.height}px above the pill`)
    expect((await words(p)) === 'позвонить @сто', `the field reads «${await words(p)}»`)
    expect(await field(p).isVisible(), 'the field is hidden')
  } },
  // 12: «type «щ» after «@сто»: only «Ещё…» shows»; «type a space: the row closes and «@сто » stays as text»;
  // «почта@» opens nothing
  { id: 'm24-12-end', device: MOBILE, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    await typeIn(p, 'щ')
    expect((await rowChips(p)).length === 0 && await row(p).getByRole('button', { name: 'Ещё…' }).count() === 1, 'not «Ещё…» alone')
    await p.keyboard.press('Backspace')
    await typeIn(p, ' ')
    expect(!(await row(p).count()), 'a space did not close the row')
    expect((await words(p)) === 'позвонить @сто ', `the field reads «${await words(p)}»`)
    await clear(p)
    await typeIn(p, 'почта@')
    expect((await words(p)) === 'почта@', `the field reads «${await words(p)}»`)
    expect(!(await row(p).count()), '«почта@» opened the row')
  } },
  // 12: «pick «Стоматолог»: the field reads «позвонить» and the chip «Стоматолог». Backspace removes the chip whole»
  { id: 'm24-12-pick', device: MOBILE, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    await pickChip(p, 'Стоматолог')
    expect(await chips(p).count() === 1 && (await chips(p).first().textContent()).trim() === 'Стоматолог', 'no «Стоматолог» chip in the field')
    expect((await words(p)).trim() === 'позвонить Стоматолог', `the field reads «${await words(p)}»`)
    expect(!(await row(p).count()), 'the row stayed after the pick')
    await p.keyboard.press('Backspace')
    await p.waitForTimeout(200)
    expect(!(await chips(p).count()), 'Backspace did not take the chip')
    expect((await words(p)) === 'позвонить ', `Backspace left «${await words(p)}»`)
  } },
  // 12: «with «Подпункт», «@» opens nothing» (a record's composer: a subitem is one line with no links). With «В заметку»
  // the name stays a chip: that mode is the templates slice's, so it is checked only once the chip offers it
  { id: 'm24-12-subitem', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const id = await store(p, data => Object.values(data.records).find(r => r.text === 'Яйца').id)
    await open(p, `/r/${id}`)
    const sub = p.getByRole('textbox', { name: 'Новый подпункт' })
    await sub.click()
    await typeIn(p, 'к омлету взять ещё @сы')
    expect(!(await row(p).count()), '«@» opened the row with «Подпункт»')
    const toNote = p.getByRole('button', { name: /В заметку|Куда записать/ })
    if (!(await toNote.count())) return
    await sub.fill('')
    await toNote.first().click()
    await p.waitForTimeout(400)
    const opt = p.getByRole('menuitemradio', { name: /В заметку/ }).or(p.getByRole('option', { name: /В заметку/ })).or(p.getByRole('button', { name: /^В заметку/ }))
    if (!(await opt.count())) return
    await opt.last().click()
    await p.waitForTimeout(300)
    await p.getByRole('textbox', { name: /Новый абзац|Новый подпункт/ }).last().click()
    await typeIn(p, 'к омлету взять ещё @сы')
    expect((await rowChips(p)).some(c => c.name === 'Сыр'), '«В заметку» does not offer «Сыр»')
  } },
  // 13: «after the pick the line reads «→ Задачи · связь: @Стоматолог». Send. The receipt row reads «Позвонить
  // @Стоматолог», and Задачи has the row in plain 16/400 ink. Open it: «Связано» lists Стоматолог; open Стоматолог:
  // «Связано» lists «Позвонить @Стоматолог»»
  { id: 'm24-13-send', device: MOBILE, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    await pickChip(p, 'Стоматолог')
    const line = (await guessLine(p).textContent()).replace(/\s+/g, ' ').trim()
    expect(line === '→ Задачи · связь: @Стоматолог', `the guess line reads «${line}»`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(800)
    const made = await recordsWith(p, '@Стоматолог')
    expect(made.length === 1 && made[0].text === 'Позвонить @Стоматолог' && made[0].page === 'Задачи', `the send made ${JSON.stringify(made)}`)
    expect(made[0].links.join() === 'Стоматолог', `the record links to ${made[0].links.join(', ') || 'nothing'}`)
    // Задачи's row: the same words, 16/400, no chip, no colour
    await open(p, '/')
    await p.getByRole('link', { name: /^Задачи/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(400)
    const look = await p.locator('main').getByText('Позвонить @Стоматолог', { exact: true }).first().evaluate((e) => {
      const s = getComputedStyle(e)
      return { size: s.fontSize, weight: s.fontWeight, chip: !!e.querySelector('.mention'), color: s.color }
    })
    const ink = await p.locator('main').getByText('Оплатить интернет', { exact: true }).first().evaluate(e => getComputedStyle(e).color)
    expect(look.size === '16px' && look.weight === '400' && !look.chip, `the row is ${look.size}/${look.weight}${look.chip ? ' with a chip' : ''}`)
    expect(look.color === ink, `the row's ink ${look.color} is not the other rows' ${ink}`)
    // «Связано» on both sides
    await open(p, `/r/${made[0].id}`)
    expect((await related(p)).some(t => t.startsWith('Стоматолог')), `«Связано» of the new record: ${JSON.stringify(await related(p))}`)
    const dentist = await store(p, data => Object.values(data.records).find(r => r.text === 'Стоматолог').id)
    await open(p, `/r/${dentist}`)
    expect((await related(p)).some(t => t.startsWith('Позвонить @Стоматолог')), `«Связано» of Стоматолог: ${JSON.stringify(await related(p))}`)
    // The receipt in Журнал
    await open(p, '/journal')
    expect(await shows(p.locator('main').getByText('Позвонить @Стоматолог', { exact: true })), 'the receipt row does not read «Позвонить @Стоматолог»')
  } },
  // 13: «rename Стоматолог to «Зубной врач». The row, the receipt in Журнал and «Связано» read «Позвонить @Зубной врач».
  // «Сохранить копию» → Markdown has `Позвонить [[Зубной врач]]`»
  { id: 'm24-13-rename', device: DESKTOP, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    await p.keyboard.press('Enter') // takes the marked «Стоматолог»
    await p.waitForTimeout(200)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(800)
    const dentist = await store(p, data => Object.values(data.records).find(r => r.text === 'Стоматолог').id)
    await open(p, `/r/${dentist}`)
    const title = p.getByRole('textbox', { name: 'Текст записи' })
    await title.fill('Зубной врач')
    await title.press('Enter')
    await p.waitForTimeout(400)
    expect((await related(p)).some(t => t.startsWith('Позвонить @Зубной врач')), `«Связано» of Зубной врач: ${JSON.stringify(await related(p))}`)
    const made = await recordsWith(p, '@')
    expect(made.length === 1 && made[0].text === 'Позвонить @Зубной врач', `the title reads ${JSON.stringify(made.map(r => r.text))}`)
    await open(p, '/journal')
    expect(await shows(p.locator('main').getByText('Позвонить @Зубной врач', { exact: true })), 'the receipt did not follow the rename')
    await open(p, '/settings')
    const md = p.getByRole('button', { name: 'Markdown', exact: true })
    if (!(await md.count())) {
      await p.getByRole('button', { name: /^Сохранить копию/ }).first().click()
      await p.waitForTimeout(400)
    }
    const download = p.waitForEvent('download')
    await p.getByRole('button', { name: 'Markdown', exact: true }).or(p.getByRole('menuitem', { name: /^Markdown/ })).first().click()
    const text = await (await (await download).createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8'))
    expect(text.includes('Позвонить [[Зубной врач]]'), 'no «Позвонить [[Зубной врач]]» in the Markdown')
  } },
  // 13: «on a fresh run, «Отменить» in the receipt leaves no record and no link, and puts «позвонить» and the chip back»;
  // one line, several records: each gets only the links in its own text
  { id: 'm24-13-undo', device: MOBILE, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    await pickChip(p, 'Стоматолог')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(800)
    await p.getByRole('button', { name: 'Отменить' }).first().click()
    await p.waitForTimeout(500)
    expect(!(await recordsWith(p, '@Стоматолог')).length, 'the record is still there')
    const links = await store(p, data => Object.values(data.records).filter(r => !r.deletedAt).flatMap(r => r.links ?? []).map(id => data.nameOf(id)))
    expect(!links.includes('Стоматолог'), 'a link to Стоматолог is still there')
    expect((await words(p)).trim() === 'позвонить Стоматолог' && await chips(p).count() === 1, `the field reads «${await words(p)}» with ${await chips(p).count()} chips`)
    // The same line with a second record: only the first links
    await field(p).click()
    await p.keyboard.press('End')
    await typeIn(p, ', купить хлеб')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(800)
    const made = await store(p, data => data.entries.at(-1).recordIds.map(id => data.records[id]).map(r => ({ text: r.text, links: r.links ?? [] })))
    expect(made.length === 2, `the line made ${made.length} records`)
    expect(made.filter(r => r.links.length).map(r => r.text).join() === 'Позвонить @Стоматолог', `linked: ${JSON.stringify(made)}`)
  } },
  // 14: «on Главная with the keyboard up, type «позвонить @сто». Every row above the chips is whole, no fade; Задачи with
  // both its lines and the «Личное» caption stay. Clear the field: the fade returns»
  { id: 'm24-14-edge', device: MOBILE, run: async (p) => {
    await home(p, true)
    await typeIn(p, 'позвонить @сто')
    let edge = await dockEdge(p)
    expect(!edge.fade, 'the list fades above the «@» row')
    expect(!edge.cut.length, `cut by the edge: ${edge.cut.join(', ')}`)
    // MobileComposerMention was drawn before «На неделе» joined Избранное (item 11), so there Задачи and «Личное» still
    // fit; with it the last whole row is Дела по дому, and nothing that fits is covered
    expect(edge.last, 'Дела по дому is not whole above the chips')
    expect(!edge.hidden.length, `covered though it fits: ${edge.hidden.join(', ')}`)
    // The guess line: the same hard edge; scrolled so an edge falls inside a row, it is covered
    await pickChip(p, 'Стоматолог')
    for (const dy of [0, 13, 29]) {
      await p.locator('.scroll-fade').first().evaluate((el, y) => {
        el.scrollTop += y
      }, dy)
      await p.waitForTimeout(250)
      edge = await dockEdge(p)
      expect(!edge.fade && !edge.cut.length && !edge.hidden.length, `scrolled ${dy}: ${edge.fade ? 'a fade' : `cut: ${edge.cut.join(', ')}; covered: ${edge.hidden.join(', ')}`}`)
    }
    await clear(p)
    await p.waitForTimeout(300)
    expect((await dockEdge(p)).fade, 'the fade did not come back with the field empty')
  } },
  // 16: «Поиск with the demo history shows «Открыто недавно», then the six»; «open Идеи, then Поиск again: Идеи is first
  // and listed once»; «Все секции» → «Дом»: only Яйца and Дела по дому; no screen says «Недавние записи»; D6 on the
  // phone: Полумарафон к маю reads «Цели»
  { id: 'm24-16-recent', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const rows = async () => {
      await p.getByRole('button', { name: 'Найти' }).first().click()
      await p.waitForTimeout(400)
      const list = await p.locator('section[aria-label="Открыто недавно"] li').evaluateAll(lis => lis.map(li => li.innerText.replace(/\s+/g, ' ').trim()))
      expect(!(await p.getByText('Недавние записи').count()), '«Недавние записи» is still there')
      return list
    }
    const first = await rows()
    const want = ['Яйца Покупки', 'Задачи Личное', 'Вернуть книгу в библиотеку Задачи · вс, 25 окт', 'Дела по дому Дом', 'Полумарафон к маю Цели', 'Атомные привычки Книги']
    expect(first.join(' | ') === want.join(' | '), `«Открыто недавно» reads ${first.join(' | ')}`)
    await p.getByRole('button', { name: /^Все секции/ }).click()
    await p.waitForTimeout(400)
    await p.getByRole('button', { name: 'Дом', exact: true }).last().click()
    await p.waitForTimeout(400)
    const home = await p.locator('section[aria-label="Открыто недавно"] li').evaluateAll(lis => lis.map(li => li.innerText.replace(/\s+/g, ' ').trim()))
    expect(home.join(' | ') === 'Яйца Покупки | Дела по дому Дом', `with «Дом»: ${home.join(' | ')}`)
    await p.getByRole('button', { name: 'Отмена' }).click()
    await p.waitForTimeout(300)
    await p.getByRole('link', { name: /^Идеи/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(300)
    await open(p, '/')
    const again = await rows()
    expect(again[0]?.startsWith('Идеи') && again.filter(t => t.startsWith('Идеи')).length === 1, `after Идеи: ${again.join(' | ')}`)
  } },
  // D2: «Главная: type «позвонить @сто». «Стоматолог» is marked. ↓ moves the mark to «Позвонить стоматологу», ↓ again
  // wraps to «Стоматолог». Enter makes the chip. Esc on a fresh «@сто» closes the row and leaves «@сто»»; «Ещё…» opens
  // «Связать» with the query typed
  { id: 'm24-d2-keys', device: DESKTOP, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    const marked = async () => (await rowChips(p)).filter(c => c.marked).map(c => c.name).join()
    expect(await marked() === 'Стоматолог', `marked: ${await marked()}`)
    await p.keyboard.press('ArrowDown')
    expect(await marked() === 'Позвонить стоматологу', `after ↓: ${await marked()}`)
    await p.keyboard.press('ArrowDown')
    expect(await marked() === 'Стоматолог', `after ↓ ↓: ${await marked()}`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(200)
    expect(await chips(p).count() === 1 && !(await row(p).count()), 'Enter did not make the chip')
    await typeIn(p, '@сто')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(!(await row(p).count()), 'Esc did not close the row')
    expect((await words(p)).endsWith('@сто'), `Esc left «${await words(p)}»`)
    await typeIn(p, ' @сто')
    await row(p).getByRole('button', { name: 'Ещё…' }).click()
    await p.waitForTimeout(500)
    const pop = p.getByRole('dialog').filter({ has: p.getByRole('heading', { name: 'Связать' }) })
    expect(await shows(pop), '«Ещё…» did not open «Связать»')
    expect(await pop.getByRole('textbox').first().inputValue() === 'сто', 'the query is not typed in «Связать»')
  } },
  // D2: «Ctrl K: «Открыто недавно» with Яйца selected and its preview on the right»; D6: «the fifth row reads «Полумарафон
  // к маю», line 2 «Цели · 18 мая 2027». «Все секции» → «Дом»: Яйца and Дела по дому»
  { id: 'm24-d6-find', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/journal')
    await p.keyboard.press('Control+k')
    await p.waitForTimeout(500)
    const options = () => p.getByRole('listbox', { name: 'Найденное' }).getByRole('option').evaluateAll(os => os.map(o => ({ text: o.innerText.split('\n').map(s => s.trim()).filter(Boolean), on: o.getAttribute('aria-selected') === 'true' })))
    expect(await shows(p.getByText('Открыто недавно', { exact: true })), 'no «Открыто недавно»')
    const list = await options()
    expect(list[0]?.on && list[0].text[0] === 'Яйца', `selected: ${JSON.stringify(list.find(o => o.on))}`)
    expect(await shows(p.getByRole('dialog').getByText(/Брать С0/)), 'no preview of Яйца on the right')
    expect(list[4]?.text[0] === 'Полумарафон к маю' && list[4].text[1] === 'Цели · 18 мая 2027', `the fifth row reads ${JSON.stringify(list[4]?.text)}`)
    await p.keyboard.press('ArrowDown')
    expect((await options())[1]?.on, '↓ does not move the selection')
    await p.getByRole('combobox').filter({ hasText: 'Все секции' }).click()
    await p.waitForTimeout(400)
    await p.getByRole('option', { name: 'Дом', exact: true }).last().click()
    await p.waitForTimeout(400)
    const home = (await options()).map(o => o.text[0])
    expect(home.join() === 'Яйца,Дела по дому', `with «Дом»: ${home.join(', ')}`)
  } },
  // D3: «Главная «позвонить @сто»: «Позвонить стоматологу» shows whole, not cut. After a pick the line reads «→ Задачи ·
  // связь: @Стоматолог»»; the row is 40 with 36px chips capped at 220
  { id: 'm24-d3-home', device: DESKTOP, run: async (p) => {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    const list = await rowChips(p)
    expect(list[1]?.name === 'Позвонить стоматологу' && !list[1].cut && list[1].width <= 220.5, `«Позвонить стоматологу» is ${list[1]?.cut ? 'cut' : `${Math.round(list[1]?.width)}px`}`)
    const r = await row(p).boundingBox()
    const pill = await p.locator('form').filter({ has: field(p) }).boundingBox()
    const chip = await row(p).locator('button').first().boundingBox()
    expect(Math.round(r.height) === 40 && Math.round(chip.height) === 36, `the row is ${r.height}, its chips ${chip.height}`)
    expect(Math.abs(pill.y - (chip.y + chip.height) - 8) <= 1, `the chips end ${pill.y - chip.y - chip.height}px above the pill`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    const line = (await guessLine(p).textContent()).replace(/\s+/g, ' ').trim()
    expect(line === '→ Задачи · связь: @Стоматолог', `the guess line reads «${line}»`)
  } },
  // D3: «Журнал «записаться на забег к @пол» offers «Полумарафон к маю», and the feed above ends at a hard edge with no
  // half line»
  { id: 'm24-d3-journal', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/journal')
    await seedHealth(p)
    await field(p).click()
    await typeIn(p, 'записаться на забег к @пол')
    const list = await rowChips(p)
    expect(list.map(c => c.name).join() === 'Полумарафон к маю', `the row offers ${list.map(c => c.name).join(', ')}`)
    const edge = await dockEdge(p)
    expect(!edge.fade && !edge.cut.length, edge.fade ? 'the feed fades above the row' : `cut by the edge: ${edge.cut.join(', ')}`)
  } },
  // D3: «Задачи «записаться к @сто» offers the same row. Send: «Записаться к @Стоматолог», linked»
  { id: 'm24-d3-page', device: DESKTOP, run: async (p) => {
    await home(p)
    await p.getByRole('link', { name: /^Задачи/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(400)
    await field(p).click()
    await typeIn(p, 'записаться к @сто')
    const list = await rowChips(p)
    expect(list.map(c => c.name).join() === 'Стоматолог,Позвонить стоматологу', `the row offers ${list.map(c => c.name).join(', ')}`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(200)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(800)
    const made = await recordsWith(p, '@Стоматолог')
    expect(made.length === 1 && made[0].text === 'Записаться к @Стоматолог' && made[0].page === 'Задачи' && made[0].links.join() === 'Стоматолог', `the send made ${JSON.stringify(made)}`)
  } }
]
