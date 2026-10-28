// The main flow (canvas 76, page «Основной путь»): first open → first record → its note, Главная a week in, and the
// path with a model. The names are the mockup's artboards (Flow, FlowTyping, …), so the report pairs them. Every state
// starts from a real first run (no ?demo) on an iPhone: its insets (47 top, 34 bottom) and, while writing, its keyboard
// from 557 px down, where the mockup draws it.

const KEYBOARD_TOP = 557
const MINUTE = 60000

export default ({ MOBILE, DAY, settle, open, data }) => {
  /** An iPhone's insets and keyboard, set before the first open */
  async function phone(page) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } })
    await page.addInitScript(() => {
      const own = Object.getOwnPropertyDescriptor(VisualViewport.prototype, 'height')
      Object.defineProperty(VisualViewport.prototype, 'height', {
        configurable: true,
        get() {
          return window.__keyboardTop ?? own.get.call(this)
        }
      })
    })
  }
  async function keyboard(page, up = true) {
    await page.evaluate((top) => {
      window.__keyboardTop = top
      window.visualViewport.dispatchEvent(new Event('resize'))
    }, up ? KEYBOARD_TOP : undefined)
    await settle(page, 300)
  }
  async function first(page) {
    await phone(page)
    await open(page, '/', false)
  }

  const pill = page => page.locator('[data-field="closed"] button').nth(1)
  const title = page => page.getByRole('textbox', { name: 'Запись', exact: true })
  const note = page => page.getByRole('textbox', { name: 'Заметка', exact: true })

  /** Opens Главная's field and types into its title, the keyboard up */
  async function typing(page, words) {
    await pill(page).click()
    await keyboard(page)
    await page.keyboard.type(words)
    await settle(page, 400)
  }
  /** Picks a place in the open field's list by hand; on Главная it stays (main flow 2, item 5) */
  async function pickPlace(page, name) {
    await page.locator('[data-chip="main"]').click()
    await page.locator('[data-places]').getByRole('button', { name, exact: true }).click()
    await settle(page, 200)
  }
  async function sendMilk(page) {
    await pill(page).click()
    await keyboard(page)
    await pickPlace(page, 'Покупки')
    await page.keyboard.type('Купить молоко')
    await note(page).click()
    await page.keyboard.type('2,5%, большую пачку')
    await title(page).click()
    await page.keyboard.press('Enter')
    await settle(page, 500)
  }
  /** Puts the field away, the keyboard down */
  async function away(page) {
    await page.keyboard.press('Escape')
    await keyboard(page, false)
  }
  async function goPage(page, name) {
    await page.locator('[data-home] [role="listitem"]').filter({ has: page.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) }).locator('a').click()
    await page.waitForURL(/\/p\//)
    await settle(page, 500)
  }
  async function milkRecord(page) {
    await first(page)
    await sendMilk(page)
    await away(page)
    await goPage(page, 'Покупки')
    await page.locator('[data-rows] [data-row-text]').filter({ hasText: 'Молоко' }).click()
    await page.waitForURL(/\/r\//)
    await settle(page, 600)
  }

  /** The model, answering in the page the way a service would (the lines of the mockup's `aiRead`) */
  async function model(page) {
    await page.route('**/fake-ai/v1/**', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}')
      const input = JSON.parse(body.messages?.at(-1)?.content ?? '{}')
      const id = name => input.pages?.find(x => x.title === name)?.id ?? null
      const item = (text, pageId, more = {}) => ({ text, note: '', pageId, date: null, time: null, qty: null, option: null, ...more })
      const read = {
        'Купить молоко 2,5% большую пачку и позвонить маме завтра в 10': [item('Молоко', id('Покупки'), { note: '2,5%, большую пачку' }), item('Позвонить маме', id('Задачи'), { date: '2026-10-20', time: '10:00' })],
        'Купить сыр и пазл для Пети': [item('Сыр', id('Покупки')), item('Пазл для Пети', id('Подарки'))]
      }[input.line] ?? [item(input.line, null)]
      await new Promise(r => setTimeout(r, 300))
      return route.fulfill({ json: { id: 'x', object: 'chat.completion', created: 0, model: 'shots', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ kind: 'record', items: read }) } }] } })
    })
    await data(page, (d, base) => d.setSettings({ provider: 'custom', baseUrl: base, modelId: 'shots', apiKey: 'sk-shots', keyState: 'ok', rulesFirst: false }), `${new URL(page.url()).origin}/fake-ai/v1`)
    await settle(page, 300)
  }

  /** Входящие a few days in, as the mockup's `inbox`: three records, one with a long text */
  async function inbox(page) {
    await first(page)
    await data(page, (d, { MINUTE, DAY }) => {
      const now = Date.now()
      d.addRecord({ pageId: d.inbox.id, text: 'Подарок Оле', addedAt: now - DAY - 40 * MINUTE, via: 'chat' })
      const pool = d.addRecord({ pageId: d.inbox.id, text: 'Узнать про абонемент в бассейн', addedAt: now - DAY - 20 * MINUTE, via: 'chat' })
      d.setBody({ kind: 'record', id: pool.id }, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Спросить про утренние часы и детскую группу, взять с собой справку от терапевта и фото 3×4' }] }] })
      d.addRecord({ pageId: d.inbox.id, text: 'Купить батарейки', addedAt: now - 50 * MINUTE, via: 'chat' })
    }, { MINUTE, DAY })
    await goPage(page, 'Входящие')
  }

  /** A week in, as the mockup's `week`: every page has records, two pages of the person's own, Покупки has a new one */
  async function week(page) {
    await first(page)
    await data(page, (d, { MINUTE, DAY }) => {
      const now = Date.now()
      const ago = min => now - min * MINUTE
      const by = t => d.livePages.find(p => p.title === t)
      const day = (n) => {
        const x = new Date(now + n * DAY)
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
      }
      const gifts = d.createPage({ title: 'Подарки', createdAt: ago(6 * 1440 + 10) })
      const trip = d.createPage({ title: 'Отпуск', createdAt: ago(8 * 1440) })
      d.setBody({ kind: 'page', id: trip.id }, { type: 'doc', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Билеты взять до 1 ноября' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Отель у моря, пять ночей' }] }] }] }
      ] })
      const add = (page, text, min, due = null) => d.addRecord({ pageId: by(page)?.id ?? page, text, addedAt: ago(min), due, via: 'chat' })
      add('Покупки', 'Порошок для стирки', 3 * 1440)
      add('Покупки', 'Кофе', 2 * 1440)
      add('Покупки', 'Сыр', 1440 + 30)
      add('Покупки', 'Яйца', 45)
      add('Покупки', 'Хлеб', 42)
      const milk = add('Покупки', 'Молоко', 40)
      d.setBody({ kind: 'record', id: milk.id }, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2,5%, большую пачку' }] }] })
      add('Задачи', 'Записаться к стоматологу', 4 * 1440)
      add('Задачи', 'Позвонить маме', 1440 + 120, { date: day(1), time: '10:00' })
      add('Задачи', 'Оплатить интернет', 2 * 1440, { date: day(0) })
      add('Задачи', 'Забрать посылку', 180, { date: day(0), time: '19:00' })
      add('Идеи', 'Сходить в новый музей', 5 * 1440)
      add('Идеи', 'Подарок Оле на день рождения', 2 * 1440 + 60)
      add(d.inbox.id, 'Узнать про абонемент в бассейн', 1440 + 300)
      add(gifts.id, 'Настольная игра для Пети', 6 * 1440)
      add(gifts.id, 'Книга для Оли', 1440 + 200)
      // Three of «Быстрый старт» are ticked, as the mockup has it
      const start = d.liveRecords.filter(r => r.seed).sort((a, b) => b.addedAt - a.addedAt)
      for (const i of [0, 1, 3]) d.updateRecord(start[i].id, { done: true, doneAt: ago(1440), tickedAt: ago(1440) })
      // Every page was opened since, but Покупки missed «Молоко»
      for (const p of d.livePages) d.updatePage(p.id, { seenAt: p.title === 'Покупки' ? ago(41) : now })
    }, { MINUTE, DAY })
    await settle(page, 500)
  }
  async function homeMenu(page) {
    await page.getByRole('button', { name: 'Меню Главной' }).click()
    await settle(page, 400)
  }

  return [
    // П1 · first open
    { name: 'Flow', device: MOBILE, run: first },
    // П2 · «Купить молоко»: without a model the chip stays Входящие
    { name: 'FlowTyping', device: MOBILE, run: async (p) => {
      await first(p)
      await typing(p, 'Купить молоко')
    } },
    // П3 · Покупки picked by hand, the note, ↑ ready
    { name: 'FlowNote', device: MOBILE, run: async (p) => {
      await first(p)
      await typing(p, 'Купить молоко')
      await pickPlace(p, 'Покупки')
      await note(p).click()
      await p.keyboard.type('2,5%, большую пачку')
      await settle(p, 300)
    } },
    // П1в · the places list over the chip
    { name: 'FlowPlace', device: MOBILE, run: async (p) => {
      await first(p)
      await typing(p, 'Подарок Оле')
      await p.locator('[data-chip="main"]').click()
      await settle(p, 400)
    } },
    // П5 · «Новая страница» at the list's end, its name typed in the row
    { name: 'FlowPlaceNew', device: MOBILE, run: async (p) => {
      await first(p)
      await typing(p, 'Подарок Оле')
      await p.locator('[data-chip="main"]').click()
      await p.locator('[data-places] [data-place-new]').click()
      await p.keyboard.type('Подарки')
      await settle(p, 400)
    } },
    // П6 · a date in the words
    { name: 'FlowDate', device: MOBILE, run: async (p) => {
      await first(p)
      await typing(p, 'Позвонить маме завтра в 10')
    } },
    // П7 · after the send: the card, the notice; the field stays open with Покупки
    { name: 'FlowFiled', device: MOBILE, run: async (p) => {
      await first(p)
      await sendMilk(p)
    } },
    // П8 · after «Отменить»: the words, the note and the place are back in the field
    { name: 'FlowUndo', device: MOBILE, run: async (p) => {
      await first(p)
      await sendMilk(p)
      await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
      await settle(p, 400)
    } },
    // П9 · Покупки: «Яйца 10 шт», «Молоко» with its text, «+ Новая запись»
    { name: 'FlowPage', device: MOBILE, run: async (p) => {
      await first(p)
      await data(p, (d, MINUTE) => {
        const shop = d.livePages.find(x => x.title === 'Покупки')
        const qty = shop.props.find(x => x.name === 'Количество')
        // The department the rules give eggs, as the add row would
        const dept = shop.props.find(x => x.type === 'select')
        const milky = dept.options.find(o => o.name === 'Молочное')
        d.addRecord({ pageId: shop.id, text: 'Яйца', addedAt: Date.now() - 20 * MINUTE, values: { [qty.id]: '10 шт', [dept.id]: milky.id } })
      }, MINUTE)
      await sendMilk(p)
      await away(p)
      await goPage(p, 'Покупки')
    } },
    // П10 · Входящие: a move button at the end of each open record, a text on two lines
    { name: 'FlowInbox', device: MOBILE, run: inbox },
    // П11 · the move list at the row
    { name: 'FlowInboxMove', device: MOBILE, run: async (p) => {
      await inbox(p)
      await p.getByRole('button', { name: 'Переместить «Подарок Оле»' }).click()
      await settle(p, 400)
    } },
    // П12 · the record
    { name: 'FlowRec', device: MOBILE, run: milkRecord },
    // П13 · writing its text: a list item, the bar over the keyboard
    { name: 'FlowBody', device: MOBILE, run: async (p) => {
      await milkRecord(p)
      await p.locator('main .body-text').first().click()
      await keyboard(p)
      await p.keyboard.press('End')
      await p.keyboard.press('Enter')
      await p.keyboard.type('- если нет, то 3,2%')
      await settle(p, 400)
    } },
    // П14 · a subitem as a row, the next line open
    { name: 'FlowSub', device: MOBILE, run: async (p) => {
      await milkRecord(p)
      await p.locator('[data-add-row]', { hasText: 'Подпункт' }).click()
      await keyboard(p)
      await p.keyboard.type('Взять две, если по акции')
      await p.keyboard.press('Enter')
      await settle(p, 400)
    } },
    // ПС · a new page from «+» at «Мои страницы»
    { name: 'FlowNewPage', device: MOBILE, run: async (p) => {
      await first(p)
      await p.getByRole('button', { name: 'Новая страница' }).click()
      await p.waitForURL(/\/p\//)
      await keyboard(p)
    } },
    // ПГ1 · «Со сводкой» a week in
    { name: 'FlowWeek', device: MOBILE, run: week },
    // ПГ2 · Главная's «⋯»
    { name: 'FlowMenu', device: MOBILE, run: async (p) => {
      await week(p)
      await homeMenu(p)
    } },
    // ПГ3 · «Компактный»
    { name: 'FlowCompact', device: MOBILE, run: async (p) => {
      await week(p)
      await homeMenu(p)
      await p.getByRole('menuitemradio', { name: 'Компактный' }).click()
      await settle(p, 400)
    } },
    // ПИ1 · with a model: the same Главная, the example holds two things
    { name: 'FlowAi', device: MOBILE, run: async (p) => {
      await first(p)
      await model(p)
    } },
    // ПИ2 · the model shows the two records it read
    { name: 'FlowAiSplit', device: MOBILE, run: async (p) => {
      await first(p)
      await model(p)
      await typing(p, 'Купить молоко 2,5% большую пачку и позвонить маме завтра в 10')
      await settle(p, 1400)
    } },
    // ПИ3 · both filed: two cards, one notice
    { name: 'FlowAiFiled', device: MOBILE, run: async (p) => {
      await first(p)
      await model(p)
      await typing(p, 'Купить молоко 2,5% большую пачку и позвонить маме завтра в 10')
      await settle(p, 1400)
      await p.keyboard.press('Enter')
      await settle(p, 500)
    } },
    // ПИ4 · a week in: one of two records goes to a page of the person's own
    { name: 'FlowAiWeek', device: MOBILE, run: async (p) => {
      await week(p)
      await model(p)
      await typing(p, 'Купить сыр и пазл для Пети')
      await settle(p, 1400)
    } }
  ].map(s => ({ ...s, device: { ...s.device, deviceScaleFactor: 2 } }))
}
