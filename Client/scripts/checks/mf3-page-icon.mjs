import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { first, mainChip, openField, places } from './main-flow.mjs'
import { fakeBucket, KEY_ID, SECRET, BUCKET } from './sync.mjs'

async function makePage(p) {
  await p.locator('[data-new-page]').first().click()
  await p.waitForURL(/\/p\//)
  return p.getByRole('textbox', { name: 'Название страницы' })
}

const current = p => store(p, (data) => {
  const id = location.pathname.split('/').at(-1)
  const page = data.pages[id]
  return page && { glyph: page.glyph, color: page.color, autoGlyph: page.autoGlyph, title: page.title }
})

async function waitForCalls(p, count, read) {
  for (let i = 0; i < 50 && read() < count; i++) await p.waitForTimeout(100)
  expect(read() >= count, 'model request did not start')
}

async function scenario(p) {
  await first(p)
  const title = await makePage(p)
  await title.fill('Дача')
  expect((await current(p)).glyph === 'tree', 'the new page did not follow «Дача»')
  expect(await p.locator('[data-starters]').count() > 0, 'auto icon hid the page starters')
  await p.getByRole('button', { name: 'Значок страницы' }).click()
  const recommendations = p.getByRole('group', { name: 'Рекомендуемые значки' })
  expect(await recommendations.getByRole('button').first().getAttribute('aria-label') === 'Дерево', 'tree is not the first recommendation')
  await recommendations.getByRole('button', { name: 'Солнце' }).click()
  await p.getByRole('group', { name: 'Цвет' }).getByRole('button', { name: 'Зелёный' }).click()
  await p.keyboard.press('Escape')
  await title.fill('Дача у озера')
  await title.blur()
  let page = await current(p)
  expect(page.glyph === 'sun' && page.color === 'green' && page.autoGlyph === false, 'manual selection did not stop automatic icons')
  await p.reload()
  await p.waitForSelector('textarea[aria-label="Название страницы"]')
  page = await current(p)
  expect(page.glyph === 'sun' && page.color === 'green', 'manual icon or color did not survive reload')
  await p.getByRole('textbox', { name: 'Название страницы' }).fill('Ремонт')
  expect((await current(p)).glyph === 'sun', 'an existing page changed its icon')
}

async function lateModel(p) {
  await first(p)
  let calls = 0
  await p.route('**/icon-model/v1/**', async (route) => {
    calls++
    await new Promise(resolve => setTimeout(resolve, 1400))
    await route.fulfill({ json: { choices: [{ message: { role: 'assistant', content: JSON.stringify({ glyph: 'roller' }) } }] } }).catch(() => {})
  })
  await store(p, (data, base) => data.setSettings({ provider: 'custom', apiKey: 'test-only', baseUrl: base, modelId: 'fake', keyState: 'ok', aiIcon: true }), `${new URL(p.url()).origin}/icon-model/v1`)
  const title = await makePage(p)
  await title.fill('Дача')
  await waitForCalls(p, 1, () => calls)
  await p.getByRole('button', { name: 'Значок страницы' }).click()
  await p.getByRole('group', { name: 'Рекомендуемые значки' }).getByRole('button', { name: 'Солнце' }).click()
  await p.waitForTimeout(1700)
  expect((await current(p)).glyph === 'sun', 'a late answer overwrote a manual choice')
}

async function placesPage(p) {
  await first(p)
  await openField(p)
  await mainChip(p).click()
  const input = places(p).locator('[data-place-new] input')
  await input.click()
  await input.fill('дача')
  await input.press('Enter')
  await p.waitForTimeout(200)
  const result = await store(p, data => data.livePages.filter(x => x.title === 'Дача').map(x => ({ glyph: x.glyph, color: x.color })))
  expect(result.length === 1 && result[0].glyph === 'tree' && !result[0].color, `places created ${JSON.stringify(result)}`)
}

async function disabled(p) {
  await open(p, '/settings', false)
  const toggle = p.getByRole('switch', { name: 'Значок для новых страниц', exact: true })
  expect(await toggle.getAttribute('data-state') === 'checked', 'the icon setting is not on by default')
  await toggle.click()
  expect(await toggle.getAttribute('data-state') === 'unchecked', 'the icon setting did not switch off')
  await p.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/'))
  const title = await makePage(p)
  await title.fill('Дача')
  expect((await current(p)).glyph === null, 'icon changed while the setting was off')
  await store(p, data => data.setSettings({ aiIcon: true }))
  expect((await current(p)).glyph === 'tree', 'enabling the setting did not apply the local rule')
}

async function modelChanges(p) {
  await first(p)
  let calls = 0
  await p.route('**/icon-model/v1/**', async (route) => {
    calls++
    const body = JSON.parse(route.request().postData())
    const title = body.messages.at(-1).content
    await new Promise(resolve => setTimeout(resolve, title === 'Дача' ? 1200 : 50))
    await route.fulfill({ json: { choices: [{ message: { role: 'assistant', content: JSON.stringify({ glyph: title === 'Дача' ? 'gift' : 'sun' }) } }] } }).catch(() => {})
  })
  await store(p, (data, base) => data.setSettings({ provider: 'custom', apiKey: 'test-only', baseUrl: base, modelId: 'fake', keyState: 'ok', aiIcon: true }), `${new URL(p.url()).origin}/icon-model/v1`)
  const title = await makePage(p)
  await title.fill('Дача')
  await waitForCalls(p, 1, () => calls)
  await title.fill('Ремонт')
  await waitForCalls(p, 2, () => calls)
  await p.waitForTimeout(250)
  expect((await current(p)).glyph === 'sun', 'model did not select an icon for the new title')
  await p.waitForTimeout(700)
  expect((await current(p)).glyph === 'sun', 'an old model response overwrote the new name')
  await title.fill('Дача')
  await waitForCalls(p, 3, () => calls)
  await store(p, data => data.setSettings({ aiIcon: false }))
  await p.waitForTimeout(1400)
  expect((await current(p)).glyph === 'tree', 'a late model response ignored the disabled setting')
}

async function starter(p) {
  await first(p)
  const title = await makePage(p)
  await title.fill('Дача')
  await p.getByRole('button', { name: 'Список покупок', exact: true }).first().click()
  await p.waitForTimeout(200)
  const page = await current(p)
  expect(page.glyph === 'basket', 'the suggested glyph replaced the chosen starter')
}

async function syncIcon(p) {
  const bucket = fakeBucket()
  await bucket.attach(p.context())
  async function connect(page) {
    await open(page, '/settings', false)
    await page.locator('main button').filter({ hasText: /^Синхронизация/ }).first().click()
    const sheet = page.getByRole('dialog', { name: 'Синхронизация' })
    await sheet.getByLabel('Бакет', { exact: true }).fill(BUCKET)
    await sheet.getByLabel('ID ключа', { exact: true }).fill(KEY_ID)
    await sheet.getByLabel('Секретный ключ', { exact: true }).fill(SECRET)
    await sheet.getByRole('button', { name: 'Подключить', exact: true }).click()
    await sheet.waitFor({ state: 'hidden', timeout: 10000 })
  }
  await connect(p)
  await p.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/'))
  const title = await makePage(p)
  await title.fill('Дача')
  await p.getByRole('button', { name: 'Значок страницы' }).click()
  await p.getByRole('group', { name: 'Рекомендуемые значки' }).getByRole('button', { name: 'Солнце' }).click()
  await p.getByRole('group', { name: 'Цвет' }).getByRole('button', { name: 'Зелёный' }).click()
  await p.keyboard.press('Escape')
  await title.blur()
  await p.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('cloud').roundTrip())
  const saved = bucket.file()?.pages.find(page => page.title === 'Дача')
  expect(saved?.glyph === 'sun' && saved.color === 'green' && saved.autoGlyph === false, 'manual icon was not sent to the bucket')
  const other = await p.context().browser().newContext({ ...MOBILE, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
  try {
    await bucket.attach(other)
    const second = await other.newPage()
    await connect(second)
    const received = await store(second, (data) => {
      const page = data.livePages.find(x => x.title === 'Дача')
      return page && { glyph: page.glyph, color: page.color, autoGlyph: page.autoGlyph }
    })
    expect(received?.glyph === 'sun' && received.color === 'green' && received.autoGlyph === false, 'another device did not receive the manual icon')
  } finally {
    await other.close()
  }
}

export default [
  ...[MOBILE, DESKTOP].flatMap((device, i) => ['light', 'dark'].map(colorScheme => ({
    id: `mf3-page-icon-${i ? 'desktop' : 'phone'}-${colorScheme}`, device: { ...device, colorScheme }, run: scenario
  }))),
  { id: 'mf3-page-icon-late-model', device: MOBILE, run: lateModel },
  { id: 'mf3-page-icon-places', device: MOBILE, run: placesPage },
  { id: 'mf3-page-icon-setting', device: MOBILE, run: disabled },
  { id: 'mf3-page-icon-model-name-setting', device: MOBILE, run: modelChanges },
  { id: 'mf3-page-icon-starter', device: MOBILE, run: starter },
  { id: 'mf3-page-icon-sync', device: MOBILE, run: syncIcon }
]
