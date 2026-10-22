// v22 views: drag on page lists (Josh #3), tabs that do not fit (14), the calendar's day (16, 38), the phone board (17),
// the shop loop (40) and the edges of an off switch (41)
import { DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

const DEMO_NOW = new Date('2026-10-19T09:14:00+03:00')

async function openPage(p, title, device = 'phone') {
  await p.clock.install({ time: DEMO_NOW })
  await open(p, '/')
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(device === 'phone' ? 700 : 500)
}

/** The notice above the composer, found by its text (a sheet can hide it from the accessibility tree) */
const toast = (p, text) => p.locator('[data-notice], ol li', { hasText: text }).first()

/** The Отдел of a Покупки record, by name */
const dept = (p, text) => store(p, (data, t) => {
  const page = data.livePages.find(x => x.title === 'Покупки')
  const prop = page.props.find(x => x.name === 'Отдел')
  const r = data.liveRecords.find(x => x.pageId === page.id && x.text === t)
  return prop.options.find(o => o.id === r.values[prop.id])?.name ?? null
}, text)

const row = (p, text) => p.locator('li', { hasText: text }).first()

/** A finger: long press on `from`, then (if given) carry it to the middle of `to` and let go */
async function touch(p, from, to) {
  const a = await from.boundingBox()
  const b = to ? await to.boundingBox() : null
  const x = a.x + 120
  const y = a.y + a.height / 2
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await p.waitForTimeout(600)
  if (b) {
    const ty = b.y + b.height / 2
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (ty - y) * i / 12 }] })
      await p.waitForTimeout(30)
    }
    await p.waitForTimeout(250)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await p.waitForTimeout(600)
}

/** Records of a page that are not in Корзина */
const live = (p, title) => store(p, (data, t) => {
  const page = data.livePages.find(x => x.title === t)
  return data.liveRecords.filter(r => r.pageId === page.id).map(r => r.text)
}, title)

export default [
  // Josh #3: a long press lifts a row, a drop into another group sets its value
  { id: 'v-3-drag', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    const before = await dept(p, 'Яйца')
    expect(before && before !== 'Овощи и фрукты', `Яйца start in ${before}`)
    const target = p.getByRole('region', { name: 'Овощи и фрукты' }).locator('li').first()
    await touch(p, row(p, 'Яйца'), target)
    expect(await dept(p, 'Яйца') === 'Овощи и фрукты', `the drop left Отдел at ${await dept(p, 'Яйца')}`)
    expect(await shows(toast(p, 'Яйца → Овощи и фрукты')), 'no «Яйца → Овощи и фрукты» toast')
    await toast(p, 'Яйца → Овощи и фрукты').getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(400)
    expect(await dept(p, 'Яйца') === before, '«Отменить» did not put Отдел back')
  } },
  { id: 'v-3-press', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await touch(p, row(p, 'Яйца'))
    expect(await shows(p.getByRole('dialog').getByText('Яйца')), 'a long press without moving did not open the row menu')
    expect(await dept(p, 'Яйца') !== null, 'the press changed the record')
  } },
  { id: 'v-3-desktop', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Покупки', 'desktop')
    const eggs = row(p, 'Яйца')
    await eggs.hover()
    expect(await shows(eggs.locator('[style*="grab"]')), 'no ⋮⋮ on hover')
    const before = await dept(p, 'Яйца')
    await eggs.locator('[data-row-text]').focus()
    for (let i = 0; i < 6 && await dept(p, 'Яйца') === before; i++) {
      await p.keyboard.press('Alt+ArrowDown')
      await p.waitForTimeout(250)
    }
    expect(await dept(p, 'Яйца') === 'Овощи и фрукты', `Alt+↓ moved Яйца to ${await dept(p, 'Яйца')}`)
    expect(await shows(toast(p, 'Яйца → Овощи и фрукты')), 'no «Яйца → Овощи и фрукты · Отменить»')
    expect(await shows(toast(p, 'Яйца → Овощи и фрукты').getByRole('button', { name: 'Отменить' })), 'the toast has no «Отменить»')
  } },

  // 14: a fourth view on Покупки at 390: the strip scrolls and fades, «Купить» is whole
  { id: 'v-14-tabs', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await store(p, (data) => {
      const page = data.livePages.find(x => x.title === 'Покупки')
      data.updatePage(page.id, { views: [...page.views, { ...page.views[0], id: 'v-check', name: 'Список на выходные' }] })
    })
    await p.waitForTimeout(400)
    const strip = p.getByRole('tablist').first()
    const state = await strip.evaluate(el => ({ over: el.scrollWidth > el.clientWidth + 1, fade: el.classList.contains('fade-end'), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }))
    expect(state.over, 'four views fit, nothing to check')
    expect(state.fade, 'the strip does not fade at its end')
    const buy = await p.getByRole('tab', { name: 'Купить' }).boundingBox()
    expect(buy.x >= state.left - 0.5 && buy.x + buy.width <= state.right + 0.5, '«Купить» is cut')
  } },
  // 14: at 320 a segmented control whose labels do not fit becomes a row with a list sheet
  { id: 'v-14-segmented', device: { ...MOBILE, viewport: { width: 320, height: 640 } }, run: async (p) => {
    await p.clock.install({ time: DEMO_NOW })
    await open(p, '/settings')
    const trigger = p.getByRole('button', { name: /^Тема: / })
    if (await trigger.count()) {
      await trigger.click()
      expect(await shows(p.getByRole('dialog').getByText('Как в системе')), 'the row does not open a list')
    } else {
      const cut = await p.getByRole('radiogroup', { name: 'Тема' }).evaluate(el => [...el.querySelectorAll('[data-seg-label]')].some(s => s.scrollWidth > s.clientWidth + 1))
      expect(!cut, 'a theme label is cut and no row replaced the control')
    }
  } },

  // 16: the calendar writes on the selected day
  { id: 'v-16-calendar-send', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    await p.getByRole('tab', { name: 'Календарь' }).click()
    await p.waitForTimeout(500)
    await p.getByRole('button', { name: /^25 октября/ }).click()
    // The main flow's field (item 12) says nothing at rest: the selected day is given to the record, which lands under it
    await p.locator('[data-field="closed"] button').nth(1).click()
    await p.waitForTimeout(300)
    await p.keyboard.type('купить подарок')
    await p.keyboard.press('Enter')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(700)
    const due = await store(p, data => data.liveRecords.find(r => r.text === 'Купить подарок')?.due?.date)
    expect(due === '2026-10-25', `the record landed on ${due}`)
    expect(await p.getByRole('tab', { name: 'Календарь' }).getAttribute('aria-selected') === 'true', 'the tab left Календарь')
    expect(await shows(p.locator('main').getByText('Купить подарок', { exact: true })), 'the record is not under the 25th')
  } },
  // 38: the week switch and the time under a selected day
  { id: 'v-38-calendar-day', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    await p.getByRole('tab', { name: 'Календарь' }).click()
    await p.waitForTimeout(500)
    expect(await shows(p.getByRole('button', { name: 'Свернуть до недели' })), 'no «Свернуть до недели»')
    await p.getByRole('button', { name: /^19 октября/ }).click()
    const dentist = p.locator('main div.relative').filter({ has: p.getByText('Позвонить стоматологу', { exact: true }) }).last()
    expect(await shows(dentist), 'the 19th does not list «Позвонить стоматологу»')
    expect((await dentist.innerText()).includes('10:00'), 'no «10:00» on the row')
    await p.getByRole('button', { name: 'Свернуть до недели' }).click()
    expect(await shows(p.getByRole('button', { name: 'Показать месяц' })), 'the folded switch does not read «Показать месяц»')
  } },

  // 17: the phone board keeps an emptied column open, with «Отменить»
  { id: 'v-17-board', device: MOBILE, run: async (p) => {
    await openPage(p, 'Цели')
    await p.getByRole('tab', { name: 'По статусу' }).click()
    await p.waitForTimeout(500)
    const chips = p.getByRole('tablist', { name: 'Колонки' })
    const box = await chips.boundingBox()
    const right = await chips.getByRole('tab').evaluateAll(els => Math.max(...els.map(e => e.getBoundingClientRect().right)))
    expect(right <= box.x + box.width + 0.5, 'a column chip runs off the screen')
    await chips.getByRole('tab', { name: /^В процессе/ }).click()
    await p.getByRole('button', { name: 'В «Достигнута»' }).first().click()
    await p.waitForTimeout(400)
    expect(await chips.getByRole('tab', { name: /^В процессе/ }).getAttribute('aria-selected') === 'true', 'the emptied column is no longer selected')
    expect(await shows(p.getByText('Нет записей')), 'no «Нет записей» in the emptied column')
    await toast(p, 'Достигнута').getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(400)
    expect(await shows(p.getByRole('button', { name: 'Открыть «Полумарафон к маю»' })), '«Отменить» did not bring the goal back')
  } },

  // 40: Очистить купленное and its undo; Купить снова
  { id: 'v-40-clear', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('tab', { name: 'Куплено' }).click()
    await p.waitForTimeout(500)
    const before = (await live(p, 'Покупки')).length
    await p.getByRole('button', { name: 'Очистить купленное' }).click()
    await p.waitForTimeout(400)
    expect((await live(p, 'Покупки')).length < before, '«Очистить купленное» kept the bought rows')
    await toast(p, 'в Корзине').getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(400)
    expect((await live(p, 'Покупки')).length === before, '«Отменить» did not bring the records back')
  } },
  { id: 'v-40-again', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Покупки', 'desktop')
    await p.getByRole('tab', { name: 'Куплено' }).click()
    await p.waitForTimeout(500)
    await p.getByRole('checkbox', { name: 'Купить снова «Помидоры»' }).click()
    await p.waitForTimeout(400)
    await p.getByRole('tab', { name: 'Купить' }).click()
    await p.waitForTimeout(500)
    expect(await shows(p.locator('main li', { hasText: 'Помидоры' })), '«Помидоры» is not back in «Купить»')
    expect(await shows(p.getByRole('tab', { name: 'Запасы' })), 'no «Запасы» view')
  } },

  // 41: an off switch shows its track edge in the dark
  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `v-41-switch-${name}`, device: { ...device, colorScheme: 'dark' }, run: async (p) => {
    await p.clock.install({ time: DEMO_NOW })
    await open(p, '/settings')
    const sw = p.getByRole('switch', { name: 'Компактные строки' })
    expect(await sw.getAttribute('aria-checked') === 'false', '«Компактные строки» is on')
    const { edge, line2 } = await sw.evaluate((el) => {
      const probe = document.createElement('i')
      probe.style.color = 'var(--line2)'
      document.body.append(probe)
      const out = { edge: getComputedStyle(el).borderTopColor, line2: getComputedStyle(probe).color }
      probe.remove()
      return out
    })
    expect(edge === line2, `the off track edge is ${edge}, not line2 ${line2}`)
  } }))
]
