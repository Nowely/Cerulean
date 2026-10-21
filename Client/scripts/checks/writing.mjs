// v22 writing loop: the one notice slot (11), the short docked Уточнение (12), «Похожее в записях» and «ИИ снова не
// ответил» (22), duplicates (25), «Запомнить» (26), plain words (35) and no «Новая страница «X»» when X exists (39)
import { BASE, DESKTOP, MOBILE, expect, open, send, shows, store } from './lib.mjs'

const box = locator => locator.first().evaluate((e) => {
  const r = e.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }
})

const notice = p => p.locator('[data-notice]')

const shop = async (p) => {
  await p.getByRole('link', { name: /^Покупки/ }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(500)
}

/**
 * Авто with a model that is a route of this page: `answer` is what it files («unclear» with a page name), `fail`
 * never answers (the connection drops) and `refuse` turns the key down
 */
async function fakeAI(p, answer) {
  await p.route('**/fake-ai/v1/**', (route) => {
    if (answer === 'fail') return route.abort('failed')
    if (answer === 'refuse') return route.fulfill({ status: 401, json: { error: { message: 'bad key' } } })
    return route.fulfill({ json: { id: 'x', object: 'chat.completion', created: 0, model: 'test', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(answer) } }] } })
  })
  await store(p, (data, base) => data.setSettings({ provider: 'custom', baseUrl: base, modelId: 'test', apiKey: 'sk-test', keyState: 'ok', rulesFirst: false }), `${BASE}/fake-ai/v1`)
}

/** Deletes a row of the page on screen without moving focus (the composer keeps the keyboard up) */
const deleteRow = p => p.evaluate(() => [...document.querySelectorAll('main button')].find(b => b.textContent.trim() === 'Удалить').click())

/** Every text on screen, for words that must not show */
const screenText = p => p.evaluate(() => document.body.innerText)

export default [
  // 11. Delete a record with the keyboard up: the notice sits above the composer and covers neither it nor the list
  { id: 'w-11-notice-slot', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: new Date('2026-10-19T09:14:00+03:00') })
    await open(p, '/')
    await shop(p)
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    await field.focus()
    await field.fill('кефир')
    await deleteRow(p)
    expect(await shows(notice(p).filter({ hasText: 'Запись в корзине' })), 'no notice after a delete')
    const t = await box(notice(p))
    const form = await box(p.locator('form').filter({ has: field }))
    const list = await box(p.locator('main .scroll-fade'))
    expect(t.bottom <= form.top, `the notice (bottom ${t.bottom}) covers the composer (top ${form.top})`)
    expect(t.top >= list.bottom - 1, `the notice (top ${t.top}) covers the list (bottom ${list.bottom})`)
    expect(await field.evaluate(e => e === document.activeElement), 'the composer lost focus')
    // A new notice replaces the old one
    await deleteRow(p)
    await p.waitForTimeout(200)
    expect(await notice(p).count() === 1, `${await notice(p).count()} notices at once`)
    // A deletion stays 8 s; a finger on it holds it
    await p.clock.fastForward(7000)
    expect(await notice(p).count() === 1, 'the deletion notice went before 8 s')
    await notice(p).dispatchEvent('touchstart')
    await p.clock.fastForward(5000)
    expect(await notice(p).count() === 1, 'a finger on the notice did not hold it')
    await notice(p).dispatchEvent('touchend')
    await p.clock.fastForward(1500)
    await p.waitForTimeout(200)
    expect(!(await notice(p).count()), 'the notice stayed past its 8 s')
  } },
  // 11. Inside an open sheet the notice is the sheet's foot, under its content, and screen readers get it
  { id: 'w-11-notice-sheet', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await shop(p)
    await p.getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.getByRole('dialog').or(p.getByRole('menu')).getByText(/^Свойства/).first().click()
    await p.getByRole('button', { name: 'Изменить «Отдел»' }).click()
    await p.waitForTimeout(400)
    await p.getByRole('button', { name: 'Удалить вариант «Бытовая химия»' }).click()
    const n = p.getByRole('dialog').locator('[data-notice]')
    expect(await shows(n), 'the notice is not in the sheet')
    expect(await n.evaluate(e => !e.closest('[aria-hidden="true"]')), 'the notice is hidden from screen readers')
    const t = await box(n)
    const content = await box(p.getByRole('dialog').locator('.overflow-y-auto').last())
    expect(t.top >= content.bottom - 1, 'the notice covers the sheet\'s content')
    expect(await n.locator('.line-clamp-2').evaluate(e => getComputedStyle(e).webkitLineClamp === '2'), 'long text does not wrap to two lines')
    const action = n.getByRole('button', { name: 'Отменить' })
    expect(await action.evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'the action is cut')
  } },
  // 11. Desktop: at the column's right above the composer, a drain line, held while the pointer is on it
  { id: 'w-11-notice-desk', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: new Date('2026-10-19T09:14:00+03:00') })
    await open(p, '/')
    await shop(p)
    await p.getByText('Молоко', { exact: true }).first().hover()
    await p.getByRole('button', { name: 'Удалить «Молоко»' }).click()
    expect(await shows(notice(p)), 'no notice after a delete')
    const t = await box(notice(p))
    const form = await box(p.locator('form').filter({ has: p.getByRole('textbox', { name: 'Новая запись' }) }))
    expect(t.bottom <= form.top && Math.abs(t.right - form.right) <= 1, `the notice ${JSON.stringify(t)} is not at the right above the composer ${JSON.stringify(form)}`)
    expect(await notice(p).locator('[data-drain]').evaluate(e => getComputedStyle(e).display !== 'none'), 'no drain line')
    await notice(p).hover()
    await p.clock.fastForward(10_000)
    expect(await notice(p).count() === 1, 'the pointer on the notice did not hold it')
    await p.mouse.move(10, 10)
    await p.clock.fastForward(8500)
    await p.waitForTimeout(200)
    expect(!(await notice(p).count()), 'the notice stayed past its 8 s')
  } },
  // 12. Docked Уточнение: the question, one row of chips that scrolls and fades, the footnote, about 150px
  { id: 'w-12-ask-docked', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'подарок Лене на новоселье')
    const card = p.locator('div.border-accent').filter({ hasText: 'Куда положить' })
    expect(await shows(card), 'no docked Уточнение')
    const { height } = await box(card)
    expect(height <= 170, `the card is ${Math.round(height)}px tall`)
    const row = card.locator('button').first().locator('..')
    const tops = await row.evaluate(e => [...e.children].map(c => Math.round(c.getBoundingClientRect().top)))
    expect(new Set(tops).size === 1, `the chips wrap: ${tops}`)
    expect(await row.evaluate(e => e.scrollWidth > e.clientWidth && getComputedStyle(e).overflowX === 'auto'), 'the chips do not scroll sideways')
    expect(await row.evaluate(e => /gradient/.test(getComputedStyle(e).maskImage || getComputedStyle(e).webkitMaskImage)), 'the chips do not fade at the edge')
    expect(await shows(card.getByText('Пока лежит во Входящих с меткой «уточнить».')), 'no footnote')
  } },
  // 22. Desktop: a question is filed with «Похожее в записях»; a similar row opens in the right panel
  { id: 'w-22-similar-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await send(p, 'когда менять фильтр?')
    expect(await shows(p.getByText(/1 запись → Дела по дому/)), 'no receipt to Дела по дому')
    expect(await shows(p.getByText('Похожее в записях')), 'no «Похожее в записях»')
    await p.getByRole('button', { name: 'Открыть «Поменять фильтр воды» справа' }).click()
    const panel = p.getByRole('complementary', { name: 'Превью' })
    expect(await shows(panel), 'no right panel')
    expect(await shows(panel.getByText('Поменять фильтр воды')), 'the panel shows another record')
  } },
  // 22. Phone: a similar row opens the preview sheet
  { id: 'w-22-similar-phone', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'когда менять фильтр?')
    await p.getByText('Похожее в записях').waitFor({ timeout: 5000 })
    await p.getByRole('button', { name: /Поменять фильтр воды/ }).last().click()
    expect(await shows(p.getByRole('dialog', { name: 'Превью' })), 'no preview sheet')
  } },
  // 22 / 35. The model never answers: «ИИ не ответил…» · «Повторить»; a second miss says «ИИ снова не ответил»
  { id: 'w-22-retry-again', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await fakeAI(p, 'fail')
    await send(p, 'батарейки для пульта')
    expect(await shows(p.getByText('ИИ не ответил, запись ждёт во Входящих.')), 'no slow note')
    await p.getByRole('button', { name: 'Повторить' }).click()
    expect(await shows(notice(p).filter({ hasText: 'ИИ снова не ответил' })), 'no «ИИ снова не ответил»')
    expect(await p.getByText('ИИ не ответил, запись ждёт во Входящих.').count(), 'the receipt went with the notice')
    const t = await box(notice(p))
    const card = await box(p.locator('div.raised').filter({ hasText: 'ИИ не ответил' }))
    expect(t.bottom <= card.top, 'the notice is not above the docked card')
  } },
  // 25. «молоко 1 л» on Главная, «Объединить»: one Молоко, «3 л», the receipt changes in place
  { id: 'w-25-merge', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'молоко 1 л')
    expect(await shows(p.getByText('уже есть в списке, 2 л')), 'no «уже есть в списке, 2 л»')
    await p.getByRole('button', { name: 'Объединить с «Молоко, 2 л»' }).click()
    expect(await shows(p.getByText('объединено с записью в списке')), 'the receipt did not change in place')
    expect(!(await notice(p).count()), 'merging showed a notice')
    const milk = await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Покупки')
      const qty = page.props.find(x => x.name === 'Количество').id
      return data.recordsOf(page.id).filter(r => r.text === 'Молоко' && !r.done).map(r => r.values[qty])
    })
    expect(milk.length === 1 && milk[0] === '3 л', `Молоко on Покупки: ${JSON.stringify(milk)}`)
  } },
  { id: 'w-25-merge-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await send(p, 'молоко 1 л')
    await p.getByRole('button', { name: 'Объединить с «Молоко, 2 л»' }).click()
    expect(await shows(p.getByText('объединено с записью в списке')), 'no «объединено с записью в списке»')
    expect(await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Покупки')
      const qty = page.props.find(x => x.name === 'Количество').id
      return data.recordsOf(page.id).find(r => r.text === 'Молоко')?.values[qty]
    }) === '3 л', 'Молоко does not read «3 л»')
  } },
  // 25. A new page named like an existing one says so under its title; «Открыть» goes there
  { id: 'w-25-taken-name', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const id = await store(p, data => data.createPage({ title: '' }).id)
    await p.evaluate(path => window.history.pushState({}, '', path), `/p/${id}`)
    await open(p, `/p/${id}`, false)
    await p.getByRole('textbox', { name: 'Название страницы' }).fill('покупки')
    expect(await shows(p.getByText('Страница «Покупки» уже есть в секции Дом.')), 'no «Страница «Покупки» уже есть в секции Дом.»')
    await p.getByRole('button', { name: 'Открыть', exact: true }).click()
    await p.waitForTimeout(500)
    const shopId = await store(p, data => data.livePages.find(x => x.title === 'Покупки').id)
    expect(p.url().includes(`/p/${shopId}`), `«Открыть» went to ${p.url()}`)
    expect(!(await store(p, (data, i) => !!data.pages[i], id)), 'the empty new page stayed')
  } },
  // 26. Задачи chosen for «подарок Лене на новоселье», «Запомнить»: the line is in its description; «Отменить» removes it
  { id: 'w-26-remember', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await send(p, 'подарок Лене на новоселье')
    await p.locator('div.border-accent').getByRole('button', { name: 'Задачи', exact: true }).click()
    const line = p.getByText('Запомнить: такое класть в «Задачи».')
    expect(await shows(line), 'no «Запомнить» line')
    await line.locator('..').getByRole('button', { name: 'Запомнить' }).click()
    const description = () => store(p, data => data.livePages.find(x => x.title === 'Задачи').description)
    expect((await description()).includes('Например: «подарок Лене на новоселье»'), 'the example is not in Задачи\'s description')
    const done = p.getByText('Запомнено в описании «Задачи».')
    expect(await shows(done), 'no «Запомнено в описании «Задачи».»')
    await done.locator('..').getByRole('button', { name: 'Отменить' }).click()
    expect(!(await description()).includes('Например'), '«Отменить» did not take the example out')
    expect(await shows(line), 'the line did not turn back to «Запомнить»')
  } },
  { id: 'w-26-remember-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await send(p, 'позвонить маме')
    await p.getByRole('button', { name: 'Не туда' }).click()
    await p.getByRole('button', { name: 'Ещё…' }).click()
    await p.getByRole('dialog').getByRole('button', { name: /^Дела по дому/ }).first().click()
    const line = p.getByText('Запомнить: такое класть в «Дела по дому».')
    expect(await shows(line), 'no «Запомнить» line after «Не туда»')
    await line.locator('..').getByRole('button', { name: 'Запомнить' }).click()
    const description = () => store(p, data => data.livePages.find(x => x.title === 'Дела по дому').description)
    expect((await description()).includes('Например: «позвонить маме»'), 'the example is not in the description')
    await p.getByText('Запомнено в описании «Дела по дому».').locator('..').getByRole('button', { name: 'Отменить' }).click()
    expect(!(await description()).includes('Например'), '«Отменить» did not take it out')
  } },
  // 35. Plain words: the AI notes and their verbs; no «модель» outside Настройки
  { id: 'w-35-plain-words', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await fakeAI(p, 'refuse')
    await send(p, 'батарейки')
    expect(await shows(p.getByText('Разложено по простым правилам: ключ не принят.')), 'no key note')
    expect(await shows(p.getByRole('button', { name: 'Проверить ключ' })), 'no «Проверить ключ»')
    const seen = [await screenText(p)]
    for (const path of ['/journal', '/settings/trash']) {
      await p.goto(`${BASE}${path}`)
      await p.waitForSelector('main')
      await p.waitForTimeout(400)
      seen.push(await screenText(p))
    }
    await p.goto(`${BASE}/`)
    await p.waitForSelector('main')
    await shop(p)
    seen.push(await screenText(p))
    const hit = seen.find(t => /модел/i.test(t))
    expect(!hit, `«модель» on screen: ${hit?.match(/.{0,40}модел.{0,40}/i)?.[0]}`)
  } },
  // 39. With a page «Подарки», a line Авто cannot place offers «Подарки», not «Новая страница «Подарки»»
  { id: 'w-39-existing-page', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await store(p, data => data.createPage({ title: 'Подарки' }))
    await fakeAI(p, { kind: 'unclear', pageId: null, items: [], guesses: [], newPageName: 'Подарки' })
    await send(p, 'что-нибудь для Лены')
    const card = p.locator('div.border-accent').filter({ hasText: 'Куда положить' })
    expect(await shows(card), 'no Уточнение')
    expect(await card.getByRole('button', { name: 'Подарки', exact: true }).count(), 'the card does not offer «Подарки»')
    expect(!(await card.getByText(/Новая страница «Подарки»/).count()), 'the card offers «Новая страница «Подарки»»')
  } },
  { id: 'w-39-existing-page-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await store(p, data => data.createPage({ title: 'Подарки' }))
    await fakeAI(p, { kind: 'unclear', pageId: null, items: [], guesses: [], newPageName: 'Подарки' })
    await send(p, 'что-нибудь для Лены')
    const card = p.locator('div.border-accent').filter({ hasText: 'Куда положить' })
    expect(await shows(card.getByRole('button', { name: 'Подарки', exact: true })), 'the card does not offer «Подарки»')
    expect(!(await card.getByText(/Новая страница «Подарки»/).count()), 'the card offers «Новая страница «Подарки»»')
  } }
]
