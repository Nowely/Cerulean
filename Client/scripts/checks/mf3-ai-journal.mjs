import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { fakeModel, first, openField, title } from './main-flow.mjs'

async function journalCheck(p) {
  await first(p)
  await fakeModel(p, (_line, id) => [{ text: 'Молоко', pageId: id('Покупки') }, { text: 'Позвонить маме', pageId: id('Задачи') }], 1200)
  await open(p, '/journal', false)
  const field = p.getByRole('textbox', { name: 'Новая запись', exact: true })
  await field.fill('молоко и позвонить маме')
  const request = p.waitForRequest(r => r.url().includes('/fake-ai/v1/'))
  await p.keyboard.press('Enter')
  await request
  await field.fill('следующая запись')
  await store(p, data => data.setSettings({ aiRoute: false, aiSplit: false, aiDepartment: false }))
  await p.waitForFunction(() => {
    const data = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data')
    return data.entries.some(e => e.text === 'молоко и позвонить маме' && e.kind === 'routed')
  })
  const result = await store(p, (data) => {
    const entry = data.entries.find(e => e.text === 'молоко и позвонить маме')
    return { records: entry.recordIds.map(id => data.records[id]), inbox: data.inbox.id }
  })
  expect(result.records.length === 1, 'journal: split switch ignored')
  expect(result.records[0].pageId === result.inbox, 'journal: route switch ignored')
  expect(result.records[0].text.toLowerCase().includes('позвонить маме'), 'journal: text lost')
  expect(await field.innerText() === 'следующая запись', 'journal: next text overwritten')
  expect(await p.locator('article').filter({ hasText: 'молоко и позвонить маме' }).count() === 1, 'journal: receipt missing')
}

async function lateCheck(p, manual) {
  await first(p)
  await fakeModel(p, (_line, id) => [{ text: 'Молоко', pageId: id('Покупки') }, { text: 'Позвонить маме', pageId: id('Задачи') }], 1200)
  await openField(p)
  await title(p).fill('молоко с доставкой')
  const request = p.waitForRequest(r => r.url().includes('/fake-ai/v1/'))
  const response = p.waitForResponse(r => r.url().includes('/fake-ai/v1/'))
  await p.keyboard.press('Enter')
  await request
  const before = await store(p, (data) => {
    const entry = data.entries.find(e => e.text === 'молоко с доставкой')
    return entry.recordIds.map(id => ({ id, pageId: data.records[id].pageId }))
  })
  await store(p, (data, args) => {
    data.setSettings({ aiRoute: false, aiSplit: false, aiDepartment: false })
    if (args.manual) data.updateRecord(args.id, { text: 'Моя ручная правка' })
  }, { manual, id: before[0].id })
  await title(p).fill('следующая запись')
  await response
  await p.waitForTimeout(300)
  const after = await store(p, (data, ids) => ids.map(id => data.records[id]), before.map(r => r.id))
  expect(after.every((r, i) => r && r.pageId === before[i].pageId), 'late: moved or deleted an existing record')
  if (manual) expect(after[0].text === 'Моя ручная правка', 'late: overwrote manual edit')
  expect(await title(p).innerText() === 'следующая запись', 'late: next text overwritten')
}

async function noKeyCheck(p) {
  await first(p)
  await open(p, '/journal', false)
  const field = p.getByRole('textbox', { name: 'Новая запись', exact: true })
  for (const text of ['молоко, молоко', 'молоко']) {
    await field.fill(text)
    await p.keyboard.press('Enter')
  }
  await p.waitForFunction(() => {
    const data = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data')
    return data.entries.filter(e => e.kind === 'routed').length === 2
  })
  const ids = await store(p, data => data.entries.flatMap(e => e.recordIds ?? []))
  expect(ids.length === 3 && new Set(ids).size === 3, 'no key: duplicate items did not create new records')
  expect(await p.locator('article').count() === 2, 'no key: receipts missing')
}

export default [
  ...[MOBILE, DESKTOP].flatMap((device, i) => [
    { id: `mf3-ai-journal-${i ? 'desktop' : 'phone'}`, device, run: journalCheck },
    { id: `mf3-ai-journal-no-key-${i ? 'desktop' : 'phone'}`, device, run: noKeyCheck },
    { id: `mf3-ai-journal-late-${i ? 'desktop' : 'phone'}`, device, run: p => lateCheck(p, false) },
    { id: `mf3-ai-journal-manual-${i ? 'desktop' : 'phone'}`, device, run: p => lateCheck(p, true) }
  ])
]
