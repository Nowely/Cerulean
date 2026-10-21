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
  // 1. «в Журнале ›» stays on the docked card after the 15 s of «Отменить»
  { id: 'acc-1-journal-link', device: MOBILE, run: async (p) => {
    await p.clock.install()
    await open(p, '/')
    await send(p, 'молоко, яблоки')
    expect(await shows(p.getByRole('button', { name: /^Отменить/ })), 'no «Отменить» right after the send')
    await p.clock.fastForward(16_000)
    await p.waitForTimeout(400)
    expect(!(await p.getByRole('button', { name: /^Отменить/ }).count()), '«Отменить» is still there after 15 s')
    expect(await shows(p.getByText('в Журнале')), '«в Журнале ›» went with «Отменить»')
    expect(await shows(p.getByRole('button', { name: 'Не туда' })), '«Не туда» went')
  } },
  // 2. B9: the docked receipt survives a visit to a page
  { id: 'acc-2-dock-kept', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'позвонить маме')
    expect(await shows(p.getByText(/1 запись → Задачи/)), 'no receipt')
    await shop(p)
    await p.getByRole('link', { name: /Главная/ }).first().click()
    await p.waitForURL(u => new URL(u).pathname === '/')
    await p.waitForTimeout(400)
    expect(await shows(p.getByText(/1 запись → Задачи/)), 'the receipt is gone after coming back to Главная')
  } },
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
  // 4. B29: Подключение keeps «Работает · gpt-6-luna» and the service with the key whole
  { id: 'acc-4-connection-row', device: MOBILE, run: async (p) => {
    await open(p, '/settings')
    await store(p, data => data.setSettings({ provider: 'openrouter', apiKey: 'sk-or-v1-0123456789abcdef9f2c', keyState: 'ok' }))
    await p.waitForTimeout(300)
    const value = p.getByText(/^OpenRouter · sk-…9f2c$/)
    expect(await shows(value), 'no «OpenRouter · sk-…9f2c»')
    expect(await value.first().evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'the value is cut')
    const status = p.getByText(/^Работает · /)
    expect(await status.first().evaluate(e => e.getClientRects().length === 1 && e.getBoundingClientRect().height < 24), 'the status wraps')
  } },
  // 6. Day one: the guess line names the page the template makes
  { id: 'acc-6-day-one-guess', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await p.getByRole('textbox', { name: 'Новая запись' }).fill('хлеб')
    await p.waitForTimeout(500)
    expect(await shows(p.getByText('→ Покупки', { exact: true })), 'the guess line does not say «→ Покупки»')
    await p.keyboard.press('Enter')
    expect(await shows(p.getByText(/1 запись → Покупки/)), 'the send did not go to Покупки')
  } },
  // 7–8. The composer chip is accent-ink; chips on a page sit on `trk`
  { id: 'acc-7-8-chips', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await shop(p)
    const chip = p.getByRole('button', { name: /^Куда:/ })
    const ink = await p.evaluate(() => {
      const probe = document.createElement('span')
      probe.className = 'text-accent-ink'
      document.body.append(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    })
    expect(await chip.evaluate(e => getComputedStyle(e).color) === ink, 'the chip is not accent-ink')
    const inbox = await store(p, data => data.inbox.id)
    await open(p, `/p/${inbox}`)
    const trk = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--trk').trim())
    const fill = await p.getByRole('button', { name: /^Переместить в/ }).first().evaluate(e => getComputedStyle(e).backgroundColor)
    expect(!!trk && fill !== 'rgb(255, 255, 255)', `a page chip is ${fill}`)
  } },
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
    const form = await edges(p.locator('form').filter({ has: p.getByRole('textbox', { name: 'Новая запись' }) }))
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
    expect(await shows(p.getByRole('button', { name: /^Удалить навсегда «/ })), 'no «Удалить»')
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
