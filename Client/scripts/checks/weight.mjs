// Action weight (spec «Action weight», v22): the rows of the table that no other module checks. Each check is the
// table's «Check» column; the weight's response (in place, a line with «Отменить», a confirm) is what it looks for.
import { BASE, MOBILE, expect, open, pageOf, shows, store } from './lib.mjs'

/** The words in the composer: since v24 (item 12) its field is an editor, not a textarea */
const typed = field => field.evaluate(e => e.value ?? e.textContent)

const pageId = (p, title) => store(p, (data, t) => data.livePages.find(x => x.title === t).id, title)
const notice = p => p.locator('[data-notice]')

async function openPage(p, title) {
  await open(p, '/')
  await p.goto(`${BASE}/p/${await pageId(p, title)}`)
  await p.waitForSelector('main')
  await p.waitForTimeout(500)
}

export default [
  // Tick, light: «tick «Молоко»: the row did not move»
  { id: 'wt-tick', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    const row = p.locator('main li').filter({ hasText: 'Молоко' }).first()
    const before = await row.boundingBox()
    await p.getByRole('checkbox', { name: 'Отметить «Молоко»' }).click()
    await p.waitForTimeout(400)
    const after = await row.boundingBox()
    expect(Math.abs(after.y - before.y) <= 1, `the row moved by ${Math.round(after.y - before.y)} px`)
    expect(!(await notice(p).count()), 'a tick shows a notice')
  } },
  // Write, light: «send «хлеб» and type the next one at once»
  { id: 'wt-write-next', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    await field.fill('хлеб')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(100)
    expect(await typed(field) === '', 'the field did not empty')
    expect(await field.evaluate(e => e === document.activeElement), 'the field lost focus, so the keyboard would drop')
    await p.keyboard.type('молоко')
    expect(await typed(field) === 'молоко', 'the next words did not go in at once')
  } },
  // Move, medium: «move and undo: the record is back»; the line says «Молоко → Задачи»
  { id: 'wt-move-undo', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    const row = p.locator('main li').filter({ hasText: 'Молоко' }).first()
    await row.locator('button', { hasText: 'Переместить' }).dispatchEvent('click')
    const picker = p.getByRole('dialog', { name: /Переместить/ })
    expect(await shows(picker), 'no picker')
    await picker.getByRole('button', { name: /^Задачи/ }).first().click()
    const line = notice(p).filter({ hasText: 'Молоко → Задачи' })
    expect(await shows(line), 'no line «Молоко → Задачи»')
    expect(await pageOf(p, 'молоко') === 'Задачи', 'Молоко did not move')
    await line.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(300)
    expect(await pageOf(p, 'молоко') === 'Покупки', '«Отменить» did not bring Молоко back')
  } },
  // Delete for good, heavy: «the button is warn and not the default»; the confirm says it cannot be undone
  { id: 'wt-purge-heavy', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await store(p, (data) => {
      const rec = Object.values(data.records).find(r => !r.deletedAt && r.text === 'Хлеб')
      data.removeRecords([rec.id])
    })
    await open(p, '/settings/trash')
    await p.getByRole('button', { name: 'Очистить' }).click()
    const sheet = p.getByRole('dialog')
    expect(await shows(sheet.getByText(/навсегда\. Вернуть .* будет нельзя/)), 'the confirm does not say it cannot be undone')
    const action = sheet.getByRole('button', { name: 'Удалить навсегда' })
    expect(await shows(action), 'no «Удалить навсегда»')
    const fill = await action.evaluate(e => getComputedStyle(e).backgroundColor)
    const warn = await p.evaluate(() => {
      const probe = document.createElement('span')
      probe.className = 'bg-error'
      document.body.append(probe)
      const c = getComputedStyle(probe).backgroundColor
      probe.remove()
      return c
    })
    expect(fill === warn, `the action is ${fill}, not warn ${warn}`)
    expect(!(await action.evaluate(e => e === document.activeElement)), 'the action has focus, so Enter would run it')
  } },
  // Create a page, light: «from «⋯» of Главная: one tap to typing»
  { id: 'wt-create-page', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Действия с Главной' }).click()
    await p.getByRole('button', { name: 'Новая страница' }).or(p.getByRole('menuitem', { name: 'Новая страница' })).first().click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(300)
    const title = p.getByRole('textbox', { name: 'Название страницы' })
    expect(await title.evaluate(e => e === document.activeElement), 'the title has no cursor')
    await p.keyboard.type('Ремонт')
    expect(await title.inputValue() === 'Ремонт', 'typing does not go into the title')
  } },
  // Rename, light: «tap the title and fix it»; Esc restores
  { id: 'wt-rename', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    const title = p.getByRole('textbox', { name: 'Название страницы' })
    await title.click()
    await title.fill('Дела')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(await title.inputValue() === 'Задачи', `Esc left «${await title.inputValue()}»`)
    expect(await store(p, data => data.livePages.some(x => x.title === 'Задачи')), 'Esc saved the new name')
    await title.click()
    await title.fill('Мои задачи')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(200)
    expect(await store(p, data => data.livePages.some(x => x.title === 'Мои задачи')), 'Enter did not save the name')
  } },
  // Switch a view, light: «the list does not flash or jump»: the other view is there on the next frame
  { id: 'wt-switch-view', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    const tab = p.getByRole('tab', { name: 'Запасы' })
    // From the press to the tab selected with its rows on screen, timed in the page
    await tab.evaluate((e) => {
      window.__switch = {}
      e.addEventListener('pointerdown', () => {
        window.__switch.start = performance.now()
      }, { capture: true, once: true })
      // The selected tab is a new button (it carries the view menu): watch the strip
      const strip = e.closest('[role="tablist"]')
      new MutationObserver((_, o) => {
        const on = strip.querySelector('[aria-selected="true"]')
        if (on?.textContent.trim() !== 'Запасы') return
        requestAnimationFrame(() => {
          window.__switch.end = performance.now()
          window.__switch.rows = document.querySelectorAll('main li').length
        })
        o.disconnect()
      }).observe(strip, { attributes: true, childList: true, subtree: true })
    })
    await tab.click()
    await p.waitForTimeout(400)
    const t = await p.evaluate(() => window.__switch)
    expect(t.end && t.rows, 'the view did not show')
    const ms = t.end - t.start
    expect(ms <= 150, `the view took ${Math.round(ms)} ms`)
    const top = await p.getByRole('tablist').boundingBox()
    await p.getByRole('tab', { name: 'Купить' }).click()
    await p.waitForTimeout(200)
    expect(Math.abs((await p.getByRole('tablist').boundingBox()).y - top.y) <= 1, 'the tabs jumped')
  } },
  // Dictate, light: «offline the mic is faint and says why»
  { id: 'wt-dictate-offline', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.context().setOffline(true)
    await p.waitForTimeout(300)
    const mic = p.getByRole('button', { name: 'Надиктовать: без сети не работает' })
    expect(await shows(mic), 'the mic does not say it needs the network')
    // aria-disabled: still a button a finger can press, it answers with the reason
    await mic.click({ force: true })
    expect(await shows(notice(p).filter({ hasText: 'Диктовка без сети не работает' })), 'a tap does not say why')
    await p.context().setOffline(false)
  } },
  // Connect a key, medium: «a wrong key: the reason in words, not a code»; «Проверка…» on the button meanwhile
  { id: 'wt-wrong-key', device: MOBILE, run: async (p) => {
    let release
    const answered = new Promise((r) => {
      release = r
    })
    await p.route('**/api.openai.com/**', async (route) => {
      await answered
      await route.fulfill({ status: 401, json: { error: { message: 'Incorrect API key provided', code: 'invalid_api_key' } } })
    })
    await open(p, '/settings?key')
    await p.getByRole('radio', { name: 'OpenAI' }).click()
    await p.getByLabel(/^Ключ/).first().fill('sk-wrong-0000000000000000000000000000')
    await p.getByRole('button', { name: 'Сохранить' }).click()
    expect(await shows(p.getByRole('button', { name: 'Проверка…' })), 'no «Проверка…» on the button')
    release()
    expect(await shows(p.getByText('Ключ не подошёл. Проверь, что он скопирован целиком')), 'no reason in words')
    expect(!/\b401\b|invalid_api_key/.test(await p.evaluate(() => document.body.innerText)), 'the error shows a code')
  } }
]
