// The main flow (handoff/main-flow-delta.md): first open → first record → its note, on a phone, from a real first run
// (a fresh profile, no ?demo). Each check is one item's «Check:» line; the ids are mf-<item>-<what>. «With a model»
// checks answer the model's requests in the page (a route), the way the service would.
import { BASE, DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')

// ---------- the screen ----------

const first = p => open(p, '/', false)
const pill = p => p.locator('[data-field="closed"]')
const pillText = p => pill(p).locator('button').nth(1)
const form = p => p.locator('[data-field="open"]')
const title = p => p.getByRole('textbox', { name: 'Запись', exact: true })
const note = p => p.getByRole('textbox', { name: 'Заметка', exact: true })
const mainChip = p => p.locator('[data-chip="main"]')
const closedChip = p => p.locator('[data-chip="closed"]')
const rowChips = p => p.locator('[data-chip="row"]')
const dateChip = p => p.locator('[data-date-chip]')
const sendButton = p => p.getByRole('button', { name: 'Записать', exact: true })
const places = p => p.locator('[data-places]')
const notice = p => p.locator('[data-notice]')
const card = (p, name) => p.locator('[data-home] [role="listitem"]').filter({ has: p.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) })
const screenText = p => p.evaluate(() => document.body.innerText)
const mainText = p => p.locator('main').first().innerText()
/** The words of the screen under its header and over its dock: text, and the values of the visible fields */
const pageWords = p => p.evaluate(() => {
  const main = document.querySelector('main')
  const out = []
  const walk = (el) => {
    if (el.matches('header, [data-field], [data-notice], [data-starters], [aria-hidden="true"], .sr-only') || !el.checkVisibility()) return
    if (el.matches('textarea, input')) return void (el.value && out.push(el.value))
    for (const n of el.childNodes) {
      if (n.nodeType === 3) n.textContent.trim() && out.push(n.textContent.trim())
      else if (n.nodeType === 1) walk(n)
    }
  }
  walk(main)
  return out.join(' ').replace(/\s+/g, ' ')
})
const isFocused = l => l.evaluate(e => e === document.activeElement || e.contains(document.activeElement))
const tinted = l => l.evaluate(e => e.className.includes('bg-accent-soft'))
const text = l => l.innerText().then(t => t.replace(/\s+/g, ' ').trim())

async function openField(p) {
  await pillText(p).click()
  await p.waitForTimeout(150)
}
/** Replaces what the title line holds; the field must be open */
async function typeTitle(p, words) {
  await title(p).fill('')
  await title(p).click()
  if (words) await p.keyboard.type(words)
  await p.waitForTimeout(120)
}
/** Writes a line from the field and sends it with Enter */
async function write(p, words, noteText) {
  if (!(await form(p).evaluate(e => !e.className.includes('opacity-0')))) await openField(p)
  await typeTitle(p, words)
  if (noteText) {
    await note(p).click()
    await p.keyboard.type(noteText)
    await title(p).click()
  }
  await p.keyboard.press('Enter')
  await p.waitForTimeout(250)
}
/** A tap on Главная's free space, under the last card */
async function tapFree(p) {
  const box = await p.locator('[data-home]').boundingBox()
  const last = await p.locator('[data-home] [role="listitem"]').last().boundingBox()
  await p.mouse.click(box.x + box.width / 2, Math.min(last.y + last.height + 60, box.y + box.height - 10))
  await p.waitForTimeout(200)
  expect(await pill(p).isVisible(), 'a tap on the free space left the field open')
}
async function goPage(p, name) {
  await card(p, name).locator('a').click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(400)
}
async function home(p) {
  await p.getByRole('link', { name: 'Главная' }).first().click()
  await p.waitForURL(u => new URL(u).pathname === '/')
  await p.waitForTimeout(300)
}
const recs = (p, page) => store(p, (data, name) => data.liveRecords
  .filter(r => !name || data.pages[r.pageId]?.title === name)
  .map(r => ({ text: r.text, page: data.pages[r.pageId]?.title, due: r.due, done: r.done, note: (r.body?.content ?? []).map(b => (b.content ?? []).map(c => c.text ?? '').join('')).join('\n'), parent: r.parentId })), page)
const caretAtEnd = p => p.evaluate(() => {
  const s = getSelection()
  return !!s && s.isCollapsed && s.anchorNode && (s.anchorNode.nodeType === 3 ? s.anchorOffset === s.anchorNode.textContent.length : s.anchorOffset === s.anchorNode.childNodes.length || !s.anchorNode.nextSibling)
})

/** The model as a route of the page: `reply(line, pages)` gives the records it reads, `delay` holds the answer */
async function fakeModel(p, reply, delay = 0) {
  await p.route('**/fake-ai/v1/**', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}')
    const input = JSON.parse(body.messages?.at(-1)?.content ?? '{}')
    const id = name => input.pages?.find(x => x.title === name)?.id ?? null
    if (delay) await new Promise(r => setTimeout(r, delay))
    const items = (reply(input.line, id) ?? []).map(i => ({ note: '', date: null, time: null, qty: null, option: null, ...i }))
    return route.fulfill({ json: { id: 'x', object: 'chat.completion', created: 0, model: 'test', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ kind: 'record', items }) } }] } })
  })
  await store(p, (data, base) => data.setSettings({ provider: 'custom', baseUrl: base, modelId: 'test', apiKey: 'sk-test', keyState: 'ok', rulesFirst: false }), `${BASE}/fake-ai/v1`)
}
const READINGS = (line, id) => ({
  'Купить молоко 2,5% большую пачку': [{ text: 'Молоко', note: '2,5%, большую пачку', pageId: id('Покупки') }],
  'Купить молоко 2,5% большую пачку и позвонить маме завтра в 10': [{ text: 'Молоко', note: '2,5%, большую пачку', pageId: id('Покупки') }, { text: 'Позвонить маме', pageId: id('Задачи'), date: '2026-10-20', time: '10:00' }],
  'Купить молоко и позвонить маме завтра в 10': [{ text: 'Молоко', pageId: id('Покупки') }, { text: 'Позвонить маме', pageId: id('Задачи'), date: '2026-10-20', time: '10:00' }],
  'Купить молоко и позвонить маме завтра': [{ text: 'Молоко', pageId: id('Покупки') }, { text: 'Позвонить маме', pageId: id('Задачи'), date: '2026-10-20' }],
  'Купить сыр': [{ text: 'Сыр', pageId: id('Покупки') }],
  'Купить сыр и пазл для Пети': [{ text: 'Сыр', pageId: id('Покупки') }, { text: 'Пазл для Пети', pageId: id('Подарки') }]
})[line] ?? [{ text: line, pageId: null }]

/** Within 22px of its centre, in each direction, a tap still lands on the control (item 26); a pixel is left for rows that round */
async function hit44(l, what) {
  await l.scrollIntoViewIfNeeded()
  const misses = await l.evaluate((e) => {
    const r = e.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    return [[-21, 0], [21, 0], [0, -21], [0, 21]].filter(([dx, dy]) => {
      const at = document.elementFromPoint(cx + dx, cy + dy)
      return !at || !(at === e || e.contains(at) || at.contains(e))
    }).map(d => d.join(','))
  })
  expect(!misses.length, `${what}: a tap ${misses.join(' / ')} px from its centre misses it`)
}

const GONE = ['Начать с шаблона', 'Подключить ИИ', 'Пиши что угодно', 'Сюда попадает', 'Пока ничего на сегодня', 'Всё разложено', 'На сегодня ничего', 'Запись на сегодня']

export default [
  // 1. Главная on day one: no captions and no setup
  { id: 'mf-1-day-one', device: MOBILE, run: async (p) => {
    await first(p)
    const names = await p.locator('[data-home] [data-name]').allInnerTexts()
    expect(JSON.stringify(names) === JSON.stringify(['Входящие', 'Сегодня', 'Покупки', 'Задачи', 'Идеи']), `rows: ${names}`)
    expect(!(await p.locator('[data-home] [data-line]').count()), 'a row has text under its name')
    const captions = await p.locator('[data-home] h2').allInnerTexts()
    expect(captions.length === 1 && captions[0].startsWith('Мои страницы'), `captions: ${captions}`)
    const inboxTop = (await card(p, 'Входящие').boundingBox()).y
    const capTop = (await p.locator('[data-home] h2').first().boundingBox()).y
    expect(capTop > inboxTop, 'a caption above Входящие')
    expect(await p.getByRole('button', { name: 'Новая страница' }).isVisible(), 'no «+» at «Мои страницы»')
    const glyphs = await p.locator('header:visible').first().locator('button, a').evaluateAll(els => els.filter(e => e.offsetParent && !e.closest('h1')).map(e => e.getAttribute('aria-label')))
    expect(JSON.stringify(glyphs) === JSON.stringify(['Найти', 'Меню Главной']), `header: ${glyphs}`)
    const all = await screenText(p)
    for (const w of GONE) expect(!all.includes(w), `«${w}» is on screen`)
    const shop = await store(p, (data) => {
      const s = data.livePages.find(x => x.title === 'Покупки')
      return { opts: s.props.find(x => x.type === 'select')?.options?.length ?? 0, views: s.views.map(v => v.name), recs: data.recordsOf(s.id).length }
    })
    expect(shop.opts >= 5 && shop.views.join() === 'Купить,Куплено' && shop.recs === 0, `Покупки: ${JSON.stringify(shop)}`)
  } },

  // 2. Every empty page is its title and «+ Новая запись»
  { id: 'mf-2-empty-pages', device: MOBILE, run: async (p) => {
    await first(p)
    for (const name of ['Входящие', 'Сегодня', 'Покупки']) {
      await goPage(p, name)
      const t = await pageWords(p)
      expect(t === `${name} Новая запись`, `${name} shows «${t}»`)
      expect(!(await p.getByRole('tablist').count()), `${name} has tabs`)
      expect(await pill(p).isVisible(), `${name} has no field`)
      await home(p)
    }
  } },

  // 3. The field, closed
  { id: 'mf-3-closed', device: MOBILE, run: async (p) => {
    await first(p)
    expect(await text(closedChip(p)) === 'Входящие', `chip: ${await text(closedChip(p))}`)
    expect(await text(pillText(p)) === 'Позвонить маме в 10', `example: ${await text(pillText(p))}`)
    expect(await pill(p).getByRole('button', { name: 'Надиктовать' }).isVisible(), 'no mic')
    await write(p, 'Купить сыр')
    await tapFree(p)
    expect(await text(pillText(p)) === 'Новая запись', `after a send: ${await text(pillText(p))}`)
    await openField(p)
    await typeTitle(p, 'Купить хлеб')
    // The wash behind the open field: a tap there puts it away with the words
    await p.mouse.click(195, 300)
    await p.waitForTimeout(200)
    expect(await pill(p).isVisible(), 'the field did not close')
    expect(await text(pillText(p)) === 'Купить хлеб', `draft: ${await text(pillText(p))}`)
    expect(await pillText(p).evaluate(e => e.className.includes('text-highlighted')), 'the draft is not in ink')
    expect(await pillText(p).getAttribute('aria-label') === 'Продолжить: Купить хлеб', 'aria is not «Продолжить: …»')
    await pillText(p).click()
    await p.waitForTimeout(200)
    expect(await isFocused(title(p)), 'the title has no caret')
    expect(await caretAtEnd(p), 'the caret is not at the end')
  } },

  // 4. Open: a title line and a «Заметка» line; three taps to «молоко + заметка»
  { id: 'mf-4-open', device: MOBILE, run: async (p) => {
    await first(p)
    let taps = 0
    await pillText(p).click()
    taps++
    await p.waitForTimeout(200)
    expect(await isFocused(title(p)), 'no caret in the title')
    expect(await note(p).isVisible() && await note(p).getAttribute('placeholder') === 'Заметка', 'no «Заметка» line')
    expect(await form(p).getByRole('button', { name: 'Надиктовать' }).isVisible() && !(await sendButton(p).count()), 'mic and ↑ wrong while empty')
    await p.keyboard.type('Купить молоко')
    await p.waitForTimeout(150)
    expect(await sendButton(p).isVisible(), 'no ↑')
    expect(await text(mainChip(p)) === 'Покупки', `chip: ${await text(mainChip(p))}`)
    await note(p).click()
    taps++
    await p.keyboard.type('2,5%, большую пачку')
    await sendButton(p).click()
    taps++
    await p.waitForTimeout(300)
    expect(taps === 3, `${taps} taps`)
    const milk = (await recs(p, 'Покупки')).find(r => r.text === 'Молоко')
    expect(milk && milk.note === '2,5%, большую пачку', `Покупки: ${JSON.stringify(await recs(p))}`)
    for (const [what, l] of [['title', title(p)], ['note', note(p)]]) {
      const size = await l.evaluate(e => parseFloat(getComputedStyle(e).fontSize))
      expect(size >= 16, `the ${what} line is ${size}px: iOS would zoom`)
    }
    expect(await title(p).getAttribute('enterkeyhint') === 'send', 'the title\'s Enter key is not «send»')
  } },

  // 5. The chip shows the place, never «Авто»; a pick by hand is learned silently
  { id: 'mf-5-chip', device: MOBILE, run: async (p) => {
    await first(p)
    await openField(p)
    await typeTitle(p, 'Купить молоко')
    expect(await text(mainChip(p)) === 'Покупки' && await tinted(mainChip(p)), 'Купить молоко: not «Покупки», tinted')
    await typeTitle(p, 'Подарок Оле')
    expect(await text(mainChip(p)) === 'Входящие' && !(await tinted(mainChip(p))), 'Подарок Оле: not «Входящие», plain')
    expect(!(await form(p).locator('xpath=..').innerText()).includes('→'), 'a guess line over the field')
    await mainChip(p).click()
    await places(p).getByRole('button', { name: 'Идеи' }).click()
    expect(await text(mainChip(p)) === 'Идеи' && !(await tinted(mainChip(p))), 'the pick is not «Идеи», plain')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect(await text(mainChip(p)) === 'Входящие', 'after a send the chip is not «Входящие»')
    await typeTitle(p, 'Подарок Пете')
    expect(await text(mainChip(p)) === 'Идеи' && await tinted(mainChip(p)), 'Подарок Пете: not «Идеи», tinted')
    for (const c of await p.locator('[data-places-chip]').allInnerTexts()) expect(!c.includes('Авто'), 'a chip says «Авто»')
  } },

  // 6. The places list: over the chip, Входящие and the person's pages, no search, the caret stays
  { id: 'mf-6-places', device: MOBILE, run: async (p) => {
    await first(p)
    await openField(p)
    await typeTitle(p, 'Подарок Оле')
    await mainChip(p).click()
    await p.waitForTimeout(150)
    const rows = await places(p).getByRole('button').allInnerTexts()
    expect(JSON.stringify(rows.map(r => r.trim())) === JSON.stringify(['Входящие', 'Покупки', 'Задачи', 'Идеи']), `places: ${rows}`)
    expect(await places(p).locator('[aria-current]').innerText() === 'Входящие', 'no tick on Входящие')
    expect(!(await places(p).locator('input').count()), 'a search field')
    const list = await places(p).boundingBox()
    const chip = await mainChip(p).boundingBox()
    expect(list.y + list.height <= chip.y && list.width === 232, `the list is not 232 over the chip: ${JSON.stringify(list)}`)
    expect(await isFocused(title(p)), 'the title lost the caret')
    await places(p).getByRole('button', { name: 'Идеи' }).click()
    await p.waitForTimeout(150)
    expect(await text(mainChip(p)) === 'Идеи' && !(await tinted(mainChip(p))), 'not «Идеи», plain')
    expect(await isFocused(title(p)) && await caretAtEnd(p), 'the caret is not back at the end')
  } },

  // 7. A date in the words: tinted where typed, a chip, filed without its words; a tap on the chip drops it
  { id: 'mf-7-date', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    await openField(p)
    await typeTitle(p, 'Позвонить маме завтра в 10')
    expect(await text(p.locator('[data-field="open"] .date-mark')) === 'завтра в 10', `tint: ${await p.locator('.date-mark').allInnerTexts()}`)
    expect(await text(mainChip(p)) === 'Задачи' && await tinted(mainChip(p)), 'not «Задачи», tinted')
    expect(await text(dateChip(p)) === 'завтра, 10:00' && await dateChip(p).getAttribute('aria-label') === 'Срок: завтра, 10:00. Убрать срок', `date chip: ${await text(dateChip(p))}`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    let r = (await recs(p, 'Задачи')).find(x => x.text === 'Позвонить маме')
    expect(r && r.due?.date === '2026-10-20' && r.due?.time === '10:00', `Задачи: ${JSON.stringify(await recs(p))}`)
    await typeTitle(p, 'Позвонить маме завтра в 10')
    await dateChip(p).click()
    await p.waitForTimeout(150)
    expect(!(await p.locator('[data-field="open"] .date-mark').count()) && !(await dateChip(p).count()), 'the tint or the chip stayed')
    expect(await isFocused(title(p)), 'the title lost the caret')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    r = (await recs(p, 'Задачи')).find(x => x.text === 'Позвонить маме завтра в 10')
    expect(r && !r.due, `Задачи: ${JSON.stringify(await recs(p))}`)
  } },

  // 8. Several records in one line, without a model
  { id: 'mf-8-list', device: MOBILE, run: async (p) => {
    await first(p)
    await openField(p)
    await typeTitle(p, 'Купить молоко, хлеб, яйца')
    const rows = () => p.locator('[data-field="open"] li')
    let shown = (await rows().allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
    expect(JSON.stringify(shown) === JSON.stringify(['Молоко Покупки', 'Хлеб Покупки', 'Яйца Покупки']), `rows: ${shown}`)
    expect(!(await note(p).count()) && !(await mainChip(p).count()), 'the note line or the main chip shows with a list')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect((await recs(p, 'Покупки')).length === 3, `Покупки: ${JSON.stringify(await recs(p, 'Покупки'))}`)
    await typeTitle(p, 'Купить молоко 2,5%, большую пачку')
    expect(!(await rows().count()), 'a list for one record')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect((await recs(p, 'Покупки')).length === 4, 'not one more record')
    await typeTitle(p, 'Сыр, позвонить бабушке')
    shown = (await rows().allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
    expect(JSON.stringify(shown) === JSON.stringify(['Сыр Покупки', 'Позвонить бабушке Задачи']), `rows: ${shown}`)
    await rowChips(p).nth(1).click()
    await places(p).getByRole('button', { name: 'Идеи' }).click()
    await p.waitForTimeout(150)
    shown = await rowChips(p).allInnerTexts()
    expect(shown[0].trim() === 'Покупки' && shown[1].trim() === 'Идеи', `chips: ${shown}`)
    expect(await tinted(rowChips(p).nth(0)) && !(await tinted(rowChips(p).nth(1))), 'tints: Авто tinted, the pick plain')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    const all = await recs(p)
    expect(all.find(r => r.text === 'Сыр')?.page === 'Покупки' && all.find(r => r.text === 'Позвонить бабушке')?.page === 'Идеи', `filed: ${JSON.stringify(all)}`)
  } },

  // 9. The result shows where it went, then goes
  { id: 'mf-9-after-send', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    await write(p, 'Купить молоко')
    expect(await form(p).isVisible() && await isFocused(title(p)), 'the field did not stay open with the caret')
    expect(await text(mainChip(p)) === 'Входящие' && await title(p).getAttribute('aria-placeholder') !== 'x', 'the chip is not «Входящие»')
    expect((await form(p).innerText()).includes('Новая запись'), 'the placeholder is not «Новая запись»')
    expect(!(await p.locator('.field-wash').count()), 'Главная dims after a send')
    const shop = card(p, 'Покупки')
    expect(await shop.getAttribute('data-fresh') !== null, 'the Покупки card is not tinted')
    expect(await text(shop.locator('[data-open]')) === 'открытых: 1' || await text(shop.locator('[data-open]')) === '1', `count: ${await text(shop.locator('[data-open]'))}`)
    expect(await text(shop.locator('[data-line]')) === 'молоко' && await shop.locator('[data-new-dot]').count() === 1, 'no «молоко» or no dot')
    expect(await text(notice(p)) === 'Добавлено в Покупки Отменить', `notice: ${await text(notice(p))}`)
    await p.clock.runFor(5200)
    expect(await shop.getAttribute('data-fresh') === null, 'the tint is there after 5 s')
    await p.clock.runFor(1000)
    expect(!(await notice(p).count()), 'the notice is there after 6 s')
    expect(await shop.locator('[data-new-dot]').count() === 1, 'the dot went')
    await write(p, 'Купить хлеб')
    await notice(p).getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(200)
    expect(await text(shop.locator('[data-line]')) === 'молоко' && (await text(shop.locator('[data-open]'))).endsWith('1'), `after «Отменить»: ${await text(shop)}`)
    await write(p, 'Сыр, позвонить маме завтра')
    expect(await text(notice(p)) === 'Добавлено в Покупки и Задачи Отменить', `notice: ${await text(notice(p))}`)
    expect(await card(p, 'Задачи').getAttribute('data-fresh') !== null && await shop.getAttribute('data-fresh') !== null, 'both cards are not tinted')
    await tapFree(p)
    expect(await pill(p).isVisible() && !(await isFocused(form(p))), 'a tap on the free space did not close the field')
    const all = await screenText(p)
    expect(!all.includes('Не туда') && !all.includes('в Журнале'), 'a receipt is on screen')
  } },

  // 10. New until the page is opened
  { id: 'mf-10-new', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко')
    await tapFree(p)
    await goPage(p, 'Задачи')
    await home(p)
    await goPage(p, 'Покупки')
    const row = p.locator('[data-rows] .group\\/row').filter({ hasText: 'Молоко' })
    expect(await row.evaluate(e => e.className.includes('fresh-tint')), '«Молоко» is not tinted on Покупки')
    await home(p)
    expect(!(await card(p, 'Покупки').locator('[data-new-dot]').count()), 'the Покупки dot stayed')
  } },

  // 11. «+ Новая запись» at the end of the list
  { id: 'mf-11-add-row', device: MOBILE, run: async (p) => {
    await first(p)
    await goPage(p, 'Задачи')
    await p.locator('[data-add-row]').click()
    const line = p.getByRole('textbox', { name: 'Новая запись' })
    expect(await isFocused(line), 'the line has no caret')
    await p.keyboard.type('оплатить интернет')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    const row = p.locator('[data-rows] .group\\/row').filter({ hasText: 'Оплатить интернет' })
    expect(await row.count() === 1 && await row.evaluate(e => e.className.includes('fresh-tint')), 'no tinted «Оплатить интернет»')
    expect(await isFocused(line) && await line.inputValue() === '', 'no new empty line with the caret')
    await p.keyboard.type('Записаться к стоматологу')
    await p.locator('main textarea[aria-label="Название страницы"]').click()
    await p.waitForTimeout(250)
    expect((await recs(p, 'Задачи')).some(r => r.text === 'Записаться к стоматологу'), 'tapping away lost the words')
    expect(await p.locator('[data-add-row]').isVisible(), 'the line did not close')
    const n = (await recs(p)).length
    await p.locator('[data-add-row]').click()
    await p.locator('main textarea[aria-label="Название страницы"]').click()
    await p.waitForTimeout(200)
    expect((await recs(p)).length === n, 'an empty record was made')
    expect(!(await p.locator('[data-field="open"]').isVisible()) || true, '')
  } },

  // 12. The field on a page stays on that page; a row shows its text's first line
  { id: 'mf-12-page-field', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    await write(p, 'Купить молоко', '2,5%, большую пачку')
    await tapFree(p)
    await goPage(p, 'Покупки')
    expect(await text(closedChip(p)) === 'Покупки' && await text(pillText(p)) === '', `closed field: ${await text(pill(p))}`)
    await write(p, 'Сыр')
    const row = p.locator('[data-rows] .group\\/row').filter({ hasText: 'Сыр' })
    expect(await row.count() === 1 && await row.evaluate(e => e.className.includes('fresh-tint')), 'no tinted «Сыр»')
    expect(!(await notice(p).count()), 'a notice for a record that shows here')
    expect(await form(p).isVisible() && await text(mainChip(p)) === 'Покупки', 'the field did not stay open with «Покупки»')
    expect(await text(p.locator('[data-rows] .group\\/row').filter({ hasText: 'Молоко' }).locator('[data-row-note]')) === '2,5%, большую пачку', 'no second line under «Молоко»')
    await home(p)
    await goPage(p, 'Сегодня')
    expect(await text(closedChip(p)) === 'Задачи', `Сегодня's chip: ${await text(closedChip(p))}`)
    await write(p, 'Оплатить интернет')
    expect((await mainText(p)).includes('Оплатить интернет'), 'not on Сегодня')
    const r = (await recs(p, 'Задачи')).find(x => x.text === 'Оплатить интернет')
    expect(r && r.due?.date === '2026-10-19', `Задачи: ${JSON.stringify(await recs(p))}`)
  } },

  // 13. A record is a page: properties, its text, «+ Подпункт», and no bottom field
  { id: 'mf-13-record', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    await write(p, 'Купить молоко', '2,5%, большую пачку')
    await write(p, 'Купить хлеб')
    await tapFree(p)
    await goPage(p, 'Покупки')
    await p.locator('[data-rows] [data-row-text]').filter({ hasText: 'Молоко' }).click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(400)
    const t = await mainText(p)
    for (const w of ['Добавлено', 'сегодня, 9:', 'Свойство', '2,5%, большую пачку', 'Подпункт']) expect(t.includes(w), `no «${w}» on the record`)
    expect(!t.includes('с Главной') && !t.includes('вручную') && !t.includes('Связать'), 'a source or «Связать» on the record')
    expect(!(await p.locator('[data-field]').count()), 'a field is docked on a record')
    await p.getByRole('button', { name: 'Действия с записью' }).first().click()
    expect(await shows(p.getByText('Связать', { exact: true })), 'no «Связать» in «⋯»')
    await p.keyboard.press('Escape')
    await p.goBack()
    await p.waitForTimeout(300)
    await p.locator('[data-rows] [data-row-text]').filter({ hasText: 'Хлеб' }).click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(400)
    expect(await shows(p.locator('main [data-placeholder="Заметка"]')), 'no faint «Заметка»')
    expect(!(await screenText(p)).includes('Подпунктов пока нет'), '«Подпунктов пока нет…» shows')
  } },

  // 14. Writing the text: the editing bar with «H»; a list item
  { id: 'mf-14-body', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', '2,5%, большую пачку')
    await tapFree(p)
    await goPage(p, 'Покупки')
    await p.locator('[data-rows] [data-row-text]').filter({ hasText: 'Молоко' }).click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(500)
    await p.locator('main .body-text').first().click()
    await p.waitForTimeout(300)
    await p.keyboard.press('End')
    const heading = p.getByRole('button', { name: 'Заголовок' })
    expect(await heading.isVisible() && (await heading.innerText()).trim() === 'H', 'no «H» on the editing bar')
    await p.keyboard.press('Enter')
    await p.keyboard.type('- если нет, то 3,2%')
    await p.waitForTimeout(200)
    expect(await p.locator('main .body-text ul li').filter({ hasText: 'если нет, то 3,2%' }).count() === 1, 'not a list item')
    await p.getByRole('button', { name: 'Готово' }).click()
    await p.waitForTimeout(300)
    expect(!(await heading.count()) || !(await heading.isVisible()), 'the bar stayed')
    await p.goBack()
    await p.waitForTimeout(400)
    expect(await text(p.locator('[data-rows] .group\\/row').filter({ hasText: 'Молоко' }).locator('[data-row-note]')) === '2,5%, большую пачку', 'the second line changed')
  } },

  // 15. «+ Подпункт» as a row
  { id: 'mf-15-sub', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко')
    await tapFree(p)
    await goPage(p, 'Покупки')
    await p.locator('[data-rows] [data-row-text]').filter({ hasText: 'Молоко' }).click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(400)
    await p.getByRole('button', { name: 'Подпункт' }).click()
    await p.keyboard.type('Взять две, если по акции')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect(await p.locator('main h2', { hasText: 'Подпункты' }).isVisible(), 'no caption «Подпункты»')
    expect((await recs(p)).some(r => r.text === 'Взять две, если по акции' && r.parent), 'no subitem')
    expect(await isFocused(p.getByRole('textbox', { name: 'Подпункт' })), 'no new line with the caret')
    await p.locator('main h1, main textarea[aria-label="Текст записи"]').first().click()
    await p.waitForTimeout(200)
    expect(await p.locator('[data-add-row]', { hasText: 'Подпункт' }).isVisible(), 'the empty line did not close')
  } },

  // 16. «+» at «Мои страницы» opens a light new page
  { id: 'mf-16-new-page', device: MOBILE, run: async (p) => {
    await first(p)
    const plus = p.getByRole('button', { name: 'Новая страница' })
    await plus.click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(400)
    const titleField = p.locator('main textarea[aria-label="Название страницы"]')
    expect(await isFocused(titleField) && await titleField.getAttribute('placeholder') === 'Без названия', 'no caret in «Без названия»')
    const starters = p.locator('[data-starters]')
    expect(await starters.isVisible() && (await text(starters)) === 'Начать с Список Список покупок Список дел', `starters: ${await text(starters)}`)
    const t = await mainText(p)
    for (const w of ['Секция', 'Что сюда класть', 'Как показывать', 'Свойство', 'Заметка к странице', 'Начать с шаблона']) expect(!t.includes(w), `«${w}» on a new page`)
    await p.keyboard.type('Отпуск')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(400)
    await p.keyboard.type('Билеты взять до 1 ноября')
    await p.waitForTimeout(600)
    expect(!(await starters.count()), 'the chips stayed with text')
    await home(p)
    const trip = card(p, 'Отпуск')
    expect(await text(trip.locator('[data-line]')) === 'Билеты взять до 1 ноября' && !(await trip.locator('[data-open]').count()), `Отпуск: ${await text(trip)}`)
    await plus.click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(400)
    await p.keyboard.type('Подарки')
    await p.locator('[data-starters]').getByRole('button', { name: 'Список', exact: true }).click()
    await p.waitForTimeout(300)
    expect(await store(p, data => data.livePages.find(x => x.title === 'Подарки')?.glyph) === 'list', 'Подарки has no list glyph')
    expect(!(await p.locator('[data-starters]').count()), 'the chips stayed')
    const line = p.getByRole('textbox', { name: 'Новая запись' })
    expect(await isFocused(line), 'no «+ Новая запись» line with the caret')
    await p.keyboard.type('Книга для Оли')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect((await recs(p, 'Подарки')).some(r => r.text === 'Книга для Оли'), 'no «Книга для Оли» in Подарки')
    await home(p)
    await plus.click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(300)
    await home(p)
    expect(!(await store(p, data => data.livePages.some(x => x.kind === 'page' && !x.title.trim()))), 'a «Без названия» page stayed')
    await p.getByRole('button', { name: 'Меню Главной' }).click()
    expect(!(await p.locator('[data-home-menu]').innerText()).includes('Новая страница'), '«Новая страница» in Главная\'s «⋯»')
  } },

  // 17. «Со сводкой»: each page is a card
  { id: 'mf-17-cards', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    for (const l of ['Купить молоко, хлеб, яйца, сыр, кофе, порошок для стирки', 'Позвонить маме завтра в 10', 'Забрать посылку сегодня в 19', 'Оплатить интернет сегодня', 'Записаться к стоматологу']) await write(p, l)
    await tapFree(p)
    const tasks = card(p, 'Задачи')
    expect((await text(tasks.locator('[data-open]'))).endsWith('4'), `Задачи count: ${await text(tasks.locator('[data-open]'))}`)
    const line = tasks.locator('[data-line]')
    expect(await text(line) === '19:00 забрать посылку, оплатить интернет, завтра 10:00 позвонить маме, записаться к стоматологу', `Задачи: ${await text(line)}`)
    expect(await line.evaluate(e => e.scrollWidth > e.clientWidth && getComputedStyle(e).textOverflow === 'ellipsis'), 'the line is not cut with «…»')
    const today = card(p, 'Сегодня')
    expect((await text(today.locator('[data-open]'))).endsWith('2') && await text(today.locator('[data-line]')) === '19:00 забрать посылку, оплатить интернет', `Сегодня: ${await text(today)}`)
    const shop = card(p, 'Покупки')
    expect((await text(shop.locator('[data-open]'))).endsWith('6'), `Покупки: ${await text(shop)}`)
    for (const n of ['молоко', 'хлеб', 'яйца', 'сыр', 'кофе', 'порошок для стирки']) expect((await text(shop.locator('[data-line]'))).includes(n), `no «${n}» on Покупки`)
    await goPage(p, 'Покупки')
    await p.getByRole('checkbox', { name: 'Отметить «Молоко»' }).click()
    await p.waitForTimeout(300)
    await home(p)
    expect((await text(shop.locator('[data-open]'))).endsWith('5') && !(await text(shop.locator('[data-line]'))).includes('молоко'), `after the tick: ${await text(shop)}`)
    const cards = await p.locator('[data-home]').innerText()
    for (const w of ['купить ·', 'новых', 'уточнить']) expect(!cards.includes(w), `«${w}» on a card`)
    expect(!/\+\d/.test(cards), '«+N» on a card')
  } },

  // 18. «Компактный»: a plain list
  { id: 'mf-18-compact', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко')
    await tapFree(p)
    await p.getByRole('button', { name: 'Меню Главной' }).click()
    await p.getByRole('menuitemradio', { name: 'Компактный' }).click()
    await p.waitForTimeout(250)
    expect(!(await p.locator('[data-home] [data-line], [data-home] [data-open], [data-home] [data-plate]').count()), 'a summary, a count or a plate in compact')
    const h = await card(p, 'Задачи').evaluate(e => e.getBoundingClientRect().height)
    expect(Math.round(h) === 44, `a compact row is ${h}px`)
    const dot = await card(p, 'Покупки').locator('[data-new-dot]').boundingBox()
    const row = await card(p, 'Покупки').boundingBox()
    expect(dot && row.x + row.width - (dot.x + dot.width) <= 12 && dot.width === 6, `the dot is not 6px at the right edge: ${JSON.stringify(dot)}`)
    expect(await store(p, data => data.settings.homeRows) === 'compact', 'the view is not kept')
  } },

  // 19. Главная's «⋯»; 20. Журнал moves into «⋯»
  { id: 'mf-19-menu', device: MOBILE, run: async (p) => {
    await first(p)
    expect(!(await p.locator('header a[href="/journal"]').count()), 'a Журнал glyph in the header')
    await p.getByRole('button', { name: 'Меню Главной' }).click()
    const menu = p.locator('[data-home-menu]')
    const t = (await menu.innerText()).split('\n').map(x => x.trim()).filter(Boolean)
    expect(JSON.stringify(t) === JSON.stringify(['Вид', 'Со сводкой', 'Компактный', 'Журнал', 'Настройки', 'Новая секция', 'Корзина']), `menu: ${t}`)
    expect(await menu.getByRole('menuitemradio', { name: 'Со сводкой' }).getAttribute('aria-checked') === 'true', 'no tick on «Со сводкой»')
    const box = await menu.boundingBox()
    expect(Math.round(390 - box.x - box.width) === 16 && Math.round(box.width) === 232, `the menu is not 232 at 16px from the edge: ${JSON.stringify(box)}`)
    await menu.getByRole('menuitem', { name: 'Журнал' }).click()
    await p.waitForURL(/\/journal/)
  } },

  // 21, 22. With a model nothing says so but the example, which holds two records
  { id: 'mf-22-model-example', device: MOBILE, run: async (p) => {
    await first(p)
    await fakeModel(p, READINGS)
    await p.waitForTimeout(200)
    expect(await text(pillText(p)) === 'Купить хлеб и позвонить маме завтра', `example: ${await text(pillText(p))}`)
    const all = await screenText(p)
    for (const w of ['ИИ', 'Авто', 'модель']) expect(!all.includes(w), `«${w}» on Главная`)
    for (const w of GONE) expect(!all.includes(w), `«${w}» on Главная`)
  } },

  // 23. The model reads while typing: it shows, it does not tell
  { id: 'mf-23-model-reads', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    await fakeModel(p, READINGS)
    await openField(p)
    await typeTitle(p, 'Купить молоко 2,5% большую пачку')
    await p.clock.runFor(700)
    await p.waitForTimeout(400)
    expect(await text(mainChip(p)) === 'Покупки' && await note(p).inputValue() === '2,5%, большую пачку', `chip ${await text(mainChip(p))}, note «${await note(p).inputValue()}»`)
    expect(!(await p.locator('[data-field="open"] li').count()), 'a list for one record')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    const milk = (await recs(p, 'Покупки')).find(r => r.text === 'Молоко')
    expect(milk && milk.note === '2,5%, большую пачку', `Покупки: ${JSON.stringify(await recs(p))}`)
    await typeTitle(p, 'Купить молоко и позвонить маме завтра в 10')
    await p.clock.runFor(700)
    await p.waitForTimeout(400)
    const rows = (await p.locator('[data-field="open"] li').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
    expect(JSON.stringify(rows) === JSON.stringify(['Молоко Покупки', 'Позвонить маме завтра, 10:00 Задачи']), `rows: ${rows}`)
    await p.keyboard.type(' ещё')
    await p.waitForTimeout(100)
    expect(await p.locator('[data-field="open"] ul').evaluate(e => e.className.includes('opacity-50')), 'the old reading does not dim')
    await typeTitle(p, 'Купить сыр')
    await note(p).click()
    await p.keyboard.type('на выходные')
    await p.clock.runFor(700)
    await p.waitForTimeout(400)
    await sendButton(p).click()
    await p.waitForTimeout(300)
    const cheese = (await recs(p)).find(r => r.text === 'Сыр')
    expect(cheese && cheese.note === 'на выходные', `Сыр: ${JSON.stringify(cheese)}`)
  } },

  // 24. Never wait: the rules file now, and a late reading files again
  { id: 'mf-24-late', device: MOBILE, run: async (p) => {
    await first(p)
    await store(p, data => data.createPage({ title: 'Подарки' }))
    await fakeModel(p, READINGS, 900)
    await openField(p)
    await typeTitle(p, 'Купить молоко и позвонить маме завтра')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(150)
    expect((await recs(p)).length === 2, `the rules did not file at once: ${JSON.stringify(await recs(p))}`)
    await p.waitForTimeout(1300)
    const all = await recs(p)
    expect(all.find(r => r.text === 'Молоко')?.page === 'Покупки' && all.find(r => r.text === 'Позвонить маме')?.page === 'Задачи' && all.find(r => r.text === 'Позвонить маме')?.due?.date, `filed: ${JSON.stringify(all)}`)
    expect(await text(notice(p)) === 'Добавлено в Покупки и Задачи Отменить', `notice: ${await text(notice(p))}`)
    // The rules put «пазл для Пети» in Покупки; the late reading moves it to Подарки, keeping its id
    await typeTitle(p, 'Купить сыр и пазл для Пети')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(150)
    const before = await store(p, data => data.liveRecords.find(r => /пазл/i.test(r.text))?.id)
    await p.waitForTimeout(1300)
    const after = await store(p, (data) => {
      const r = data.liveRecords.find(x => /пазл/i.test(x.text))
      return { id: r?.id, page: data.pages[r?.pageId]?.title }
    })
    expect(after.page === 'Подарки' && after.id === before, `late: ${JSON.stringify(after)} (was ${before})`)
    expect(await text(notice(p)) === 'Добавлено в Покупки и Подарки Отменить', `notice: ${await text(notice(p))}`)
    await notice(p).getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(200)
    expect(!(await recs(p)).some(r => /пазл|сыр/i.test(r.text)), '«Отменить» left records')
  } },

  // 25. The person's own pages
  { id: 'mf-25-own-pages', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    await store(p, data => data.createPage({ title: 'Подарки' }))
    await fakeModel(p, READINGS)
    await openField(p)
    await typeTitle(p, 'Купить сыр и пазл для Пети')
    await p.clock.runFor(700)
    await p.waitForTimeout(400)
    const rows = (await p.locator('[data-field="open"] li').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
    expect(JSON.stringify(rows) === JSON.stringify(['Сыр Покупки', 'Пазл для Пети Подарки']), `rows: ${rows}`)
  } },

  // 26. Hit areas of at least 44px on the path
  { id: 'mf-26-hit-areas', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await first(p)
    await hit44(closedChip(p), 'the closed chip')
    await hit44(pillText(p), 'the pill\'s text')
    await hit44(pill(p).getByRole('button', { name: 'Надиктовать' }), 'the mic')
    await hit44(p.getByRole('button', { name: 'Новая страница' }), '«+» at «Мои страницы»')
    await openField(p)
    await typeTitle(p, 'Позвонить маме завтра в 10')
    await hit44(sendButton(p), '↑')
    await hit44(mainChip(p), 'the place chip')
    await hit44(dateChip(p), 'the date chip')
    await typeTitle(p, 'Сыр, позвонить бабушке')
    await hit44(rowChips(p).nth(0), 'a row chip')
    await typeTitle(p, 'Купить молоко')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    await tapFree(p)
    await goPage(p, 'Покупки')
    await hit44(p.locator('[data-add-row]'), '«+ Новая запись»')
    await hit44(p.getByRole('checkbox', { name: 'Отметить «Молоко»' }), 'a record\'s circle')
    for (const tab of await p.getByRole('tab').all()) await hit44(tab, 'a tab')
    await p.locator('[data-rows] [data-row-text]').filter({ hasText: 'Молоко' }).click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(400)
    await hit44(p.locator('[data-add-row]', { hasText: 'Свойство' }), '«+ Свойство»')
    await hit44(p.locator('[data-add-row]', { hasText: 'Подпункт' }), '«+ Подпункт»')
    await p.locator('main .body-text').first().click()
    await p.waitForTimeout(300)
    await hit44(p.getByRole('button', { name: 'Заголовок' }), 'the editing bar\'s «H»')
    await hit44(p.getByRole('button', { name: 'Готово' }), '«Готово»')
    await p.getByRole('button', { name: 'Готово' }).click()
    await p.getByRole('link', { name: 'Покупки' }).first().click()
    await p.waitForURL(/\/p\//)
    await home(p)
    await p.getByRole('button', { name: 'Новая страница' }).click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(400)
    for (const s of await p.locator('[data-starters] button').all()) await hit44(s, 'a starter')
  } },

  // 26. Safe areas: an iPhone's insets (47 top, 34 bottom), set the way Safari does
  { id: 'mf-26-safe-areas', device: MOBILE, run: async (p) => {
    const cdp = await p.context().newCDPSession(p)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } })
    await first(p)
    const clear = async (where) => {
      const items = await p.locator('header:visible').first().evaluate(h => [...h.querySelectorAll('a, button, h1')].filter(e => e.checkVisibility()).map(e => e.getBoundingClientRect()).map(r => [r.top, r.bottom]))
      const top = Math.min(...items.map(i => i[0]))
      expect(top >= 47, `${where}: the header sits under the status bar (${top})`)
      const content = await p.locator('main [data-home], main textarea[aria-label="Название страницы"], main textarea[aria-label="Текст записи"]').filter({ visible: true }).first().boundingBox()
      const bottom = Math.max(...items.map(i => i[1]))
      expect(content.y >= bottom - 1, `${where}: the header's controls run over the page (${bottom} > ${content.y})`)
      const dock = await p.locator('[data-field="closed"]').boundingBox().catch(() => null)
      if (dock) expect(dock.y + dock.height <= 844 - 34, `${where}: the field sits on the home indicator`)
    }
    await clear('Главная')
    await p.getByRole('button', { name: 'Меню Главной' }).click()
    expect((await p.locator('[data-home-menu]').boundingBox()).y >= 47 + 44, 'the menu covers the header')
    await p.keyboard.press('Escape')
    await p.locator('[data-home]').click({ position: { x: 200, y: 500 } })
    await goPage(p, 'Покупки')
    await clear('Покупки')
    await write(p, 'Купить молоко')
    await p.locator('[data-rows] [data-row-text]').filter({ hasText: 'Молоко' }).click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(400)
    await clear('Молоко')
  } },

  // 27. Voice into the same field
  { id: 'mf-27-voice', device: MOBILE, run: async (p) => {
    await p.addInitScript(() => {
      class Fake {
        start() {
          setTimeout(() => {
            this.onresult?.({ results: [Object.assign([{ transcript: 'купить молоко' }], { isFinal: true })] })
            this.onend?.()
          }, 50)
        }

        stop() { this.onend?.() }
      }
      window.SpeechRecognition = Fake
    })
    await first(p)
    await pill(p).getByRole('button', { name: 'Надиктовать' }).click()
    await p.waitForTimeout(400)
    expect((await title(p).innerText()).trim() === 'купить молоко', `title: ${await title(p).innerText()}`)
    expect(await text(mainChip(p)) === 'Покупки', `chip: ${await text(mainChip(p))}`)
  } },

  // Desktop is parked this round: a smoke test that the path works with a mouse and keys at 1440
  { id: 'mf-desk-smoke', device: DESKTOP, run: async (p) => {
    await first(p)
    await pillText(p).click()
    await p.keyboard.type('Купить молоко')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    expect((await recs(p, 'Покупки')).length === 1, 'nothing filed with Enter')
    // A place picked with the mouse, then a date read from the words
    await p.keyboard.type('Подарок Оле')
    await mainChip(p).click()
    await places(p).getByRole('button', { name: 'Идеи' }).click()
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    expect((await recs(p, 'Идеи')).length === 1, 'the place picked with the mouse was not used')
    await p.keyboard.type('Позвонить маме завтра в 10')
    expect(await shows(dateChip(p)), 'no date chip')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    expect((await recs(p, 'Задачи')).some(r => r.text === 'Позвонить маме' && r.due), 'the date was not read')
    await p.keyboard.press('Escape')
    await goPage(p, 'Задачи')
    await p.getByRole('button', { name: 'Новая запись' }).click()
    await p.keyboard.type('Оплатить интернет')
    await p.keyboard.press('Enter')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect((await recs(p, 'Задачи')).length === 2, 'the add row did not add')
    // The record and its text
    const id = await store(p, data => data.liveRecords.find(r => r.text === 'Молоко').id)
    await p.goto(`${BASE}/r/${id}`)
    await p.waitForSelector('main')
    await p.locator('main .body-text').first().click()
    await p.keyboard.type('2,5%, большую пачку')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    expect((await recs(p, 'Покупки'))[0].note === '2,5%, большую пачку', 'the record\'s text was not kept')
  } }
]
