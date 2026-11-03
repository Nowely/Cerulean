import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

async function fixture(p) {
  await open(p, '/', false)
  const ids = await store(p, async (data) => {
    const page = data.createPage({ title: 'Таблица вложенности', hasDone: true, props: [
      { id: 'tree-choice', name: 'Группа', type: 'select', options: [{ id: 'yes', name: 'Да' }, { id: 'no', name: 'Нет' }] },
      { id: 'tree-extra-1', name: 'Дополнение 1', type: 'text' },
      { id: 'tree-extra-2', name: 'Дополнение 2', type: 'text' }
    ] })
    data.updatePage(page.id, { views: [{ ...page.views[0], layout: 'table', sort: 'manual', filter: [{ field: 'done', op: 'is', value: false }], selectFilters: { 'tree-choice': ['yes'] } }] })
    const parent = data.addRecord({ pageId: page.id, text: 'Родитель', order: 1, values: { 'tree-choice': 'yes' } })
    const child = data.addRecord({ pageId: page.id, parentId: parent.id, text: 'Подпункт', order: 1, done: true, values: { 'tree-choice': 'no' } })
    const grandchild = data.addRecord({ pageId: page.id, parentId: child.id, text: 'Внук', order: 1 })
    const deep = data.addRecord({ pageId: page.id, parentId: grandchild.id, text: 'Слишком глубоко' })
    const hidden = data.addRecord({ pageId: page.id, text: 'Другой родитель', order: 2, values: { 'tree-choice': 'no' } })
    const hiddenChild = data.addRecord({ pageId: page.id, parentId: hidden.id, text: 'Скрытый подпункт' })
    const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Жирная заметка', marks: [{ type: 'bold' }] }, { type: 'text', text: ' и ссылка', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }, { type: 'text', text: ' ' }, { type: 'mention', attrs: { id: parent.id, label: 'Родитель', mentionSuggestionChar: '@' } }] }] }
    data.setBody({ kind: 'record', id: child.id }, body)
    await data.flush()
    return { page: page.id, parent: parent.id, child: child.id, grandchild: grandchild.id, deep: deep.id, hidden: hidden.id, hiddenChild: hiddenChild.id, body }
  })
  await open(p, `/p/${ids.page}`, false)
  await p.locator('[data-phone-table] tbody tr').first().waitFor()
  return ids
}

const table = p => p.locator('[data-phone-table]')
const row = (p, name) => table(p).locator('tbody tr').filter({ has: p.getByRole('button', { name, exact: true }) })

async function treeCheck(p) {
  const ids = await fixture(p)
  const rows = table(p).locator('tbody tr')
  expect(JSON.stringify(await rows.locator('td:first-child > div > button:last-child').allTextContents()) === JSON.stringify(['Родитель', 'Подпункт', 'Внук']), 'tree order, filter or depth is incorrect')
  const offsets = await rows.locator('td:first-child > div').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).paddingLeft)))
  expect(JSON.stringify(offsets) === '[0,20,40]', `indentation: ${offsets}`)
  expect((await row(p, 'Подпункт').getByRole('button', { name: 'Подпункт', exact: true }).getAttribute('class')).includes('line-through'), 'done child is not struck through')
  const scroller = table(p)
  const before = await row(p, 'Внук').locator('td').evaluateAll(cells => cells.slice(0, 2).map(c => c.getBoundingClientRect().left))
  await scroller.evaluate(el => el.scrollLeft = 300)
  const after = await row(p, 'Внук').locator('td').evaluateAll(cells => cells.slice(0, 2).map(c => c.getBoundingClientRect().left))
  expect(Math.abs(after[0] - before[0]) < 1 && after[1] < before[1] - 50, `sticky column: ${before} → ${after}`)
  await scroller.evaluate(el => el.scrollLeft = 0)
  await row(p, 'Подпункт').getByRole('checkbox').click()
  expect(await row(p, 'Подпункт').getByRole('checkbox').getAttribute('aria-checked') === 'false', 'child toggle failed')
  await p.waitForTimeout(1800)
  expect(await row(p, 'Подпункт').count() === 1 && await row(p, 'Внук').count() === 1, 'child vanished after toggle')
  expect(JSON.stringify(await store(p, (data, id) => data.records[id].body, ids.child)) === JSON.stringify(ids.body), 'toggling changed rich body')
  await row(p, 'Внук').getByRole('button', { name: 'Внук', exact: true }).click()
  await p.waitForURL(new RegExp(`/r/${ids.grandchild}`))
}

async function previewCheck(p) {
  const ids = await fixture(p)
  await p.getByRole('link', { name: 'Главная' }).first().click()
  await p.waitForURL(u => new URL(u).pathname === '/')
  await p.getByRole('link', { name: /Таблица вложенности/ }).waitFor()
  await p.waitForTimeout(300)
  await p.evaluate(id => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push({ query: { peek: `p:${id}` } }), ids.page)
  const preview = p.getByRole('dialog', { name: 'Превью' })
  await preview.getByRole('button', { name: 'Подпункт', exact: true }).waitFor()
  expect(await preview.getByRole('button', { name: 'Новое свойство' }).count() === 0, 'preview allows adding properties')
  expect(await preview.locator('[data-phone-table] input, [data-phone-table] textarea, [data-phone-table] [contenteditable="true"]').count() === 0, 'preview exposes an editor')
  await preview.getByRole('checkbox', { name: 'Отметить «Подпункт»' }).click()
  expect(await preview.getByRole('checkbox', { name: 'Отметить «Подпункт»' }).getAttribute('aria-checked') === 'false', 'preview cannot tick child')
  await preview.getByRole('button', { name: 'Подпункт', exact: true }).click()
  await p.getByRole('dialog', { name: 'Превью' }).getByText('Жирная заметка', { exact: false }).first().waitFor()
  expect(JSON.stringify(await store(p, (data, id) => data.records[id].body, ids.child)) === JSON.stringify(ids.body), 'opening preview changed rich body')
}

async function filterCheck(p) {
  const ids = await fixture(p)
  await row(p, 'Подпункт').getByRole('button', { name: /Группа:/ }).click()
  await p.getByRole('dialog').getByRole('button', { name: 'Да', exact: true }).click()
  await row(p, 'Подпункт').getByRole('button', { name: 'Группа: Да — Подпункт' }).waitFor()
  await store(p, (data, ids) => {
    const page = data.pages[ids.page]
    data.addRecord({ pageId: ids.page, text: 'А родитель', values: { 'tree-choice': 'yes' } })
    data.updatePage(ids.page, { views: [{ ...page.views[0], sort: 'name' }] })
  }, ids)
  const names = () => table(p).locator('tbody tr td:first-child > div > button:last-child').allTextContents()
  expect(JSON.stringify(await names()) === JSON.stringify(['А родитель', 'Родитель', 'Подпункт', 'Внук']), 'sort detached children from their parent')
  await store(p, (data, ids) => data.updateRecord(ids.parent, { values: { 'tree-choice': 'no' } }), ids)
  expect(JSON.stringify(await names()) === JSON.stringify(['А родитель']), 'filtered parent or its children remained visible')
}

async function collectingCheck(p) {
  const ids = await fixture(p)
  await store(p, (data, ids) => {
    const page = data.pages[ids.page]
    data.updatePage(page.id, { views: [{ ...page.views[0], from: 'pick', pages: [page.id], filter: [], selectFilters: {} }] })
  }, ids)
  const rows = table(p).locator('tbody tr')
  await row(p, 'Слишком глубоко').waitFor()
  expect(await rows.count() === 6, `collecting rows changed: ${await rows.count()}`)
  const offsets = await rows.locator('td:first-child > div').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).paddingLeft)))
  expect(offsets.every(offset => offset === 0), `collecting view is not flat: ${offsets}`)
}

async function noteCheck(p) {
  const ids = await fixture(p)
  const child = row(p, 'Подпункт')
  const neighbour = await store(p, (data, id) => JSON.stringify(data.records[id]), ids.parent)
  const before = await child.boundingBox()
  await child.getByRole('button', { name: 'Заметка: изменить «Подпункт»' }).click()
  const editor = child.getByRole('textbox', { name: 'Заметка — Подпункт' })
  await editor.waitFor()
  await p.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Заметка — Подпункт')
  expect(await editor.locator('strong').count() === 1 && await editor.locator('a[href="https://example.com"]').count() === 1 && await editor.locator(`[data-type="mention"][data-id="${ids.parent}"]`).count() === 1, 'rich note did not open in the cell')
  await p.keyboard.press('Enter')
  await p.keyboard.insertText('Новая строка')
  expect((await child.boundingBox()).height > before.height, 'editing did not expand the row')
  await editor.evaluate((root) => {
    const text = root.querySelector('p:last-child').firstChild
    const selection = window.getSelection()
    selection.setBaseAndExtent(text, 0, text, text.textContent.length)
  })
  expect(await p.evaluate(() => window.getSelection()?.toString()) === 'Новая строка', 'text selection failed')
  const scrollBefore = await table(p).evaluate(el => el.scrollLeft)
  await table(p).evaluate((el) => {
    el.scrollLeft -= 40
  })
  expect(await table(p).evaluate(el => el.scrollLeft) < scrollBefore, 'table did not scroll while editing')
  expect(await p.evaluate(() => window.getSelection()?.toString()) === 'Новая строка', 'scroll lost the selection')
  await p.getByRole('toolbar', { name: 'Текст' }).getByRole('button', { name: 'Курсив' }).click()
  expect(await editor.locator('em').count() === 1, 'formatting bar did not apply to the selection')
  await p.keyboard.press('Escape')
  await child.getByRole('button', { name: 'Заметка: изменить «Подпункт»' }).waitFor()
  const saved = await store(p, (data, id) => ({ body: data.records[id].body, mentions: data.records[id].mentions }), ids.child)
  const paragraph = saved.body.content[0].content
  expect(paragraph.some(n => n.text === 'Жирная заметка' && n.marks?.some(m => m.type === 'bold')), 'bold was lost')
  expect(paragraph.some(n => n.text === ' и ссылка' && n.marks?.some(m => m.type === 'link' && m.attrs.href === 'https://example.com')), 'link was lost')
  expect(paragraph.some(n => n.type === 'mention' && n.attrs.id === ids.parent) && saved.mentions.includes(ids.parent), 'mention was lost')
  expect(saved.body.content[1].content[0].text === 'Новая строка' && saved.body.content[1].content[0].marks?.some(m => m.type === 'italic'), 'Enter or formatting save failed')
  expect(await store(p, (data, id) => JSON.stringify(data.records[id]), ids.parent) === neighbour, 'editing changed a neighbouring record')
  await child.getByRole('button', { name: 'Заметка: изменить «Подпункт»' }).click()
  await editor.waitFor()
  await p.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Заметка — Подпункт')
  await p.keyboard.press('Tab')
  await child.getByRole('button', { name: 'Заметка: изменить «Подпункт»' }).waitFor()
  expect(await p.evaluate(() => document.activeElement !== document.body && !document.activeElement?.matches('[contenteditable="true"]')), 'Tab lost focus or kept it in the editor')
  await p.reload()
  await row(p, 'Подпункт').getByRole('button', { name: 'Заметка: изменить «Подпункт»' }).waitFor()
  expect(JSON.stringify(await store(p, (data, id) => data.records[id].body, ids.child)) === JSON.stringify(saved.body), 'rich body did not survive reload')
  await row(p, 'Внук').getByRole('button', { name: 'Внук', exact: true }).click()
  await p.waitForURL(new RegExp(`/r/${ids.grandchild}`))
}

async function noteBlurCheck(p) {
  const ids = await fixture(p)
  const parent = row(p, 'Родитель')
  const child = row(p, 'Подпункт')
  await parent.getByRole('button', { name: 'Заметка: изменить «Родитель»' }).focus()
  await p.keyboard.press('Enter')
  await p.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Заметка — Родитель')
  await p.keyboard.insertText('Первая заметка')
  await child.getByRole('button', { name: 'Заметка: изменить «Подпункт»' }).click()
  await p.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Заметка — Подпункт')
  expect(await store(p, (data, id) => data.records[id].body?.content[0]?.content[0]?.text, ids.parent) === 'Первая заметка', 'switching cells lost the first note')
  await p.keyboard.press('Enter')
  await p.keyboard.insertText('Вторая заметка')
  await row(p, 'Внук').getByRole('checkbox').click()
  await child.getByRole('button', { name: 'Заметка: изменить «Подпункт»' }).waitFor()
  const saved = await store(p, (data, id) => data.records[id].body, ids.child)
  expect(saved.content[1]?.content[0]?.text === 'Вторая заметка', 'clicking outside lost the second note')
}

async function notePreviewCheck(p) {
  const ids = await fixture(p)
  await p.getByRole('link', { name: 'Главная' }).first().click()
  await p.waitForURL(u => new URL(u).pathname === '/')
  await p.getByRole('link', { name: /Таблица вложенности/ }).waitFor()
  await p.waitForTimeout(300)
  await p.evaluate(id => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push({ query: { peek: `p:${id}` } }), ids.page)
  const preview = p.getByRole('dialog', { name: 'Превью' })
  const note = preview.getByRole('button', { name: 'Заметка: открыть «Подпункт»' })
  await note.waitFor()
  expect(await preview.locator('[data-phone-table] [contenteditable="true"]').count() === 0, 'preview table exposes note editing')
  await note.click()
  await p.waitForURL(u => new URL(u).searchParams.get('peek') === `r:${ids.child}`)
  await preview.getByText('Жирная заметка', { exact: false }).first().waitFor()
  expect(JSON.stringify(await store(p, (data, id) => data.records[id].body, ids.child)) === JSON.stringify(ids.body), 'preview changed rich body')
}

export default [
  { id: 'mf3-table-subitems-phone-light', device: MOBILE, run: treeCheck },
  { id: 'mf3-table-subitems-phone-dark', device: { ...MOBILE, colorScheme: 'dark' }, run: treeCheck },
  { id: 'mf3-table-subitems-desktop-light', device: DESKTOP, run: treeCheck },
  { id: 'mf3-table-subitems-desktop-dark', device: { ...DESKTOP, colorScheme: 'dark' }, run: treeCheck },
  { id: 'mf3-table-subitems-preview', device: MOBILE, run: previewCheck },
  { id: 'mf3-table-subitems-filter-sort', device: MOBILE, run: filterCheck },
  { id: 'mf3-table-subitems-collecting', device: DESKTOP, run: collectingCheck },
  { id: 'mf3-table-subitems-rich-note-phone', device: MOBILE, run: noteCheck },
  { id: 'mf3-table-subitems-rich-note-desktop', device: DESKTOP, run: noteCheck },
  { id: 'mf3-table-subitems-note-blur-phone', device: MOBILE, run: noteBlurCheck },
  { id: 'mf3-table-subitems-note-blur-desktop', device: DESKTOP, run: noteBlurCheck },
  { id: 'mf3-table-subitems-note-preview', device: MOBILE, run: notePreviewCheck }
]
