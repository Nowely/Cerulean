// Main flow, iteration 2 (handoff/main-flow-2-delta.md, Josh's 28 Oct notes): each check is one item's «Check:» line,
// ids mf2-<item>-<what>, from a real first run on a phone. The screen's helpers are round 1's (main-flow.mjs).
import { MOBILE, expect, store } from './lib.mjs'
import { card, caretAtEnd, closedChip, dateChip, fakeModel, first, form, goPage, hit44, home, isFocused, mainChip, note, notice, openField, pickPlace, pillText, places, READINGS, recs, tapFree, text, tinted, title, typeTitle, valuesOf, write } from './main-flow.mjs'

const START = [
  'Запишите что-нибудь в поле внизу',
  'Откройте запись и добавьте к ней заметку',
  'Разберите Входящие: кнопка справа у записи переносит её',
  'Создайте свою страницу: «+» у «Мои страницы»',
  'Подключите модель в Настройках, и записи будут раскладываться сами',
  'Удалите эту страницу, когда она станет не нужна: «⋯» → «Удалить»'
]

const rowOf = (p, name) => p.locator('[data-rows] .group\\/row').filter({ has: p.locator('[data-row-text]', { hasText: name }) })
/** The rows' names, without the text under them */
const rowNames = p => p.locator('[data-rows] [data-row-text]').allInnerTexts().then(t => t.map(x => x.split('\n')[0].replace(/\u00a0/g, ' ').trim()))
/** The names in «Мои страницы», under its caption */
const myPages = p => p.locator('[data-home]').evaluate((home) => {
  const cap = [...home.querySelectorAll('h2')].find(h => h.textContent.startsWith('Мои страницы'))
  return [...home.querySelectorAll('[role="listitem"] [data-name]')]
    .filter(n => cap.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)
    .map(n => n.textContent)
})
const placeNames = p => places(p).locator('button:not([data-place-auto])').allInnerTexts().then(t => t.map(x => x.trim()))
const newRow = p => places(p).locator('[data-place-new]')
const naming = p => newRow(p).evaluate(e => e.className.includes('inset-ring'))
async function view(p, name) {
  await p.getByRole('tab', { name, exact: true }).click()
  await p.waitForTimeout(150)
}

export default [
  // 1. A pull down is the browser's: Поиск opens from its glyph only, and nothing holds the pull back
  { id: 'mf2-1-pull', device: MOBILE, run: async (p) => {
    await first(p)
    const cdp = await p.context().newCDPSession(p)
    const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 195, y }] })
    await touch('touchStart', 200)
    for (let y = 220; y <= 360; y += 20) await touch('touchMove', y)
    await touch('touchEnd')
    await p.waitForTimeout(400)
    expect(!(await p.locator('[role="dialog"][aria-label="Поиск"]').count()), 'a pull of 160px opened Поиск')
    const o = await p.evaluate(() => ({
      body: getComputedStyle(document.body).overscrollBehaviorY,
      main: getComputedStyle(document.querySelector('.scroll-fade')).overscrollBehaviorY
    }))
    expect(o.body === 'auto' && o.main === 'auto', `overscroll: ${JSON.stringify(o)}`)
    // Popovers keep theirs, so a pull inside them never reloads the page
    await openField(p)
    await mainChip(p).click()
    expect(await places(p).evaluate(e => getComputedStyle(e).overscrollBehaviorY) === 'contain', 'the places list lost «contain»')
  } },

  // 2. No dot on Главная; the count follows the name
  { id: 'mf2-2-dot-count', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', '', 'Покупки')
    await tapFree(p)
    const shop = card(p, 'Покупки')
    const m = await shop.evaluate((e) => {
      const name = e.querySelector('[data-name]').getBoundingClientRect()
      const count = e.querySelector('[data-open]')
      const c = count.getBoundingClientRect()
      const s = getComputedStyle(count)
      return { gap: c.left - name.right, right: e.getBoundingClientRect().right - c.right, top: Math.abs(c.top + c.height / 2 - (name.top + name.height / 2)), size: s.fontSize, nums: s.fontVariantNumeric, seen: count.innerText.replace(/открытых:\s*/, '').trim() }
    })
    expect(m.seen === '1' && Math.round(m.gap) === 6 && m.top < 2 && m.right > 150, `the count: ${JSON.stringify(m)}`)
    expect(m.size === '15px' && m.nums.includes('tabular-nums'), `the count's type: ${JSON.stringify(m)}`)
    expect(!(await p.locator('[data-new-dot]').count()), 'a dot on Главная')
    // Сегодня's «N просрочено» takes the same place
    await store(p, (data) => {
      const todo = data.livePages.find(x => x.title === 'Задачи')
      data.addRecord({ pageId: todo.id, text: 'Оплатить интернет', due: { date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10) } })
    })
    await p.waitForTimeout(200)
    const late = await card(p, 'Сегодня').evaluate((e) => {
      const name = e.querySelector('[data-name]')
      const badge = name.nextElementSibling
      return { gap: badge ? badge.getBoundingClientRect().left - name.getBoundingClientRect().right : null, text: badge?.textContent.trim() }
    })
    expect(late.text === '1 просрочено' && Math.round(late.gap) === 6, `Сегодня: ${JSON.stringify(late)}`)
    // «Компактный»: the glyph and the name only
    await p.getByRole('button', { name: 'Меню Главной' }).click()
    await p.getByRole('menuitemradio', { name: 'Компактный' }).click()
    await p.waitForTimeout(250)
    const rows = await p.locator('[data-home] [role="listitem"]').evaluateAll(els => els.map((e) => {
      const name = e.querySelector('[data-name]').textContent
      return { name, rest: e.querySelector('a').innerText.replace(name, '').replace(/\s+/g, '') }
    }))
    expect(rows.every(r => !r.rest), `compact rows: ${JSON.stringify(rows.filter(r => r.rest))}`)
    expect(!(await p.locator('[data-new-dot]').count()), 'a dot in «Компактный»')
  } },

  // 3. «Быстрый старт» on day one: an ordinary page, which is not the person's first record
  { id: 'mf2-3-quick-start', device: MOBILE, run: async (p) => {
    await first(p)
    const mine = await myPages(p)
    expect(JSON.stringify(mine) === JSON.stringify(['Быстрый старт', 'Покупки', 'Задачи', 'Идеи']), `«Мои страницы»: ${mine}`)
    const start = card(p, 'Быстрый старт')
    expect((await text(start.locator('[data-open]'))).endsWith('6'), `the count: ${await text(start.locator('[data-open]'))}`)
    expect((await text(start.locator('[data-line]'))).startsWith('запишите что-нибудь в поле внизу, откройте'), `the line: ${await text(start.locator('[data-line]'))}`)
    expect(await start.locator('[data-glyph="list"], .i-lucide-list, [class*="lucide-list"]').count() > 0 || await store(p, data => data.livePages.find(x => x.title === 'Быстрый старт')?.glyph) === 'list', 'no list glyph')
    await goPage(p, 'Быстрый старт')
    const names = await rowNames(p)
    expect(JSON.stringify(names) === JSON.stringify(START), `rows: ${names}`)
    expect(await text(rowOf(p, START[0]).locator('[data-row-note]')) === 'Дата в словах станет сроком: «позвонить маме завтра в 10»', 'the first record has no text under its name')
    await p.getByRole('checkbox', { name: `Отметить «${START[1]}»` }).click()
    await p.waitForTimeout(1800)
    await home(p)
    expect((await text(start.locator('[data-open]'))).endsWith('5'), `after the tick: ${await text(start)}`)
    expect(await text(pillText(p)) === 'Позвонить маме в 10', `the example: ${await text(pillText(p))}`)
    await goPage(p, 'Быстрый старт')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click()
    await p.waitForURL(u => new URL(u).pathname === '/')
    await p.waitForTimeout(300)
    expect(!(await card(p, 'Быстрый старт').count()), '«Быстрый старт» is still on Главная')
  } },

  // 4. Without a model nothing is sorted; the date and Покупки's reading stay
  { id: 'mf2-4-no-sort', device: MOBILE, run: async (p) => {
    await first(p)
    await openField(p)
    await typeTitle(p, 'Купить молоко')
    await p.waitForTimeout(300)
    expect(await text(mainChip(p)) === 'Входящие' && !(await tinted(mainChip(p))), `chip: ${await text(mainChip(p))}`)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect(JSON.stringify(await recs(p)) === JSON.stringify([{ text: 'Купить молоко', page: 'Входящие', due: null, done: false, note: '', parent: null }]) || (await recs(p)).every(r => r.text === 'Купить молоко' && r.page === 'Входящие'), `filed: ${JSON.stringify(await recs(p))}`)
    await typeTitle(p, 'Позвонить маме завтра в 10')
    expect(await text(dateChip(p)) === 'завтра, 10:00' && await text(mainChip(p)) === 'Входящие', `date ${await text(dateChip(p))}, chip ${await text(mainChip(p))}`)
    await typeTitle(p, '')
    await pickPlace(p, 'Покупки')
    await typeTitle(p, 'Купить сыр')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect((await recs(p, 'Покупки')).some(r => r.text === 'Сыр'), `Покупки: ${JSON.stringify(await recs(p, 'Покупки'))}`)
    await pickPlace(p, 'Входящие')
    await typeTitle(p, 'Купить сыр')
    await p.waitForTimeout(300)
    expect(await text(mainChip(p)) === 'Входящие' && !(await tinted(mainChip(p))), `a pick taught the rules: ${await text(mainChip(p))}`)
    expect(!Object.keys(await store(p, data => data.learned ?? {})).length, 'a pick by hand taught a word')
  } },

  // 5. The place picked by hand stays; with a model the list starts with «Авто»
  { id: 'mf2-5-place-stays', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', '', 'Покупки')
    expect(await form(p).isVisible() && await title(p).innerText().then(t => !t.trim()) && await text(mainChip(p)) === 'Покупки', `after the send: ${await text(mainChip(p))}`)
    await tapFree(p)
    await goPage(p, 'Задачи')
    await home(p)
    expect(await text(closedChip(p)) === 'Покупки', `back on Главная: ${await text(closedChip(p))}`)
    await openField(p)
    expect(await text(mainChip(p)) === 'Покупки', `open: ${await text(mainChip(p))}`)
    // A reload starts it over, like the rest of the field (Josh, 12:45Z)
    await p.reload()
    await p.waitForTimeout(600)
    await openField(p)
    expect(await text(mainChip(p)) === 'Входящие', `after a reload: ${await text(mainChip(p))}`)
    // With a model: «Авто» first, ticked while the model chooses
    await fakeModel(p, READINGS)
    await mainChip(p).click()
    const auto = places(p).locator('[data-place-auto]')
    expect(await auto.isVisible() && await auto.getAttribute('aria-current') === 'true' && await places(p).locator('button').first().evaluate(e => e.hasAttribute('data-place-auto')), 'no ticked «Авто» first')
    await places(p).getByRole('button', { name: 'Задачи', exact: true }).click()
    await p.waitForTimeout(120)
    await mainChip(p).click()
    expect(await auto.getAttribute('aria-current') === null && await places(p).getByRole('button', { name: 'Задачи', exact: true }).getAttribute('aria-current') === 'true', '«Авто» kept the tick after a pick')
    await auto.click()
    await p.waitForTimeout(120)
    await typeTitle(p, 'Купить сыр')
    await p.waitForTimeout(1200)
    expect(await text(mainChip(p)) === 'Покупки' && await tinted(mainChip(p)), `«Авто» did not hand the choice back: ${await text(mainChip(p))}`)
  } },

  // 6. «+ Новая страница» ends the places list
  { id: 'mf2-6-new-page', device: MOBILE, run: async (p) => {
    await first(p)
    await openField(p)
    await typeTitle(p, 'Подарок Оле')
    await mainChip(p).click()
    expect(await places(p).evaluate(e => e.lastElementChild.hasAttribute('data-place-new')), '«Новая страница» is not last')
    expect(await newRow(p).locator('input').getAttribute('placeholder') === 'Новая страница', 'no «Новая страница»')
    await newRow(p).click()
    expect(await isFocused(newRow(p).locator('input')) && await naming(p) && await places(p).isVisible(), 'the row is not a name field with the caret')
    await p.keyboard.type('подарки')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(200)
    expect(!(await places(p).count()) && await text(mainChip(p)) === 'Подарки', `chip: ${await text(mainChip(p))}`)
    expect(await isFocused(title(p)) && await text(title(p)) === 'Подарок Оле', 'the caret is not back in the title')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect(await text(notice(p)) === 'Добавлено в Подарки Отменить', `notice: ${await text(notice(p))}`)
    const gifts = await store(p, data => data.livePages.filter(x => x.title === 'Подарки').map(x => ({ glyph: x.glyph, recs: data.recordsOf(x.id).length })))
    expect(JSON.stringify(gifts) === '[{"glyph":"list","recs":1}]', `Подарки: ${JSON.stringify(gifts)}`)
    await tapFree(p)
    expect((await myPages(p)).includes('Подарки') && (await text(card(p, 'Подарки').locator('[data-open]'))).endsWith('1'), `no «Подарки 1»: ${await myPages(p)}`)
    // A name that exists picks that page; Esc and an empty Enter give the row back
    await openField(p)
    await mainChip(p).click()
    await newRow(p).click()
    await p.keyboard.type('покупки')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(200)
    expect(await text(mainChip(p)) === 'Покупки' && await store(p, data => data.livePages.filter(x => x.title.toLowerCase() === 'покупки').length) === 1, 'a second Покупки')
    const pages = await store(p, data => data.livePages.length)
    await mainChip(p).click()
    await newRow(p).click()
    await p.keyboard.type('Дача')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(150)
    expect(await places(p).isVisible() && !(await naming(p)) && await newRow(p).locator('input').inputValue() === '', 'Esc did not give the row back')
    await newRow(p).click()
    await p.keyboard.press('Enter')
    await p.waitForTimeout(150)
    expect(await places(p).isVisible() && !(await naming(p)), 'an empty Enter did not give the row back')
    expect(await store(p, data => data.livePages.length) === pages, 'Esc or an empty Enter made a page')
  } },

  // 7. Without a model one line is one record
  { id: 'mf2-7-one-line', device: MOBILE, run: async (p) => {
    await first(p)
    await openField(p)
    await pickPlace(p, 'Покупки')
    await typeTitle(p, 'Купить сыр, кофе, чай')
    await p.waitForTimeout(300)
    expect(!(await p.locator('[data-field="open"] li').count()), 'draft rows under the field')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    const shop = (await recs(p, 'Покупки')).map(r => r.text)
    expect(JSON.stringify(shop) === '["Сыр, кофе, чай"]', `Покупки: ${shop}`)
    await tapFree(p)
    await goPage(p, 'Покупки')
    await p.locator('[data-add-row]').click()
    await p.keyboard.type('Хлеб, батон')
    await p.keyboard.press('Enter')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(250)
    const after = (await recs(p, 'Покупки')).map(r => r.text)
    expect(after.length === 2 && after.includes('Хлеб, батон') && await rowOf(p, 'Хлеб, батон').count() === 1, `Покупки: ${after}`)
  } },

  // 8. «Отменить» gives the words back
  { id: 'mf2-8-undo', device: MOBILE, run: async (p) => {
    await first(p)
    await openField(p)
    await pickPlace(p, 'Покупки')
    await typeTitle(p, 'Купить молоко')
    await note(p).click()
    await p.keyboard.type('2,5%, большую пачку')
    await title(p).click()
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    await notice(p).getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(250)
    expect(!(await recs(p)).length && !(await card(p, 'Покупки').locator('[data-open], [data-line]').count()), `Покупки is not empty: ${await text(card(p, 'Покупки'))}`)
    expect(await form(p).isVisible() && await text(title(p)) === 'Купить молоко' && await note(p).inputValue() === '2,5%, большую пачку', `the field: «${await text(title(p))}» / «${await note(p).inputValue()}»`)
    expect(await text(mainChip(p)) === 'Покупки', `chip: ${await text(mainChip(p))}`)
    expect(await isFocused(title(p)) && await caretAtEnd(p), 'the caret is not at the end of the title')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect(await text(notice(p)) === 'Добавлено в Покупки Отменить', `notice: ${await text(notice(p))}`)
    await p.keyboard.type('Х')
    await p.waitForTimeout(400)
    expect(!(await notice(p).count()), 'typing did not put the notice away')
    // A date the person dropped stays dropped
    await typeTitle(p, 'Позвонить маме завтра в 10')
    await dateChip(p).click()
    await title(p).click()
    await p.keyboard.press('End')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    await notice(p).getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(250)
    expect(await text(title(p)) === 'Позвонить маме завтра в 10' && !(await dateChip(p).count()), 'the dropped date came back')
  } },

  // 9. A tick strikes at once and leaves the list after a moment
  { id: 'mf2-9-tick', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Купить молоко', '', 'Покупки')
    await write(p, 'Купить хлеб')
    await tapFree(p)
    await goPage(p, 'Покупки')
    await p.getByRole('checkbox', { name: 'Отметить «Молоко»' }).click()
    await p.waitForTimeout(100)
    const struck = await rowOf(p, 'Молоко').locator('[data-row-text]').evaluate(e => getComputedStyle(e).textDecorationLine.includes('line-through') || !!e.closest('.line-through') || !!e.querySelector('.line-through'))
    expect(await rowOf(p, 'Молоко').isVisible() && struck, 'not struck at once')
    expect(await rowOf(p, 'Молоко').evaluate(e => e.className.includes('animate-leave')), 'no fade on the way out')
    await view(p, 'Куплено')
    expect(!(await rowOf(p, 'Молоко').count()), 'in «Куплено» at once')
    await view(p, 'Купить')
    await p.waitForTimeout(2000)
    expect(!(await rowOf(p, 'Молоко').count()), 'still in «Купить» after 2 s')
    await view(p, 'Куплено')
    expect(await rowOf(p, 'Молоко').count() === 1, 'not in «Куплено» after 2 s')
    await view(p, 'Купить')
    await p.getByRole('checkbox', { name: 'Отметить «Хлеб»' }).click()
    await p.waitForTimeout(500)
    await p.getByRole('checkbox', { name: /«Хлеб»$/ }).click()
    await p.waitForTimeout(2000)
    expect(await rowOf(p, 'Хлеб').count() === 1 && !(await recs(p, 'Покупки')).find(r => r.text === 'Хлеб').done, 'a second tap did not keep «Хлеб» open')
  } },

  // 10. Входящие: a move button on every open record
  { id: 'mf2-10-inbox-move', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Подарок Оле')
    await write(p, 'Купить батарейки')
    await tapFree(p)
    await goPage(p, 'Входящие')
    for (const name of ['Подарок Оле', 'Купить батарейки']) {
      const btn = rowOf(p, name).locator('[data-move]')
      expect(await btn.isVisible() && await btn.getAttribute('aria-label') === `Переместить «${name}»`, `«${name}» has no move button`)
      const end = await rowOf(p, name).evaluate(row => row.getBoundingClientRect().right - row.querySelector('[data-move]').getBoundingClientRect().right)
      expect(end < 8, `the move button is not at the row's end (${end}px)`)
    }
    await hit44(rowOf(p, 'Подарок Оле').locator('[data-move]'), 'the move button')
    await rowOf(p, 'Подарок Оле').locator('[data-move]').click()
    const names = await placeNames(p)
    expect(JSON.stringify(names) === JSON.stringify(['Быстрый старт', 'Покупки', 'Задачи', 'Идеи']) && await places(p).evaluate(e => e.lastElementChild.hasAttribute('data-place-new')), `the list: ${names}`)
    const box = await places(p).boundingBox()
    const at = await rowOf(p, 'Подарок Оле').boundingBox()
    expect(Math.abs(box.y - (at.y + at.height)) < 12 || Math.abs(box.y + box.height - at.y) < 12, 'the list does not open at the row')
    await places(p).getByRole('button', { name: 'Идеи', exact: true }).click()
    await p.waitForTimeout(250)
    expect(!(await rowOf(p, 'Подарок Оле').count()) && (await recs(p, 'Идеи')).some(r => r.text === 'Подарок Оле'), 'the row did not leave for Идеи')
    expect(await text(notice(p)) === 'Перемещено в Идеи Отменить', `notice: ${await text(notice(p))}`)
    await notice(p).getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(250)
    expect(await rowOf(p, 'Подарок Оле').count() === 1 && (await recs(p, 'Входящие')).some(r => r.text === 'Подарок Оле'), '«Отменить» did not bring it back')
    await rowOf(p, 'Подарок Оле').locator('[data-move]').click()
    await newRow(p).click()
    await p.keyboard.type('Дом')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    expect((await recs(p, 'Дом')).some(r => r.text === 'Подарок Оле') && await store(p, data => data.livePages.find(x => x.title === 'Дом')?.glyph) === 'list', 'not on a new list «Дом»')
    // A ticked record has no button
    await p.getByRole('checkbox', { name: 'Отметить «Купить батарейки»' }).click()
    await p.waitForTimeout(150)
    expect(!(await rowOf(p, 'Купить батарейки').locator('[data-move]').count()), 'a ticked record has the button')
    // With a model, its place is the list's first row, tinted; still two taps
    await p.waitForTimeout(1600)
    await store(p, data => data.addRecord({ pageId: data.inbox.id, text: 'Купить сыр' }))
    await fakeModel(p, READINGS)
    await p.waitForTimeout(200)
    await rowOf(p, 'Купить сыр').locator('[data-move]').click()
    const top = places(p).locator('button').first()
    expect(await text(top) === 'Покупки' && await tinted(top), `with a model the first row is «${await text(top)}»`)
    await top.click()
    await p.waitForTimeout(250)
    expect((await recs(p, 'Покупки')).some(r => r.text === 'Купить сыр' || r.text === 'Сыр'), 'the model\'s place did not move it')
  } },

  // 11. A record's text shows up to two lines
  { id: 'mf2-11-two-lines', device: MOBILE, run: async (p) => {
    await first(p)
    await write(p, 'Записаться в бассейн', 'Спросить про утренние часы и детскую группу, взять с собой справку от врача и фото')
    await tapFree(p)
    await goPage(p, 'Входящие')
    const m = await rowOf(p, 'Записаться в бассейн').locator('[data-row-note]').evaluate((e) => {
      const s = getComputedStyle(e)
      return { lines: Math.round(e.getBoundingClientRect().height / parseFloat(s.lineHeight)), cut: e.scrollHeight > e.clientHeight + 1, clamp: s.webkitLineClamp }
    })
    expect(m.lines === 2 && m.cut && m.clamp === '2', `the text: ${JSON.stringify(m)}`)
  } },

  // 12. The quantity sits by the name
  { id: 'mf2-12-qty', device: MOBILE, run: async (p) => {
    await first(p)
    await goPage(p, 'Покупки')
    await p.locator('[data-add-row]').click()
    await p.keyboard.type('Яйца 10 шт')
    await p.keyboard.press('Enter')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(250)
    expect((await valuesOf(p, 'Яйца'))?.qty === '10 шт', `Яйца: ${JSON.stringify(await valuesOf(p, 'Яйца'))}`)
    const row = rowOf(p, 'Яйца')
    const m = await row.evaluate((e) => {
      const t = e.querySelector('[data-row-text]')
      const q = t.querySelector('[data-row-qty]')
      const word = q.parentElement.firstChild
      const name = document.createRange()
      name.selectNodeContents(word)
      const n = name.getBoundingClientRect()
      const r = q.getBoundingClientRect()
      return {
        text: `${word.textContent} ${q.textContent}`,
        gap: r.left - n.right,
        line: Math.abs(r.top - n.top) < 2,
        toned: getComputedStyle(q).color === getComputedStyle(e.querySelector('[data-row-text] + *, [data-row-text]')).color || q.className.includes('text-toned'),
        right: [...e.querySelectorAll('*')].filter(x => !t.contains(x) && x.textContent.trim() === '10 шт').length
      }
    })
    expect(m.text === 'Яйца 10 шт' && Math.round(m.gap) === 6 && m.line && m.toned, `the row: ${JSON.stringify(m)}`)
    expect(!m.right, 'the quantity still sits at the right too')
  } },
  // Acceptance F1 (canvas 78): a long name gives way, the quantity shows whole at the row's end, ticked or not
  { id: 'mf2-12-long', device: MOBILE, run: async (p) => {
    await first(p)
    await goPage(p, 'Покупки')
    await p.locator('[data-add-row]').click()
    await p.keyboard.type('Яйца куриные крупные отборные категории С0 10 шт')
    await p.keyboard.press('Enter')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(250)
    const row = rowOf(p, 'Яйца куриные')
    const look = () => row.evaluate((e) => {
      const t = e.querySelector('[data-row-text]')
      const q = t.querySelector('[data-row-qty]')
      const name = q.previousElementSibling
      const box = t.getBoundingClientRect()
      const r = q.getBoundingClientRect()
      return {
        qty: q.textContent,
        whole: q.scrollWidth <= q.clientWidth + 1 && r.right <= box.right + 1,
        cut: name.scrollWidth > name.clientWidth,
        line: Math.abs(r.top - name.getBoundingClientRect().top) < 3,
        through: [getComputedStyle(name).textDecorationLine, getComputedStyle(q).textDecorationLine]
      }
    })
    const m = await look()
    expect(m.qty === '10 шт' && m.whole && m.cut && m.line, `the row: ${JSON.stringify(m)}`)
    await row.locator('[data-check], [role="checkbox"]').first().click()
    await p.waitForTimeout(200)
    const d = await look()
    expect(d.whole && d.through.every(x => x.includes('line-through')), `ticked: ${JSON.stringify(d)}`)
  } },

  // 13. A smaller title: 20px on a phone
  { id: 'mf2-13-title', device: MOBILE, run: async (p) => {
    await first(p)
    await goPage(p, 'Быстрый старт')
    const page = await p.locator('main textarea[aria-label="Название страницы"]').evaluate(e => [getComputedStyle(e).fontSize, getComputedStyle(e).lineHeight])
    expect(page.join() === '20px,26px', `the page title: ${page}`)
    await p.locator('[data-rows] [data-row-text]').first().click()
    await p.waitForURL(/\/r\//)
    await p.waitForTimeout(400)
    const rec = await p.locator('main textarea[aria-label="Текст записи"]').evaluate(e => [getComputedStyle(e).fontSize, getComputedStyle(e).lineHeight])
    expect(rec.join() === '20px,26px', `the record title: ${rec}`)
  } }
]
