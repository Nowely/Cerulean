// Stock imports either stop without changing anything, or can be added and undone as usual.
import { MOBILE, expect, open, shows, store } from './lib.mjs'

const copyFile = (page, independent) => store(page, (data, separate) => {
  let s = JSON.parse(JSON.stringify(data.snapshot()))
  if (separate) {
    const ids = new Map()
    for (const section of s.sections) ids.set(section.id, `${section.id}-file`)
    for (const record of s.records) ids.set(record.id, `${record.id}-file`)
    for (const entry of s.entries) ids.set(entry.id, `${entry.id}-file`)
    for (const page of s.pages) {
      ids.set(page.id, `${page.id}-file`)
      for (const view of page.views) ids.set(view.id, `${view.id}-file`)
      for (const prop of page.props) {
        ids.set(prop.id, `${prop.id}-file`)
        for (const option of prop.options ?? []) ids.set(option.id, `${option.id}-file`)
      }
    }
    const remap = (value) => {
      if (Array.isArray(value)) return value.map(remap)
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [ids.get(key) ?? key, remap(item)]))
      return ids.get(value) ?? value
    }
    s = remap(s)
  }
  const books = s.pages.find(p => p.title === 'Книги')
  const book = s.records.find(r => r.pageId === books.id && !r.parentId && !r.deletedAt)
  s.pages.push({ ...books, id: 'p-test-films', title: 'Фильмы', favorite: null })
  s.records.push({ ...book, id: 'r-test-dune', pageId: 'p-test-films', text: 'Дюна', favorite: null })
  const products = s.pages.find(p => p.title === 'Покупки')
  const milk = s.records.find(r => r.pageId === products.id && r.text === 'Молоко')
  s.records.push({ ...milk, id: 'r-test-kefir', text: 'Кефир', favorite: null })
  return JSON.stringify({ app: 'cerulean', version: 1, exportedAt: Date.now(), ...s })
}, independent)

async function pickFile(page, text) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /^Загрузить копию/ }).first().click()
  await (await chooser).setFiles({ name: 'cerulean-test.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await page.getByRole('alertdialog').waitFor()
}

const fingerprint = (page, undo = false) => store(page, (data, withoutStamp) => {
  const s = data.snapshot()
  const sort = items => [...items].sort((a, b) => a.id.localeCompare(b.id))
  return JSON.stringify({ ...s, pages: sort(s.pages), records: sort(s.records), sections: sort(s.sections),
    entries: sort(s.entries), settings: data.settings }, (key, value) => withoutStamp && key === 'updatedAt' ? undefined : value)
}, undo)

export default [
  { id: 'mf3-stock-import-conflict', device: MOBILE, run: async (p) => {
    await open(p, '/settings')
    await store(p, data => data.flush())
    const before = await fingerprint(p)
    await pickFile(p, await copyFile(p, true))
    const sheet = p.getByRole('alertdialog')
    await sheet.getByRole('button', { name: 'Добавить к текущим' }).click()
    const alert = sheet.getByRole('alert')
    expect(await shows(alert), 'no visible conflict alert inside the import sheet')
    expect(/конфликт запасов/i.test(await alert.innerText()), 'the alert does not explain the stock conflict')
    expect(/Покупки/.test(await alert.innerText()), 'the alert does not name the conflicting page')
    expect(/Данные не изменены/.test(await alert.innerText()), 'the alert does not say the data is unchanged')
    expect(await shows(sheet.getByRole('button', { name: 'Добавить к текущим' })), 'the import sheet closed on conflict')
    expect(await fingerprint(p) === before, 'the data changed after the rejected import')
    await store(p, data => data.flush())
    await p.reload()
    await p.waitForSelector('main')
    await p.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$pinia._s.get('data')?.ready)
    expect(await fingerprint(p) === before, 'the stored data changed after reload')
  } },
  { id: 'mf3-stock-import-undo', device: MOBILE, run: async (p) => {
    await open(p, '/settings')
    const before = await fingerprint(p, true)
    await pickFile(p, await copyFile(p, false))
    await p.getByRole('alertdialog').getByRole('button', { name: 'Добавить к текущим' }).click()
    expect(await shows(p.getByText('Добавлена 1 страница и 2 записи')), 'no successful import notice')
    expect(await store(p, data => data.livePages.filter(x => x.title === 'Покупки').length) === 1, 'Покупки doubled')
    expect(await store(p, data => data.livePages.some(x => x.title === 'Фильмы') && Object.values(data.records).some(r => r.text === 'Кефир' && !r.deletedAt) && Object.values(data.records).some(r => r.text === 'Дюна' && !r.deletedAt)), 'the new page or records were not imported')
    await p.getByRole('button', { name: 'Отменить' }).click()
    expect(await fingerprint(p, true) === before, 'the data is not as before after undo')
    await store(p, data => data.flush())
    await p.reload()
    await p.waitForSelector('main')
    await p.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$pinia._s.get('data')?.ready)
    expect(await fingerprint(p, true) === before, 'undo did not persist after reload')
  } }
]
