import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../../Client/package.json', import.meta.url))
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.MOCKUP_URL || 'http://127.0.0.1:8765'
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const errors = []
page.on('pageerror', error => errors.push(error.message))
let run = 0

async function open(state) {
  await page.goto(`${origin}/prototype.html?check=${state}-${++run}#${state}`)
  await page.locator('.app').waitFor()
}

const tab = name => page.getByRole('tab', { name, exact: true })
const row = name => page.locator('.li[data-rid]').filter({ hasText: name }).first()
const tableRow = name => page.locator('.tvr[data-rid]').filter({ hasText: name }).first()
const dialog = () => page.getByRole('dialog', { name: 'Осталось' })

async function fillStock(have, need, unit) {
  await dialog().getByLabel('Осталось', { exact: true }).fill(have)
  await dialog().getByLabel('Норма', { exact: true }).fill(need)
  await dialog().getByLabel('Единица', { exact: true }).fill(unit)
  await dialog().getByRole('button', { name: 'Готово' }).click()
}

async function editTable(name, have, need, unit) {
  await tableRow(name).locator('.w-stock button').click()
  await fillStock(have, need, unit)
}

try {
  await open('i3stocksetup')
  const beforeTabs = await page.locator('[role="tab"]').allTextContents()
  const beforeRows = await page.locator('.li[data-rid] .litn').allTextContents()
  await tab('Купить').click()
  await page.getByRole('button', { name: 'Включить запасы' }).click()
  const setup = page.getByRole('dialog', { name: 'Включить запасы' })
  await setup.getByRole('button', { name: 'Отмена' }).click()
  assert.deepEqual(await page.locator('[role="tab"]').allTextContents(), beforeTabs)
  await tab('Купить').click()
  await page.getByRole('button', { name: 'Включить запасы' }).click()
  await setup.getByRole('button', { name: 'Включить', exact: true }).click()
  assert.deepEqual(await page.locator('[role="tab"]').allTextContents(), [...beforeTabs, 'Запасы'])
  assert.deepEqual(await page.locator('.li[data-rid] .litn').allTextContents(), beforeRows)
  await tab('Запасы').click()
  assert.equal(await page.locator('.li[data-rid]').count(), 0)
  await tab('Купить').click()
  await row('Кола').locator('.lit').click()
  await page.getByRole('button', { name: 'Добавить свойство' }).click()
  await page.getByRole('button', { name: 'Осталось', exact: true }).click()
  await dialog().getByLabel('Осталось', { exact: true }).fill('ошибка')
  await dialog().getByRole('button', { name: 'Готово' }).click()
  assert.match(await dialog().getByRole('alert').innerText(), /Укажите остаток и норму/)
  await fillStock('0,5', '2', 'л')
  assert.match(await page.locator('.rchips').innerText(), /0,5 из 2 л/)
  await page.locator('.backb').click()
  await tab('Запасы').click()
  assert.match(await row('Кола').innerText(), /0,5\/2 л/)

  await open('i3stockedit')
  await dialog().getByLabel('Осталось', { exact: true }).fill('8')
  await dialog().getByRole('button', { name: 'Отмена' }).click()
  assert.match(await page.locator('.rchips').innerText(), /3 из 5 шт/)

  await open('i3stocktable')
  await editTable('Кола', '0,5', '2', 'л')
  assert.equal(await tableRow('Кола').locator('.w-stock button').innerText(), '0,5/2 л')
  assert.equal(await tableRow('Йогурт').locator('.w-stock button').innerText(), '2/5')
  await tableRow('Кола').locator('.tvn').click()
  assert.match(await page.locator('.rchips').innerText(), /0,5 из 2 л/)
  await page.locator('.backb').click()
  await tab('Запасы').click()
  assert.match(await row('Кола').innerText(), /0,5\/2 л/)

  for (const [have, need, low] of [['1', '1', false], ['0', '1', true], ['1', '5', true], ['0,5', '2', true], ['0,5', '0,5', false]]) {
    await tab('Таблица').click()
    await editTable('Кола', have, need, 'шт')
    assert.equal(await tableRow('Кола').locator('.w-stock').evaluate(el => el.classList.contains('low')), low, `${have}/${need}`)
    await tab('Купить').click()
    assert.equal(await row('Кола').count() > 0, low, `${have}/${need} on Купить`)
  }

  await tab('Таблица').click()
  await editTable('Кола', '0', '1', 'шт')
  await tab('Купить').click()
  await row('Кола').locator('.chk').click()
  await row('Кола').waitFor({ state: 'detached', timeout: 3000 })
  await tab('Запасы').click()
  assert.match(await row('Кола').innerText(), /1\/1/)
  await tab('Купить').click()
  assert.equal(await row('Кола').count(), 0)

  await open('i3stocktable')
  await editTable('Кола', '5', '5', 'шт')
  await tab('Купить').click()
  assert.equal(await row('Кола').count(), 0)
  await page.locator('.addr').click()
  await page.locator('#f-add').fill('кола')
  await page.locator('#f-add').press('Enter')
  assert.equal(await row('Кола').count(), 1)
  assert.match(await row('Кола').innerText(), /5\/5/)
  await page.locator('.toast').getByRole('button', { name: 'Отменить' }).click()
  assert.equal(await row('Кола').count(), 0)
  await tab('Запасы').click()
  assert.equal(await row('Кола').count(), 1)
  assert.match(await row('Кола').innerText(), /5\/5/)
  assert.equal(await row('Кола').locator('.chk').getAttribute('aria-pressed'), 'false')

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  desktop.on('pageerror', error => errors.push(error.message))
  await desktop.goto(`${origin}/prototype.html#deski3update`)
  await desktop.locator('.lit').filter({ hasText: 'Хлеб' }).click()
  await desktop.locator('.rchips .rpl').click()
  const deskEditor = desktop.getByRole('dialog', { name: 'Осталось' })
  await deskEditor.getByLabel('Норма', { exact: true }).fill('3')
  await deskEditor.getByRole('button', { name: 'Готово' }).click()
  assert.match(await desktop.locator('.rchips').innerText(), /1 из 3 шт/)
  await desktop.close()

  const canvas = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  canvas.on('pageerror', error => errors.push(error.message))
  await canvas.goto(`${origin}/#I3StockEdit.dc.html`)
  const frame = canvas.frameLocator('#board-frame')
  const canvasDialog = frame.getByRole('dialog', { name: 'Осталось' })
  await canvasDialog.getByLabel('Осталось', { exact: true }).fill('0,5')
  await canvasDialog.getByLabel('Норма', { exact: true }).fill('2')
  await canvasDialog.getByLabel('Единица', { exact: true }).fill('л')
  await canvasDialog.getByRole('button', { name: 'Готово' }).click()
  assert.match(await frame.locator('.rchips').innerText(), /0,5 из 2 л/)
  await canvas.selectOption('#theme', 'dark')
  assert.equal(await frame.locator('.t-dark').count() > 0, true)
  const boards = await canvas.evaluate(() => fetch('project/canvas.json').then(r => r.json()).then(c => c.order.filter(f => c.boards[f].page === 'i3big')))
  assert.equal(boards.length, 24)
  for (const board of boards) {
    await canvas.selectOption('#board', board)
    await canvas.waitForFunction(file => document.querySelector('#board-frame').contentWindow.location.pathname.endsWith('/' + file), board)
    await frame.locator('.app').waitFor()
  }
  await canvas.close()

  const walk = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  walk.on('pageerror', error => errors.push(error.message))
  await walk.goto(`${origin}/prototype.html#first`)
  await walk.locator('.app').waitFor()
  const states = await walk.locator('#st option').evaluateAll(options => options.map(option => option.value))
  assert.equal(states.length, 93)
  for (const state of states) {
    await walk.evaluate(value => { location.hash = value }, state)
    await walk.waitForFunction(value => document.querySelector('#st').value === value && !!document.querySelector('.app'), state)
  }
  await walk.close()

  assert.deepEqual(errors, [])
  console.log('ok: stock setup, editor, table, low threshold, refill, re-entry, desktop, 24 Canvas boards and 93 prototype states')
} finally {
  await browser.close()
}
