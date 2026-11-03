import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { fakeModel, openField, pickPlace, title } from './main-flow.mjs'
import { BUCKET, KEY_ID, SECRET, fakeBucket } from './sync.mjs'

async function fixture(p, layout = 'list') {
  await open(p, '/', false)
  const ids = await store(p, async (data, layout) => {
    const page = data.livePages.find(p => p.template === 'shop')
    const prop = page.props.find(p => p.type === 'select')
    const dept = { ...prop, options: [{ id: 'memory-grocery', name: 'Бакалея' }, { id: 'memory-other', name: 'Прочее' }] }
    data.updatePage(page.id, {
      props: page.props.map(p => p.id === prop.id ? dept : p),
      views: [{ ...page.views[0], layout, groupBy: prop.id, shown: [prop.id] }]
    })
    const coffee = data.addRecord({ pageId: page.id, text: 'Кофе', order: 0, values: { [prop.id]: 'memory-grocery' } })
    const anchor = data.addRecord({ pageId: page.id, text: 'Якорь', order: 1, values: { [prop.id]: 'memory-other' } })
    await data.flush()
    return { page: page.id, prop: prop.id, coffee: coffee.id, anchor: anchor.id }
  }, layout)
  await open(p, `/p/${ids.page}`, false)
  return ids
}

async function remembered(p, ids) {
  await p.waitForFunction(a => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data').pages[a.page].departmentMemory?.[a.prop]?.кофе === 'memory-other', ids)
  const memory = await store(p, (data, a) => data.pages[a.page].departmentMemory?.[a.prop]?.кофе, ids)
  expect(memory === 'memory-other', `manual choice was not remembered: ${memory}`)
}

async function addAndCheck(p, ids, text, expected) {
  const field = p.getByRole('textbox', { name: 'Новая запись', exact: true })
  if (!(await field.isVisible())) await p.locator('[data-add-row]', { hasText: 'Новая запись' }).click()
  await field.fill(text)
  await field.press('Enter')
  await p.waitForFunction(({ page, text }) => Object.values(document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data').records).some(r => r.pageId === page && r.text.toLowerCase() === text.toLowerCase()), { page: ids.page, text })
  const value = await store(p, (data, a) => data.liveRecords.find(r => r.pageId === a.page && r.text.toLowerCase() === a.text.toLowerCase())?.values[a.prop] ?? null, { ...ids, text })
  expect(value === expected, `${text}: expected ${expected}, got ${value}`)
}

async function card(p) {
  const ids = await fixture(p)
  await p.locator(`[data-tree-row="${ids.coffee}"] [data-row-text]`).click()
  await p.waitForURL(/\/r\//)
  await p.locator('[data-record-values]').getByRole('button', { name: 'Отдел: Бакалея' }).click()
  await p.getByRole('button', { name: 'Прочее', exact: true }).click()
  await remembered(p, ids)
  await open(p, `/p/${ids.page}`, false)
  await addAndCheck(p, ids, 'кофе в зёрнах', 'memory-other')
  await store(p, data => data.setSettings({ aiDepartment: false }))
  await addAndCheck(p, ids, 'кофе молотый', null)
}

async function table(p) {
  const ids = await fixture(p, 'table')
  const row = p.locator('[data-phone-table] tbody tr').filter({ hasText: 'Кофе' })
  await row.getByRole('button', { name: /Отдел:/ }).click()
  await p.getByRole('dialog').getByRole('button', { name: 'Прочее' }).click()
  await remembered(p, ids)
}

async function board(p) {
  const ids = await fixture(p, 'board')
  const article = p.locator('article').filter({ hasText: 'Кофе' })
  await article.getByRole('button', { name: 'Действия: Кофе' }).click()
  const action = p.viewportSize().width < 900 ? p.getByRole('dialog', { name: 'Кофе' }).getByRole('button', { name: 'В «Прочее»', exact: true }) : p.getByRole('menuitem', { name: 'В «Прочее»' })
  await action.click()
  await remembered(p, ids)
  await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
  expect(await store(p, (data, a) => data.pages[a.page].departmentMemory?.[a.prop]?.кофе ?? null, ids) === null, 'board undo kept the taught value')
}

async function drag(p, phone) {
  const ids = await fixture(p)
  const row = id => p.locator(`[data-tree-row="${id}"]`)
  if (phone) {
    const source = row(ids.coffee).locator('[data-row-text]')
    await source.scrollIntoViewIfNeeded()
    const a = await source.boundingBox()
    const b = await row(ids.anchor).boundingBox()
    const cdp = await p.context().newCDPSession(p)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x + 40, y: a.y + a.height / 2 }] })
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + 20, y: b.y + 3 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } else {
    await row(ids.coffee).locator('[data-row-text]').focus()
    await p.keyboard.press('Alt+ArrowDown')
  }
  await remembered(p, ids)
}

async function model(p) {
  const ids = await fixture(p)
  await store(p, (data, a) => {
    const rec = data.records[a.coffee]
    const before = rec.values[a.prop]
    data.updateRecord(rec.id, { values: { ...rec.values, [a.prop]: 'memory-other' } })
    data.teachDepartment(rec.id, a.prop, before, 'memory-other')
  }, ids)
  await open(p, '/', false)
  await fakeModel(p, (_line, id) => [{ text: 'Кофе в зёрнах', pageId: id('Покупки'), option: 'Бакалея' }])
  await openField(p)
  await pickPlace(p, 'Покупки')
  await title(p).fill('кофе в зёрнах')
  await p.waitForResponse(res => res.url().includes('/fake-ai/v1/'))
  await p.keyboard.press('Enter')
  await p.waitForFunction(({ page }) => Object.values(document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data').records).some(r => r.pageId === page && r.text === 'Кофе в зёрнах'), ids)
  const value = await store(p, (data, a) => data.liveRecords.find(r => r.pageId === a.page && r.text === 'Кофе в зёрнах')?.values[a.prop], ids)
  expect(value === 'memory-other', `model overrode the manual choice: ${value}`)
}

async function persistence(p) {
  const bucket = fakeBucket()
  await bucket.attach(p.context())
  const ids = await fixture(p)
  await store(p, async (data, a) => {
    const rec = data.records[a.coffee]
    const before = rec.values[a.prop]
    data.updateRecord(rec.id, { values: { ...rec.values, [a.prop]: 'memory-other' } })
    data.teachDepartment(rec.id, a.prop, before, 'memory-other')
    await data.flush()
  }, ids)
  const connected = await p.evaluate(async ({ bucket, keyId, secret }) => {
    const cloud = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('cloud')
    return (await cloud.connect({ bucket, keyId, secret })).ok
  }, { bucket: BUCKET, keyId: KEY_ID, secret: SECRET })
  expect(connected, 'fake bucket did not connect')
  const file = bucket.file()
  expect(file?.pages.find(page => page.id === ids.page)?.departmentMemory?.[ids.prop]?.кофе === 'memory-other', 'bucket lost memory')
  expect(!JSON.stringify(file).includes(SECRET) && !JSON.stringify(file).includes(KEY_ID), 'bucket contains connection fields')
  await p.reload()
  await p.locator('main').waitFor()
  await remembered(p, ids)
  const copy = await store(p, data => JSON.parse(JSON.stringify({ app: 'cerulean', version: 1, exportedAt: 0, ...data.snapshot() })))
  expect(!JSON.stringify(copy).includes(SECRET) && !JSON.stringify(copy).includes(KEY_ID), 'copy contains connection fields')
  await store(p, async (data, copy) => data.importSnapshot(copy), copy)
  await remembered(p, ids)
  const isolated = await store(p, (data) => {
    const other = data.createFromTemplate('shop', { title: 'Другой магазин' })
    return other.departmentMemory ?? null
  })
  expect(isolated === null, 'memory leaked to a different shopping page')
}

export default [
  ...[['phone', MOBILE], ['desktop', DESKTOP]].flatMap(([name, device]) => [
    { id: `mf3-department-memory-${name}-card`, device, run: card },
    { id: `mf3-department-memory-${name}-table`, device, run: table },
    { id: `mf3-department-memory-${name}-board`, device, run: board },
    { id: `mf3-department-memory-${name}-drag`, device, run: p => drag(p, name === 'phone') },
    { id: `mf3-department-memory-${name}-model`, device, run: model },
    { id: `mf3-department-memory-${name}-persistence`, device, run: persistence }
  ])
]
