// Sync through S3 (handoff/sync-delta.md, canvas 77, states С1–С15): each check is one item's «Check:» line, ids
// s3-<item>-<what>. The bucket is a fake behind Playwright routes on storage.yandexcloud.net: path-style S3 with
// ETag, If-None-Match and If-Match, CORS headers, and the request's Signature V4 checked against the key's secret
// here, in Node. As in the prototype, a bucket ending «-jos» is not reached and one starting «noaccess» refuses the
// key. The keys are made up; nothing leaves the machine.
import { createHash, createHmac } from 'node:crypto'
import { MOBILE, expect, open, store } from './lib.mjs'

const HOST = 'storage.yandexcloud.net'
const KEY_ID = 'YCAJEtestkeyid7'
const SECRET = 'YCPtestsecretvalue0042'
const BUCKET = 'cerulean-test'
const DATA = 'cerulean/data.json'

// ---------- the fake bucket ----------

const sha = s => createHash('sha256').update(s ?? '').digest('hex')
const hmac = (k, s) => createHmac('sha256', k).update(s).digest()

/** Signature V4 as S3 checks it, from the request's own signed headers */
function expected(method, url, headers, secret) {
  const auth = headers.authorization ?? ''
  const date = headers['x-amz-date'] ?? ''
  const day = date.slice(0, 8)
  const names = (/SignedHeaders=([^,]+)/.exec(auth)?.[1] ?? '').split(';')
  const value = n => n === 'host' ? url.host : (headers[n] ?? '').trim()
  const canonical = [method, url.pathname, '', names.map(n => `${n}:${value(n)}\n`).join(''), names.join(';'), headers['x-amz-content-sha256']].join('\n')
  const scope = `${day}/ru-central1/s3/aws4_request`
  let key = hmac(`AWS4${secret}`, day)
  for (const part of ['ru-central1', 's3', 'aws4_request']) key = hmac(key, part)
  const sig = createHmac('sha256', key).update(['AWS4-HMAC-SHA256', date, scope, sha(canonical)].join('\n')).digest('hex')
  return auth.replace(/Signature=[0-9a-f]+$/, `Signature=${sig}`) === auth && /Signature=/.test(auth) ? sig : null
}

/**
 * One bucket in memory, shared by every device a check attaches it to (the shots of scripts/shots/sync.mjs use it
 * too): `keys` are the key IDs it knows with their secrets, `denied` makes every key lack the rights
 */
export function fakeBucket(keys = { [KEY_ID]: SECRET }, bucketName = BUCKET) {
  const b = { objects: new Map(), keys, delay: 0, n: 0, writes: 0, reads: 0, denied: false }
  b.file = () => {
    const o = b.objects.get(`${bucketName}/${DATA}`)
    return o ? JSON.parse(o.body) : null
  }
  b.attach = context => context.route(`https://${HOST}/**`, route => handle(b, route))
  return b
}

async function handle(b, route) {
  const req = route.request()
  const url = new URL(req.url())
  const [, bucket = '', ...rest] = url.pathname.split('/')
  const key = decodeURIComponent(rest.join('/'))
  // A missing bucket or a bucket with no CORS rule: the browser sees no answer at all
  if (bucket.endsWith('-jos')) return route.abort('failed')
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'ETag' }
  if (req.method() === 'OPTIONS') {
    return route.fulfill({ status: 200, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, PUT, HEAD', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] ?? '*', 'Access-Control-Max-Age': '600' } })
  }
  if (b.delay) await new Promise(r => setTimeout(r, b.delay))
  const h = req.headers()
  const xml = (status, code) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/xml' }, body: `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code></Error>` })
  const keyId = /Credential=([^/]+)\//.exec(h.authorization ?? '')?.[1]
  const secret = b.keys[keyId]
  if (secret === undefined) return xml(403, 'InvalidAccessKeyId')
  const body = req.postData() ?? ''
  if (!expected(req.method(), url, h, secret) || h['x-amz-content-sha256'] !== sha(body)) return xml(403, 'SignatureDoesNotMatch')
  if (bucket.startsWith('noaccess') || b.denied) return xml(403, 'AccessDenied')
  const path = `${bucket}/${key}`
  const here = b.objects.get(path)
  if (req.method() === 'GET') {
    b.reads++
    if (!here) return xml(404, 'NoSuchKey')
    if (h['if-none-match'] === here.etag) return route.fulfill({ status: 304, headers: { ...cors, ETag: here.etag } })
    return route.fulfill({ status: 200, headers: { ...cors, 'ETag': here.etag, 'Content-Type': 'application/json' }, body: here.body })
  }
  if (h['if-match'] && h['if-match'] !== here?.etag) return xml(412, 'PreconditionFailed')
  if (h['if-none-match'] === '*' && here) return xml(412, 'PreconditionFailed')
  const etag = `"e${++b.n}"`
  b.objects.set(path, { body, etag })
  if (key === DATA) b.writes++
  return route.fulfill({ status: 200, headers: { ...cors, ETag: etag } })
}

// ---------- the screen ----------

/** A device: its own browser profile on the fake bucket */
async function device(p, b, path = '/settings', demo = false) {
  await b.attach(p.context())
  await open(p, path, demo)
  return p
}

async function another(p, b, path = '/settings', demo = false) {
  const context = await p.context().browser().newContext({ ...MOBILE, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
  const q = await context.newPage()
  q.setDefaultTimeout(10000)
  return device(q, b, path, demo)
}

const row = p => p.locator('main button').filter({ hasText: /^Синхронизация/ }).first()
const rowHint = p => row(p).locator('span.text-13').first().innerText().then(t => t.replace(/\u00A0/g, ' ').trim())
const rowValue = p => row(p).locator('> span.truncate').first().innerText({ timeout: 1000 }).catch(() => '')
const sheet = p => p.getByRole('dialog', { name: 'Синхронизация' })
const field = (p, name) => sheet(p).getByLabel(name, { exact: true })
const connectButton = p => sheet(p).getByRole('button', { name: /^(Подключить|Проверка…)$/ })
const statusLine = p => p.locator('main [role="status"]').first()
const cloud = (p, fn, arg) => p.evaluate(([src, a]) => {
  const s = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s
  return new Function('cloud', 'data', 'a', `return (${src})(cloud, data, a)`)(s.get('cloud'), s.get('data'), a)
}, [fn.toString(), arg])
const noticeText = p => p.locator('[data-notice]').first().innerText().then(t => t.trim(), () => '')

async function fill(p, bucket = BUCKET, keyId = KEY_ID, secret = SECRET) {
  await field(p, 'Бакет').fill(bucket)
  await field(p, 'ID ключа').fill(keyId)
  await field(p, 'Секретный ключ').fill(secret)
}

/** Settings → «Синхронизация» → the three fields → «Подключить», and waits for the sheet to go */
async function connect(p, opts = {}) {
  await row(p).click()
  await fill(p, opts.bucket, opts.keyId, opts.secret)
  await connectButton(p).click()
  if (opts.fails) return
  await sheet(p).waitFor({ state: 'hidden', timeout: 10000 })
  await p.waitForTimeout(200)
}

/** Adds records to a page of this device, by its title */
const add = (p, title, texts) => store(p, (data, a) => {
  const page = data.livePages.find(x => x.title === a.title)
  return a.texts.map(text => data.addRecord({ pageId: page.id, text }).id)
}, { title, texts })

const titles = p => store(p, data => data.livePages.map(x => x.title))
/** Главная has its rows on screen, not the loading placeholder */
const home = async (p) => {
  await p.locator('[data-home] [data-name]').first().waitFor()
  await p.waitForTimeout(300)
}
const round = p => cloud(p, c => c.roundTrip())
/** Moves inside the app, with no page load */
const go = async (p, path) => {
  await p.evaluate(to => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), path)
  await p.waitForTimeout(400)
}

export default [
  // 1 (С1). The row is the first of «Данные»; the other rows are as they were
  { id: 's3-1-row', device: MOBILE, run: async (p) => {
    await device(p, fakeBucket())
    const rows = await p.locator('section[aria-labelledby="s-data"] > button, section[aria-labelledby="s-data"] > div > button').evaluateAll(xs => xs.map(x => x.querySelector('span.text-base')?.textContent.trim()).filter(Boolean))
    expect(rows[0] === 'Синхронизация', `rows of «Данные»: ${rows}`)
    expect(JSON.stringify(rows.slice(1)) === JSON.stringify(['Не удалять при нехватке места', 'Сохранить копию', 'Загрузить копию', 'Корзина', 'Удалить всё'].filter(r => rows.includes(r))), `the rest: ${rows}`)
    expect(await rowHint(p) === 'Выключена', `hint: ${await rowHint(p)}`)
    expect(await rowValue(p) === 'Подключить', `value: ${await rowValue(p)}`)
    const tone = await row(p).locator('> span.truncate').first().evaluate(e => e.className)
    expect(tone.includes('text-toned') && !tone.includes('accent'), `«Подключить» is grey: ${tone}`)
    expect(await row(p).locator('[class*="i-lucide:cloud"]').count() > 0, 'no cloud icon')
  } },

  // 4. The last note of Настройки
  { id: 's3-4-note', device: MOBILE, run: async (p) => {
    await device(p, fakeBucket())
    const text = await p.locator('main').innerText()
    expect(text.includes('Ключи хранятся только в этом браузере: в копию и в бакет они не попадают.'), 'the new note is missing')
    expect(!text.includes('Синхронизации между устройствами нет'), 'the old note is still there')
  } },

  // 5 (С2). The form: the caret in «Бакет», «Подключить» waits for all three, the secret hidden until the eye
  { id: 's3-5-form', device: MOBILE, run: async (p) => {
    await device(p, fakeBucket())
    await row(p).click()
    await sheet(p).waitFor()
    await p.waitForTimeout(300)
    expect(await field(p, 'Бакет').evaluate(e => e === document.activeElement), 'the caret is not in «Бакет»')
    expect(await connectButton(p).isDisabled(), '«Подключить» is on with nothing typed')
    await field(p, 'Бакет').fill(BUCKET)
    await field(p, 'ID ключа').fill(KEY_ID)
    expect(await connectButton(p).isDisabled(), '«Подключить» is on with two fields')
    await field(p, 'Секретный ключ').fill(SECRET)
    expect(!(await connectButton(p).isDisabled()), '«Подключить» is off with all three')
    expect(await field(p, 'Секретный ключ').getAttribute('type') === 'password', 'the secret shows')
    await sheet(p).getByRole('button', { name: 'Показать ключ' }).click()
    expect(await field(p, 'Секретный ключ').getAttribute('type') === 'text', 'the eye did not show it')
    for (const name of ['Бакет', 'ID ключа', 'Секретный ключ']) {
      const a = await field(p, name).evaluate(e => [e.autocomplete, e.getAttribute('autocapitalize'), e.spellcheck])
      expect(a[0] === 'off' && a[1] === 'off' && a[2] === false, `${name}: ${a}`)
    }
    // «Другой адрес» opens the two more fields, Yandex's values in them
    await sheet(p).getByRole('button', { name: 'Другой адрес' }).click()
    expect(await field(p, 'Адрес').inputValue() === HOST && await field(p, 'Регион').inputValue() === 'ru-central1', 'the address fields')
    expect((await sheet(p).innerText()).includes('Бакету нужен доступ из браузера (CORS): как настроить'), 'the CORS hint')
  } },

  // 6 (С3). One line fills all three
  { id: 's3-6-paste', device: MOBILE, run: async (p) => {
    await device(p, fakeBucket())
    await row(p).click()
    await field(p, 'ID ключа').fill('cerulean-test YCAJExxxx YCPxxxx')
    const v = await Promise.all(['Бакет', 'ID ключа', 'Секретный ключ'].map(n => field(p, n).inputValue()))
    expect(JSON.stringify(v) === JSON.stringify(['cerulean-test', 'YCAJExxxx', 'YCPxxxx']), `fields: ${v}`)
    expect(await field(p, 'Секретный ключ').getAttribute('type') === 'password', 'the secret shows')
    expect(!(await connectButton(p).isDisabled()), '«Подключить» is off')
    // Two parts stay where they were typed
    await field(p, 'Бакет').fill('one two')
    expect(await field(p, 'Бакет').inputValue() === 'one two' && await field(p, 'ID ключа').inputValue() === 'YCAJExxxx', 'two parts spread')
  } },

  // 7 (С4–С7). «Подключить» checks first; each answer where it belongs; nothing saved on a failure
  { id: 's3-7-answers', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b)
    b.delay = 700
    await connect(p, { secret: 'YCPbadsecret', fails: true })
    await p.waitForTimeout(150)
    expect(await connectButton(p).innerText() === 'Проверка…', `checking: ${await connectButton(p).innerText()}`)
    b.delay = 0
    const keyErr = sheet(p).getByText('Неверный ключ: ID или секрет не подходят')
    await keyErr.waitFor()
    const invalid = await Promise.all(['Бакет', 'ID ключа', 'Секретный ключ'].map(n => field(p, n).getAttribute('aria-invalid')))
    expect(invalid[0] !== 'true' && invalid[1] === 'true' && invalid[2] === 'true', `error style: ${invalid}`)
    // Under the secret
    const below = await sheet(p).evaluate((s) => {
      const err = [...s.querySelectorAll('[role="alert"]')].find(x => x.textContent.includes('Неверный ключ'))
      const secret = s.querySelector('input[type="password"], input[data-sync-secret]')
      return !!(secret.compareDocumentPosition(err) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    expect(below, 'the key error is not under the secret')
    // Typing clears the answer
    await field(p, 'Секретный ключ').fill(`${SECRET}x`)
    expect(!(await keyErr.count()), 'typing kept the answer')
    // Closed and opened again: nothing was kept
    await sheet(p).getByRole('button', { name: 'Отмена' }).click()
    await sheet(p).waitFor({ state: 'hidden' })
    expect(await rowHint(p) === 'Выключена', 'something was saved')
    // No access: under «Бакет»
    await connect(p, { bucket: 'noaccess-test', fails: true })
    await sheet(p).getByText('У этого ключа нет доступа к бакету: нужна роль storage.editor').waitFor()
    expect(await field(p, 'Бакет').getAttribute('aria-invalid') === 'true', 'the bucket field has no error style')
    await sheet(p).getByRole('button', { name: 'Отмена' }).click()
    await sheet(p).waitFor({ state: 'hidden' })
    // Not reached: the one note in place of the hint
    await connect(p, { bucket: 'cerulean-jos', fails: true })
    const note = sheet(p).locator('[data-sync-reach]')
    await note.waitFor()
    const t = (await note.innerText()).replace(/\s+/g, ' ')
    expect(t.startsWith('Браузер не достучался до бакета «cerulean‑jos».') && t.includes('Expose headers') && t.includes('ETag') && t.endsWith('Как настроить'), `note: ${t}`)
    expect(!(await sheet(p).getByText('Бакету нужен доступ из браузера').count()), 'the hint stays beside the note')
    expect(!b.objects.has(`${BUCKET}/${DATA}`), 'a failed check wrote the data')
  } },

  // 8 (С8, С9). The brief's check: two «Покупки», Входящие and Сегодня once each, the receipt counts what came
  { id: 's3-8-first', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    const other = await another(p, b)
    await add(other, 'Покупки', ['Батарейки', 'Кофе в зёрнах'])
    await connect(other)
    await device(p, b)
    await add(p, 'Покупки', ['Молоко', 'Хлеб', 'Сыр'])
    await connect(p)
    const n = await noticeText(p)
    expect(n === 'Из бакета добавлено: 1 страница, 2 записи', `receipt: ${n}`)
    expect(await rowHint(p) === 'Синхронизировано · только что', `row: ${await rowHint(p)}`)
    const t = await titles(p)
    expect(t.filter(x => x === 'Покупки').length === 2 && t.filter(x => x === 'Входящие').length === 1 && t.filter(x => x === 'Сегодня').length === 1, `pages: ${t}`)
    expect(t.filter(x => x === 'Быстрый старт').length === 1, `starters doubled: ${t}`)
    // On Главная, side by side
    await p.goto(p.url().replace(/\/settings.*$/, '/'))
    await p.waitForSelector('main')
    const names = await p.locator('[data-home] [data-name]').allInnerTexts()
    expect(names.filter(x => x.trim() === 'Покупки').length === 2, `Главная: ${names}`)
    await other.context().close()
  } },

  // 8, the other way (С9). A phone with its own pages joins the bucket of a new one: the bucket's empty «Задачи» and
  // «Идеи» are this phone's, the other phone's «Покупки» comes beside this one's
  { id: 's3-8-joins', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    const other = await another(p, b)
    await add(other, 'Покупки', ['Батарейки'])
    await connect(other)
    await device(p, b, '/settings', true)
    const before = await titles(p)
    await connect(p)
    const n = await noticeText(p)
    expect(n === 'Из бакета добавлено: 2 страницы, 1 запись', `receipt: ${n}`)
    const t = await titles(p)
    for (const name of ['Задачи', 'Идеи']) expect(t.filter(x => x === name).length === before.filter(x => x === name).length, `${name}: ${t}`)
    expect(t.filter(x => x === 'Покупки').length === 2, `Покупки: ${t}`)
    // The other phone takes this one's Задачи in place of its empty one
    await round(other)
    const theirs = await titles(other)
    expect(theirs.filter(x => x === 'Задачи').length === 1, `the other phone: ${theirs}`)
    await other.context().close()
  } },

  // 2 (С1, С8, С13). The status line on top
  { id: 's3-2-line', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b)
    await connect(p)
    const line = await statusLine(p).innerText()
    expect(line.trim() === 'Работает офлайн, копия в бакете «cerulean‑test»', `line: ${line}`)
    expect(await statusLine(p).locator('span').first().evaluate(e => e.className.includes('bg-ok')), 'the dot is not green')
    expect(!(await statusLine(p).getByRole('button', { name: 'Сохранить копию' }).count()), '«Сохранить» stays')
    // The key stops working: three tries, then stopped
    b.keys = {}
    for (let i = 0; i < 3; i++) await round(p)
    await p.waitForTimeout(100)
    const stopped = await statusLine(p).innerText()
    expect(stopped.trim().endsWith('· синхронизация остановлена'), `stopped: ${stopped}`)
    expect(await statusLine(p).locator('span').first().evaluate(e => e.className.includes('bg-warn')), 'the dot is not warn')
  } },

  // 3. The copy reminder rests while sync works and comes back after «Отключить»
  { id: 's3-3-copy', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b, '/', true)
    await store(p, data => data.setSettings({ copiedAt: Date.now() - 40 * 86400000 }))
    await home(p)
    const reminder = p.locator('[data-home] button').filter({ hasText: 'Сохранить копию' })
    expect(await reminder.count() === 1, 'no reminder before')
    await p.goto(p.url().replace(/\/(\?.*)?$/, '/settings'))
    await p.waitForSelector('main')
    await connect(p)
    await p.goBack()
    await home(p)
    expect(!(await reminder.count()), 'the reminder shows while sync works')
    await p.goto(p.url().replace(/\/(\?.*)?$/, '/settings'))
    await p.waitForSelector('main')
    await row(p).click()
    await sheet(p).getByRole('button', { name: 'Отключить' }).click()
    await p.locator('[data-notice]').first().waitFor({ state: 'hidden', timeout: 12000 })
    await p.goBack()
    await home(p)
    expect(await reminder.count() === 1, 'the reminder did not come back')
  } },

  // 9 (С10). The connected sheet: the secret masked and nowhere in the page; «Синхронизировать сейчас»
  { id: 's3-9-sheet', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b)
    await connect(p)
    await row(p).click()
    await sheet(p).waitFor()
    const text = await sheet(p).innerText()
    expect(text.includes(BUCKET) && text.includes(KEY_ID) && text.includes(`••••••••${SECRET.slice(-4)}`), `sheet: ${text}`)
    const html = await p.content()
    const values = await p.evaluate(() => [...document.querySelectorAll('input')].map(i => i.value))
    expect(!html.includes(SECRET) && !values.includes(SECRET), 'the full secret is in the page')
    expect(await row(p).locator('> span.truncate').count() === 0, 'a value beside the row while on')
    const reads = b.reads
    await sheet(p).getByRole('button', { name: 'Синхронизировать сейчас' }).click()
    await p.waitForTimeout(400)
    expect(b.reads > reads, 'no round trip')
    expect((await sheet(p).locator('[data-sync-state]').innerText()).trim() === 'Синхронизировано · только что', 'state line')
    expect(await sheet(p).getByRole('button', { name: 'Готово' }).count() === 1, 'no «Готово»')
  } },

  // 10 (С11). «Отключить»: at once, «Отменить» brings it back, then the key is forgotten; the bucket keeps the file
  { id: 's3-10-off', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b)
    await connect(p)
    const before = (await titles(p)).length
    await row(p).click()
    await sheet(p).getByRole('button', { name: 'Отключить' }).click()
    await sheet(p).waitFor({ state: 'hidden' })
    expect(await noticeText(p) === 'Синхронизация выключена\nОтменить' || (await noticeText(p)).startsWith('Синхронизация выключена'), `notice: ${await noticeText(p)}`)
    expect(await rowHint(p) === 'Выключена', 'still on')
    expect((await titles(p)).length === before, 'pages went')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(300)
    expect((await rowHint(p)).startsWith('Синхронизировано'), `after «Отменить»: ${await rowHint(p)}`)
    await row(p).click()
    await sheet(p).getByRole('button', { name: 'Отключить' }).click()
    await p.locator('[data-notice]').first().waitFor({ state: 'hidden', timeout: 12000 })
    await row(p).click()
    const v = await Promise.all(['Бакет', 'ID ключа', 'Секретный ключ'].map(n => field(p, n).inputValue()))
    expect(v.every(x => !x), `the fields kept: ${v}`)
    expect(b.objects.has(`${BUCKET}/${DATA}`), 'the bucket lost the file')
  } },

  // 11. The state line: a change goes within seconds; offline, changes are counted in grey
  { id: 's3-11-state', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b)
    await connect(p)
    const writes = b.writes
    await add(p, 'Задачи', ['Позвонить в сервис'])
    await p.waitForTimeout(3500)
    expect(b.writes > writes, 'the change was not sent within 3.5 s')
    expect(b.file().records.some(r => r.text === 'Позвонить в сервис'), 'not in the bucket')
    expect(await rowHint(p) === 'Синхронизировано · только что', `row: ${await rowHint(p)}`)
    await p.context().setOffline(true)
    await add(p, 'Задачи', ['Один', 'Два', 'Три'])
    await p.waitForTimeout(300)
    expect(await rowHint(p) === 'Ждёт сети · 3 изменения не отправлены', `offline: ${await rowHint(p)}`)
    expect(await row(p).locator('span.text-13').first().evaluate(e => e.className.includes('text-toned')), 'not grey')
    await p.context().setOffline(false)
    await p.waitForTimeout(1500)
    expect(b.file().records.some(r => r.text === 'Три'), 'not sent when the network came back')
  } },

  // 12 (С13). The key stops working: three tries, «Исправить», «Ввести ключ заново» keeps the bucket and the ID
  { id: 's3-12-error', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b)
    await connect(p)
    b.keys = {}
    await round(p)
    await round(p)
    expect(await rowHint(p) !== 'Ошибка: ключ больше не подходит', 'stopped after two tries')
    await round(p)
    await p.waitForTimeout(100)
    expect(await rowHint(p) === 'Ошибка: ключ больше не подходит', `row: ${await rowHint(p)}`)
    expect(await rowValue(p) === 'Исправить', `value: ${await rowValue(p)}`)
    expect(await row(p).locator('> span.truncate').first().evaluate(e => e.className.includes('accent')), '«Исправить» is not accent')
    await row(p).click()
    expect(await sheet(p).getByRole('button', { name: 'Синхронизировать сейчас' }).count() === 0, '«Синхронизировать сейчас» shows')
    await sheet(p).getByRole('button', { name: 'Ввести ключ заново' }).click()
    await p.waitForTimeout(300)
    const v = await Promise.all(['Бакет', 'ID ключа', 'Секретный ключ'].map(n => field(p, n).inputValue()))
    expect(v[0] === BUCKET && v[1] === KEY_ID && v[2] === '', `fields: ${v}`)
    expect(await field(p, 'Секретный ключ').evaluate(e => e === document.activeElement), 'the caret is not in the secret')
    // The key works again: sync is back
    b.keys = { [KEY_ID]: SECRET }
    await field(p, 'Секретный ключ').fill(SECRET)
    await connectButton(p).click()
    await sheet(p).waitFor({ state: 'hidden' })
    expect((await rowHint(p)).startsWith('Синхронизировано'), `after a new key: ${await rowHint(p)}`)
  } },

  // 13 (С12, С14). Главная's sign: nothing for a short time offline; the grey glyph after 10 minutes; its tap
  { id: 's3-13-sign', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await p.clock.install()
    // One page load, Главная → Настройки → Главная inside the app: the dev server serves the screens' parts on demand
    // and offline it could not (the built app has them in its service worker)
    await device(p, b, '/')
    await go(p, '/settings')
    await connect(p)
    await row(p).click()
    await sheet(p).getByRole('button', { name: 'Готово' }).click()
    await sheet(p).waitFor({ state: 'hidden' })
    await go(p, '/')
    await home(p)
    const sign = p.locator('[data-sync-sign]:visible')
    await p.context().setOffline(true)
    await add(p, 'Задачи', ['Позвонить в сервис'])
    await p.clock.runFor(4 * 60000)
    expect(!(await sign.count()), 'a sign after 4 minutes')
    await p.context().setOffline(false)
    await p.clock.runFor(3000)
    expect(!(await sign.count()), 'a sign after the network came back')
    await p.context().setOffline(true)
    await add(p, 'Задачи', ['Купить фильтр'])
    await p.clock.runFor(11 * 60000)
    expect(await sign.count() === 1, 'no sign after 11 minutes offline')
    const label = await sign.getAttribute('aria-label')
    expect(label === 'Синхронизация ждёт сети: 1 изменение не отправлено', `label: ${label}`)
    expect(await sign.evaluate(e => e.className.includes('text-toned')), 'the waiting sign is not grey')
    await sign.click()
    await sheet(p).waitFor()
    expect(p.url().includes('/settings'), 'not in Настройки')
    const state = (await sheet(p).locator('[data-sync-state]').innerText()).trim()
    expect(state === 'Ждёт сети · 1 изменение не отправлено', `sheet: ${state}`)
    await p.context().setOffline(false)
  } },

  // 14 (С15). A newer format in the bucket: read only
  { id: 's3-14-newer', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    b.objects.set(`${BUCKET}/${DATA}`, { etag: '"n1"', body: JSON.stringify({ app: 'cerulean', format: 99, writtenAt: Date.now(), pages: [], records: [], sections: [], entries: [], gone: {}, settings: null, learned: null }) })
    await device(p, b)
    await connect(p)
    expect(await rowHint(p) === 'Только чтение: нужна новая версия', `row: ${await rowHint(p)}`)
    expect((await statusLine(p).innerText()).trim().endsWith('· синхронизация остановлена'), 'status line')
    await row(p).click()
    const box = (await sheet(p).locator('[role="status"]').first().innerText()).replace(/\s+/g, ' ').trim()
    expect(box === 'Бакет записан новой версией Cerulean. Эта версия только читает его, правки остаются на устройстве. Обновите приложение.', `box: ${box}`)
    expect(!(await sheet(p).getByRole('button', { name: 'Синхронизировать сейчас' }).count()) && await sheet(p).getByRole('button', { name: 'Отключить' }).count() === 1, 'buttons')
    await add(p, 'Задачи', ['Не уйдёт'])
    await round(p)
    expect(!b.objects.get(`${BUCKET}/${DATA}`).body.includes('Не уйдёт'), 'an edit was written')
    await p.goto(p.url().replace(/\/settings.*$/, '/'))
    await p.waitForSelector('main')
    const sign = p.locator('[data-sync-sign]:visible')
    expect(await sign.getAttribute('aria-label') === 'Синхронизация остановлена' && await sign.evaluate(e => e.className.includes('text-warn-ink')), 'no warn sign')
  } },

  // 15. What syncs: no key in the file or a copy; the theme follows
  { id: 's3-15-keys', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    const other = await another(p, b)
    await connect(other)
    await device(p, b)
    await store(p, data => data.setSettings({ provider: 'openai', apiKey: 'sk-made-up-model-key-77' }))
    await connect(p)
    const file = b.objects.get(`${BUCKET}/${DATA}`).body
    expect(![SECRET, KEY_ID, 'sk-made-up-model-key-77'].some(x => file.includes(x)), 'a key is in the bucket')
    const copy = await store(p, data => JSON.stringify(data.snapshot()))
    expect(![SECRET, KEY_ID, 'sk-made-up-model-key-77'].some(x => copy.includes(x)), 'a key is in the copy')
    // The theme changed here is the other device's on its next round trip
    await p.getByRole('radio', { name: 'Тёмная' }).click().catch(() => p.getByText('Тёмная', { exact: true }).click())
    await p.waitForTimeout(3000)
    await round(other)
    await other.waitForTimeout(300)
    const theme = await other.evaluate(() => document.documentElement.className)
    expect(theme.includes('dark'), `the other device's theme: ${theme}`)
    await other.context().close()
  } },

  // 16. Two devices: a record shows on the other; the later edit wins whole; a deletion does not come back
  { id: 's3-16-two', device: MOBILE, run: async (p) => {
    const b = fakeBucket()
    await device(p, b)
    await connect(p)
    const other = await another(p, b)
    await connect(other)
    const [id] = await add(p, 'Задачи', ['Записаться к врачу'])
    await p.waitForTimeout(3000)
    // B opens the app again: it is there at once
    await other.reload()
    await other.waitForSelector('main')
    await other.waitForTimeout(800)
    expect(await store(other, (data, a) => data.records[a]?.text, id) === 'Записаться к врачу', 'not on B after a reopen')
    // Both edit it while B is offline: the later edit wins on both
    await other.context().setOffline(true)
    await store(other, (data, a) => data.updateRecord(a, { text: 'Записаться к врачу во вторник' }), id)
    await p.waitForTimeout(20)
    await store(p, (data, a) => data.updateRecord(a, { text: 'Записаться к врачу в среду' }), id)
    await p.waitForTimeout(3000)
    await other.context().setOffline(false)
    await other.waitForTimeout(1500)
    await round(other)
    await round(p)
    const both = [await store(p, (data, a) => data.records[a]?.text, id), await store(other, (data, a) => data.records[a]?.text, id)]
    expect(both.every(t => t === 'Записаться к врачу в среду'), `after: ${both}`)
    // Deleted for good on A: gone on B, and it does not come back
    await store(p, (data, a) => data.purgeRecords([a]), id)
    await p.waitForTimeout(3000)
    await round(other)
    await round(other)
    await round(p)
    expect(await store(other, (data, a) => !data.records[a], id), 'still on B')
    expect(await store(p, (data, a) => !data.records[a], id), 'back on A')
    await other.context().close()
  } }
]
