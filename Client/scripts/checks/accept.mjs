// What did not land in the acceptance of part 1 (design/app-qa/acceptance-pr15.md, «What did not land» 1–14)
import { DESKTOP, MOBILE, expect, open, send, shows, store } from './lib.mjs'

const shop = async (p) => {
  await p.getByRole('link', { name: /^Покупки/ }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(400)
}

/** Left and right edge of the element's box */
const edges = locator => locator.first().evaluate((e) => {
  const r = e.getBoundingClientRect()
  return [Math.round(r.left), Math.round(r.right)]
})

export default [
  // 3. B4: a send on a long page shows its row
  { id: 'acc-3-long-page-send', device: MOBILE, run: async (p) => {
    // The demo's day: its records are written up to 8:41, so before that hour they would be in the future
    await p.clock.install({ time: new Date('2026-10-19T09:14:00+03:00') })
    await open(p, '/')
    await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Покупки')
      for (let i = 0; i < 160; i++) data.addRecord({ pageId: page.id, text: `Товар ${i}` })
    })
    await shop(p)
    expect(await shows(p.getByRole('button', { name: /^Показать ещё/ })), 'the page is not long enough to cut')
    expect(await p.getByRole('textbox', { name: 'Название страницы' }).evaluate(e => e.getBoundingClientRect().top > 0), 'the page opened scrolled away from its title')
    await send(p, 'изолента')
    const row = p.getByText('Изолента', { exact: true })
    expect(await shows(row), 'the sent row is not rendered')
    expect(await row.first().isVisible() && await row.first().evaluate((e) => {
      const r = e.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= innerHeight
    }), 'the sent row is not in view')
  } },
  // 4. B29: Подключение says its state on one line. v23 (M11, F16) changed the words: «OpenRouter · подключено» and no
  // key value (the key and the model live in the connection's own screen)
  { id: 'acc-4-connection-row', device: MOBILE, run: async (p) => {
    await open(p, '/settings')
    await store(p, data => data.setSettings({ provider: 'openrouter', apiKey: 'sk-or-v1-0123456789abcdef9f2c', keyState: 'ok' }))
    await p.waitForTimeout(300)
    expect(!(await p.getByText(/sk-…9f2c/).count()), 'Настройки show the key')
    const status = p.getByText(/^OpenRouter · подключено$/)
    expect(await shows(status), 'no «OpenRouter · подключено»')
    expect(await status.first().evaluate(e => e.getClientRects().length === 1 && e.getBoundingClientRect().height < 24), 'the status wraps')
  } },
  // 5. B1: a finger swipe opens «Переместить» and «Удалить»; the mark and the name stay where they were
  // (touch events through the DevTools protocol, as on a phone; a real phone is still the last word)
  { id: 'acc-5-swipe', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await shop(p)
    const row = p.locator('main li').filter({ hasText: 'Сыр' }).first()
    // The name's line holds the quantity too (main flow 2, item 12)
    const name = row.locator('[data-row-text] > span').first()
    const box = await row.boundingBox()
    const before = (await name.boundingBox()).x
    const cdp = await p.context().newCDPSession(p)
    const y = box.y + box.height / 2
    const at = x => ({ touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', ...at(box.x + box.width - 30) })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', ...at(box.x + box.width - 30 - i * 16) })
      await p.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await p.waitForTimeout(400)
    expect(await row.getByRole('button', { name: 'Переместить', exact: true }).isVisible(), 'no «Переместить» after the swipe')
    expect(await row.getByRole('button', { name: 'Удалить', exact: true }).isVisible(), 'no «Удалить» after the swipe')
    const after = await name.boundingBox()
    expect(Math.abs(after.x - before) <= 1, `the name moved by ${Math.round(after.x - before)} px`)
    expect(await row.getByRole('checkbox').first().isVisible(), 'the mark left the screen')
  } },
  // 7–8 retired in main flow 2 (item 10): Входящие has no guess chips; each open record ends with a move button
  // 9. The Прогресс bar is neutral
  { id: 'acc-9-progress', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const id = await store(p, data => Object.values(data.records).find(r => !r.deletedAt && Object.values(data.records).filter(s => s.parentId === r.id).length > 1)?.id)
    expect(id, 'no record with subitems in the demo')
    await open(p, `/r/${id}`)
    const bar = p.locator('[role="img"][aria-label*=" из "] > span')
    expect(await shows(bar), 'no progress bar')
    expect(!(await bar.first().evaluate(e => e.className.includes('bg-accent'))), 'the bar is accent')
  } },
  // 10. Desktop: rows, tabs and the composer share one 680 column
  { id: 'acc-10-desk-column', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await shop(p)
    const tabs = await edges(p.getByRole('tablist'))
    const form = await edges(p.locator('[data-field="closed"]'))
    expect(Math.abs(tabs[0] - form[0]) <= 1, `tabs start at ${tabs[0]}, the composer at ${form[0]}`)
    const row = await edges(p.locator('main li').first())
    expect(Math.abs(row[0] - form[0]) <= 1 && Math.abs(row[1] - form[1]) <= 1, `rows ${row} vs composer ${form}`)
    expect(Math.abs(form[1] - form[0] - 680) <= 1, `the composer is ${form[1] - form[0]} wide`)
  } },
  // 11. Корзина: line 2 has only the day and wraps
  { id: 'acc-11-trash', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Задачи')
      const rec = Object.values(data.records).find(r => r.pageId === page.id && !r.deletedAt)
      data.removeRecords([rec.id])
      data.removePage(data.livePages.find(x => x.title === 'Идеи').id)
    })
    await open(p, '/settings/trash')
    const line = p.getByText(/^Задачи · удалено сегодня$/)
    expect(await shows(line), 'no «Задачи · удалено сегодня»')
    expect(!(await p.getByText(/удалено сегодня, \d/).count()), 'line 2 still has the time')
    const lines = p.locator('li .text-meta')
    for (const l of await lines.all()) expect(await l.evaluate(e => e.scrollWidth <= e.clientWidth + 1), `«${await l.textContent()}» is cut`)
    expect(await shows(p.getByRole('button', { name: 'Вернуть' })), 'no «Вернуть»')
    // v23 (B7, M12): «Удалить навсегда» moved into the row's faint «⋯»
    expect(await shows(p.getByRole('button', { name: /^Ещё для «/ })), 'no row «⋯»')
    await p.getByRole('button', { name: 'Очистить' }).click()
    expect(await shows(p.getByText(/\d+ страниц[аы]? \(\d+ запис[а-я]*\) и \d+ запис[а-я]* удалятся навсегда/)), 'the confirm does not count the records inside the page')
  } },
  // 12. A blank page has no view bar
  { id: 'acc-12-blank-page', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const id = await store(p, data => data.createPage({ title: '' }).id)
    await open(p, `/p/${id}`)
    expect(!(await p.getByRole('tablist').count()), 'the view bar shows on a blank page')
  } },
  // 13. Desktop Settings: the title sits on the rows' edge
  { id: 'acc-13-desk-settings', device: DESKTOP, run: async (p) => {
    await open(p, '/settings')
    const title = await edges(p.getByRole('heading', { name: 'Настройки', level: 1 }).locator('visible=true'))
    const row = await edges(p.getByText('Подключение', { exact: true }).locator('visible=true'))
    expect(Math.abs(title[0] - row[0]) <= 1, `title at ${title[0]}, rows at ${row[0]}`)
  } },
  // 14. Desktop hover keeps the quantity before the row's glyphs
  { id: 'acc-14-desk-hover', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await shop(p)
    const row = p.locator('main li').filter({ hasText: 'Молоко' }).first()
    await row.hover()
    await p.waitForTimeout(300)
    const qty = row.getByText('2 л', { exact: true })
    expect(await qty.isVisible(), '«2 л» hides on hover')
    const move = row.getByRole('button', { name: 'Переместить' })
    expect(await move.isVisible(), 'no «Переместить» on hover')
    expect((await edges(qty))[1] <= (await edges(move))[0], 'the quantity is not before the glyphs')
  } }
]
