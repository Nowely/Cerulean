// PR #15 acceptance round 2: what did not land (design/app-qa/acceptance-pr15-round2.md, «What did not land» 3–18)
import { BASE, DESKTOP, MOBILE, expect, open, pageOf, send, shows, store } from './lib.mjs'

const DEMO_TIME = new Date('2026-10-19T09:14:00+03:00')

async function page(p, title) {
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(500)
}

const focused = p => p.evaluate(() => document.activeElement?.closest('li')?.innerText.split('\n')[0] ?? document.activeElement?.tagName)

export default [
  // 3: a row ticked on «Купить» stays there, struck, and never shows up on «Запасы»
  { id: 'r3-3-tick-stays-home', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await page(p, 'Покупки')
    await p.locator('main li', { hasText: 'Хлеб' }).first().getByRole('checkbox').click()
    await p.waitForTimeout(300)
    await p.getByRole('tab', { name: 'Запасы' }).click()
    await p.waitForTimeout(400)
    expect(!(await p.locator('main li', { hasText: 'Хлеб' }).count()), 'the row ticked on «Купить» shows on «Запасы»')
  } },
  // 4: a long name is cut, never where it went
  { id: 'r3-4-long-notice', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await store(p, data => data.updateRecord(Object.values(data.records).find(r => r.text === 'Подарок маме на др').id, { text: 'Подарок маме на день рождения: большой набор для вышивания крестиком и рамка' }))
    await page(p, 'Входящие')
    await p.locator('main li', { hasText: 'Подарок маме' }).first().getByRole('button', { name: 'Переместить в «Задачи»' }).click()
    const n = p.locator('[data-notice]').first()
    expect(await shows(n), 'no notice after the move')
    const where = n.getByText('→ Задачи')
    expect(await shows(where), '«→ Задачи» is not in the notice')
    expect(await where.evaluate(e => e.getBoundingClientRect().right <= e.closest('[data-notice]').getBoundingClientRect().right), '«→ Задачи» is cut off')
    expect(await n.evaluate(e => e.scrollHeight <= e.clientHeight + 1), 'a third line peeks out')
  } },
  // 5: the «новых» dot sits right after the name in the sidebar; text statuses stay at the end
  { id: 'r3-5-sidebar-dot', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: DEMO_TIME })
    await open(p, '/journal')
    const dots = p.locator('aside .size-1\\.5.rounded-full')
    expect(await shows(dots), 'no «новых» dot in the sidebar')
    const gaps = await dots.evaluateAll(all => all.map((d) => {
      const name = d.closest('a, button').querySelector('span.truncate')
      return d.getBoundingClientRect().left - name.getBoundingClientRect().right
    }))
    expect(gaps.every(g => g >= 0 && g <= 12), `a dot is not after its name (gaps ${gaps.join(', ')})`)
    const late = p.locator('aside .text-warn').first()
    if (await late.count()) {
      const row = await late.evaluate(e => e.closest('a, button').getBoundingClientRect().right - e.getBoundingClientRect().right)
      expect(row <= 16, 'a text status left the row end')
    }
  } },
  // 6: after Shift+F10 and Esc the focus is on the row; ↓ goes to the next row; Delete moves on to the next row
  { id: 'r3-6-row-focus', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await page(p, 'Покупки')
    await p.locator('[data-row-text]', { hasText: 'Хлеб' }).first().focus()
    await p.keyboard.press('Shift+F10')
    expect(await shows(p.getByRole('menu')), 'Shift+F10 opened no menu')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    expect(await p.evaluate(() => document.activeElement?.hasAttribute('data-row-text')), 'the focus is not on the row after Esc')
    await p.keyboard.press('ArrowDown')
    await p.waitForTimeout(100)
    expect(!(await p.getByRole('menu').count()), '↓ reopened the menu')
    const second = await focused(p)
    expect(second === 'Молоко', `↓ went to «${second}», not the next row`)
    await p.keyboard.press('Delete')
    await p.waitForTimeout(400)
    expect(await p.evaluate(() => document.activeElement?.hasAttribute('data-row-text')), 'Delete sent the focus to the page')
    expect((await focused(p)) === 'Сыр', 'Delete did not move on to the next row')
  } },
  // 10: the page menu: Переименовать, Добавить в избранное, Что сюда класть (v23), Значок и цвет…; no section caption
  { id: 'r3-10-page-menu', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await page(p, 'Покупки')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    const sheet = p.getByRole('dialog')
    expect(await shows(sheet.getByText('Переименовать')), 'no menu')
    const labels = await sheet.locator('button, [role="menuitem"]').evaluateAll(all => all.map(b => b.innerText.split('\n')[0].trim()).filter(Boolean))
    const want = ['Переименовать', 'Добавить в избранное', 'Что сюда класть', 'Значок и цвет', 'Переместить в секцию']
    const at = want.map(w => labels.findIndex(l => l.startsWith(w) || (w === 'Добавить в избранное' && l.startsWith('Убрать из избранного'))))
    expect(at.every((i, k) => i >= 0 && (k === 0 || i > at[k - 1])), `the order is ${labels.join(', ')}`)
    expect(!(await sheet.getByText(/секция «/).count()), 'the header names the section')
  } },
  // 11: Задачи and Дела по дому keep manual order, the newest on top
  { id: 'r3-11-manual', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await page(p, 'Задачи')
    const first = () => p.locator('main [data-row-text]').first().innerText()
    expect((await first()).startsWith('Позвонить стоматологу'), `«${await first()}» is first on Задачи`)
    await send(p, 'оплатить штраф')
    expect((await first()).startsWith('Оплатить штраф'), 'a new record did not go on top')
  } },
  // 12: the Корзина subtitle: 14 px on the 16 px gutter
  { id: 'r3-12-trash', device: MOBILE, run: async (p) => {
    await open(p, '/settings/trash')
    const sub = p.getByText('Удалённое хранится 30 дней, потом исчезает само')
    expect(await shows(sub), 'no subtitle')
    const s = await sub.evaluate(e => ({ size: getComputedStyle(e).fontSize, left: e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft), lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)) }))
    expect(s.size === '14px' && Math.abs(s.left - 16) <= 1, `the subtitle is ${s.size} at x ${s.left}`)
  } },
  // 13: the desktop property editor: «Удалить свойство» (warn) and a filled «Готово» in a footer always in view
  { id: 'r3-13-prop-footer', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await page(p, 'Покупки')
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.getByRole('menu').getByText(/^Свойства/).first().click()
    await p.getByRole('button', { name: 'Изменить «Отдел»' }).click()
    await p.waitForTimeout(400)
    const dialog = p.getByRole('dialog')
    const done = dialog.getByRole('button', { name: 'Готово' })
    const remove = dialog.getByRole('button', { name: 'Удалить свойство' })
    expect(await done.count() === 1 && await remove.count() === 1, 'no footer with «Удалить свойство» and «Готово»')
    const box = await dialog.boundingBox()
    for (const b of [await done.boundingBox(), await remove.boundingBox()]) expect(b.y + b.height <= box.y + box.height && b.y + b.height <= 900, 'the footer is below the fold')
    expect(await done.evaluate(e => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'), '«Готово» is not filled')
    const head = await dialog.locator('h2').first().boundingBox()
    expect((await done.boundingBox()).y > head.y + 100, '«Готово» is in the header')
    await done.click()
    expect(await shows(dialog.getByText('Есть у каждой записи страницы')), '«Готово» did not go back to «Свойства»')
  } },
  // 14: with Найти open, only Найти is the current row
  { id: 'r3-14-find-current', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await p.keyboard.press('Control+k')
    await p.waitForTimeout(400)
    const current = await p.locator('aside [aria-current="page"]').evaluateAll(all => all.map(e => e.innerText.split('\n')[0].trim()))
    expect(current.length === 1 && current[0] === 'Найти', `current rows: ${current.join(', ')}`)
  } },
  // 15: desktop: «Запись изменили в другой вкладке» under the title (PageTwoTabs); the phone keeps it above (MobileTwoTabs)
  { id: 'r3-15-two-tabs-desk', device: DESKTOP, run: p => twoTabs(p, 'under') },
  { id: 'r3-15-two-tabs', device: MOBILE, run: p => twoTabs(p, 'above') },
  // 16: a typed «идея:» names the page over a topic word of another one (the main flow files it with no receipt)
  { id: 'r3-16-prefix', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'идея: сад на балконе')
    const where = await pageOf(p, 'сад на балконе')
    expect(where === 'Идеи', `«идея: сад на балконе» went to ${where}`)
  } },
  // 17, 18: receipts stay on Журнал's composer, off the main flow

  // 17: in a series only the row that waited for the network says «разобрано, когда появилась сеть»
  { id: 'r3-17-resumed-row', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    const pid = await store(p, data => data.livePages.find(x => x.title === 'Покупки').id)
    await p.route('**/fake-ai/v1/**', async (route) => {
      const line = JSON.parse(route.request().postData() ?? '{}').messages?.at(-1)?.content ?? ''
      const text = /сметан/i.test(line) ? 'Сметана' : 'Кефир'
      await route.fulfill({ json: { id: 'x', object: 'chat.completion', created: 0, model: 'test', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ kind: 'record', pageId: pid, items: [{ text }], guesses: [], newPageName: null }) } }] } })
    })
    await store(p, (data, base) => data.setSettings({ provider: 'custom', baseUrl: base, modelId: 'test', apiKey: 'sk-test', keyState: 'ok', rulesFirst: false }), `${BASE}/fake-ai/v1`)
    await send(p, 'кефир')
    await p.context().setOffline(true)
    await p.waitForTimeout(200)
    await send(p, 'сметана')
    await p.context().setOffline(false)
    await p.waitForTimeout(1500)
    const label = p.getByText('разобрано, когда появилась сеть')
    expect(await label.count() === 1, `${await label.count()} rows say «разобрано, когда появилась сеть»`)
    expect(await label.locator('xpath=ancestor::li[1]').innerText().then(t => t.includes('Сметана')), 'the label is on the row sent online')
  } },
  // 18: «Проверить ключ ›»; the import question is an alertdialog
  { id: 'r3-18-key-chevron', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    await p.route('**/fake-ai/v1/**', route => route.fulfill({ status: 401, json: { error: { message: 'bad key' } } }))
    await store(p, (data, base) => data.setSettings({ provider: 'custom', baseUrl: base, modelId: 'test', apiKey: 'sk-test', keyState: 'ok', rulesFirst: false }), `${BASE}/fake-ai/v1`)
    await send(p, 'батарейки')
    const key = p.getByRole('button', { name: 'Проверить ключ' })
    expect(await shows(key), 'no «Проверить ключ»')
    expect(await key.locator('.iconify, svg, [class*="i-lucide"]').count(), '«Проверить ключ» has no «›»')
  } },
  { id: 'r3-18-import-alert', device: DESKTOP, run: async (p) => {
    await open(p, '/settings')
    const text = await store(p, data => JSON.stringify({ app: 'cerulean', version: 1, exportedAt: Date.now(), pages: Object.values(data.pages), records: Object.values(data.records), sections: Object.values(data.sections), entries: [] }))
    const chooser = p.waitForEvent('filechooser')
    await p.getByRole('button', { name: 'Выбрать файл' }).first().click()
    await (await chooser).setFiles({ name: 'cerulean-2026-09-12.json', mimeType: 'application/json', buffer: Buffer.from(text) })
    expect(await shows(p.getByRole('alertdialog')), 'the import question is not an alertdialog')
  } }
]

async function twoTabs(p, where) {
  await open(p, '/')
  const id = await store(p, data => Object.values(data.records).find(r => r.text === 'Яйца').id)
  await p.goto(new URL(`/r/${id}`, p.url()).href)
  await p.waitForSelector('main')
  const other = await p.context().newPage()
  await other.goto(p.url())
  await other.getByRole('textbox', { name: 'Текст записи' }).waitFor()
  await store(other, (data, rid) => data.updateRecord(rid, { text: 'Яйца С0' }), id)
  const line = p.getByText('Запись изменили в другой вкладке')
  expect(await shows(line), 'no «Запись изменили в другой вкладке»')
  const l = await line.boundingBox()
  const t = await p.getByRole('textbox', { name: 'Текст записи' }).boundingBox()
  expect(where === 'under' ? l.y >= t.y + t.height : l.y + l.height <= t.y, `the line is not ${where} the title`)
  await other.close()
}
