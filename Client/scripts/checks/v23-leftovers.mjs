// The four findings outside the v23 Check lines that its acceptance noted (design/app-qa/acceptance-pr15-v23.md,
// «Other findings»): «Срок» at 320, a goal's name beside its values, the receipt's head glyph, the record page in the
// desktop sidebar.
import { BASE, DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')
const recId = (p, text) => store(p, (data, t) => Object.values(data.records).find(r => r.text === t && !r.deletedAt)?.id, text)

async function openRecord(p, text) {
  await open(p, '/')
  const id = await recId(p, text)
  expect(id, `no record «${text}»`)
  await open(p, `/r/${id}`)
  return id
}

export default [
  // «25 октября · через 6 дней» ran past the right edge at 320: the date stays whole and «через…» gives way
  { id: 'x23-due-320', device: { ...MOBILE, viewport: { width: 320, height: 700 } }, run: async (p) => {
    await p.clock.install({ time: NOW })
    await openRecord(p, 'Полумарафон к маю')
    const due = p.getByRole('button', { name: /^Срок:/ })
    const end = await due.evaluate(b => Math.max(...[...b.querySelectorAll('span')].map(s => s.getBoundingClientRect().right)))
    expect(end <= 320 - 16 + 1, `«Срок» ends at ${Math.round(end)}`)
    const date = await due.locator('span').first().evaluate(s => s.scrollWidth <= s.clientWidth + 1)
    expect(date, 'the date itself is cut')
    const progress = await p.getByText(/^\d+ из \d+$/).first().evaluate(s => s.getBoundingClientRect().height)
    expect(progress < 30, `«3 из 6» wraps (${progress} high)`)
  } },
  // Цели: «Полумарафон к маю» was cut to «Полум…» by «3/6», the note glyph, «В процессе» and the date: the values go
  // to line 2 and the name is whole, at 390 and 320; a row with room keeps one line
  ...[390, 320].map(w => ({ id: `x23-goal-name-${w}`, device: { ...MOBILE, viewport: { width: w, height: 700 } }, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await p.getByRole('link', { name: /^Цели/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(500)
    const rows = await p.locator('[data-row-text]').evaluateAll(bs => bs.map((b) => {
      const name = b.querySelector('span')
      return { text: name.textContent.replace(/\s+/g, ' ').trim(), whole: name.scrollWidth <= name.clientWidth + 1, h: b.parentElement.getBoundingClientRect().height }
    }))
    const goal = rows.find(r => r.text === 'Полумарафон к маю')
    expect(goal?.whole, `«Полумарафон к маю» is cut (${JSON.stringify(goal)})`)
    const books = rows.find(r => r.text === '24 книги за год')
    expect(books && books.h <= 44.5, `«24 книги за год» is ${books?.h} high`)
    await p.getByRole('textbox', { name: 'Новая запись' }).waitFor()
    // Покупки's rows keep one line
    await open(p, '/')
    await p.getByRole('link', { name: /^Покупки/ }).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(500)
    const tall = await p.locator('[data-row-text]').evaluateAll(bs => bs.filter(b => b.parentElement.getBoundingClientRect().height > 44.5).map(b => b.textContent.trim()))
    expect(!tall.length, `Покупки rows on two lines: ${tall.join(', ')}`)
  } })),
  // Spec «Icons»: 14 in receipts; the head's glyph sits on the rows' 18px column
  { id: 'x23-receipt-glyph', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/journal')
    await p.waitForTimeout(500)
    const sizes = await p.locator('main').getByRole('button', { name: /→ Покупки/ }).first().evaluate(b => [...b.querySelectorAll('svg, .iconify, [class*="i-"]')].map(i => Math.round(i.getBoundingClientRect().width)))
    expect(sizes[0] === 14, `the head's glyph is ${sizes[0]}`)
  } },
  // Spec: «the current screen or page has `side-sel`»: a record page marks its page, a subitem of a favourite its row
  { id: 'x23-sidebar-record', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    const marked = () => p.locator('[aria-current="page"]').evaluateAll(els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()))
    for (const [rec, row] of [['Яйца', 'Покупки'], ['Позвонить стоматологу', 'Задачи'], ['Пробежка 6 км', 'Полумарафон к маю'], ['Полумарафон к маю', 'Полумарафон к маю']]) {
      await openRecord(p, rec)
      const m = await marked()
      expect(m.length === 1 && m[0].startsWith(row), `on «${rec}» the sidebar marks ${m.join(' | ') || 'nothing'}`)
    }
    expect(BASE, 'no base')
  } }
]
