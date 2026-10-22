// v23 delta, the flow of every screen: the «Check:» lines of items 13–21 and D3 (Главная summary, the large title,
// Входящие, Сегодня, Журнал, Настройки, Корзина, one sheet pattern, glued short words)
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')
const PHONE_320 = { ...MOBILE, viewport: { width: 320, height: 640 } }

const openPage = async (p, title) => {
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(400)
}

/** Text as read, the glued short words (NBSP) read as plain spaces */
const plain = s => (s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

/** The line under a page's name on Главная */
const summaryOf = (p, title) => p.evaluate((t) => {
  const row = [...document.querySelectorAll('main [role="listitem"]')].find(li => li.querySelector('a span.truncate')?.textContent.trim() === t)
  const col = row?.querySelector('a span.flex-col')
  return col && col.children.length > 1 ? col.lastElementChild.textContent : null
}, title)

/** The long list of MobileLong on Покупки, so it scrolls well past its title block */
const longList = p => store(p, (data) => {
  const pg = data.livePages.find(x => x.title === 'Покупки')
  const dept = pg.props.find(x => x.name === 'Отдел')
  const opt = n => dept.options.find(o => o.name === n).id
  const rows = [['Кефир', 'Молочное'], ['Сметана', 'Молочное'], ['Творог', 'Молочное'], ['Йогурт', 'Молочное'], ['Ряженка', 'Молочное'], ['Масло', 'Молочное'],
    ['Огурцы', 'Овощи и фрукты'], ['Картошка', 'Овощи и фрукты'], ['Лук', 'Овощи и фрукты'], ['Яблоки', 'Овощи и фрукты'], ['Груши', 'Овощи и фрукты'], ['Морковь', 'Овощи и фрукты'], ['Свёкла', 'Овощи и фрукты']]
  rows.forEach(([text, group], i) => data.addRecord({ pageId: pg.id, text, order: 100 + i, addedAt: Date.now() - 3600000, values: { [dept.id]: opt(group) } }))
})

/** The scroller of the screen */
const scrollBy = (p, y) => p.evaluate((dy) => {
  const box = document.querySelector('.scroll-fade')
  box.scrollTop = dy === null ? 0 : box.scrollTop + dy
}, y)

/** Text of the visible centre title in the header(s) above the scroller, '' when hidden */
const headerTitle = p => p.evaluate(() => [...document.querySelectorAll('header span[aria-hidden="true"]')]
  .filter(s => s.classList.contains('absolute') && !s.classList.contains('invisible') && s.offsetParent)
  .map(s => s.textContent.trim()).join(' | '))

export default [
  // 13: «Задачи reads «3 дела · оплатить интернет, позвонить стоматологу…» (overdue first, then today, then the rest);
  // Покупки reads «6 купить · хлеб, молоко, сыр +3» (new first)»
  // v24 item 17: a summary never cuts a name, so at 390 Задачи reads «3 дела · оплатить интернет +2»
  { id: 'f-13-summary', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const tasks = plain(await summaryOf(p, 'Задачи'))
    expect(tasks === '3 дела · оплатить интернет +2', `Задачи reads «${tasks}»`)
    const buy = plain(await summaryOf(p, 'Покупки'))
    expect(buy === '6 купить · хлеб, молоко, сыр +3', `Покупки reads «${buy}»`)
  } },
  // 14: «scroll Покупки → the header reads «Покупки · Купить»; scroll back up → the large title returns»
  { id: 'f-14-title-collapse', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await longList(p)
    await openPage(p, 'Покупки')
    await p.locator('main h3').first().waitFor()
    expect(await headerTitle(p) === '', `the header already names «${await headerTitle(p)}»`)
    await scrollBy(p, 5000)
    await p.waitForTimeout(300)
    const named = plain(await headerTitle(p))
    expect(named === 'Покупки · Купить', `scrolled, the header reads «${named}»`)
    await scrollBy(p, null)
    await p.waitForTimeout(300)
    expect(await headerTitle(p) === '', 'back on top, the header still names the page')
    expect(await p.getByRole('textbox', { name: 'Название страницы' }).isVisible(), 'the large title is not back')
  } },
  // 14 on a record (item 7, M6): past its title the header names the record
  { id: 'f-14-record-header', device: { ...MOBILE, viewport: { width: 390, height: 520 } }, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const id = await store(p, data => data.liveRecords.find(r => r.text === 'Полумарафон к маю')?.id)
    expect(id, 'no «Полумарафон к маю»')
    await open(p, `/r/${id}`)
    expect(await headerTitle(p) === '', 'the header names the record before scrolling')
    await scrollBy(p, 400)
    await p.waitForTimeout(300)
    const named = plain(await headerTitle(p))
    expect(named === 'Полумарафон к маю', `scrolled, the header reads «${named}»`)
  } },
  // D3: «scroll Покупки → the slim header, «Молочное» stuck»
  { id: 'f-14-desk-slim', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await longList(p)
    await openPage(p, 'Покупки')
    await p.locator('main h3').first().waitFor()
    expect(!(await p.locator('main header[data-slim]').count()), 'the slim header is there before scrolling')
    // «Молочное» right under the top of the scroller, a few rows into its group
    await p.evaluate(() => {
      const box = document.querySelector('.scroll-fade')
      const cap = [...box.querySelectorAll('h3')].find(h => h.textContent.trim().startsWith('Молочное'))
      box.scrollTop += cap.getBoundingClientRect().top - box.getBoundingClientRect().top + 120
    })
    await p.waitForTimeout(400)
    const slim = p.locator('main header[data-slim]')
    expect(await slim.count() === 1 && await slim.isVisible(), 'no slim header past the title block')
    const h = (await slim.boundingBox()).height
    expect(Math.round(h) === 44, `the slim header is ${h} px`)
    expect(plain(await slim.textContent()).includes('Покупки · Купить'), `the slim header reads «${plain(await slim.textContent())}»`)
    const stuck = await p.evaluate(() => {
      const box = document.querySelector('.scroll-fade')
      const cap = [...box.querySelectorAll('h3')].find(h => h.textContent.trim().startsWith('Молочное'))
      return Math.abs(cap.getBoundingClientRect().top - box.getBoundingClientRect().top)
    }).catch(() => null)
    expect(stuck !== null && stuck < 2, `«Молочное» is ${stuck} px off the top of the list`)
  } },
  // 15: «Подарок маме на др» on one line with «→ Задачи» and «⋯»; «⋯» → «→ Идеи», «Переместить…», «Удалить»
  { id: 'f-15-inbox', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Входящие')
    const row = p.locator('main li').filter({ hasText: 'Подарок маме на др' }).first()
    const box = await row.boundingBox()
    expect(Math.round(box.height) <= 45, `the row is ${box.height} px, more than one line`)
    const chip = row.getByRole('button', { name: 'Переместить в «Задачи»' })
    expect(await chip.isVisible(), 'no «→ Задачи» chip')
    expect(plain(await chip.textContent()) === '→ Задачи', `the chip reads «${plain(await chip.textContent())}»`)
    const cw = (await chip.boundingBox()).width
    expect(cw >= 92 && cw <= 120, `the chip is ${cw} px wide`)
    expect(await row.getByRole('button', { name: /^Переместить в/ }).count() === 1, 'more than one guess chip on the row')
    const text = await row.locator('[data-row-text]').boundingBox()
    expect(text.width >= 200, `the text column is ${text.width} px`)
    const more = row.getByRole('button', { name: 'Ещё для «Подарок маме на др»' })
    const mw = (await more.boundingBox()).width
    expect(Math.round(mw) === 24, `«⋯» is ${mw} px wide`)
    await more.click()
    await p.waitForTimeout(600)
    const sheet = p.getByRole('dialog')
    for (const name of ['→ Идеи', 'Переместить…', 'Удалить']) {
      expect(await shows(sheet.getByRole('button', { name, exact: true }).or(sheet.getByRole('menuitem', { name, exact: true }))), `the sheet has no «${name}»`)
    }
    expect(!(await sheet.getByRole('button', { name: '→ Задачи', exact: true }).count()), 'the sheet repeats the chip')
  } },
  // 15 at 320: the chip drops under the text as line 2
  { id: 'f-15-inbox-320', device: PHONE_320, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Входящие')
    const row = p.locator('main li').filter({ hasText: 'Подарок маме на др' }).first()
    const chip = row.getByRole('button', { name: 'Переместить в «Задачи»' }).locator('visible=true')
    expect(await chip.count() === 1, `${await chip.count()} visible chips`)
    const c = await chip.boundingBox()
    const t = await row.locator('[data-row-text]').boundingBox()
    expect(c.y >= t.y + t.height - 1, 'the chip is not under the text')
  } },
  // D3: «Входящие → «→ Задачи» moves the row, the toast takes it back»; the faint «⋯» holds the other guesses
  { id: 'f-15-desk-inbox', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Входящие')
    const row = p.locator('main li').filter({ hasText: 'Подарок маме на др' }).first()
    await row.getByRole('button', { name: 'Ещё для «Подарок маме на др»' }).click()
    await p.waitForTimeout(500)
    for (const name of ['→ Идеи', 'Переместить…', 'Удалить']) expect(await shows(p.getByRole('menuitem', { name, exact: true })), `the menu has no «${name}»`)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    await row.getByRole('button', { name: 'Переместить в «Задачи»' }).click()
    await p.waitForTimeout(500)
    expect(!(await p.locator('main li').filter({ hasText: 'Подарок маме на др' }).count()), 'the row is still in Входящие')
    const undo = p.locator('[data-notice]', { hasText: 'Подарок маме на др → Задачи' }).getByRole('button', { name: 'Отменить' })
    expect(await shows(undo), 'no «Подарок маме на др → Задачи · Отменить»')
    await undo.click()
    await p.waitForTimeout(500)
    expect(await shows(p.locator('main li').filter({ hasText: 'Подарок маме на др' })), '«Отменить» did not bring the row back')
  } },
  // 16: «Сегодня shows «На неделе · 2 ›»; tap → «Поменять фильтр воды … ср»»; the fold stays as it was left
  // v24 item 18: one demo world, the fold reads «На неделе · 4» (ср, пт, сб, вс)
  { id: 'f-16-week', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Сегодня')
    const cap = p.getByRole('button', { name: /^На неделе/ })
    expect(await shows(cap), 'no «На неделе»')
    expect(plain(await cap.textContent()) === 'На неделе · 4', `the caption reads «${plain(await cap.textContent())}»`)
    expect(await cap.getAttribute('aria-expanded') === 'false', '«На неделе» does not start folded')
    expect(!(await p.getByText('Поменять фильтр воды').count()), 'the folded week shows its rows')
    await cap.click()
    await p.waitForTimeout(300)
    const row = p.locator('main section[aria-label="На неделе"] > div').filter({ hasText: 'Поменять фильтр воды' })
    expect(await shows(row), 'open, the week has no «Поменять фильтр воды»')
    const text = plain(await row.textContent())
    expect(text.endsWith('ср') && text.includes('Дела по дому'), `the row reads «${text}»`)
    const ends = (await p.locator('main section[aria-label="На неделе"] > div').allTextContents()).map(t => plain(t).slice(-2))
    expect(ends.join(' ') === 'ср пт сб вс', `the week's rows end with ${ends.join(' ')}`)
    // The header still counts today only
    expect(await shows(p.getByText('3 дела со всех страниц · 1 просрочено')), 'the header count changed')
    await p.reload()
    await p.waitForSelector('main')
    await p.waitForTimeout(800)
    expect(await p.getByRole('button', { name: /^На неделе/ }).getAttribute('aria-expanded') === 'true', 'the week folded again after a reload')
  } },
  // 16 / M15: «tick everything for today → the empty line and the open week»; no «0 дел»
  { id: 'f-16-empty', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Сегодня')
    for (const name of ['Оплатить интернет', 'Позвонить стоматологу', 'Пробежка 6 км']) {
      await store(p, (data, t) => {
        const r = data.liveRecords.find(x => x.text === t)
        data.updateRecord(r.id, { done: true })
      }, name)
    }
    // Rows ticked here stay struck until the page is opened again
    await p.getByRole('link', { name: 'Главная' }).first().click()
    await p.waitForTimeout(400)
    await openPage(p, 'Сегодня')
    expect(await shows(p.getByText('На сегодня ничего, всё со сроком появится здесь.')), 'no empty line')
    expect(await p.getByRole('button', { name: /^На неделе/ }).getAttribute('aria-expanded') === 'true', 'the week is folded with nothing today')
    expect(await shows(p.getByText('Поменять фильтр воды')), 'the open week has no rows')
    expect(!(await p.getByText(/0 дел/).count()), 'the header says «0 дел»')
  } },
  // D3: «Сегодня «На неделе · 2»» on desktop too (v24 item 18: «На неделе · 4»)
  { id: 'f-16-desk-week', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Сегодня')
    const cap = p.getByRole('button', { name: /^На неделе/ })
    expect(plain(await cap.textContent()) === 'На неделе · 4', `the caption reads «${plain(await cap.textContent())}»`)
    await cap.click()
    expect(await shows(p.getByText('Вернуть книгу в библиотеку')), 'the open week has no «Вернуть книгу в библиотеку»')
  } },
  // 17: «open Журнал → the newest entries at the bottom; scroll up → «Вчера» receipts as single lines; tap one → the
  // card with «Не туда»; the Главная header icon is the lines-with-clock glyph»; «Не туда» in the toast action style
  { id: 'f-17-journal', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const icon = await p.getByRole('link', { name: 'Журнал' }).first().locator('.iconify, svg').first().evaluate(el => el.outerHTML.slice(0, 300))
    expect(/journal/.test(icon), `the Журнал glyph is ${icon.slice(0, 80)}`)
    await p.getByRole('link', { name: 'Журнал' }).first().click()
    await p.waitForURL(/journal/)
    await p.locator('main article').first().waitFor()
    await p.waitForTimeout(600)
    const gap = await p.evaluate(() => {
      const box = document.querySelector('.scroll-fade')
      return box.scrollHeight - box.clientHeight - box.scrollTop
    })
    expect(gap < 2, `Журнал opens ${gap} px above its bottom`)
    const yesterday = p.locator('main section[aria-label="Вчера"]')
    await yesterday.scrollIntoViewIfNeeded()
    const entry = yesterday.locator('article').filter({ hasText: 'бананы 1 кг, порошок' })
    const card = entry.locator('.rounded-card').first()
    const h = (await card.boundingBox()).height
    expect(h <= 45, `yesterday's receipt is ${h} px, not one line`)
    expect(!(await entry.getByRole('button', { name: 'Не туда' }).count()), 'the shut receipt has «Не туда»')
    expect(!(await card.locator('[class*="chevron-right"]').count()), 'the shut receipt has «›»')
    await entry.getByRole('button', { name: /2 записи/ }).click()
    await p.waitForTimeout(300)
    const wrong = entry.getByRole('button', { name: 'Не туда' })
    expect(await shows(wrong), 'the opened receipt has no «Не туда»')
    expect(await shows(entry.getByText('Бананы')), 'the opened receipt has no rows')
    const style = await wrong.evaluate((el) => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--accent-ink)'
      document.body.append(probe)
      const ink = getComputedStyle(probe).color
      probe.remove()
      const s = getComputedStyle(el)
      return { size: s.fontSize, weight: s.fontWeight, ink: s.color === ink }
    })
    expect(style.size === '14px' && style.weight === '500' && style.ink, `«Не туда» is ${JSON.stringify(style)}`)
  } },
  // D3: «Журнал's past receipts one line» on desktop
  { id: 'f-17-desk-past', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/journal')
    const entry = p.locator('main section[aria-label="Вчера"] article').filter({ hasText: 'вызвать мастера' })
    await entry.scrollIntoViewIfNeeded()
    expect(!(await entry.getByRole('button', { name: 'Не туда' }).count()), 'the shut receipt has «Не туда»')
    await entry.getByRole('button', { name: /1 запись/ }).click()
    expect(await shows(entry.getByRole('button', { name: 'Не туда' })), 'a click did not open the receipt in place')
  } },
  // 18: «Настройки at 390: the status line fits, «Сохранить» opens the format sheet; «Подключение» line 2 is one line;
  // «Данные» comes before «Оформление»»; a pick saves and the line reads «копия сегодня»
  { id: 'f-18-settings', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/settings')
    await store(p, data => data.setSettings({ provider: 'openai', apiKey: 'sk-proj-0123456789abcdef7Qa2', keyState: 'ok' }))
    await p.waitForTimeout(300)
    const status = p.getByRole('status').filter({ hasText: 'Работает офлайн' })
    expect(plain(await status.textContent()) === 'Работает офлайн, всё в этом браузере · копии нет · Сохранить', `the status line reads «${plain(await status.textContent())}»`)
    expect(await status.evaluate(e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().right <= innerWidth), 'the status line does not fit')
    const dot = await status.locator('span[aria-hidden="true"]').first().getAttribute('class')
    expect(/bg-faint/.test(dot), `the dot without a copy is «${dot}»`)
    const line2 = p.getByText('OpenAI · подключено', { exact: true })
    expect(await shows(line2), 'no «OpenAI · подключено»')
    expect(await line2.evaluate(e => e.getClientRects().length === 1 && e.getBoundingClientRect().height < 24), '«OpenAI · подключено» wraps')
    expect(!(await p.getByText(/sk-…/).count()), 'Настройки show the key')
    const heads = await p.locator('main h2').allInnerTexts()
    expect(heads.indexOf('Данные') >= 0 && heads.indexOf('Данные') < heads.indexOf('Оформление'), `the groups go ${heads.join(', ')}`)
    await status.getByRole('button', { name: 'Сохранить копию' }).click()
    await p.waitForTimeout(600)
    const sheet = p.getByRole('dialog')
    expect(await shows(sheet.getByText('Всё, чтобы потом загрузить обратно')), 'the sheet has no JSON line')
    expect(await shows(sheet.getByText('Страницы и записи текстом, чтобы читать')), 'the sheet has no Markdown line')
    expect(!(await sheet.getByRole('button', { name: /Готово|Сохранить$/ }).count()), 'the format sheet has a button to confirm')
    const download = p.waitForEvent('download')
    await sheet.getByRole('button', { name: /^JSON/ }).click()
    expect(/\.json$/.test((await download).suggestedFilename()), 'JSON saved no .json file')
    await p.waitForTimeout(400)
    expect(plain(await status.textContent()) === 'Работает офлайн, всё в этом браузере · копия сегодня', `after a copy the line reads «${plain(await status.textContent())}»`)
    expect(/bg-ok/.test(await status.locator('span[aria-hidden="true"]').first().getAttribute('class')), 'the dot is not ok after a copy')
    // The row says the same choice: «Сохранить копию ›», line 2 «JSON или Markdown · последняя сегодня»
    const row = p.getByRole('button', { name: /^Сохранить копию JSON или Markdown/ })
    expect(await shows(row), 'no row «Сохранить копию» with «JSON или Markdown»')
    await row.click()
    await p.waitForTimeout(600)
    expect(await shows(p.getByRole('dialog').getByText('Страницы и записи текстом, чтобы читать')), 'the row does not open the same sheet')
  } },
  // D3: «Настройки → «Сохранить» and the «Сохранить копию ›» row open the same two formats, a pick → «копия сегодня»»
  { id: 'f-18-desk-copy', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/settings')
    const status = p.getByRole('status').filter({ hasText: 'Работает офлайн' })
    await status.getByRole('button', { name: 'Сохранить копию' }).click()
    for (const name of [/^JSON/, /^Markdown/]) expect(await shows(p.getByRole('menuitem', { name })), `«Сохранить» has no ${name}`)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    await p.getByRole('region', { name: 'Данные' }).getByRole('button', { name: 'Сохранить копию' }).click()
    expect(await shows(p.getByRole('menuitem', { name: /^Markdown/ })), 'the row does not open the two formats')
    const download = p.waitForEvent('download')
    await p.getByRole('menuitem', { name: /^Markdown/ }).click()
    expect(/\.md$/.test((await download).suggestedFilename()), 'Markdown saved no .md file')
    await p.waitForTimeout(400)
    expect(plain(await status.textContent()).endsWith('копия сегодня'), `after a copy the line reads «${plain(await status.textContent())}»`)
  } },
  // 19: «Корзина → a row «⋯» → «Вернуть», «Удалить навсегда»; the latter asks before deleting»; meta on one line
  { id: 'f-19-trash', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/settings/trash')
    const row = p.locator('main li').filter({ hasText: 'Позвонить в банк' })
    expect(await row.getByRole('button', { name: 'Вернуть' }).count() === 1, 'the row has no «Вернуть» of its own')
    for (const meta of await p.locator('main li .text-meta').all()) {
      expect(await meta.evaluate(e => e.getClientRects().length === 1 && e.getBoundingClientRect().height < 24), `«${await meta.textContent()}» is not one line`)
    }
    expect(await shows(p.getByText(/^4\sзаписи · удалено/)), 'a page reads other than «4 записи · удалено …»')
    await row.getByRole('button', { name: 'Ещё для «Позвонить в банк»' }).click()
    await p.waitForTimeout(600)
    const sheet = p.getByRole('dialog')
    const items = await sheet.locator('button').allInnerTexts()
    const back = items.findIndex(t => t.trim() === 'Вернуть')
    const purge = items.findIndex(t => t.trim() === 'Удалить навсегда')
    expect(back >= 0 && purge > back, `the sheet lists ${items.map(t => t.trim()).join(', ')}`)
    await sheet.getByRole('button', { name: 'Удалить навсегда' }).click()
    await p.waitForTimeout(600)
    const ask = p.getByRole('dialog').filter({ hasText: 'Удалить «Позвонить в банк» навсегда?' })
    expect(await shows(ask), 'no confirm before deleting for good')
    expect(await shows(ask.getByText('Запись удалится навсегда. Вернуть будет нельзя.')), 'the confirm does not say what goes')
    expect(await store(p, data => data.trash.length) === 3, 'deleted before the confirm')
    await ask.getByRole('button', { name: 'Удалить навсегда' }).click()
    await p.waitForTimeout(500)
    expect(await shows(p.locator('[data-notice]', { hasText: '«Позвонить в банк» удалено навсегда' })), 'no line after deleting for good')
    expect(!(await p.locator('main li').filter({ hasText: 'Позвонить в банк' }).count()), 'the row stayed')
  } },
  // 20: ««Значок и цвет», «Настроить вид», «Свойства», «Связать», «Подключение» and the page picker have no ×; a tap on
  // the scrim closes each»; every sheet has its grabber
  { id: 'f-20-sheets', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const sheetChecked = async (what) => {
      await p.waitForTimeout(700)
      const sheet = p.getByRole('dialog').last()
      expect(await shows(sheet), `«${what}» did not open`)
      expect(!(await sheet.getByRole('button', { name: /^Закрыть/ }).count()), `«${what}» has ×`)
      expect(await sheet.locator('[data-vaul-handle], [class*="handle"]').count() || await sheet.evaluate(e => !!e.querySelector('div[data-slot="handle"]')), `«${what}» has no grabber`)
      await p.mouse.click(195, 24)
      await p.waitForTimeout(700)
      expect(!(await p.getByRole('dialog').count()), `a tap on the scrim left «${what}» open`)
    }
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await sheetChecked('Настроить вид')
    await p.getByRole('button', { name: 'Значок страницы' }).click()
    await sheetChecked('Значок')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.waitForTimeout(500)
    await p.getByRole('dialog').getByRole('button', { name: /^Свойства/ }).click()
    await sheetChecked('Свойства')
    const milk = await store(p, data => data.liveRecords.find(r => r.text === 'Молоко').id)
    await open(p, `/r/${milk}`)
    await p.getByRole('button', { name: 'Связать' }).first().click()
    await sheetChecked('Связать')
    await open(p, '/')
    await openPage(p, 'Входящие')
    await p.getByRole('button', { name: 'Ещё для «Подарок маме на др»' }).click()
    await p.waitForTimeout(500)
    await p.getByRole('dialog').getByRole('button', { name: 'Переместить…' }).click()
    await sheetChecked('Куда положить')
    await open(p, '/settings')
    await p.getByRole('button', { name: /^Подключение/ }).click()
    await sheetChecked('Подключение')
  } },
  // D3: «Popovers have no × and close by a click outside or Esc»
  { id: 'f-20-desk-popovers', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    const pop = p.getByRole('dialog')
    expect(await shows(pop), '«Настроить вид» did not open')
    expect(!(await pop.getByRole('button', { name: /^Закрыть/ }).count()), '«Настроить вид» has ×')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    expect(!(await p.getByRole('dialog').count()), 'Esc left «Настроить вид» open')
    await p.getByRole('button', { name: 'Значок страницы' }).click()
    expect(await shows(p.getByRole('dialog')), '«Значок» did not open')
    expect(!(await p.getByRole('dialog').getByRole('button', { name: /^Закрыть/ }).count()), '«Значок» has ×')
    await p.mouse.click(700, 700)
    await p.waitForTimeout(400)
    expect(!(await p.getByRole('dialog').count()), 'a click outside left «Значок» open')
  } },
  // 20: «No row stays highlighted under an open sheet»: a row of Главная after its menu closes is plain again
  { id: 'f-20-no-lit-row', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const row = p.locator('main [role="listitem"]').filter({ hasText: 'Покупки' }).first()
    const plainBg = await row.evaluate(e => getComputedStyle(e).backgroundColor)
    // A long press opens the page menu, a tap on the scrim closes it and the sheet gives focus back to the row
    const box = await row.locator('a').first().boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const at = [{ x: box.x + 40, y: box.y + box.height / 2 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at })
    await p.waitForTimeout(700)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.waitForTimeout(600)
    expect(await shows(p.getByRole('dialog')), 'a long press did not open the page menu')
    const under = await row.evaluate(e => getComputedStyle(e).backgroundColor)
    expect(under === plainBg, `the row is lit (${under}) under its open menu`)
    await p.touchscreen.tap(195, 24)
    await p.waitForTimeout(700)
    expect(!(await p.getByRole('dialog').count()), 'a tap on the scrim left the menu open')
    expect(new URL(p.url()).pathname === '/', `the long press opened the page (${p.url()})`)
    const after = await row.evaluate(e => getComputedStyle(e).backgroundColor)
    expect(after === plainBg, `the row is lit (${after}) after its menu closed`)
    // A swiped row closes when a sheet opens over it
    await openPage(p, 'Покупки')
    const bread = p.locator('main li').filter({ hasText: 'Хлеб' }).first()
    const rb = await bread.boundingBox()
    const y = rb.y + rb.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rb.x + rb.width - 30, y }] })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rb.x + rb.width - 30 - i * 16, y }] })
      await p.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.waitForTimeout(400)
    // By CSS, not by role: an open sheet hides the page from the accessibility tree
    const swiped = () => bread.locator('button', { hasText: /^\s*Удалить\s*$/ }).isVisible()
    expect(await swiped(), 'the swipe did not open «Удалить»')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().tap()
    await p.waitForTimeout(600)
    expect(await shows(p.getByRole('dialog')), 'the page menu did not open')
    expect(!(await swiped()), 'the swiped row stayed open under the page menu')
  } },
  // 21: «„Вернуть книгу в библиотеку“ never ends a line with „в“»; a draft being typed stays as typed
  { id: 'f-21-glue', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    const id = await store(p, data => data.liveRecords.find(r => r.text === 'Вернуть книгу в библиотеку').id)
    await open(p, `/r/${id}`)
    const field = p.getByRole('textbox', { name: 'Текст записи' })
    // The title's lines, read from the field's mirror (same text, font and width): the top of «книгу», «в», «библиотеку»
    const tops = () => field.locator('xpath=preceding-sibling::span[1]').evaluate((el) => {
      const node = el.firstChild
      const i = node.data.search(/в\sбиблиотеку/)
      const top = (k) => {
        const r = document.createRange()
        r.setStart(node, k)
        r.setEnd(node, k + 1)
        return Math.round(r.getClientRects()[0].top)
      }
      return [top(i - 2), top(i), top(i + 2)]
    })
    let brokeBefore = false
    for (let width = 300; width <= 430; width += 10) {
      await p.setViewportSize({ width, height: 844 })
      await p.waitForTimeout(150)
      const [book, v, lib] = await tops()
      expect(v === lib, `at ${width}px «в» ends a line`)
      if (book !== v) brokeBefore = true
    }
    expect(brokeBefore, 'no width put «в» on the next line (the check sees no wrap)')
    // Typing: plain spaces in the field, plain spaces saved, glued again at rest
    await p.setViewportSize({ width: 390, height: 844 })
    await field.click()
    expect(!(await field.inputValue()).includes('\u00a0'), 'the field being typed in holds the glue')
    await field.fill('Отнести книгу в библиотеку')
    await field.blur()
    await p.waitForTimeout(300)
    const saved = await store(p, (data, rid) => data.records[rid].text, id)
    expect(saved === 'Отнести книгу в библиотеку', `saved «${saved}» with the glue`)
    expect((await field.inputValue()).includes('в\u00a0библиотеку'), 'at rest the title is not glued')
  } }
]
