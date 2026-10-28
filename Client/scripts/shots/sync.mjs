// Sync through S3 (handoff/sync-delta.md, canvas 77, page «Синхронизация через S3»): the app at the mockup's states
// С1–С15, under the mockup's names. The bucket is the checks' fake (scripts/checks/sync.mjs) behind Playwright
// routes; the bucket name and the key ID are the mockup's, the secret is made up here. Nothing leaves the machine.
import { fakeBucket } from '../checks/sync.mjs'

const BUCKET = 'cerulean-josh'
const KEY_ID = 'YCAJEk3Lr7pQ2vXa9mT1sBwZ'
const SECRET = 'YCPmadeupShotsSecretNotARealKey00003f9a'
const FORM = { bucket: BUCKET, keyId: KEY_ID, secret: SECRET }

export default (h) => {
  const row = p => p.locator('main button').filter({ hasText: /^Синхронизация/ }).first()
  const sheet = p => p.getByRole('dialog', { name: 'Синхронизация' })
  const field = (p, name) => sheet(p).getByLabel(name, { exact: true })
  const bucketOf = () => fakeBucket({ [KEY_ID]: SECRET }, BUCKET)
  const cloud = (p, fn, arg) => p.evaluate(([src, a]) => {
    const s = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s
    return new Function('cloud', 'a', `return (${src})(cloud, a)`)(s.get('cloud'), a)
  }, [fn.toString(), arg])

  /** In-app navigation: one page load per shot, so what the store holds never waits on a reload */
  async function go(p, path) {
    await p.evaluate(to => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), path)
    await h.settle(p, 700)
  }
  /** Настройки of a device with the demo data, «Данные» in view as the mockup frames it */
  async function settings(p, b) {
    await b.attach(p.context())
    await h.open(p, '/')
    await go(p, '/settings')
  }
  async function form(p) {
    await row(p).click()
    await sheet(p).waitFor()
    await h.settle(p, 500)
  }
  async function fill(p, f = FORM) {
    await field(p, 'Бакет').fill(f.bucket)
    await field(p, 'ID ключа').fill(f.keyId)
    await field(p, 'Секретный ключ').fill(f.secret)
  }
  async function tryConnect(p, f) {
    await form(p)
    await fill(p, f)
    await sheet(p).getByRole('button', { name: 'Подключить' }).click()
    await h.settle(p, 600)
  }
  /** Connected straight through the store, no sheet */
  const connected = p => cloud(p, (c, f) => c.connect(f), FORM)

  /** Another phone, first run, a week in: two records on its «Покупки», one in Входящие, «Быстрый старт» deleted */
  async function otherPhone(p, b) {
    const context = await p.context().browser().newContext({ ...h.MOBILE, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
    const q = await context.newPage()
    await q.clock.setSystemTime(h.NOW)
    await b.attach(context)
    await h.open(q, '/', false)
    await h.data(q, (d) => {
      const page = t => d.livePages.find(x => x.title === t)
      d.addRecord({ pageId: page('Покупки').id, text: 'кофе в зёрнах' })
      d.addRecord({ pageId: page('Покупки').id, text: 'батарейки' })
      d.addRecord({ pageId: d.livePages.find(x => x.kind === 'inbox').id, text: 'узнать про абонемент в бассейн' })
      d.purgePages([page('Быстрый старт').id])
    })
    await connected(q)
    await context.close()
  }

  const M = h.MOBILE
  return [
    // С1: «Синхронизация · Выключена · Подключить ›», the first row of «Данные»
    { name: 'SyncSettings', device: M, run: p => settings(p, bucketOf()) },
    // С2: the form, nothing typed
    { name: 'SyncForm', device: M, run: async (p) => {
      await settings(p, bucketOf())
      await form(p)
    } },
    // С3: one line pasted into a field fills all three
    { name: 'SyncPaste', device: M, run: async (p) => {
      await settings(p, bucketOf())
      await form(p)
      await field(p, 'ID ключа').fill(`${BUCKET} ${KEY_ID} ${SECRET}`)
      await h.settle(p, 300)
    } },
    // С4: «Проверка…» while the bucket is being tried
    { name: 'SyncCheck', device: M, run: async (p) => {
      const b = bucketOf()
      b.delay = 60000
      await settings(p, b)
      await tryConnect(p, FORM)
    } },
    // С5: a wrong key
    { name: 'SyncBadKey', device: M, run: async (p) => {
      await settings(p, bucketOf())
      await tryConnect(p, { ...FORM, secret: `${SECRET}x` })
    } },
    // С6: the key has no rights on the bucket
    { name: 'SyncNoAccess', device: M, run: async (p) => {
      const b = bucketOf()
      b.denied = true
      await settings(p, b)
      await tryConnect(p, FORM)
    } },
    // С7: the bucket did not answer the browser
    { name: 'SyncReach', device: M, run: async (p) => {
      await settings(p, bucketOf())
      await tryConnect(p, { ...FORM, bucket: 'cerulean-jos' })
    } },
    // С8: connected to the other phone's bucket: the receipt, «копия в бакете» on top
    { name: 'SyncMerged', device: M, run: async (p) => {
      const b = bucketOf()
      await otherPhone(p, b)
      await settings(p, b)
      await tryConnect(p, FORM)
    } },
    // С9: Главная after it: the other phone's «Покупки» beside this one's, Входящие and Сегодня once
    { name: 'SyncMergedHome', device: M, run: async (p) => {
      const b = bucketOf()
      await otherPhone(p, b)
      await settings(p, b)
      await connected(p)
      await go(p, '/')
    } },
    // С10: the connected sheet as it reads five minutes after the last round trip (while the app is open, a round trip
    // every 30 s keeps it at «только что»)
    { name: 'SyncOn', device: M, run: async (p) => {
      await settings(p, bucketOf())
      await connected(p)
      await h.data(p, d => d.setCloud({ ...d.cloud, at: Date.now() - 5.5 * 60000 }))
      await form(p)
    } },
    // С11: «Отключить»: «Выключена», the notice with «Отменить»
    { name: 'SyncOff', device: M, run: async (p) => {
      await settings(p, bucketOf())
      await connected(p)
      await form(p)
      await sheet(p).getByRole('button', { name: 'Отключить' }).click()
      await h.settle(p, 600)
    } },
    // С12: Главная, more than ten minutes offline with a change not sent: the grey sign
    { name: 'SyncWait', device: M, run: async (p) => {
      await settings(p, bucketOf())
      await connected(p)
      await go(p, '/')
      await p.context().setOffline(true)
      await h.data(p, d => d.addRecord({ pageId: d.livePages.find(x => x.title === 'Задачи').id, text: 'купить фильтр' }))
      await p.clock.fastForward('11:00')
      await h.settle(p, 600)
    } },
    // С13: the key stopped working, three tries: «Ошибка: ключ больше не подходит», «Ввести ключ заново»
    { name: 'SyncErr', device: M, run: async (p) => {
      const b = bucketOf()
      await settings(p, b)
      await connected(p)
      b.keys = {}
      for (let i = 0; i < 3; i++) await cloud(p, c => c.roundTrip())
      await form(p)
    } },
    // С14: the same error on Главная: the warn sign
    { name: 'SyncErrHome', device: M, run: async (p) => {
      const b = bucketOf()
      await settings(p, b)
      await connected(p)
      b.keys = {}
      for (let i = 0; i < 3; i++) await cloud(p, c => c.roundTrip())
      await go(p, '/')
    } },
    // С15: the bucket is written by a newer Cerulean: read only
    { name: 'SyncNewer', device: M, run: async (p) => {
      const b = bucketOf()
      b.objects.set(`${BUCKET}/cerulean/data.json`, { etag: '"n1"', body: JSON.stringify({ app: 'cerulean', format: 2, writtenAt: h.NOW.getTime(), pages: [], records: [], sections: [], entries: [], gone: {}, settings: null, learned: null }) })
      await settings(p, b)
      await connected(p)
      await form(p)
    } }
  ]
}
