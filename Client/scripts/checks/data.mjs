// v22 keeping data: items 27 (keeping data), 28 (import), 29 (two tabs) and the storage side of 9 (failure states).
//
// Storage states are made with Playwright init scripts that run before the app:
// - `breakStorage`: `indexedDB.open` throws, as in a private window or with site data blocked;
// - `fillStorage`: `IDBObjectStore.prototype.put` throws a QuotaExceededError once `window.__storageFull` is set,
//   so the app loads normally and the next write is refused (a full disk). The delta's check says
//   «make `localStorage.setItem` throw»; the client keeps its data in IndexedDB, so this is the same check here.
// - `keeping(persisted)`: a StorageManager that answers `persisted()` as given and counts `persist()` calls.
// Two tabs are two pages of one browser context: they share IndexedDB and BroadcastChannel like two real tabs.
import { DESKTOP, MOBILE, expect, open, send, shows, store } from './lib.mjs'

const DAY = 86400000

export const breakStorage = page => page.addInitScript(() => {
  indexedDB.open = () => {
    throw new DOMException('A mutation operation was attempted on a database that did not allow mutations.', 'InvalidStateError')
  }
})

export const fillStorage = page => page.addInitScript(() => {
  const put = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (...args) {
    if (window.__storageFull) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    return put.apply(this, args)
  }
})

const keeping = (page, persisted) => page.addInitScript((value) => {
  window.__persistCalls = 0
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      persisted: async () => value,
      persist: async () => {
        window.__persistCalls++
        return value
      },
      estimate: async () => ({})
    }
  })
}, persisted)

/** A copy from another device: this database's demo with fresh ids, one more page and two more records */
const copyFile = page => store(page, (data) => {
  const s = JSON.parse(JSON.stringify(data.snapshot()))
  const ids = new Map()
  const id = x => x && (ids.get(x) ?? ids.set(x, `${x}-file`).get(x))
  for (const p of s.pages) {
    p.id = id(p.id)
    p.sectionId = id(p.sectionId)
  }
  for (const r of s.records) Object.assign(r, { id: id(r.id), pageId: id(r.pageId), parentId: id(r.parentId), links: (r.links ?? []).map(id) })
  for (const x of s.sections) x.id = id(x.id)
  const books = s.pages.find(p => p.title === 'Книги')
  s.pages.push({ ...books, id: 'p-films', title: 'Фильмы', favorite: null })
  s.records.push({ ...s.records.find(r => r.pageId === books.id), id: 'r-dune', pageId: 'p-films', text: 'Дюна', favorite: null })
  const products = s.pages.find(p => p.title === 'Покупки')
  s.records.push({ ...s.records.find(r => r.pageId === products.id && !r.parentId), id: 'r-kefir', text: 'Кефир', favorite: null, deletedAt: null })
  return JSON.stringify({ app: 'cerulean', version: 1, exportedAt: Date.now(), ...s, entries: [] })
})

async function pickFile(page, text) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /^Загрузить копию/ }).first().click()
  await (await chooser).setFiles({ name: 'cerulean-2026-09-12.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await page.waitForTimeout(600)
}

/** What the user has, by id, for «the data is as before» */
const fingerprint = page => store(page, data => JSON.stringify({
  pages: Object.values(data.pages).map(p => [p.id, p.title, p.props.length]).sort(),
  records: Object.values(data.records).map(r => [r.id, r.text, r.done]).sort(),
  sections: Object.keys(data.sections).sort()
}))

export default [
  // 27: «block site data and open the app: the block shows on Главная, «Как исправить» opens Настройки with the same words»
  { id: 'v22-27-nostore', device: MOBILE, run: async (p) => {
    await breakStorage(p)
    await open(p, '/')
    const block = p.getByRole('alert').filter({ hasText: 'Изменения не сохраняются' })
    expect(await shows(block), 'no warning block on Главная')
    expect(await block.getByText(/так бывает в приватном окне/).count(), 'the block does not say why')
    await block.getByRole('button', { name: 'Как исправить' }).click()
    await p.waitForURL(/\/settings/)
    expect(await shows(p.getByText('Изменения не сохраняются')), 'Настройки do not say «Изменения не сохраняются»')
    expect(await p.getByText(/Открой сайт в обычном окне/).count(), 'Настройки do not say what to do')
    expect(!(await p.getByText(/^Работает офлайн/).count()), 'the status line still shows')
    expect(!(await p.getByText('Не удалять при нехватке места').count()), '«Не удалять при нехватке места» shows without storage')
    expect(await p.getByText('Сейчас', { exact: true }).count(), '«Сохранить копию» does not say «Сейчас»')
  } },
  { id: 'v22-27-nostore-desk', device: DESKTOP, run: async (p) => {
    await breakStorage(p)
    await open(p, '/')
    // Desktop addendum (canvas 60): the same tinted block as on the phone, above Входящие
    const block = p.getByRole('alert').filter({ hasText: 'Изменения не сохраняются' })
    expect(await shows(block), 'no warning block on desktop Главная')
    const [first, inbox] = await Promise.all([block.boundingBox(), p.locator('main').getByRole('link', { name: /^Входящие/ }).first().boundingBox()])
    expect(first.y < inbox.y, 'the block is not above Входящие')
    await block.getByRole('button', { name: 'Как исправить' }).click()
    await p.waitForURL(/\/settings/)
  } },
  // 27: persist() is asked once, at the first record, with no screen of ours
  { id: 'v22-27-persist', device: MOBILE, run: async (p) => {
    await keeping(p, false)
    await open(p, '/', false)
    expect(await p.evaluate(() => window.__persistCalls) === 0, 'persist() asked before any record')
    await send(p, 'хлеб')
    await send(p, 'молоко')
    expect(await p.evaluate(() => window.__persistCalls) === 1, `persist() asked ${await p.evaluate(() => window.__persistCalls)} times`)
    await p.goto(p.url().replace(/\/(\?.*)?$/, '/settings'))
    await p.waitForSelector('main')
    const data = p.getByRole('region', { name: 'Данные' })
    // Sync (28 Oct, item 1) is the first row of «Данные» now; the shield row comes right after it
    const rows = (await data.locator(':scope > button, :scope > div').allInnerTexts()).filter(t => !/^Синхронизация/.test(t))
    expect(/^Не удалять при нехватке места/.test(rows[0] ?? ''), `the first row of «Данные» after «Синхронизация» is «${rows[0]?.split('\n')[0]}»`)
    expect(/Включить/.test(rows[0] ?? ''), 'no «Включить»')
    // v23 (M11): before the first copy line 2 is just «JSON или Markdown»; the status line says «копии нет»
    expect(/Сохранить копию\s*JSON или Markdown\s*$/.test(rows[1] ?? ''), 'the second row is not «Сохранить копию · JSON или Markdown»')
    // One-letter words are glued to the next one with a no-break space, which \s matches
    expect(/Загрузить копию[\s\S]*Добавить к\sтекущим или заменить всё/.test(rows[2] ?? ''), 'the third row is not «Загрузить копию»')
  } },
  // 27: the monthly row under the sections; a tap downloads, × is «Не сейчас»; never once storage is persistent.
  // v23 (M11): the tap opens the one format choice first, and a pick downloads
  { id: 'v22-27-backup', device: MOBILE, run: async (p) => {
    await keeping(p, false)
    await open(p, '/')
    const row = p.getByRole('button', { name: /^Сохранить копию/ })
    expect(!(await row.count()), 'the row shows on a fresh demo')
    await store(p, (data, at) => data.setSettings({ copiedAt: at }), Date.now() - 40 * DAY)
    expect(await shows(row), 'no «Сохранить копию» row a month after the last copy')
    expect(await p.getByText(/Последняя копия \d+ [а-я]+/).count(), 'no «Последняя копия …»')
    const download = p.waitForEvent('download')
    await row.click()
    await p.getByRole('dialog').getByRole('button', { name: /^JSON/ }).click()
    expect(/^cerulean-.*\.json$/.test((await download).suggestedFilename()), 'the copy is not a JSON file')
    expect(!(await p.getByRole('button', { name: /^Сохранить копию/ }).count()), 'the row stayed after saving')
    expect(!(await p.locator('[data-notice]').count()), 'saving a copy toasted')
    await store(p, (data, at) => data.setSettings({ copiedAt: at }), Date.now() - 40 * DAY)
    await p.getByRole('button', { name: 'Не сейчас' }).click()
    expect(!(await p.getByRole('button', { name: /^Сохранить копию/ }).count()), '× did not hide the row')
  } },
  { id: 'v22-27-backup-kept', device: MOBILE, run: async (p) => {
    await keeping(p, true)
    await open(p, '/')
    await store(p, (data, at) => data.setSettings({ copiedAt: at }), Date.now() - 90 * DAY)
    await p.waitForTimeout(300)
    expect(!(await p.getByRole('button', { name: /^Сохранить копию/ }).count()), 'the row shows while storage is persistent')
  } },
  // 28: «import a file with «Добавить к текущим», then «Отменить»: the data is as before»
  { id: 'v22-28-add', device: MOBILE, run: async (p) => {
    await open(p, '/settings')
    const before = await fingerprint(p)
    await pickFile(p, await copyFile(p))
    const sheet = p.getByRole('alertdialog')
    expect(await shows(sheet.getByText(/В файле cerulean-2026-09-12\.json \d+ страниц\S* и \d+ запис\S*\. Здесь сейчас \d+ страниц\S* и \d+ запис\S*\./)), 'the sheet does not give both counts')
    await sheet.getByRole('button', { name: 'Добавить к текущим' }).click()
    expect(await shows(p.getByText('Добавлена 1 страница и 2 записи')), 'no «Добавлена 1 страница и 2 записи»')
    expect(await store(p, data => data.livePages.filter(x => x.title === 'Покупки').length) === 1, 'Покупки doubled')
    await p.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(300)
    expect(await fingerprint(p) === before, 'the data is not as before after «Отменить»')
  } },
  // 28: «Заменить всё» asks with both numbers and saves a copy first
  { id: 'v22-28-replace', device: MOBILE, run: async (p) => {
    await open(p, '/settings')
    await pickFile(p, await copyFile(p))
    await p.getByRole('alertdialog').getByRole('button', { name: 'Заменить всё' }).click()
    const ask = p.getByRole('alertdialog')
    expect(await shows(ask.getByText(/Здесь удалятся \d+ страниц\S* и \d+ запис\S*, вместо них будут данные из файла\. Перед этим сохранится копия того, что есть сейчас\./)), 'the confirm does not name what goes')
    const download = p.waitForEvent('download')
    await ask.getByRole('button', { name: 'Заменить', exact: true }).click()
    expect(/\.json$/.test((await download).suggestedFilename()), 'no copy saved before replacing')
    await p.waitForURL(u => new URL(u).pathname === '/')
    expect(await store(p, data => data.livePages.some(x => x.title === 'Фильмы')), 'the file did not replace the data')
  } },
  // 29: «open the app in two tabs, tick a record in one: the other shows it ticked without a reload»
  { id: 'v22-29-two-tabs', device: MOBILE, run: async (p) => {
    await open(p, '/')
    await p.getByRole('link', { name: /^Покупки/ }).first().click()
    await p.waitForURL(/\/p\//)
    const other = await p.context().newPage()
    await other.goto(p.url())
    await other.waitForSelector('main')
    await other.waitForTimeout(500)
    // Words typed in the page's field and put away, not sent: the closed field keeps them
    await p.locator('[data-field="closed"] button').nth(1).click()
    await p.getByRole('textbox', { name: 'Запись', exact: true }).fill('несохранённый текст')
    await p.keyboard.press('Escape')
    await other.getByRole('checkbox', { name: 'Отметить «Молоко»' }).click()
    await p.waitForTimeout(800)
    expect(await store(p, data => Object.values(data.records).find(r => r.text === 'Молоко').done), 'the tick did not reach the other tab')
    expect(await shows(p.getByRole('button', { name: 'Продолжить: несохранённый текст' })), 'the unsent text went')
    await other.getByRole('checkbox', { name: 'Купить снова «Молоко»' }).click().catch(async () => {
      await store(other, data => data.toggleDone(Object.values(data.records).find(r => r.text === 'Молоко').id))
    })
    await p.waitForTimeout(800)
    expect(!(await store(p, data => Object.values(data.records).find(r => r.text === 'Молоко').done)), 'the untick did not reach the other tab')
    // The list stays where it was scrolled while a row changes under it
    const scroller = p.locator('.scroll-fade').first()
    const top = await scroller.evaluate((el) => {
      el.scrollTop = 120
      return el.scrollTop
    })
    await store(other, data => data.updateRecord(Object.values(data.records).find(r => r.text === 'Хлеб').id, { text: 'Хлеб белый' }))
    expect(await shows(p.getByText('Хлеб белый')), 'a rename in the other tab did not show')
    expect(await scroller.evaluate(el => el.scrollTop) === top, 'the list jumped')
    await other.close()
  } },
  // 29: the record open here waits with «Запись изменили в другой вкладке» · «Обновить»
  { id: 'v22-29-record', device: MOBILE, run: p => recordWaits(p) },
  { id: 'v22-29-record-desk', device: DESKTOP, run: p => recordWaits(p) },
  // 9 (storage side): a refused write is reported to the writing loop; the card itself belongs to the writing loop
  { id: 'v22-9-save-failed', device: MOBILE, run: async (p) => {
    await fillStorage(p)
    await open(p, '/')
    await p.evaluate(() => {
      window.__storageFull = true
    })
    await send(p, 'купить батарейки')
    await p.waitForTimeout(500)
    const failed = await store(p, data => data.writeFailed)
    expect(failed, 'writeFailed is not set')
    expect(failed.reason === 'quota', `writeFailed.reason is ${failed.reason}`)
    expect(!(await store(p, data => data.storageError)), 'a full disk reads as storage unavailable')
    // The field (main flow): a notice that says so with «Повторить», the words back in the field, nothing that claims it was saved
    const notice = p.locator('[data-notice]')
    expect(await shows(notice.filter({ hasText: 'Не сохранилось: в браузере нет места' })), 'no «Не сохранилось» notice')
    expect(await shows(p.getByRole('button', { name: 'Продолжить: купить батарейки' })), 'the text is not back in the field')
    expect(!(await store(p, data => Object.values(data.records).some(r => /батарейки/i.test(r.text) && !r.deletedAt))), 'the refused record is still shown')
    expect(!(await shows(p.getByText(/^Добавлено в /))), 'a notice still claims it was saved')
    // «Повторить» once there is room again
    await p.evaluate(() => {
      window.__storageFull = false
    })
    await notice.getByRole('button', { name: 'Повторить' }).click()
    await p.waitForTimeout(600)
    expect(await store(p, data => Object.values(data.records).some(r => /батарейки/i.test(r.text) && !r.deletedAt)), '«Повторить» did not write it')
  } }
]

/** 29: the record open here waits with «Запись изменили в другой вкладке» · «Обновить» */
async function recordWaits(p) {
  await open(p, '/')
  const id = await store(p, data => Object.values(data.records).find(r => r.text === 'Яйца').id)
  await p.goto(new URL(`/r/${id}`, p.url()).href)
  await p.waitForSelector('main')
  const other = await p.context().newPage()
  await other.goto(p.url())
  // The other tab writes only once its record is on screen (its data is loaded)
  await other.getByRole('textbox', { name: 'Текст записи' }).waitFor()
  await store(other, (data, rid) => data.updateRecord(rid, { text: 'Яйца С0' }), id)
  const line = p.getByText('Запись изменили в другой вкладке')
  expect(await shows(line), 'no «Запись изменили в другой вкладке»')
  expect(await p.getByRole('textbox', { name: 'Текст записи' }).inputValue() === 'Яйца', 'the record changed before «Обновить»')
  await p.getByRole('button', { name: 'Обновить' }).click()
  await p.waitForTimeout(300)
  expect(await p.getByRole('textbox', { name: 'Текст записи' }).inputValue() === 'Яйца С0', '«Обновить» did not bring the change')
  expect(!(await line.count()), 'the line stayed after «Обновить»')
  await other.close()
}
