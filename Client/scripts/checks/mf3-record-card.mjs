import { DESKTOP, MOBILE, expect, open, send, store } from './lib.mjs'
import { goPage } from './main-flow.mjs'

async function fixture(p) {
  await open(p, '/', false)
  return store(p, (data) => {
    const page = data.livePages.find(x => x.title === 'Задачи')
    const room = { id: 'mf3-room', name: 'Комната', type: 'select', options: [{ id: 'bath', name: 'Ванная', color: 'blue' }, { id: 'kitchen', name: 'Кухня', color: 'green' }] }
    const amount = { id: 'mf3-amount', name: 'Осталось', type: 'number', normProp: 'mf3-norm', unit: 'шт' }
    const norm = { id: 'mf3-norm', name: 'Норма', type: 'number', unit: 'шт' }
    data.updatePage(page.id, { props: [room, amount, norm, { id: 'mf3-empty', name: 'Пустое', type: 'text' }] })
    const rec = data.addRecord({ pageId: page.id, text: 'Выбрать плитку', note: 'Белая матовая, 30×60', values: { 'mf3-room': 'bath', 'mf3-amount': 1, 'mf3-norm': 2 }, due: { date: '2099-11-02' } })
    data.addRecord({ pageId: page.id, parentId: rec.id, text: 'Замерить стены', done: true })
    data.addRecord({ pageId: page.id, parentId: rec.id, text: 'Выбрать цвет' })
    data.addRecord({ pageId: page.id, parentId: rec.id, text: 'Купить плитку' })
    return rec.id
  })
}

async function openRecord(p) {
  await goPage(p, 'Задачи')
  await p.locator('[data-rows] [data-row-text]').filter({ hasText: 'Выбрать плитку' }).click()
  await p.waitForURL(/\/r\//)
  await p.locator('[data-record-values]').waitFor()
}

async function hitArea(p, touch, safeArea = false) {
  if (safeArea) {
    const cdp = await p.context().newCDPSession(p)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } })
  }
  await fixture(p)
  await openRecord(p)
  const button = p.locator('[data-record-values]').getByRole('button', { name: 'Добавить свойство' })
  const tap = (x, y) => touch ? p.touchscreen.tap(x, y) : p.mouse.click(x, y)
  for (const [dx, dy] of [[-21, 0], [21, 0], [0, -21], [0, 21]]) {
    await button.scrollIntoViewIfNeeded()
    const box = await button.boundingBox()
    expect(Math.abs(box.width - 24) < 1 && Math.abs(box.height - 24) < 1, `add button size: ${box.width}×${box.height}`)
    await tap(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy)
    await p.waitForFunction(() => document.querySelector('[data-record-values] [aria-label="Добавить свойство"]')?.getAttribute('aria-expanded') === 'true')
    const choice = p.getByRole('button', { name: /Пустое/ })
    await choice.waitFor()
    const layer = choice.locator('xpath=ancestor::*[@role="dialog"][1]')
    await layer.waitFor()
    await p.keyboard.press('Escape')
    await p.waitForFunction(() => document.querySelector('[data-record-values] [aria-label="Добавить свойство"]')?.getAttribute('aria-expanded') === 'false')
    await layer.waitFor({ state: 'detached' })
  }

  const box = await button.boundingBox()
  const note = p.locator('main .body-text').first()
  const body = await note.boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
  const xs = [cx, cx - 23, cx + 23].map(x => clamp(x, body.x + 3, body.x + body.width - 3))
  const ys = [cy, cy - 23, cy + 23].map(y => clamp(y, body.y + 3, body.y + body.height - 3))
  const points = xs.flatMap(x => ys.map(y => ({ x, y })))
    .filter(({ x, y }) => Math.abs(x - cx) > 22 || Math.abs(y - cy) > 22)
    .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
  expect(points.length > 0, 'no note point outside the add button target')
  const { x, y } = points[0]
  await tap(x, y)
  await p.waitForFunction(() => document.activeElement?.matches('.body-text[contenteditable="true"]'))
  await p.keyboard.type(' Проверка ввода')
  expect((await note.innerText()).includes('Проверка ввода'), 'the note did not accept input outside the add button target')
}

async function inspect(p) {
  const values = p.locator('[data-record-values]')
  expect(await values.getByRole('button', { name: 'Комната: Ванная' }).isVisible(), 'no choice chip')
  const amount = values.getByRole('button', { name: 'Осталось: 1 из 2 шт' })
  expect(await amount.isVisible(), 'no amount and norm')
  expect(await amount.evaluate(e => e.classList.contains('text-warn') && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)'), 'amount is not bare and orange')
  expect(await values.getByRole('button', { name: /Срок:/ }).isVisible(), 'no due date')
  expect(await values.getByRole('button', { name: 'Добавить свойство' }).isVisible(), 'no add button')
  const alignment = await values.getByRole('button', { name: 'Комната: Ванная' }).evaluate(el => Math.abs(el.getBoundingClientRect().left - document.querySelector('textarea[aria-label="Текст записи"]').getBoundingClientRect().left))
  expect(alignment <= 4, `values do not align with the title: ${alignment}px`)
  const order = await p.evaluate(() => {
    const value = document.querySelector('[data-record-values]')
    const body = [...document.querySelectorAll('*')].find(e => e.textContent?.trim() === 'Белая матовая, 30×60')
    const subs = document.querySelector('#subs-title')
    const added = document.querySelector('[data-record-added]')
    return [value, body, subs, added].slice(0, -1).every((el, i) => el && [body, subs, added][i] && (el.compareDocumentPosition([body, subs, added][i]) & Node.DOCUMENT_POSITION_FOLLOWING))
  })
  expect(order, 'value, note, subitems, added are out of order')
  const fold = p.getByRole('button', { name: 'Подпункты 1/3' })
  expect(await fold.getAttribute('aria-expanded') === 'true', 'subitems not open')
  expect(await p.getByText('Замерить стены', { exact: true }).isVisible(), 'done subitem missing')
  await fold.click()
  expect(!(await p.getByText('Замерить стены', { exact: true }).count()) && await fold.getAttribute('aria-expanded') === 'false', 'fold did not hide subitems')
  await fold.click()
  await values.getByRole('button', { name: 'Комната: Ванная' }).click()
  await p.getByRole('button', { name: 'Кухня', exact: true }).click()
  await values.getByRole('button', { name: 'Комната: Кухня' }).waitFor({ timeout: 3000 }).catch(() => {})
  await p.getByRole('button', { name: 'Ванная', exact: true }).waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
  expect(await values.getByRole('button', { name: 'Комната: Кухня' }).isVisible(), 'choice did not change')
  expect(!(await p.getByRole('button', { name: 'Ванная', exact: true }).isVisible().catch(() => false)), 'choice overlay stayed open')
  expect(!(await values.getByRole('button', { name: /Пустое/ }).count()), 'empty value is shown')
  await values.getByRole('button', { name: 'Добавить свойство' }).click()
  await p.getByRole('button', { name: /Пустое/ }).click()
  const field = p.getByRole('textbox', { name: 'Пустое' })
  await field.waitFor({ timeout: 5000 })
  await field.press('Escape')
  await field.waitFor({ state: 'hidden', timeout: 5000 })
  expect(!(await values.getByRole('button', { name: /Пустое/ }).count()), 'cancelled empty value is shown')
}

async function dueFlow(p) {
  const id = await fixture(p)
  await store(p, (data, id) => data.updateRecord(id, { due: null }), id)
  await openRecord(p)
  const values = p.locator('[data-record-values]')
  const addDue = async () => {
    await values.getByRole('button', { name: 'Добавить свойство' }).click()
    await p.getByRole('button', { name: /^Срок/ }).last().click()
    await p.getByRole('button', { name: 'Без срока', exact: true }).waitFor()
  }
  await addDue()
  await p.getByRole('button', { name: 'Без срока', exact: true }).click()
  await values.getByRole('button', { name: 'Добавить срок' }).waitFor({ state: 'hidden', timeout: 5000 })
  expect(!(await values.getByRole('button', { name: 'Добавить срок' }).count()), 'closing an empty due date left it visible')
  await addDue()
  await p.keyboard.press('Escape')
  await values.getByRole('button', { name: 'Добавить срок' }).waitFor({ state: 'hidden', timeout: 5000 })
  await addDue()
  await p.getByRole('button', { name: 'Завтра', exact: true }).click()
  await p.getByRole('button', { name: '10:00', exact: true }).click()
  await p.keyboard.press('Escape')
  const due = values.getByRole('button', { name: /^Срок: / })
  await due.waitFor()
  const cardStyle = await due.evaluate(e => ({ text: e.textContent, cls: e.className, bg: getComputedStyle(e).backgroundColor, icon: e.firstElementChild?.outerHTML, iconWidth: e.firstElementChild?.getBoundingClientRect().width }))
  expect(cardStyle.text.includes('завтра, 10:00') && cardStyle.cls.includes('text-accent-ink') && cardStyle.bg === 'rgba(0, 0, 0, 0)' && cardStyle.icon?.includes('calendar') && cardStyle.iconWidth === 16, `card due: ${JSON.stringify(cardStyle)}`)
  const saved = await store(p, (data, id) => data.records[id].due, id)
  expect(saved?.time === '10:00', 'due time was not saved')
  await due.click()
  await p.getByRole('button', { name: 'Без срока', exact: true }).click()
  await due.waitFor({ state: 'hidden', timeout: 5000 })
  expect(await store(p, (data, id) => data.records[id].due, id) === null, 'due was not cleared')
}

async function receiptDue(p, desktop) {
  await open(p, '/journal')
  await send(p, 'позвонить стоматологу завтра в 10')
  const row = p.locator('li').filter({ hasText: 'позвонить стоматологу' }).last()
  const due = row.getByRole('button', { name: /^Срок: / })
  await due.waitFor()
  const style = await due.evaluate(e => ({ height: Math.round(e.getBoundingClientRect().height), icon: e.firstElementChild?.outerHTML, iconWidth: e.firstElementChild?.getBoundingClientRect().width, text: e.textContent.trim() }))
  expect(style.height === (desktop ? 22 : 28) && style.icon?.includes('clock') && style.iconWidth === 12 && style.text.includes('завтра, 10:00'), `receipt due changed: ${JSON.stringify(style)}`)
  await due.click()
  await p.getByRole('button', { name: 'Сегодня', exact: true }).click()
  expect(await store(p, data => data.liveRecords.find(r => r.text.toLowerCase().includes('позвонить стоматологу') && r.via === 'chat')?.due?.time) === '10:00', 'receipt due did not preserve its time')
}

export default [
  { id: 'mf3-record-card-hit-phone', device: MOBILE, run: p => hitArea(p, true) },
  { id: 'mf3-record-card-hit-phone-safe', device: MOBILE, run: p => hitArea(p, true, true) },
  { id: 'mf3-record-card-hit-desktop', device: DESKTOP, run: p => hitArea(p, false) },
  { id: 'mf3-record-card-phone', device: MOBILE, run: async (p) => {
    await fixture(p)
    await openRecord(p)
    await inspect(p)
  } },
  { id: 'mf3-record-card-desktop', device: DESKTOP, run: async (p) => {
    await fixture(p)
    await openRecord(p)
    await inspect(p)
  } },
  { id: 'mf3-record-card-dark', device: MOBILE, run: async (p) => {
    await p.emulateMedia({ colorScheme: 'dark' })
    await fixture(p)
    await openRecord(p)
    expect(await p.locator('html').evaluate(e => e.classList.contains('dark')), 'dark theme is not active')
    await inspect(p)
  } },
  { id: 'mf3-record-card-desktop-dark', device: DESKTOP, run: async (p) => {
    await p.emulateMedia({ colorScheme: 'dark' })
    await fixture(p)
    await openRecord(p)
    expect(await p.locator('html').evaluate(e => e.classList.contains('dark')), 'dark theme is not active')
    await inspect(p)
  } },
  { id: 'mf3-record-card-amount', device: MOBILE, run: async (p) => {
    const id = await fixture(p)
    await openRecord(p)
    for (const [amount, norm, low] of [[1, 1, false], [0, 1, true], [1, 5, true], [0.5, 2, true], [0.5, 0.5, false]]) {
      await store(p, (data, a) => data.updateRecord(a.id, { values: { ...data.records[a.id].values, 'mf3-amount': a.amount, 'mf3-norm': a.norm } }), { id, amount, norm })
      const button = p.locator('[data-record-values]').getByRole('button', { name: new RegExp('^Осталось:') })
      await p.waitForFunction(([a, n]) => document.querySelector('[data-record-values] [aria-label^="Осталось:"]')?.textContent.includes(`${String(a).replace('.', ',')} из ${String(n).replace('.', ',')}`), [amount, norm])
      expect(await button.evaluate(e => e.classList.contains('text-warn')) === low, `wrong low state for ${amount}/${norm}`)
    }
  } },
  { id: 'mf3-record-card-due-phone', device: MOBILE, run: p => dueFlow(p) },
  { id: 'mf3-record-card-due-desktop', device: DESKTOP, run: p => dueFlow(p) },
  { id: 'mf3-record-card-receipt-phone', device: MOBILE, run: p => receiptDue(p, false) },
  { id: 'mf3-record-card-receipt-desktop', device: DESKTOP, run: p => receiptDue(p, true) },
  { id: 'mf3-record-card-due-glance', device: DESKTOP, run: async (p) => {
    await fixture(p)
    await p.getByRole('button', { name: 'Найти', exact: true }).first().click()
    const search = p.getByRole('combobox', { name: 'Найти' })
    await search.fill('Выбрать плитку')
    const values = p.getByRole('dialog', { name: 'Поиск' }).locator('[data-record-values]')
    await values.waitFor()
    expect(await values.getByText('2 ноя 2099', { exact: true }).isVisible(), 'glance lost its due date')
    expect(!(await values.getByRole('button', { name: /^Срок/ }).count()), 'glance due is editable')
    expect(await values.locator('span').filter({ hasText: '2 ноя 2099' }).last().evaluate(e => e.classList.contains('text-accent-ink') && e.querySelector('[class*="size-4"]') !== null), 'glance due lost its bare calendar')
  } },
  { id: 'mf3-record-card-preview', device: MOBILE, run: async (p) => {
    const id = await fixture(p)
    await p.goto(`${new URL(p.url()).origin}/?peek=r:${id}`)
    const values = p.locator('[data-record-values]')
    await values.waitFor()
    expect(await values.getByRole('button', { name: 'Комната: Ванная' }).isVisible(), 'preview lost values')
    expect(await p.getByRole('button', { name: 'Связать' }).isVisible(), 'preview lost linking')
    expect(await p.getByRole('button', { name: 'Подпункты 1/3' }).isVisible(), 'preview lost subitems')
    await values.getByRole('button', { name: 'Комната: Ванная' }).click()
    await p.getByRole('button', { name: 'Кухня', exact: true }).click()
    await values.getByRole('button', { name: 'Комната: Кухня' }).waitFor({ timeout: 5000 })
    await values.getByRole('button', { name: /^Срок: / }).click()
    await p.getByRole('button', { name: 'Завтра', exact: true }).click()
    expect(await store(p, (data, id) => data.records[id].due?.date !== '2099-11-02', id), 'preview due did not change')
  } }
]
