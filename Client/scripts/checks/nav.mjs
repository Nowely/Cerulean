// v22 navigation slice: the page picker, Поиск and back, empty search, Главная noise, deleting a section, Журнал's
// header, the «новых» dot, overdue once, bare place names, old words, cold start, 320px and landscape
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { BASE, DESKTOP, MOBILE, expect, open, send, shows, store } from './lib.mjs'

const CLOCK = new Date('2026-10-19T09:14:00+03:00')
const SMALL = { ...MOBILE, viewport: { width: 320, height: 568 } }
const LANDSCAPE = { ...MOBILE, viewport: { width: 844, height: 390 } }

const pageId = (p, title) => store(p, (data, t) => data.livePages.find(x => x.title === t)?.id, title)
const recordId = (p, text) => store(p, (data, t) => Object.values(data.records).find(r => r.text === t && !r.deletedAt)?.id, text)
const box = l => l.first().boundingBox()
/** A popover right under its button, or right above it */
const at = (b, m) => Math.abs(b.y - (m.y + m.height)) <= 16 || Math.abs(b.y + b.height - m.y) <= 16
/** A word on screen, not only for screen readers */
const shownWord = (l, word) => l.evaluate((el, w) => {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent.includes(w) && !n.parentElement.closest('.sr-only')) return true
  return false
}, word)

/** The page names a picker lists, one per row (the row's first line) */
const pickerNames = picker => picker.locator('section li button').evaluateAll(bs => bs.map(b => b.querySelector('span.truncate, span.min-w-0')?.textContent?.trim()))

async function openFind(p) {
  await p.getByRole('button', { name: 'Найти' }).first().click()
  await p.waitForTimeout(400)
}

/** Every button, link, field and tab sits inside the screen's width, except inside a row that scrolls sideways */
const clipped = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth
  const out = []
  if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth})`)
  const scrolls = (el) => {
    for (let x = el.parentElement; x; x = x.parentElement) {
      const s = getComputedStyle(x)
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && x.scrollWidth > x.clientWidth) return true
    }
    return false
  }
  for (const el of document.querySelectorAll('button, a, input, textarea, [role="tab"]')) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden' || el.closest('.sr-only, [aria-hidden="true"]')) continue
    if ((r.left < -1 || r.right > W + 1) && !scrolls(el)) out.push(`${el.tagName.toLowerCase()} «${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}» at ${Math.round(r.left)}–${Math.round(r.right)}`)
  }
  return out
})

async function fits(p) {
  const shop = await pageId(p, 'Покупки')
  const milk = await recordId(p, 'Молоко')
  const bad = []
  for (const path of ['/', `/p/${shop}`, `/r/${milk}`, '/?find', '/settings']) {
    await p.goto(`${BASE}${path}${path.includes('?') ? '&' : '?'}demo`)
    await p.waitForSelector('main, [aria-label="Поиск"]', { timeout: 15000 })
    await p.waitForTimeout(500)
    for (const why of await clipped(p)) bad.push(`${path}: ${why}`)
  }
  expect(!bad.length, bad.slice(0, 4).join('; '))
}

export default [
  // 18. «Переместить» on a Покупки row: Покупки appears exactly once, marked as where the record is
  { id: 'n-18-picker-once', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.goto(`${BASE}/p/${await pageId(p, 'Покупки')}`)
    await p.waitForTimeout(500)
    const row = p.locator('main li').filter({ hasText: 'Молоко' }).first()
    // The swipe action, out of the accessibility tree until the row is swiped
    await row.locator('button', { hasText: 'Переместить' }).dispatchEvent('click')
    const picker = p.getByRole('dialog', { name: /Переместить/ })
    expect(await shows(picker), 'no «Переместить» sheet')
    const names = await pickerNames(picker)
    expect(names.filter(n => n === 'Покупки').length === 1, `Покупки shows ${names.filter(n => n === 'Покупки').length} times`)
    expect(names.length === new Set(names).size, `a page repeats: ${names.join(', ')}`)
    expect(await picker.locator('button[aria-current]').filter({ hasText: 'Покупки' }).count() === 1, 'Покупки is not marked as the current page')
  } },
  // 18, desktop: «Переместить» and «Ещё…» open a popover at the button, no scrim, every page once
  { id: 'n-18-desk-popover', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: CLOCK })
    await open(p, '/')
    await p.goto(`${BASE}/p/${await pageId(p, 'Покупки')}`)
    // Menus load when the browser is idle and re-render the row's buttons: wait for that first
    await p.waitForTimeout(2500)
    const row = p.locator('main li').filter({ hasText: 'Молоко' }).first()
    await row.hover()
    const move = row.getByRole('button', { name: 'Переместить' })
    await move.click()
    const picker = p.getByRole('dialog', { name: /Переместить/ })
    expect(await shows(picker), 'no picker after «Переместить»')
    // Measured once it has finished scaling open: under load the first frames are a few px narrow
    await picker.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished)))
    expect(at(await box(picker), await box(move)), 'the picker is not at the button')
    expect(Math.abs((await box(picker)).width - 380) <= 2, `the popover is ${(await box(picker)).width}px wide`)
    const names = await pickerNames(picker)
    expect(names.filter(n => n === 'Покупки').length === 1, 'Покупки does not show exactly once')
    // No scrim: the sidebar is still the thing under the pointer
    const side = await box(p.getByRole('complementary', { name: 'Навигация' }))
    expect(await p.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('aside'), [side.x + 40, side.y + side.height / 2]), 'something covers the screen behind the picker')
    await p.keyboard.press('Escape')
    // The composer chip: the popover opens above it
    const chip = p.getByRole('button', { name: /^Куда: / })
    await chip.click()
    const where = p.getByRole('dialog', { name: /Куда записать/ })
    expect(await shows(where), 'no picker after the composer chip')
    expect(at(await box(where), await box(chip)), 'the chip\'s picker is not at the chip')
    await p.keyboard.press('Escape')
    // «Ещё…» on an Уточнение in Журнал: every page once, and «Новая страница «Подарки»» at the end
    await p.getByRole('link', { name: 'Журнал' }).first().click()
    await p.waitForTimeout(800)
    const card = p.locator('main').getByText('Куда положить «подарок маме на др»?').locator('xpath=ancestor::*[.//button[contains(., "Ещё")]][1]')
    const more = card.getByRole('button', { name: /^Ещё/ })
    await more.click()
    const pick2 = p.getByRole('dialog', { name: /Куда положить/ })
    expect(await shows(pick2), 'no picker after «Ещё…»')
    expect(at(await box(pick2), await box(more)), 'the «Ещё…» picker is not at the chip')
    const all = await pickerNames(pick2)
    expect(all.length === new Set(all).size, `a page repeats: ${all.join(', ')}`)
    expect(await pick2.getByRole('button', { name: 'Новая страница «Подарки»' }).count(), 'no «Новая страница «Подарки»» at the end')
  } },
  // 19. Back from a result returns to Поиск with the query and results
  { id: 'n-19-find-back', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openFind(p)
    await p.getByRole('searchbox', { name: 'Найти' }).fill('кни')
    await p.waitForTimeout(300)
    await p.getByRole('dialog', { name: 'Поиск' }).getByRole('button', { name: /^Книги/ }).click()
    await p.waitForURL(/\/p\//)
    const back = p.getByRole('link', { name: 'Поиск' })
    expect(await shows(back), 'the page does not say «‹ Поиск»')
    await back.click()
    await p.waitForTimeout(500)
    expect(await p.getByRole('searchbox', { name: 'Найти' }).inputValue() === 'кни', 'Поиск lost the query')
    expect(await shows(p.getByRole('dialog', { name: 'Поиск' }).getByText('Вернуть книгу в библиотеку')), 'Поиск lost the results')
    // A record opens as a sheet over Поиск and closes onto it
    await p.getByRole('dialog', { name: 'Поиск' }).getByRole('button', { name: /Вернуть книгу/ }).click()
    await p.waitForTimeout(500)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(500)
    expect(await p.getByRole('searchbox', { name: 'Найти' }).inputValue() === 'кни', 'closing the record lost the query')
  } },
  { id: 'n-19-desk-find-back', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await p.keyboard.press('Control+k')
    await p.waitForTimeout(400)
    await p.getByRole('combobox', { name: 'Найти' }).fill('кни')
    await p.waitForTimeout(300)
    await p.getByRole('option', { name: /Вернуть книгу/ }).click()
    await p.waitForURL(/\/r\//)
    const back = p.getByRole('navigation', { name: 'Назад' }).getByRole('link', { name: 'Поиск' })
    expect(await shows(back), 'the record does not say «‹ Поиск»')
    await back.click()
    await p.waitForTimeout(500)
    expect(await p.getByRole('combobox', { name: 'Найти' }).inputValue() === 'кни', 'Поиск lost the query')
    expect(await p.getByRole('option', { name: /Книги/ }).count(), 'Поиск lost the results')
  } },
  // 36. Empty search: «Записать «гараж»» files it and leaves a receipt on Главная
  { id: 'n-36-write', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openFind(p)
    await p.getByRole('searchbox', { name: 'Найти' }).fill('гараж')
    expect(await shows(p.getByText('Ничего не нашлось', { exact: true })), 'no «Ничего не нашлось»')
    expect(!(await p.getByRole('button', { name: 'Искать везде' }).count()), '«Искать везде» without a section')
    await p.getByRole('button', { name: 'Записать «гараж»' }).click()
    await p.waitForTimeout(800)
    expect(new URL(p.url()).pathname === '/' && !new URL(p.url()).searchParams.has('find'), `ended on ${p.url()}`)
    expect(await store(p, data => Object.values(data.records).some(r => /^гараж$/i.test(r.text) && !r.deletedAt)), '«гараж» was not written down')
    expect(await shows(p.locator('main').getByText(/гараж/i)), 'no receipt on Главная')
  } },
  { id: 'n-36-section', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await openFind(p)
    await p.getByRole('button', { name: 'Все секции' }).click()
    await p.getByRole('dialog', { name: 'Где искать' }).getByRole('button', { name: 'Дом' }).click()
    await p.waitForTimeout(300)
    expect(await shows(p.getByRole('button', { name: 'Секция «Дом»' })), 'the chip does not read «Секция «Дом»»')
    await p.getByRole('searchbox', { name: 'Найти' }).fill('гараж')
    expect(await shows(p.getByText('Поиск идёт только в секции «Дом». Выбери «Все секции», чтобы искать везде.')), 'no hint about the section')
    await p.getByRole('button', { name: 'Искать везде' }).click()
    await p.waitForTimeout(300)
    expect(await p.getByRole('button', { name: 'Все секции' }).count(), '«Искать везде» kept the section')
  } },
  { id: 'n-36-desk', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await p.keyboard.press('Control+k')
    await p.waitForTimeout(400)
    const dialog = p.getByRole('dialog', { name: 'Поиск' })
    await dialog.getByRole('combobox').filter({ hasText: 'Все секции' }).click()
    await p.getByRole('option', { name: 'Дом' }).click()
    await p.waitForTimeout(300)
    expect(await dialog.getByText('Секция «Дом»').count(), 'the select does not read «Секция «Дом»»')
    await dialog.getByRole('combobox', { name: 'Найти' }).fill('гараж')
    expect(await shows(dialog.getByRole('button', { name: 'Искать везде' })), 'no «Искать везде»')
    expect(await dialog.getByRole('button', { name: 'Записать «гараж»' }).count(), 'no «Записать «гараж»»')
    await dialog.getByRole('button', { name: 'Записать «гараж»' }).click()
    await p.waitForTimeout(800)
    expect(await store(p, data => Object.values(data.records).some(r => /^гараж$/i.test(r.text) && !r.deletedAt)), '«гараж» was not written down')
  } },
  // 20. The key row sits under the last section; an empty page reads «Нет записей»
  { id: 'n-20-home-noise', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const key = p.getByText('Подключить ИИ', { exact: true })
    expect(await shows(key), 'no «Подключить ИИ» row')
    const last = await store(p, data => data.sectionList.at(-1).name)
    const section = p.locator('main section').filter({ has: p.getByRole('heading', { name: last }) }).last()
    const [k, s] = [await box(key), await box(section)]
    expect(k.y >= s.y + s.height, `the key row is above the end of «${last}»`)
    await store(p, data => data.createPage({ title: 'Пустая' }))
    await p.waitForTimeout(300)
    expect(await shows(p.locator('main').getByRole('link', { name: /^Пустая/ }).getByText('Нет записей')), 'an empty page does not read «Нет записей»')
  } },
  // 21. Deleting a section says where the pages go; «Отменить» brings it back with its pages
  { id: 'n-21-section-delete', device: MOBILE, run: async (p) => {
    await open(p, '/')
    const before = await store(p, data => ({ sections: data.sectionList.map(s => s.name), home: data.livePages.filter(x => x.sectionId && data.sections[x.sectionId]?.name === 'Дом').map(x => x.title) }))
    await p.getByRole('button', { name: 'Действия с секцией «Дом»' }).first().click()
    const row = p.getByRole('button', { name: /^Удалить секцию/ })
    expect(await shows(row.getByText('2 страницы перейдут в Мои страницы')), 'the delete row does not say where the pages go')
    await row.click()
    expect(await shows(p.getByText('Секция Дом удалена, 2 страницы в Моих страницах')), 'no toast «Секция Дом удалена, 2 страницы в Моих страницах»')
    expect(!(await store(p, data => data.sectionList.some(s => s.name === 'Дом'))), 'Дом is still there')
    await p.getByRole('button', { name: 'Отменить' }).first().click()
    await p.waitForTimeout(400)
    const after = await store(p, data => ({ sections: data.sectionList.map(s => s.name), home: data.livePages.filter(x => x.sectionId && data.sections[x.sectionId]?.name === 'Дом').map(x => x.title) }))
    expect(JSON.stringify(after) === JSON.stringify(before), `after «Отменить»: ${JSON.stringify(after)}`)
  } },
  // Журнал on a phone: «‹ Главная» on the left, «Журнал» in the middle
  { id: 'n-journal-header', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    const head = p.locator('header').first()
    const title = await box(head.getByText('Журнал', { exact: true }))
    const back = await box(head.getByRole('link', { name: /Главная/ }))
    expect(Math.abs(title.x + title.width / 2 - 195) <= 3, `«Журнал» is not centred (${Math.round(title.x + title.width / 2)})`)
    expect(back.x < 40, '«‹ Главная» is not on the left')
  } },
  // 23. Send «хлеб»: Покупки gets a dot, no word; screen readers hear «новых»
  { id: 'n-23-dot', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: CLOCK })
    await open(p, '/')
    await send(p, 'хлеб')
    const row = p.locator('main').getByRole('link', { name: /^Покупки/ }).first()
    expect(/^Покупки, \d+ новых/.test(await row.textContent()), 'screen readers do not hear «новых»')
    expect(!(await shownWord(row, 'новых')), 'the row shows the word «новых»')
    expect(await row.locator('span.rounded-full[aria-hidden="true"]').count(), 'no dot after Покупки')
  } },
  { id: 'n-23-desk-dot', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: CLOCK })
    await open(p, '/')
    await send(p, 'хлеб')
    await p.getByRole('link', { name: 'Журнал' }).first().click()
    await p.waitForTimeout(500)
    const side = p.getByRole('complementary', { name: 'Навигация' }).getByRole('link', { name: /^Покупки/ }).first()
    expect(!(await shownWord(side, 'новых')), 'the sidebar shows the word «новых»')
    expect(await side.locator('span.rounded-full[aria-hidden="true"]').count(), 'no dot after Покупки in the sidebar')
    await p.getByRole('link', { name: 'Главная' }).first().click()
    await p.waitForTimeout(500)
    const row = p.locator('main').getByRole('link', { name: /^Покупки/ }).first()
    expect(!(await shownWord(row, 'новых')) && await row.locator('span.rounded-full[aria-hidden="true"]').count(), 'Главная: no dot, or the word «новых»')
  } },
  // 32. With Избранное open only Сегодня says «просрочено»; folded, Задачи says it in warn
  { id: 'n-32-overdue-once', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: CLOCK })
    await open(p, '/')
    const main = p.locator('main')
    const said = await main.getByText(/просрочено/).evaluateAll(els => els.filter(e => e.offsetParent).map(e => e.closest('a')?.textContent?.trim().slice(0, 12)))
    expect(said.length === 1 && said[0].startsWith('Сегодня'), `«просрочено» shows on: ${said.join(', ')}`)
    await main.getByRole('button', { name: /^Избранное/ }).first().click()
    await p.waitForTimeout(300)
    const tasks = main.getByRole('link', { name: /^Задачи/ }).first().getByText(/просрочено/)
    expect(await shows(tasks), 'folded: Задачи does not say «просрочено»')
    expect(await tasks.evaluate(e => e.classList.contains('text-warn')), '«просрочено» on Задачи is not in warn')
  } },
  // 42. Bare place names: «Задачи · вс, 25 окт», a page hit «Личное»
  { id: 'n-42-places', device: MOBILE, run: async (p) => {
    await p.clock.install({ time: CLOCK })
    await open(p, '/')
    await openFind(p)
    await p.getByRole('searchbox', { name: 'Найти' }).fill('кни')
    const find = p.getByRole('dialog', { name: 'Поиск' })
    expect(await shows(find.getByRole('button', { name: /Вернуть книгу в библиотеку/ }).getByText('Задачи · вс, 25 окт', { exact: true })), 'the record line is not «Задачи · вс, 25 окт»')
    expect(await find.getByRole('button', { name: /^Книги/ }).getByText('Личное', { exact: true }).count(), 'the page line is not «Личное»')
  } },
  // 31. No UI string says «Недавнее», «Чат», «из чата» or «Продукты»
  { id: 'n-31-words', device: MOBILE, run: async (p) => {
    const banned = /Недавнее|Чат|из чата|Продукты/
    const source = []
    const walk = dir => readdirSync(dir).forEach((f) => {
      const path = `${dir}/${f}`
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(vue|ts|html)$/.test(f)) {
        readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
          if (banned.test(line.replace(/\/\/.*$|<!--.*?-->/g, ''))) source.push(`${path.replace(/^.*\/app\//, 'app/')}:${i + 1}`)
        })
      }
    })
    walk(new URL('../../app', import.meta.url).pathname)
    expect(!source.length, `in the code: ${source.join(', ')}`)
    await open(p, '/')
    const shop = await pageId(p, 'Покупки')
    const seen = []
    for (const path of ['/', '/journal', '/settings', `/p/${shop}`, '/?find']) {
      await p.goto(`${BASE}${path}`)
      await p.waitForTimeout(500)
      const text = await p.evaluate(() => [document.body.innerText, ...[...document.querySelectorAll('[aria-label], [title], [placeholder]')]
        .map(e => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''} ${e.getAttribute('placeholder') ?? ''}`)].join('\n'))
      const hit = text.match(banned)
      if (hit) seen.push(`${path}: «${hit[0]}»`)
    }
    expect(!seen.length, seen.join(', '))
  } },
  // Cold start: the skeleton of Главная shows while the app loads, never a blank screen
  { id: 'n-cold-start', device: MOBILE, run: async (p) => {
    // The scripts the page asks for first come late, so the page stands on its own markup for a while
    const t0 = Date.now()
    await p.route('**/_nuxt/**', async (route) => {
      if (Date.now() - t0 < 1000) await new Promise(r => setTimeout(r, 2000))
      await route.continue()
    })
    await p.goto(`${BASE}/?demo`, { waitUntil: 'commit' })
    const skeleton = p.locator('[aria-busy="true"][aria-label="Загрузка"]')
    expect(await shows(skeleton), 'no skeleton while loading')
    expect(await skeleton.getByText('Главная').isVisible(), 'the skeleton has no «Главная»')
    await p.waitForSelector('main', { timeout: 30000 })
  } },
  // 320px and landscape: no sideways scroll, no control cut off
  { id: 'n-320', device: SMALL, run: async (p) => {
    await open(p, '/')
    await fits(p)
  } },
  { id: 'n-landscape', device: LANDSCAPE, run: async (p) => {
    await open(p, '/')
    await fits(p)
    // Once the title block scrolls away, the list between the header and a one-line composer holds five rows
    await p.goto(`${BASE}/p/${await pageId(p, 'Покупки')}?demo`)
    await p.waitForSelector('[data-row-text]')
    const { area, row, composer } = await p.evaluate(() => {
      const first = document.querySelector('[data-row-text]')
      let sc = first.parentElement
      while (sc && !/auto|scroll/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement
      const tabs = document.querySelector('[role="tablist"]')
      sc.scrollTop += tabs.getBoundingClientRect().bottom - sc.getBoundingClientRect().top
      const form = document.querySelector('[aria-label="Новая запись"]').closest('form')
      return {
        area: form.getBoundingClientRect().top - sc.getBoundingClientRect().top,
        row: first.closest('li').getBoundingClientRect().height,
        composer: form.getBoundingClientRect().height
      }
    })
    expect(area >= 5 * row, `${Math.floor(area / row)} rows fit above the composer`)
    expect(composer <= 72, `the composer is ${composer}px high`)
  } }
]
