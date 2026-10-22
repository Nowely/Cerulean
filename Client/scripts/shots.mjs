// Screenshots of the running app for comparing with the mockups.
// Usage: pnpm dev, then `pnpm shots [filter,filter2]` (SHOTS_URL, SHOTS_OUT to override).
// Every shot starts from a fresh browser profile with the demo data and the clock at 19 Oct 2026, 9:14,
// the moment the mockups show; light and dark come from the system preference.
import { readdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.env.SHOTS_URL ?? 'http://127.0.0.1:3000'
const OUT = process.env.SHOTS_OUT ?? 'shots'
const filter = process.argv[2]
const NOW = new Date('2026-10-19T09:14:00+03:00')

const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }

/** @type {{ name: string, device: object, run: (page: import('playwright').Page) => Promise<void> }[]} */
const scenarios = [
  { name: 'MobileHome', device: MOBILE, run: p => openHome(p) },
  { name: 'MobileMany', device: MOBILE, run: async (p) => {
    // A long Главная: a third section «Работа» under Личное (the v18 test of 30 pages, cut to what a screen holds)
    await openHome(p)
    await data(p, (d) => {
      const work = d.createSection('Работа')
      const pages = [['Проект Атлас', 'todo', ['собрать требования', 'согласовать макеты']], ['Созвоны', 'todo', ['созвон с подрядчиком в 15:00']], ['Отчёты', null, ['отчёт за сентябрь']]]
      pages.forEach(([title, template, recs], i) => {
        const pg = template ? d.createFromTemplate(template, { title, sectionId: work.id, order: i }) : d.createPage({ title, sectionId: work.id, order: i })
        recs.forEach(text => d.addRecord({ pageId: pg.id, text, addedAt: Date.now() - 86400000 }))
      })
    })
    await settle(p, 400)
  } },
  { name: 'MobileCompact', device: MOBILE, run: async (p) => {
    await openHome(p)
    await homeMenu(p, 'Компактные строки')
  } },
  { name: 'MobileHomeMenu', device: MOBILE, run: async (p) => {
    await openHome(p)
    await p.getByRole('button', { name: 'Действия с Главной' }).click()
    await settle(p, 600)
  } },
  { name: 'MobileFolded', device: MOBILE, run: async (p) => {
    await openHome(p)
    await fold(p, ['Избранное', 'Личное'])
  } },
  { name: 'MobileCompactFolded', device: MOBILE, run: async (p) => {
    await openHome(p)
    await homeMenu(p, 'Компактные строки')
    await fold(p, ['Избранное', 'Личное'])
  } },
  { name: 'MobileRecent', device: MOBILE, run: p => recentPages(p) },
  { name: 'MobileFirst', device: MOBILE, run: p => open(p, '/', false) },
  { name: 'MobileChat', device: MOBILE, run: p => open(p, '/journal') },
  { name: 'MobileChatEmpty', device: MOBILE, run: p => open(p, '/journal', false) },
  { name: 'MobileList', device: MOBILE, run: p => openPage(p, 'Покупки') },
  { name: 'MobileToday', device: MOBILE, run: p => openPage(p, 'Сегодня', false) },
  { name: 'MobileInbox', device: MOBILE, run: p => openPage(p, 'Входящие') },
  { name: 'MobileTasks', device: MOBILE, run: p => openPage(p, 'Задачи') },
  { name: 'MobileItem', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: /^Яйца/ }).click()
    await p.waitForURL(/\/r\//)
    await settle(p, 400)
  } },
  { name: 'MobileGoal', device: MOBILE, run: p => openPage(p, 'Полумарафон к маю') },
  { name: 'MobilePageMenu', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: 'Действия со страницей' }).click()
    await settle(p, 600)
  } },
  { name: 'MobileView', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: 'Настроить вид' }).click()
    await settle(p)
  } },
  { name: 'MobileFind', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Найти' }).click()
    await settle(p)
  } },
  { name: 'MobileFindTyped', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Найти' }).click()
    await p.getByRole('searchbox', { name: 'Найти' }).fill('кни')
    await settle(p)
  } },
  { name: 'MobileFindNone', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('button', { name: 'Найти' }).click()
    await p.getByRole('searchbox', { name: 'Найти' }).fill('гараж')
    await settle(p)
  } },
  { name: 'MobileWrite', device: MOBILE, run: async (p) => {
    await openHome(p)
    await p.getByRole('textbox', { name: 'Новая запись' }).fill('купить кефир и творог')
    await settle(p, 400)
  } },
  { name: 'MobileSent', device: MOBILE, run: async (p) => {
    await openHome(p)
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    await field.fill('купить кефир и творог')
    await p.keyboard.press('Enter')
    await field.blur()
    await settle(p, 400)
  } },
  { name: 'MobileSeries', device: MOBILE, run: async (p) => {
    await openHome(p)
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    await field.fill('купить кефир и творог')
    await p.keyboard.press('Enter')
    await field.fill('масло')
    await p.keyboard.press('Enter')
    await field.fill('яблоки')
    await settle(p, 400)
  } },
  { name: 'MobileFirstSent', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await send(p, 'хлеб')
  } },
  { name: 'MobileFirstAsk', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await send(p, 'прочитать Канемана')
  } },
  { name: 'MobileDue', device: MOBILE, run: async (p) => {
    await openHome(p)
    await send(p, 'позвонить стоматологу завтра в 10')
    await p.getByRole('button', { name: /^Срок: / }).first().click()
    await settle(p, 600)
  } },
  { name: 'MobileUndo', device: MOBILE, run: async (p) => {
    await openHome(p)
    await send(p, 'молоко', false)
    await p.getByRole('button', { name: 'Отменить' }).click()
    await settle(p, 400)
  } },
  { name: 'MobilePageSend', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('button', { name: /^Куда:/ }).click()
    await settle(p, 500)
    await p.getByRole('dialog').getByRole('button', { name: /^Авто/ }).click()
    await settle(p, 300)
    await send(p, 'позвонить маме')
    // A finger leaves no focus ring on the chip the sheet handed focus back to
    await p.evaluate(() => document.activeElement?.blur())
    await settle(p, 200)
  } },
  { name: 'MobileVoice', device: MOBILE, run: async (p) => {
    await hearing(p)
    await openHome(p)
    await p.getByRole('button', { name: 'Надиктовать' }).click()
    await settle(p, 800)
  } },
  { name: 'MobileSheet', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    await p.locator('button', { hasText: 'Покупки' }).last().click()
    await p.getByRole('dialog').waitFor()
    await settle(p, 600)
  } },
  { name: 'MobileBlank', device: MOBILE, run: async (p) => {
    await openHome(p)
    await homeMenu(p, 'Новая страница')
    await p.waitForURL(/\/p\//)
    // The title takes focus as soon as the page is on screen
    await p.getByRole('textbox', { name: 'Название страницы' }).and(p.locator(':focus')).waitFor({ timeout: 3000 })
    await settle(p, 400)
  } },
  { name: 'MobileOffline', device: MOBILE, run: async (p) => {
    await addKey(p)
    await open(p, '/journal')
    await p.context().setOffline(true)
    await settle(p, 300)
    await p.getByRole('textbox', { name: 'Новая запись' }).fill('батарейки для пульта')
    await p.keyboard.press('Enter')
    await settle(p, 600)
  } },
  { name: 'MobileOnline', device: MOBILE, run: async (p) => {
    // Sent offline, filed by the model once the network is back: «разобрано, когда появилась сеть»
    let online = false
    await p.route('**/fake-ai/v1/**', async (route) => {
      if (!online) return route.abort('internetdisconnected')
      const id = await data(p, d => d.livePages.find(x => x.title === 'Покупки').id)
      const answer = { kind: 'record', pageId: id, items: [{ text: 'батарейки для пульта', date: null, time: null, qty: null, option: null }], guesses: [], newPageName: null }
      return route.fulfill({ json: { id: 'x', object: 'chat.completion', created: 0, model: 'test', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(answer) } }] } })
    })
    await open(p, '/journal')
    await data(p, (d, base) => d.setSettings({ provider: 'custom', baseUrl: base, modelId: 'test', apiKey: 'sk-test', keyState: 'ok', rulesFirst: false }), `${BASE}/fake-ai/v1`)
    await p.context().setOffline(true)
    await settle(p, 300)
    await send(p, 'батарейки для пульта')
    online = true
    await p.context().setOffline(false)
    // After the 15 s of «Отменить», as the mockup shows it
    await settle(p, 16500)
  } },
  { name: 'MobilePending', device: MOBILE, run: async (p) => {
    await addKey(p)
    // OpenAI does not answer yet: the entry waits for the model
    await p.unroute(OPENAI)
    await p.route(OPENAI, () => {})
    await open(p, '/')
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    await field.fill('кефир и сметана')
    await p.keyboard.press('Enter')
    await field.blur()
    await settle(p, 600)
  } },
  { name: 'MobileSettings', device: MOBILE, run: p => keyed(p, '/settings') },
  { name: 'MobileTrash', device: MOBILE, run: p => open(p, '/settings/trash') },
  { name: 'MobileTrashClear', device: MOBILE, run: async (p) => {
    await open(p, '/settings/trash')
    await p.getByRole('button', { name: 'Очистить' }).click()
    await settle(p, 600)
  } },
  { name: 'MobilePick', device: MOBILE, run: async (p) => {
    await open(p, '/journal')
    await p.getByRole('button', { name: 'Ещё…' }).last().click()
    await settle(p, 600)
  } },
  { name: 'MobileConnect', device: MOBILE, run: p => openConnection(p, 'OpenRouter') },

  // v22
  { name: 'MobileMixed', device: MOBILE, run: async (p) => {
    await openHome(p)
    await send(p, 'творог, позвонить маме завтра в 10')
  } },
  { name: 'MobileModelSlow', device: MOBILE, run: async (p) => {
    await addKey(p)
    // OpenAI never answers: after 10 s the record waits in Входящие
    await p.unroute(OPENAI)
    await p.route(OPENAI, () => {})
    await open(p, '/')
    await send(p, 'батарейки для пульта')
    await settle(p, 11000)
  } },
  { name: 'MobileRulesOnly', device: MOBILE, run: async (p) => {
    await addKey(p)
    await p.unroute(OPENAI)
    await p.route(OPENAI, route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"message":"Incorrect API key"}}' }))
    await open(p, '/')
    await send(p, 'батарейки')
  } },
  { name: 'MobileSaveFail', device: MOBILE, run: async (p) => {
    await fillStorage(p)
    await openHome(p)
    await p.evaluate(() => {
      window.__storageFull = true
    })
    await send(p, 'купить батарейки')
  } },
  { name: 'MobileNoStore', device: MOBILE, run: async (p) => {
    await breakStorage(p)
    await open(p, '/')
  } },
  { name: 'MobileNoStoreFix', device: MOBILE, run: async (p) => {
    await breakStorage(p)
    await open(p, '/')
    await p.getByRole('button', { name: 'Как исправить' }).click()
    await p.waitForURL(/\/settings/)
    await settle(p, 400)
  } },
  { name: 'MobileBackup', device: MOBILE, run: async (p) => {
    await keeping(p, false)
    await openHome(p)
    await data(p, (d, at) => d.setSettings({ copiedAt: at }), NOW.getTime() - 37 * DAY)
    await p.getByRole('button', { name: /^Сохранить копию/ }).scrollIntoViewIfNeeded()
    await settle(p, 400)
  } },
  { name: 'MobileImport', device: MOBILE, run: p => importSheet(p) },
  { name: 'MobileTwoTabs', device: MOBILE, run: p => twoTabs(p) },
  { name: 'MobileAskDocked', device: MOBILE, run: async (p) => {
    await openHome(p)
    await send(p, 'подарок Лене на новоселье')
  } },
  { name: 'MobileDup', device: MOBILE, run: async (p) => {
    await openHome(p)
    await send(p, 'молоко')
  } },
  { name: 'MobileTabMenu', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('tab', { name: 'Купить' }).click()
    await settle(p, 600)
  } },
  { name: 'MobileLong', device: MOBILE, run: p => longList(p) },
  { name: 'MobileTicked', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('checkbox', { name: 'Отметить «Хлеб»' }).click()
    await p.getByRole('checkbox', { name: 'Отметить «Молоко»' }).click()
    await settle(p, 600)
  } },
  // A finger holds «Яйца» lifted: the shot is taken mid-drag
  { name: 'MobileDrag', device: MOBILE, run: async (p) => {
    await openPage(p, 'Покупки')
    const box = await p.locator('main li', { hasText: 'Яйца' }).first().boundingBox()
    const cdp = await p.context().newCDPSession(p)
    const at = dy => [{ x: box.x + 120, y: box.y + box.height / 2 + dy }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) })
    await p.waitForTimeout(600)
    for (const dy of [2, 4, 6]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(dy) })
    await settle(p, 400)
  } },
  { name: 'MobileStock', device: MOBILE, run: p => pageTab(p, 'Запасы') },
  { name: 'MobileBought', device: MOBILE, run: p => pageTab(p, 'Куплено') },
  { name: 'MobileLinked', device: MOBILE, run: p => openRecord(p, 'Вернуть книгу в библиотеку') },
  { name: 'MobileLink', device: MOBILE, run: async (p) => {
    await openRecord(p, 'Вернуть книгу в библиотеку')
    await p.getByRole('button', { name: /^Связать/ }).first().click()
    await settle(p, 600)
  } },
  { name: 'MobilePropList', device: MOBILE, run: p => pageProps(p) },
  { name: 'MobilePropEdit', device: MOBILE, run: async (p) => {
    await pageProps(p)
    await p.getByRole('button', { name: 'Изменить «Отдел»' }).click()
    // The list sheet closes first, then the editor opens
    await settle(p, 1400)
  } },
  { name: 'MobilePropNew', device: MOBILE, run: async (p) => {
    await pageProps(p)
    await p.getByRole('dialog').getByRole('button', { name: /Новое свойство/ }).click()
    await settle(p, 500)
    await p.getByRole('textbox', { name: /Название/ }).last().fill('Магазин')
    await p.getByRole('radio', { name: 'Выбор' }).click().catch(() => p.getByRole('button', { name: 'Выбор' }).click())
    await settle(p, 500)
  } },
  { name: 'MobilePropAdd', device: MOBILE, run: async (p) => {
    await openRecord(p, 'Хлеб')
    await p.getByRole('button', { name: 'Свойство', exact: true }).click()
    await settle(p, 600)
  } },

  { name: 'Home', device: DESKTOP, run: p => openHome(p) },
  { name: 'HomeCompact', device: DESKTOP, run: async (p) => {
    await openHome(p)
    await homeMenu(p, 'Компактные строки')
  } },
  { name: 'HomeMenu', device: DESKTOP, run: async (p) => {
    await openHome(p)
    await p.getByRole('button', { name: 'Действия с Главной' }).click()
    await settle(p, 600)
  } },
  { name: 'HomeRecent', device: DESKTOP, run: async (p) => {
    await recentPages(p)
    await fold(p, ['Дом', 'Личное'])
  } },
  { name: 'HomeWrite', device: DESKTOP, run: async (p) => {
    await openHome(p)
    await p.getByRole('textbox', { name: 'Новая запись' }).fill('купить кефир, творог, сметану и ещё хлеб к ужину, и не забыть про корм для кота, он почти закончился')
    await settle(p, 400)
  } },
  { name: 'HomeSent', device: DESKTOP, run: async (p) => {
    await openHome(p)
    const field = p.getByRole('textbox', { name: 'Новая запись' })
    await field.fill('купить кефир и творог')
    await p.keyboard.press('Enter')
    await field.fill('масло')
    await p.keyboard.press('Enter')
    await p.getByRole('button', { name: 'Не туда' }).click()
    await p.mouse.move(0, 0)
    await settle(p, 400)
  } },
  { name: 'HomeVoice', device: DESKTOP, run: async (p) => {
    await hearing(p)
    await openHome(p)
    await p.getByRole('button', { name: 'Надиктовать' }).click()
    await settle(p, 800)
  } },
  { name: 'MainDue', device: DESKTOP, run: async (p) => {
    await open(p, '/journal')
    await p.getByRole('button', { name: /^Позвонить стоматологу/ }).first().click()
    await settle(p, 400)
    await p.getByRole('button', { name: /^Срок: / }).first().click()
    await settle(p, 600)
  } },
  { name: 'Page', device: DESKTOP, run: p => openPage(p, 'Покупки') },
  { name: 'Board', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Цели')
    await p.getByRole('tab', { name: 'По статусу' }).click()
    await settle(p, 400)
    await p.getByRole('button', { name: 'Открыть «Полумарафон к маю»' }).hover()
    await settle(p, 200)
  } },
  { name: 'MobileBoard', device: MOBILE, run: async (p) => {
    await openPage(p, 'Цели')
    await p.getByRole('tab', { name: 'По статусу' }).click()
    await settle(p, 600)
    await p.getByRole('tab', { name: /^В процессе/ }).click()
    await settle(p, 300)
  } },
  { name: 'MobileBoardMove', device: MOBILE, run: async (p) => {
    await openPage(p, 'Цели')
    await p.getByRole('tab', { name: 'По статусу' }).click()
    await settle(p, 600)
    await p.getByRole('tab', { name: /^В процессе/ }).click()
    await p.getByRole('button', { name: /^В «/ }).first().click()
    await settle(p, 500)
  } },
  // Задачи's own «Календарь» view: a layout picked for «Список» would turn that view into «Календарь 2»
  { name: 'MobileCalendar', device: MOBILE, run: async (p) => {
    await openPage(p, 'Задачи')
    await p.getByRole('tab', { name: 'Календарь' }).click()
    await settle(p, 600)
  } },
  { name: 'Item', device: DESKTOP, run: p => openPage(p, 'Полумарафон к маю') },
  { name: 'Chat', device: DESKTOP, run: async (p) => {
    await open(p, '/journal')
    await p.getByRole('button', { name: /^Позвонить стоматологу/ }).first().click()
    await settle(p, 400)
  } },
  { name: 'PaletteNone', device: DESKTOP, run: async (p) => {
    await open(p, '/journal')
    await p.keyboard.press('Control+k')
    await settle(p, 400)
    const dialog = p.getByRole('dialog', { name: 'Поиск' })
    await dialog.getByRole('combobox').filter({ hasText: 'Все секции' }).click()
    await p.getByRole('option', { name: 'Дом' }).click()
    await settle(p, 300)
    await dialog.getByRole('combobox', { name: 'Найти' }).fill('гараж')
    await settle(p, 400)
  } },
  { name: 'PagePeek', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Полумарафон к маю')
    await p.getByRole('button', { name: /Атомные привычки/ }).first().click()
    await settle(p, 600)
  } },
  { name: 'Sidebar', device: DESKTOP, clip: { x: 0, y: 0, width: 260, height: 900 }, run: p => openPage(p, 'Покупки') },
  { name: 'Palette', device: DESKTOP, run: async (p) => {
    await open(p, '/journal')
    await p.keyboard.press('Control+k')
    await settle(p, 400)
  } },
  { name: 'PaletteTyped', device: DESKTOP, run: async (p) => {
    await open(p, '/')
    await p.keyboard.press('Control+k')
    await p.getByRole('combobox', { name: 'Найти' }).fill('мол')
    await settle(p)
  } },
  { name: 'Settings', device: DESKTOP, run: p => keyed(p, '/settings') },
  { name: 'Connect', device: DESKTOP, run: p => openConnection(p, 'Другой') },

  // v22
  { name: 'ConnectRouter', device: DESKTOP, run: p => openConnection(p, 'OpenRouter') },
  { name: 'ListTabMenu', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Покупки')
    await p.getByRole('tab', { name: 'Купить' }).click({ button: 'right' })
    await settle(p, 500)
  } },
  { name: 'ListLong', device: DESKTOP, run: p => longList(p) },
  // The mouse holds «Яйца» by its ⋮⋮: the shot is taken mid-drag
  { name: 'ListDrag', device: DESKTOP, run: async (p) => {
    await openPage(p, 'Покупки')
    const eggs = p.locator('main li', { hasText: 'Яйца' }).first()
    await eggs.hover()
    const grip = await eggs.locator('[style*="grab"]').boundingBox()
    await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
    await p.mouse.down()
    for (const dy of [3, 6, 9]) await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + dy)
    await settle(p, 400)
  } },
  { name: 'ListBought', device: DESKTOP, run: p => pageTab(p, 'Куплено') },
  { name: 'PageLink', device: DESKTOP, run: async (p) => {
    await openRecord(p, 'Вернуть книгу в библиотеку')
    await p.getByRole('button', { name: /^Связать/ }).first().click()
    await settle(p, 600)
  } },
  { name: 'MainPick', device: DESKTOP, run: async (p) => {
    await open(p, '/journal')
    await p.getByRole('button', { name: 'Ещё…' }).last().click()
    await settle(p, 600)
  } },
  { name: 'HomeSaveFail', device: DESKTOP, run: async (p) => {
    await fillStorage(p)
    await openHome(p)
    await p.evaluate(() => {
      window.__storageFull = true
    })
    await send(p, 'купить батарейки')
  } },
  { name: 'HomeNoStore', device: DESKTOP, run: async (p) => {
    await breakStorage(p)
    await open(p, '/')
  } },
  { name: 'HomeSlow', device: DESKTOP, run: async (p) => {
    await addKey(p)
    await p.unroute(OPENAI)
    await p.route(OPENAI, () => {})
    await open(p, '/')
    await send(p, 'батарейки для пульта')
    await settle(p, 11000)
  } },
  { name: 'HomeRulesOnly', device: DESKTOP, run: async (p) => {
    await addKey(p)
    await p.unroute(OPENAI)
    await p.route(OPENAI, route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"message":"Incorrect API key"}}' }))
    await open(p, '/')
    await send(p, 'батарейки')
  } },
  { name: 'HomeAsked', device: DESKTOP, run: async (p) => {
    await openHome(p)
    await send(p, 'когда менять фильтр?')
  } },
  { name: 'HomeBackup', device: DESKTOP, run: async (p) => {
    await keeping(p, false)
    await openHome(p)
    await data(p, (d, at) => d.setSettings({ copiedAt: at }), NOW.getTime() - 37 * DAY)
    await settle(p, 400)
  } },
  { name: 'SettingsNoStore', device: DESKTOP, run: async (p) => {
    await breakStorage(p)
    await keyed(p, '/settings')
  } },
  { name: 'SettingsImport', device: DESKTOP, run: p => importSheet(p) },
  { name: 'PageTwoTabs', device: DESKTOP, run: p => twoTabs(p) },
  { name: 'HomeDup', device: DESKTOP, run: async (p) => {
    await openHome(p)
    await send(p, 'молоко')
  } },
  { name: 'HomeLearn', device: DESKTOP, run: async (p) => {
    await openHome(p)
    await send(p, 'подарок Лене на новоселье')
    // Picked by hand from the Уточнение: the receipt offers «Запомнить»
    await p.getByRole('button', { name: /^Задачи/ }).last().click()
    await settle(p, 600)
  } },
  { name: 'ListProps', device: DESKTOP, run: p => pageProps(p) },
  { name: 'ListPropEdit', device: DESKTOP, run: async (p) => {
    await pageProps(p)
    await p.getByRole('button', { name: 'Изменить «Отдел»' }).click()
    // The list sheet closes first, then the editor opens
    await settle(p, 1400)
  } },
  { name: 'MainPropAdd', device: DESKTOP, run: async (p) => {
    // Яйца, as drawn: a record that still lacks some of its page's properties
    await open(p, '/journal')
    await p.getByRole('button', { name: /^Яйца/ }).first().click()
    await settle(p, 400)
    await p.getByRole('button', { name: 'Свойство', exact: true }).click()
    await settle(p, 500)
  } },
  { name: 'MainPropNew', device: DESKTOP, run: async (p) => {
    // Яйца, as drawn: a record that still lacks some of its page's properties
    await open(p, '/journal')
    await p.getByRole('button', { name: /^Яйца/ }).first().click()
    await settle(p, 400)
    await p.getByRole('button', { name: 'Свойство', exact: true }).click()
    await settle(p, 400)
    await p.getByRole('button', { name: /Новое свойство/ }).click()
    await settle(p, 500)
    await p.getByRole('textbox', { name: /Название/ }).last().fill('Магазин')
    await p.getByRole('radio', { name: 'Выбор' }).click().catch(() => p.getByRole('button', { name: 'Выбор' }).click())
    await settle(p, 500)
  } }
]

async function settle(page, ms = 250) {
  await page.waitForTimeout(ms)
}

async function open(page, path, demo = true) {
  await page.goto(`${BASE}${path}${demo ? `${path.includes('?') ? '&' : '?'}demo` : ''}`)
  await page.waitForSelector('main, [data-app-ready]', { timeout: 15000 }).catch(() => {})
  await page.evaluate(() => document.fonts.ready)
  await settle(page, 400)
}

/** Главная as the mockups show it: with a key, so without the one-time «Без ключа…» card */
async function openHome(page) {
  await open(page, '/')
  await dismissKeyCard(page)
}

/** A row of the «⋯» of Главная: a sheet on a phone, a popover on desktop */
async function homeMenu(page, item) {
  const desktop = page.viewportSize().width >= 1024
  const toggle = item === 'Компактные строки'
  await page.getByRole('button', { name: 'Действия с Главной' }).click()
  await settle(page, 500)
  if (desktop) await page.getByRole(toggle ? 'menuitemcheckbox' : 'menuitem', { name: item }).click()
  else await page.getByRole('dialog').getByRole(toggle ? 'switch' : 'button', { name: item }).click()
  if (toggle && !desktop) {
    await page.keyboard.press('Escape')
  }
  // The sheet hands focus back to «⋯» once it has closed: drop it so no focus ring shows
  await settle(page, 1000)
  await page.evaluate(() => {
    if (document.activeElement?.getAttribute('aria-label') === 'Действия с Главной') document.activeElement.blur()
  })
  await settle(page, 200)
}

/** Seven pages made without a section, newest first in «Недавнее» */
async function recentPages(page) {
  // Seven pages without a section, oldest first, each with what the mockup shows under it; made through «Новая
  // страница» and «Назад» (a typed title survives the way back), Отпуск from the Задачи template
  await openHome(page)
  const lines = {
    'Велосипед': ['поменять цепь'], 'Ремонт': ['выбрать плитку'], 'Английский': ['урок во вторник'], 'Фильмы': ['дюна, вторая часть'],
    'Отпуск в июле: билеты, жильё и страховка': ['купить билеты', 'забронировать жильё'], 'Рецепты': ['шакшука'], 'Подарки': ['маме на день рождения']
  }
  for (const title of Object.keys(lines)) {
    if (title.startsWith('Отпуск')) {
      // The template names the page after itself; the title comes after
      await data(page, (d, t) => d.updatePage(d.createFromTemplate('todo', { sectionId: null }).id, { title: t }), title)
      continue
    }
    await homeMenu(page, 'Новая страница')
    await page.waitForURL(/\/p\//)
    await page.getByRole('textbox', { name: 'Название страницы' }).fill(title)
    await page.goBack()
    await page.waitForURL(u => new URL(u).pathname === '/')
    // The page saves its title as it unmounts, once the way back has finished
    await settle(page, 500)
  }
  await data(page, (d, all) => {
    for (const [title, texts] of Object.entries(all)) {
      const pg = Object.values(d.pages).find(x => x.title === title && !x.deletedAt)
      texts.forEach(text => d.addRecord({ pageId: pg.id, text, addedAt: Date.now() - 3600000 }))
    }
  }, lines)
  await settle(page, 400)
}

/** Sends a line from the composer on screen; the keyboard goes down unless `keep` */
async function send(page, text, blur = true) {
  const field = page.getByRole('textbox', { name: 'Новая запись' })
  await field.fill(text)
  await page.keyboard.press('Enter')
  if (blur) await field.blur()
  await settle(page, 500)
}

/** The browser's dictation, replaced by one that hears «молоко и хлеб» and keeps listening */
async function hearing(page) {
  await page.addInitScript(() => {
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() {
        setTimeout(() => this.onresult?.({ results: [Object.assign([{ transcript: 'молоко и хлеб' }], { isFinal: false })] }), 300)
      }

      stop() {
        this.onend?.()
      }
    }
  })
}

async function fold(page, names) {
  for (const name of names) await page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click()
  await settle(page)
}

async function dismissKeyCard(page) {
  // Phone only: desktop Главная has no key row (v22)
  const hide = page.getByRole('button', { name: 'Скрыть строку про ключ' })
  if (await hide.count()) await hide.click()
  await page.mouse.move(0, 0)
  await settle(page)
}

/** Подключение with another service picked */
async function openConnection(page, service) {
  await open(page, '/settings?key')
  await page.getByRole('radio', { name: service }).click()
  await settle(page, 400)
}

const OPENAI = '**/api.openai.com/**'

/**
 * A key saved while OpenAI is out of reach: the app keeps it and treats the network as gone.
 * Rules go off so that the entry reaches the model, as in the mockups.
 */
/** A screen with the mockup's working key: «OpenAI · sk-…7Qa2», «Работает» (Settings, MobileSettings) */
async function keyed(page, path) {
  await page.route(OPENAI, route => route.abort('internetdisconnected'))
  await open(page, path)
  await data(page, d => d.setSettings({ provider: 'openai', apiKey: 'sk-demo-0000000000000000000000000000000000007Qa2', keyState: 'ok' }))
  await settle(page, 300)
}

async function addKey(page) {
  await page.route(OPENAI, route => route.abort('internetdisconnected'))
  await open(page, '/settings')
  await data(page, d => d.setSettings({ provider: 'openai', apiKey: 'sk-demo-0000000000000000000000000000000000007Qa2', rulesFirst: false }))
  await settle(page, 300)
}

/** Opens a page by its title from Главная (or the sidebar on desktop) */
async function openPage(page, title, exact = true) {
  await open(page, '/')
  await page.getByRole('link', { name: new RegExp(exact ? `^${title}` : title) }).first().click()
  await page.waitForURL(/\/(p|r)\//)
  await settle(page, 400)
}

/** Покупки on one of its views */
async function pageTab(page, tab) {
  await openPage(page, 'Покупки')
  await page.getByRole('tab', { name: tab }).click()
  await settle(page, 500)
}

const DAY = 86400000

/** The data store, read or changed in the page */
function data(page, fn, arg) {
  return page.evaluate(([src, a]) => {
    const d = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data')
    return new Function('d', 'a', `return (${src})(d, a)`)(d, a)
  }, [fn.toString(), arg])
}

/** Storage stubs, the same as the checks use (scripts/checks/data.mjs) */
const breakStorage = page => page.addInitScript(() => {
  indexedDB.open = () => {
    throw new DOMException('A mutation operation was attempted on a database that did not allow mutations.', 'InvalidStateError')
  }
})
const fillStorage = page => page.addInitScript(() => {
  const put = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (...args) {
    if (window.__storageFull) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    return put.apply(this, args)
  }
})
const keeping = (page, persisted) => page.addInitScript((value) => {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { persisted: async () => value, persist: async () => value, estimate: async () => ({}) }
  })
}, persisted)

/** «Загрузить копию» with a copy of this demo plus one page and two records */
async function importSheet(page) {
  await keyed(page, '/settings')
  const text = await data(page, (d) => {
    const s = JSON.parse(JSON.stringify(d.snapshot()))
    const books = s.pages.find(x => x.title === 'Книги')
    s.pages.push({ ...books, id: 'p-films', title: 'Фильмы', favorite: null })
    s.records.push({ ...s.records.find(r => r.pageId === books.id), id: 'r-dune', pageId: 'p-films', text: 'Дюна', favorite: null })
    return JSON.stringify({ app: 'cerulean', version: 1, exportedAt: Date.now(), ...s, entries: [] })
  })
  const chooser = page.waitForEvent('filechooser')
  // A phone row is the button; desktop has «Выбрать файл» at the row's end
  await page.getByRole('button', { name: /^(Загрузить копию|Выбрать файл)/ }).first().click()
  await (await chooser).setFiles({ name: 'cerulean-2026-09-12.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await settle(page, 700)
}

/** «Яйца» open here while another tab renames it */
async function twoTabs(page) {
  await openRecord(page, 'Яйца')
  const other = await page.context().newPage()
  await other.goto(page.url())
  await other.getByRole('textbox', { name: 'Текст записи' }).waitFor()
  await data(other, d => d.updateRecord(Object.values(d.records).find(r => r.text === 'Яйца').id, { text: 'Яйца С0' }))
  await other.close()
  // The other tab's write arrives on its own time: wait for the line rather than a fixed pause
  await page.getByText('Запись изменили в другой вкладке').waitFor({ timeout: 5000 }).catch(() => {})
  await settle(page, 400)
}

/** Покупки with 24 open records, «Хлеб и выпечка» and «Овощи и фрукты» folded, a fourth view (MobileLong) */
async function longList(page) {
  await openPage(page, 'Покупки')
  await data(page, (d) => {
    const pg = d.livePages.find(x => x.title === 'Покупки')
    const dept = pg.props.find(x => x.name === 'Отдел')
    const qty = pg.props.find(x => x.name === 'Количество')
    const opt = n => dept.options.find(o => o.name === n).id
    const rows = [['Батон', 'Хлеб и выпечка'], ['Лаваш', 'Хлеб и выпечка', '2 шт'], ['Кефир', 'Молочное', '1 л'], ['Сметана', 'Молочное'], ['Творог', 'Молочное', '2 шт'], ['Йогурт', 'Молочное', '4 шт'],
      ['Огурцы', 'Овощи и фрукты'], ['Картошка', 'Овощи и фрукты', '2 кг'], ['Лук', 'Овощи и фрукты'], ['Яблоки', 'Овощи и фрукты', '1 кг'],
      ['Гречка', 'Бакалея'], ['Рис', 'Бакалея'], ['Макароны', 'Бакалея', '2 пачки'], ['Овсянка', 'Бакалея'], ['Соль', 'Бакалея'],
      ['Губки', 'Бытовая химия'], ['Мыло', 'Бытовая химия', '3 шт'], ['Пакеты для мусора', 'Бытовая химия']]
    rows.forEach(([text, group, n], i) => d.addRecord({ pageId: pg.id, text, order: 100 + i, addedAt: Date.now() - 3600000, values: { [dept.id]: opt(group), ...(n ? { [qty.id]: n } : {}) } }))
    d.updatePage(pg.id, { views: [...pg.views, { ...pg.views[0], id: 'v-board', name: 'Доска', layout: 'board', named: false }] })
  })
  await settle(page, 400)
  await fold(page, ['Хлеб и выпечка', 'Овощи и фрукты'])
  // Clicking a caption further down scrolled the list: the state shows it from the top
  await page.locator('.scroll-fade').first().evaluate((el) => {
    el.scrollTop = 0
  })
  await settle(page, 400)
}

/** A record page, found by its text */
async function openRecord(page, text) {
  await open(page, '/')
  const id = await data(page, (d, t) => Object.values(d.records).find(r => r.text === t && !r.deletedAt)?.id, text)
  await open(page, `/r/${id}`)
}

/** «Свойства» from the page «⋯» of Покупки */
async function pageProps(page) {
  await openPage(page, 'Покупки')
  await page.getByRole('button', { name: /^(Действия со страницей|Меню страницы)/ }).last().click()
  await settle(page, 500)
  await page.getByRole(page.viewportSize().width >= 1024 ? 'menuitem' : 'button', { name: /^Свойства/ }).last().click()
  await settle(page, 1000)
}

await mkdir(OUT, { recursive: true })
// Scenarios of later iterations live in scripts/shots/*.mjs, one module per slice, so parallel work never edits the
// same lines: each default-exports (helpers) => scenarios
const helpers = { MOBILE, DESKTOP, NOW, DAY, settle, open, openHome, homeMenu, send, fold, dismissKeyCard, openConnection, keyed, addKey, openPage, pageTab, data, breakStorage, fillStorage, keeping, twoTabs, longList, openRecord, pageProps }
for (const file of readdirSync(new URL('./shots/', import.meta.url)).filter(f => f.endsWith('.mjs')).sort()) {
  scenarios.push(...(await import(new URL(`./shots/${file}`, import.meta.url).href)).default(helpers))
}

const browser = await chromium.launch({ executablePath: process.env.SHOTS_CHROMIUM ?? undefined })
const failed = []
for (const s of scenarios.filter(s => !filter || filter.split(',').some(f => s.name.toLowerCase().includes(f.toLowerCase())))) {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...s.device, colorScheme: scheme, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => m.type() === 'error' && errors.push(m.text()))
    // The clock starts at NOW and keeps running, so timers and animations behave as usual
    await page.clock.setSystemTime(NOW)
    // The dev server's DevTools button is not part of the app
    await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.textContent = '#nuxt-devtools-container { display: none !important }'
      document.head.append(style)
    }))
    try {
      await s.run(page)
      await page.screenshot({ path: `${OUT}/${s.name}-${scheme}.png`, clip: s.clip })
      console.log(`✓ ${s.name}-${scheme}${errors.length ? `  (${errors.length} console errors: ${errors[0]})` : ''}`)
    } catch (e) {
      failed.push(`${s.name}-${scheme}`)
      console.log(`✗ ${s.name}-${scheme}: ${e.message.split('\n')[0]}`)
      await page.screenshot({ path: `${OUT}/${s.name}-${scheme}.png` }).catch(() => {})
    }
    await context.close()
  }
}
await browser.close()
if (failed.length) process.exitCode = 1
