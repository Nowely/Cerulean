import { BASE, DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

const fieldTitle = p => p.getByRole('textbox', { name: 'Запись', exact: true })
const addInput = p => p.locator('[data-add-line] input')

async function setup(p, done, multiple = false) {
  await open(p, '/', false)
  return store(p, (data, args) => {
    const page = data.livePages.find(p => p.template === 'shop')
    const stock = page.stocks[0]
    const qty = page.props.find(p => p.name === 'Количество')
    const rec = data.addRecord({ pageId: page.id, text: 'Молоко', done: args.done, doneAt: args.done ? 123 : undefined, values: { [stock.amountProp]: 5, [stock.normProp]: 5, custom: 'рынок' }, stockUnits: { [stock.amountProp]: 'л' }, note: 'Старая заметка', links: ['fake-link'] })
    const child = data.addRecord({ pageId: page.id, parentId: rec.id, text: 'подпункт' })
    const second = args.multiple ? data.addRecord({ pageId: page.id, text: 'Молоко', done: true, values: { [stock.amountProp]: 3, [stock.normProp]: 5 } }) : undefined
    return { page: page.id, rec: rec.id, child: child.id, second: second?.id, qty: qty.id, before: JSON.stringify(rec), childBefore: JSON.stringify(child), secondBefore: second && JSON.stringify(second) }
  }, { done, multiple })
}

async function state(p, info) {
  return store(p, (data, ids) => ({ rec: JSON.stringify(data.records[ids.rec]), child: JSON.stringify(data.records[ids.child]), second: ids.second && JSON.stringify(data.records[ids.second]), rows: Object.values(data.records).filter(r => r.pageId === ids.page && !r.parentId).map(r => ({ id: r.id, text: r.text, values: r.values })) }), info)
}

async function assertNew(p, info, beforeIds, qty) {
  const result = await state(p, info)
  const added = result.rows.filter(r => !beforeIds.includes(r.id))
  expect(added.length === 1 && added[0].text === 'Молоко', `expected one new milk record: ${JSON.stringify(result.rows)}`)
  if (qty) expect(added[0].values[info.qty] === '2 л', 'quantity was not parsed')
  expect(result.rec === info.before && result.child === info.childBefore && result.second === info.secondBefore, 'existing stock or its child changed')
  expect(!(await p.getByRole('dialog').count()), 'a comparison dialog appeared')
  return added[0].id
}

async function undo(p, info, id, text) {
  await p.getByRole('button', { name: 'Отменить', exact: true }).click()
  const result = await state(p, info)
  expect(!result.rows.some(r => r.id === id) && result.rec === info.before && result.child === info.childBefore && result.second === info.secondBefore, 'undo removed or changed an existing record')
  const restored = await fieldTitle(p).innerText()
  expect(restored === text, `undo restored ${restored} instead of ${text}`)
}

async function chooseField(p) {
  await p.locator('[data-field="closed"] button').nth(1).click()
  await p.locator('[data-chip="main"]').click()
  await p.locator('[data-places]').getByRole('button', { name: 'Покупки', exact: true }).click()
}

async function choosePage(p, info) {
  await p.locator('[data-home] [role="listitem"]').filter({ has: p.locator('[data-name]', { hasText: /^Покупки$/ }) }).locator('a').click()
  await p.waitForURL(`**/p/${info.page}`)
  await p.locator('[data-add-row]', { hasText: 'Новая запись' }).click()
}

function checks(device, desktop) {
  const prefix = `mf3-stock-new-input-${desktop ? 'desktop' : 'phone'}`
  return [
    ...['field', 'addrow'].flatMap(mode => [true, false].map(done => ({ id: `${prefix}-${mode}-${done ? 'bought' : 'full'}`, device, run: async (p) => {
      const info = await setup(p, done, true)
      const initial = await state(p, info)
      const beforeIds = initial.rows.map(r => r.id)
      if (mode === 'field') await chooseField(p)
      else await choosePage(p, info)
      const input = mode === 'field' ? fieldTitle(p) : addInput(p)
      for (const text of ['Молоко 2 л', 'Молоко']) {
        await input.fill(text)
        await input.press('Enter')
        if (mode === 'field') {
          const notice = p.locator('[data-notice]:visible')
          await notice.getByText('Добавлено в Покупки', { exact: true }).waitFor()
          expect(!(await notice.innerText()).includes('снова'), 'notice incorrectly says an existing item was returned')
        }
        const id = await assertNew(p, info, beforeIds, text.includes('2'))
        if (mode === 'field') await undo(p, info, id, text)
        else {
          await p.locator(`[data-rows] [data-drag-id="${id}"]`).waitFor({ state: 'visible' })
          expect(!(await p.locator('[data-notice]:visible').count()), 'adding on the current page showed a notice')
          expect(await addInput(p).inputValue() === '', 'Enter did not open an empty next line')
          beforeIds.push(id)
        }
      }
      if (mode === 'addrow') {
        await input.press('Enter')
        expect(await p.locator('[data-add-row]', { hasText: 'Новая запись' }).isVisible(), 'empty Enter did not close the line')
        await p.locator('[data-add-row]', { hasText: 'Новая запись' }).click()
        await input.fill('Не сохранять')
        await input.press('Escape')
        expect(!(await state(p, info)).rows.some(r => r.text === 'Не сохранять'), 'Escape wrote a record')
        await p.locator('[data-add-row]', { hasText: 'Новая запись' }).click()
        await input.fill('Хлеб')
        await input.press('Tab')
        expect((await state(p, info)).rows.some(r => r.text === 'Хлеб'), 'Tab did not save the line on blur')
        expect(!(await p.locator('[data-notice]:visible').count()), 'adding on blur showed a notice')
      }
    } }))),
    { id: `${prefix}-field-late-model`, device, run: async (p) => {
      const info = await setup(p, true)
      const initial = await state(p, info)
      await p.route('**/fake-stock-new/v1/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 800))
        await route.fulfill({ json: { id: 'fake', object: 'chat.completion', created: 0, model: 'test', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ kind: 'record', items: [{ text: 'Йогурт', pageId: info.page, note: '', date: null, time: null, qty: null, option: null }] }) } }] } })
      })
      await store(p, (data, base) => data.setSettings({ provider: 'custom', baseUrl: base, modelId: 'test', apiKey: 'fake-key', keyState: 'ok', rulesFirst: false }), `${BASE}/fake-stock-new/v1`)
      await chooseField(p)
      await fieldTitle(p).fill('Молоко')
      await fieldTitle(p).press('Enter')
      const id = await assertNew(p, info, initial.rows.map(r => r.id), false)
      await p.waitForFunction(({ id }) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data').records[id]?.text === 'Йогурт', { id })
      const result = await state(p, info)
      expect(result.rec === info.before && result.child === info.childBefore && result.rows.some(r => r.id === id && r.text === 'Йогурт'), 'late model changed the original or lost the new id')
      await undo(p, info, id, 'Молоко')
    } }
  ]
}

const pageField = [true, false].map(done => ({
  id: `mf3-stock-new-input-phone-page-field-${done ? 'bought' : 'full'}`,
  device: MOBILE,
  run: async (p) => {
    const info = await setup(p, done, true)
    const beforeIds = (await state(p, info)).rows.map(r => r.id)
    await p.locator('[data-home] [role="listitem"]').filter({ has: p.locator('[data-name]', { hasText: /^Покупки$/ }) }).locator('a').click()
    await p.waitForURL(`**/p/${info.page}`)
    await p.locator('[data-field="closed"] button').nth(1).click()
    await fieldTitle(p).fill('Молоко 2 л')
    await fieldTitle(p).press('Enter')
    const id = await assertNew(p, info, beforeIds, true)
    await p.locator(`[data-rows] [data-drag-id="${id}"]`).waitFor({ state: 'visible' })
  }
}))

export default [...checks(MOBILE, false), ...checks(DESKTOP, true), ...pageField]
