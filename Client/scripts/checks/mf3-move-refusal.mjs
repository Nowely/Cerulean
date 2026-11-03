import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

export default [
  { id: 'mf3-move-refusal-mixed', device: DESKTOP, run: async (p) => {
    await open(p, '/', false)
    const ids = await store(p, async (data) => {
      const source = data.createPage({ title: 'Источник проверки', props: [
        { id: 'stock-left', name: 'Осталось', type: 'number', normProp: 'stock-norm' },
        { id: 'stock-norm', name: 'Норма', type: 'number' }
      ], stocks: [{ amountProp: 'stock-left', normProp: 'stock-norm', buyViewId: 'buy', stockViewId: 'stock' }] })
      const target = data.createPage({ title: 'Другие запасы', props: [
        { id: 'other-left', name: 'Осталось', type: 'number', normProp: 'other-norm' },
        { id: 'other-norm', name: 'Норма', type: 'number' }
      ], stocks: [{ amountProp: 'other-left', normProp: 'other-norm', buyViewId: 'buy2', stockViewId: 'stock2' }] })
      data.createPage({ title: 'Без запасов' })
      const safe = data.addRecord({ pageId: source.id, text: 'Обычная проверка', tags: ['clarify'] })
      const parent = data.addRecord({ pageId: source.id, text: 'Дерево запаса', tags: ['clarify'] })
      data.addRecord({ pageId: source.id, parentId: parent.id, text: 'Остаток потомка', values: { 'stock-left': 1, 'stock-norm': 4 }, stockUnits: { 'stock-left': 'уп' }, stockBuy: { 'stock-left': true }, note: 'не потерять' })
      data.addEntry({ id: 'check-clarification', at: 1, text: 'уточнить', kind: 'ask', pageId: source.id, recordIds: [safe.id, parent.id], learned: true, note: 'slow' })
      data.teach('проверка', source.id)
      await data.flush()
      return { source: source.id, target: target.id }
    })
    await open(p, `/p/${ids.source}`, false)
    const snapshot = () => store(p, data => JSON.stringify({ pages: data.pages, records: data.records, entries: data.entries, learned: data.learned }))
    const before = await snapshot()
    async function pick(name) {
      await p.locator('[data-row-text]').filter({ hasText: 'Обычная проверка' }).hover()
      await p.getByRole('button', { name: 'Переместить «Обычная проверка»' }).click()
      await p.getByRole('button', { name: new RegExp(name) }).click()
      const notice = p.locator('[data-notice]')
      await notice.getByText('Не удалось переместить: настройки запасов на страницах несовместимы.').waitFor()
      expect(await notice.getByRole('button', { name: 'Отменить' }).count() === 0, 'false success notice appeared')
      expect(await snapshot() === before, `data changed after refusing ${name}`)
    }
    await pick('Другие запасы')
    await pick('Без запасов')
    await p.locator('[data-row-text]').filter({ hasText: 'Обычная проверка' }).hover()
    await p.getByRole('button', { name: 'Переместить «Обычная проверка»' }).click()
    await p.getByRole('textbox', { name: 'Найти страницу' }).fill('Несозданная страница')
    await p.getByRole('button', { name: 'Новая страница «Несозданная страница»' }).click()
    await p.locator('[data-notice]').getByText('Не удалось переместить: настройки запасов на страницах несовместимы.').waitFor()
    expect(await snapshot() === before, 'refusal created a page or changed data')
  } },
  { id: 'mf3-move-refusal-inbox-new', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const inboxId = await store(p, async (data) => {
      const inbox = data.inbox
      data.updatePage(inbox.id, { props: [
        { id: 'inbox-left', name: 'Осталось', type: 'number', normProp: 'inbox-norm' },
        { id: 'inbox-norm', name: 'Норма', type: 'number' }
      ], stocks: [{ amountProp: 'inbox-left', normProp: 'inbox-norm', buyViewId: 'in-buy', stockViewId: 'in-stock' }] })
      const rec = data.addRecord({ pageId: inbox.id, text: 'Входящий запас', tags: ['clarify'], values: { 'inbox-left': 1, 'inbox-norm': 4 } })
      data.addRecord({ pageId: inbox.id, parentId: rec.id, text: 'Потомок входящего', note: 'важная заметка' })
      data.addEntry({ id: 'inbox-check', at: 1, text: 'уточнить', kind: 'ask', pageId: inbox.id, recordIds: [rec.id], note: 'slow' })
      await data.flush()
      return inbox.id
    })
    await open(p, `/p/${inboxId}`, false)
    const snapshot = () => store(p, data => JSON.stringify({ pages: data.pages, records: data.records, entries: data.entries, learned: data.learned }))
    const before = await snapshot()
    await p.getByRole('button', { name: 'Переместить «Входящий запас»' }).click()
    const input = p.locator('[data-places] input')
    await input.fill('страница не создана')
    await input.press('Enter')
    const notice = p.locator('[data-notice]')
    await notice.getByText('Не удалось переместить: настройки запасов на страницах несовместимы.').waitFor()
    expect(await notice.getByRole('button', { name: 'Отменить' }).count() === 0, 'false success notice appeared')
    expect(await snapshot() === before, 'inbox move changed data or created a page before refusal')
  } }
]
