// The computer (handoff/computer-delta.md, canvas 84, pages «Компьютер: …»): the main flow and sync at 1440×900 in the
// «Как Telegram» layout, under the mockup's names (FlowDesk…, SyncDesk…), so the report pairs them. Every state starts
// from a real first run (no ?demo) with a mouse; «a week in» is the phone shots' week. DeskWidth… are item 24's widths,
// which the canvas does not draw. The bucket is the checks' fake behind Playwright routes; the bucket name and the key
// ID are the mockup's, the secret is made up here. Nothing leaves the machine.
import { fakeBucket } from '../checks/sync.mjs'
import { fakeAi, seedInbox, seedWeek } from './main-flow.mjs'

const BUCKET = 'cerulean-josh'
const KEY_ID = 'YCAJEk3Lr7pQ2vXa9mT1sBwZ'
const SECRET = 'YCPmadeupShotsSecretNotARealKey00003f9a'
const FORM = { bucket: BUCKET, keyId: KEY_ID, secret: SECRET }

export default ({ DESKTOP, DAY, settle, open, data }) => {
  const side = p => p.locator('aside[data-side]')
  const pill = p => p.locator('[data-field="closed"] button').nth(1)
  const title = p => p.getByRole('textbox', { name: 'Запись', exact: true })
  const note = p => p.getByRole('textbox', { name: 'Заметка', exact: true })
  const card = (p, name) => p.locator('[data-home] [role="listitem"]').filter({ has: p.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) })
  const row = (p, name) => p.locator('main [data-rows] .group\\/row').filter({ has: p.locator('[data-row-text]', { hasText: name }) })
  const syncButton = p => p.locator('main section[aria-labelledby="s-data"] button').first()
  const syncWindow = p => p.getByRole('dialog', { name: 'Синхронизация' })
  const field = (p, name) => syncWindow(p).getByLabel(name, { exact: true })
  const cloud = (p, fn, arg) => p.evaluate(([src, a]) => {
    const s = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s
    return new Function('cloud', 'ui', 'a', `return (${src})(cloud, ui, a)`)(s.get('cloud'), s.get('ui'), a)
  }, [fn.toString(), arg])
  const bucketOf = () => fakeBucket({ [KEY_ID]: SECRET }, BUCKET)

  /** The pointer off the content, so no row shows its hover */
  const away = p => p.mouse.move(700, 880)
  async function first(p) {
    await open(p, '/', false)
    await p.waitForURL(/\/p\//)
    await settle(p, 500)
  }
  async function go(p, path) {
    await p.evaluate(to => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), path)
    await settle(p, 700)
  }
  async function openCard(p, name) {
    await card(p, name).locator('a').click()
    await p.waitForFunction(n => document.title.startsWith(`${n} ·`), name)
    await away(p)
    await settle(p, 500)
  }
  async function pick(p, name) {
    await p.locator('[data-chip="main"]').click()
    await p.locator('[data-places]').getByRole('button', { name, exact: true }).click()
    await settle(p, 200)
  }
  /** «Купить молоко» with its note to Покупки from the left field; the field stays open */
  async function sendMilk(p) {
    await pill(p).click()
    await pick(p, 'Покупки')
    await title(p).click()
    await p.keyboard.type('Купить молоко')
    await note(p).click()
    await p.keyboard.type('2,5%, большую пачку')
    await title(p).click()
    await p.keyboard.press('Enter')
    await settle(p, 400)
  }
  /**
   * The chip back on Входящие by hand, as the mockup's frames start from it: the field keeps the place it sent to (item 9).
   * Esc closes the field, empty, with that chip
   */
  async function backToInbox(p) {
    await pill(p).click()
    await pick(p, 'Входящие')
    await p.keyboard.press('Escape')
    await settle(p, 300)
  }
  /** Milk sent, the field put away and back on Входящие, the notice's 8 s over: then Покупки opens */
  async function milkPage(p) {
    await first(p)
    await sendMilk(p)
    await p.keyboard.press('Escape')
    await backToInbox(p)
    await settle(p, 8300)
    await openCard(p, 'Покупки')
  }
  async function milkRecord(p) {
    await milkPage(p)
    await row(p, 'Молоко').locator('[data-row-text]').click()
    await p.waitForURL(/\/r\//)
    await away(p)
    await settle(p, 600)
  }
  async function week(p) {
    await first(p)
    await seedWeek(p, data, DAY)
    await settle(p, 500)
  }
  async function weekPage(p) {
    await week(p)
    await openCard(p, 'Покупки')
  }
  async function typing(p, words) {
    await pill(p).click()
    await p.keyboard.type(words)
    await settle(p, 1400)
  }

  // ---------- sync ----------

  /** A week in, Настройки on the right, on the fake bucket */
  async function settings(p, b) {
    await b.attach(p.context())
    await week(p)
    await go(p, '/settings')
    await away(p)
  }
  async function form(p) {
    await syncButton(p).click()
    await syncWindow(p).waitFor()
    await settle(p, 500)
  }
  async function fill(p, f = FORM) {
    await field(p, 'Бакет').fill(f.bucket)
    await field(p, 'ID ключа').fill(f.keyId)
    await field(p, 'Секретный ключ').fill(f.secret)
  }
  const connected = p => cloud(p, (c, ui, f) => c.connect(f), FORM)
  /** Another computer, a week in: two records on its «Покупки», one in Входящие, «Быстрый старт» deleted */
  async function other(p, b) {
    const context = await p.context().browser().newContext({ ...DESKTOP, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
    const q = await context.newPage()
    await q.clock.setSystemTime(await p.evaluate(() => Date.now()))
    await b.attach(context)
    await open(q, '/', false)
    await data(q, (d) => {
      const page = t => d.livePages.find(x => x.title === t)
      d.addRecord({ pageId: page('Покупки').id, text: 'кофе в зёрнах' })
      d.addRecord({ pageId: page('Покупки').id, text: 'батарейки' })
      d.addRecord({ pageId: d.livePages.find(x => x.kind === 'inbox').id, text: 'позвонить в сервис' })
      d.purgePages([page('Быстрый старт').id])
    })
    await connected(q)
    await context.close()
  }

  const D = DESKTOP
  const width = (w, h) => ({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  return [
    // Д1 · first open: Главная on the left, «Быстрый старт» open on the right and marked
    { name: 'FlowDesk', device: D, run: first },
    // Д2 · the field open in place: «Купить молоко», its note, Покупки picked by hand
    { name: 'FlowDeskNote', device: D, run: async (p) => {
      await first(p)
      await pill(p).click()
      await pick(p, 'Покупки')
      await title(p).click()
      await p.keyboard.type('Купить молоко')
      await note(p).click()
      await p.keyboard.type('2,5%, большую пачку')
      await settle(p, 300)
    } },
    // Д3 · the places list over the field
    { name: 'FlowDeskPlace', device: D, run: async (p) => {
      await first(p)
      await typing(p, 'Подарок Оле')
      await p.locator('[data-chip="main"]').click()
      await settle(p, 400)
    } },
    // Д4 · filed: Покупки's plate blue, the notice over the field, the right unchanged
    { name: 'FlowDeskFiled', device: D, run: async (p) => {
      await first(p)
      await sendMilk(p)
      await away(p)
    } },
    // Д5 · Покупки on the right, its card marked, «Молоко» with the bar; the field writes to Входящие
    { name: 'FlowDeskPage', device: D, run: async (p) => {
      await first(p)
      await data(p, (d) => {
        const page = d.livePages.find(x => x.title === 'Покупки')
        const qty = page.props.find(x => x.name === 'Количество')
        d.addRecord({ pageId: page.id, text: 'Яйца', values: qty ? { [qty.id]: '10 шт' } : {}, addedAt: Date.now() - 600000 })
        d.updatePage(page.id, { seenAt: Date.now() - 300000 })
      })
      await sendMilk(p)
      await p.keyboard.press('Escape')
      await backToInbox(p)
      // As the mockup's frame: the notice's 8 s are over, and the record still has its bar as the page opens
      await settle(p, 8300)
      await openCard(p, 'Покупки')
      await away(p)
    } },
    // Д6 · Входящие on the right: a row's move button and its list at the row
    { name: 'FlowDeskInboxMove', device: D, run: async (p) => {
      await first(p)
      await seedInbox(p, data, DAY)
      await openCard(p, 'Входящие')
      await row(p, 'Подарок Оле').hover()
      await p.getByRole('button', { name: 'Переместить «Подарок Оле»' }).click()
      await settle(p, 500)
    } },
    // Д7 · the record on the right: «‹ Покупки», «Добавлено», the note, «+ Подпункт»
    { name: 'FlowDeskRec', device: D, run: milkRecord },
    // Д8 · writing the note: «- » makes a list line, no bar
    { name: 'FlowDeskBody', device: D, run: async (p) => {
      await milkRecord(p)
      await p.locator('main .body-text').first().click()
      await p.keyboard.press('End')
      await p.keyboard.press('Enter')
      await p.keyboard.type('- если нет, то 3,2%')
      await away(p)
      await settle(p, 400)
    } },
    // Д9 · «+» at «Мои страницы»: a new page on the right, the caret in its title, «Начать с» under it
    { name: 'FlowDeskNewPage', device: D, run: async (p) => {
      await first(p)
      await side(p).getByRole('button', { name: 'Новая страница' }).click()
      await p.waitForURL(/\/p\//)
      await away(p)
      await settle(p, 600)
    } },
    // ДГ1 · a week in, «Со сводкой»; Покупки on the right with the new «Молоко»
    { name: 'FlowDeskWeek', device: D, run: weekPage },
    // ДГ2 · Главная's «⋯» in the left column
    { name: 'FlowDeskMenu', device: D, run: async (p) => {
      await weekPage(p)
      await side(p).getByRole('button', { name: 'Меню Главной' }).click()
      await settle(p, 500)
    } },
    // ДГ3 · «Компактный»
    { name: 'FlowDeskCompact', device: D, run: async (p) => {
      await weekPage(p)
      await side(p).getByRole('button', { name: 'Меню Главной' }).click()
      await p.getByRole('menuitemradio', { name: 'Компактный' }).click()
      await away(p)
      await settle(p, 500)
    } },
    // ДИ1 · with a model: one line, two records in the left field
    { name: 'FlowDeskAiSplit', device: D, run: async (p) => {
      await first(p)
      await fakeAi(p, data, settle)
      await typing(p, 'Купить молоко 2,5% большую пачку и позвонить маме завтра в 10')
    } },
    // ДИ2 · both filed: two plates, one notice
    { name: 'FlowDeskAiFiled', device: D, run: async (p) => {
      await first(p)
      await fakeAi(p, data, settle)
      await typing(p, 'Купить молоко 2,5% большую пачку и позвонить маме завтра в 10')
      await p.keyboard.press('Enter')
      await away(p)
      await settle(p, 500)
    } },
    // ДИ3 · a week in: one of two records goes to a page of the person's own
    { name: 'FlowDeskAiWeek', device: D, run: async (p) => {
      await weekPage(p)
      await fakeAi(p, data, settle)
      await typing(p, 'Купить сыр и пазл для Пети')
    } },
    // ДС1 · Настройки on the right
    { name: 'SyncDeskSettings', device: D, run: p => settings(p, bucketOf()) },
    // ДС2 · the window, nothing typed
    { name: 'SyncDeskForm', device: D, run: async (p) => {
      await settings(p, bucketOf())
      await form(p)
    } },
    // ДС3 · a wrong key: said under the key, the window's top unmoved
    { name: 'SyncDeskBadKey', device: D, run: async (p) => {
      await settings(p, bucketOf())
      await form(p)
      await fill(p, { ...FORM, secret: 'YCPmadeupWrongSecretValue000000000000000' })
      await syncWindow(p).getByRole('button', { name: 'Подключить' }).click()
      await syncWindow(p).getByRole('alert').first().waitFor()
      await settle(p, 400)
    } },
    // ДС4 · connected without a question: the receipt over the left field, the second «Покупки» in the list
    { name: 'SyncDeskMerged', device: D, run: async (p) => {
      const b = bucketOf()
      await other(p, b)
      await settings(p, b)
      await form(p)
      await fill(p)
      await syncWindow(p).getByRole('button', { name: 'Подключить' }).click()
      await syncWindow(p).waitFor({ state: 'hidden', timeout: 10000 })
      await away(p)
      await settle(p, 600)
    } },
    // ДС5 · the window again: the state, the bucket, the ID, the key hidden
    { name: 'SyncDeskOn', device: D, run: async (p) => {
      await settings(p, bucketOf())
      await connected(p)
      await data(p, d => d.setCloud({ ...d.cloud, at: Date.now() - 5.5 * 60000 }))
      await form(p)
    } },
    // ДС6 · an error the tries did not clear: the cloud with «!» in Главная's header
    { name: 'SyncDeskErrHome', device: D, run: async (p) => {
      const b = bucketOf()
      await settings(p, b)
      await connected(p)
      b.keys = {}
      for (let i = 0; i < 3; i++) await cloud(p, c => c.roundTrip())
      await openCard(p, 'Покупки')
    } },
    // Item 24 · the widths: 1280 (390 + fluid), 1000 (320 + fluid), 860 (the phone layout)
    { name: 'DeskWidth1280', device: width(1280, 800), run: weekPage },
    { name: 'DeskWidth1000', device: width(1000, 800), run: weekPage },
    { name: 'DeskWidth860', device: width(860, 800), run: async (p) => {
      await open(p, '/', false)
      await seedWeek(p, data, DAY)
      await settle(p, 500)
      await card(p, 'Покупки').locator('a').click()
      await p.waitForURL(/\/p\//)
      await away(p)
      await settle(p, 600)
    } }
  ]
}
