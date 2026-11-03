import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { fakeModel, first, goPage, openField, recs, title } from './main-flow.mjs'

const labels = ['Раскладывать по страницам', 'Делить строку на записи', 'Отдел для покупок', 'Значок для новых страниц']
const toggle = (p, name) => p.getByRole('switch', { name, exact: true })

async function check(p) {
  await first(p)
  await open(p, '/settings', false)
  for (const label of labels.slice(0, 2)) {
    expect(await toggle(p, label).isDisabled(), `${label}: available without a key`)
    expect(await toggle(p, label).getAttribute('data-state') === 'unchecked', `${label}: on without a key`)
  }
  for (const label of labels.slice(2)) expect(await toggle(p, label).getAttribute('data-state') === 'checked', `${label}: off by default`)
  expect(await p.getByText('Нужен ключ модели').count() === 2, 'missing key hints')
  expect(await p.getByText('Пока по простым правилам').count() === 2, 'missing local rules hints')

  await fakeModel(p, (_line, id) => [{ text: 'Хлеб', pageId: id('Покупки') }, { text: 'Позвонить маме', pageId: id('Задачи') }])
  for (const label of labels) expect(await toggle(p, label).getAttribute('data-state') === 'checked', `${label}: off with a key`)
  await toggle(p, labels[1]).click()
  await store(p, data => data.setSettings({ apiKey: '' }))
  expect(await toggle(p, labels[1]).isDisabled(), 'split available after disconnect')
  await store(p, data => data.setSettings({ apiKey: 'fake-key', keyState: 'ok' }))
  expect(await toggle(p, labels[1]).getAttribute('data-state') === 'unchecked', 'split off lost after reconnect')
  await p.waitForFunction(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('cerulean')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const saved = await new Promise((resolve, reject) => {
      const request = db.transaction('meta').objectStore('meta').get('settings')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return saved?.aiSplit === false && saved?.apiKey === 'fake-key'
  })
  await p.reload()
  await p.getByRole('heading', { name: 'ИИ', exact: true }).waitFor()
  expect(await toggle(p, labels[1]).getAttribute('data-state') === 'unchecked', 'split off lost after reload')

  await open(p, '/', false)
  await openField(p)
  await title(p).fill('хлеб и позвонить маме')
  const answer = p.waitForResponse(res => res.url().includes('/fake-ai/v1/'))
  await p.keyboard.press('Enter')
  await answer
  await p.waitForFunction(() => Object.values(document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data').records).some(r => !r.seed && r.text.toLowerCase().includes('позвонить маме')))
  const records = await recs(p)
  expect(records.length === 1 && records[0].text.toLowerCase().includes('позвонить маме'), `split off: ${JSON.stringify(records)}`)
}

async function checkAddRow(p, { key, split, department, offline = false, route = true }) {
  await first(p)
  if (key) await fakeModel(p, () => [])
  await store(p, (data, settings) => data.setSettings(settings), { aiRoute: route, aiSplit: split, aiDepartment: department })
  await goPage(p, 'Покупки')
  if (offline) await p.context().setOffline(true)
  const before = await store(p, data => data.liveRecords.map(r => r.id))
  await p.locator('[data-add-row]', { hasText: 'Новая запись' }).click()
  await p.getByRole('textbox', { name: 'Новая запись', exact: true }).fill('молоко, позвонить маме')
  await p.keyboard.press('Enter')
  const count = key && split && !offline ? 2 : 1
  await p.waitForFunction(({ before, count }) => {
    const data = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data')
    return data.liveRecords.filter(r => !before.includes(r.id)).length >= count
  }, { before, count })
  const added = await store(p, (data, before) => {
    const shop = data.livePages.find(page => page.title === 'Покупки')
    const prop = shop.props.find(p => p.type === 'select')
    return data.liveRecords.filter(r => !before.includes(r.id)).map(r => ({ text: r.text, pageId: r.pageId, shopId: shop.id, department: r.values[prop.id] ?? null }))
  }, before)
  expect(added.length === count, `add row: expected ${count}, got ${added.length}`)
  expect(added.every(r => r.pageId === r.shopId), 'add row changed the chosen page')
  const milk = added.find(r => r.text.toLowerCase().includes('молоко'))
  expect(!!milk && (milk.department !== null) === department, 'add row department does not match the switch')
  if (count === 1) expect(milk.text.toLowerCase().includes('позвонить маме'), 'add row lost part of the line')
}

export default [
  { id: 'mf3-ai-phone', device: MOBILE, run: check },
  { id: 'mf3-ai-desktop', device: DESKTOP, run: check },
  { id: 'mf3-ai-phone-dark', device: { ...MOBILE, colorScheme: 'dark' }, run: check },
  { id: 'mf3-ai-desktop-dark', device: { ...DESKTOP, colorScheme: 'dark' }, run: check },
  ...[false, true].flatMap(key => [false, true].flatMap(split => [false, true].map(department => ({
    id: `mf3-ai-add-row-${key ? 'key' : 'no-key'}-split-${split}-department-${department}`,
    device: MOBILE,
    run: p => checkAddRow(p, { key, split, department })
  })))),
  { id: 'mf3-ai-add-row-offline', device: MOBILE, run: p => checkAddRow(p, { key: true, split: true, department: true, offline: true }) },
  { id: 'mf3-ai-add-row-desktop', device: DESKTOP, run: p => checkAddRow(p, { key: true, split: true, department: false, route: false }) }
]
