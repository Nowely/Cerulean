import { DESKTOP, MOBILE, expect, open, store } from './lib.mjs'

async function makeTree(p) {
  await open(p, '/', false)
  const ids = await store(p, async (data) => {
    const page = data.createPage({ title: 'Проверка дерева' })
    const parent = data.addRecord({ pageId: page.id, text: 'Покрасить стены', order: 0, addedAt: 1 })
    const child = data.addRecord({ pageId: page.id, parentId: parent.id, text: 'Замерить стены', order: 0, addedAt: 1 })
    const deepest = data.addRecord({ pageId: page.id, parentId: child.id, text: 'Третий уровень', order: 0, addedAt: 1 })
    const moving = data.addRecord({ pageId: page.id, text: 'Купить краску', order: 1, addedAt: 1 })
    const movingChild = data.addRecord({ pageId: page.id, parentId: moving.id, text: 'Выбрать оттенок', order: 0, addedAt: 1 })
    const last = data.addRecord({ pageId: page.id, text: 'Последняя запись', order: 2, addedAt: 1 })
    for (let i = 0; i < 25; i++) data.addRecord({ pageId: page.id, text: `Строка ${i}`, order: i + 3, addedAt: 1 })
    await data.flush()
    return { page: page.id, parent: parent.id, child: child.id, deepest: deepest.id, moving: moving.id, movingChild: movingChild.id, last: last.id }
  })
  await open(p, `/p/${ids.page}`, false)
  return ids
}

const row = (p, id) => p.locator(`[data-tree-row="${id}"]`)
async function touch(p, id) {
  const el = row(p, id).locator('[data-row-text]')
  await el.scrollIntoViewIfNeeded()
  const box = await el.boundingBox()
  const cdp = await p.context().newCDPSession(p)
  const point = { x: box.x + Math.min(80, box.width / 2), y: box.y + box.height / 2 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  return { cdp, point }
}
const move = (cdp, point) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
const end = cdp => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

export default [
  { id: 'mf3-tree-hold-menu', device: MOBILE, run: async (p) => {
    const ids = await makeTree(p)
    await p.evaluate(() => {
      window.__treeVibrations = []
      Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (n) => {
        window.__treeVibrations.push(n)
        return true
      } })
    })
    let finger = await touch(p, ids.moving)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    expect(await p.locator('[data-record-hold-veil]').count() === 1, 'veil missing during hold')
    await end(finger.cdp)
    await p.getByRole('menuitem', { name: 'Вложить в «Покрасить стены»' }).waitFor()
    expect(new URL(p.url()).pathname === `/p/${ids.page}`, 'holding opened the record')
    await p.getByRole('button', { name: 'Закрыть меню записи' }).click({ position: { x: 5, y: 5 } })
    finger = await touch(p, ids.moving)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    await end(finger.cdp)
    expect(JSON.stringify(await p.evaluate(() => window.__treeVibrations)) === '[10,10]', 'a repeated hold did not request both haptic ticks')
    await p.getByRole('menuitem', { name: 'Вложить в «Покрасить стены»' }).click()
    expect(await store(p, (data, ids) => data.records[ids.moving].parentId === ids.parent, ids), 'menu nesting failed')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    await row(p, ids.moving).getByRole('checkbox').click()
    expect(await store(p, (data, id) => data.records[id].done, ids.moving), 'checkbox did not work')
    await row(p, ids.moving).getByRole('checkbox').click()
    const scrollTop = () => row(p, ids.moving).evaluate((el) => {
      for (let n = el.parentElement; n; n = n.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight) return n.scrollTop
      return window.scrollY
    })
    const before = await scrollTop()
    const scroll = await touch(p, ids.moving)
    for (let i = 1; i <= 10; i++) {
      await move(scroll.cdp, { x: scroll.point.x, y: scroll.point.y - i * 12 })
      await p.waitForTimeout(16)
    }
    await end(scroll.cdp)
    await p.waitForTimeout(450)
    expect(await p.locator('[data-record-hold]').count() === 0, 'scroll opened a hold menu')
    expect(await scrollTop() > before, 'ordinary vertical scroll did not move the list')
  } },
  { id: 'mf3-tree-hold-drag', device: MOBILE, run: async (p) => {
    const ids = await makeTree(p)
    const original = await store(p, (data, ids) => ({ parent: data.records[ids.moving].parentId, order: data.records[ids.moving].order, child: data.records[ids.movingChild].parentId, childOrder: data.records[ids.movingChild].order }), ids)
    let finger = await touch(p, ids.moving)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    let box = await row(p, ids.parent).boundingBox()
    await move(finger.cdp, { x: box.x + 120, y: box.y + box.height / 2 })
    expect(await row(p, ids.parent).locator('.ring-accent').count() > 0, 'nest target not highlighted')
    await end(finger.cdp)
    let state = await store(p, (data, ids) => ({ parent: data.records[ids.moving].parentId, child: data.records[ids.movingChild].parentId }), ids)
    expect(state.parent === ids.parent && state.child === ids.moving, 'nest did not carry subtree')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    state = await store(p, (data, ids) => ({ parent: data.records[ids.moving].parentId, child: data.records[ids.movingChild].parentId }), ids)
    expect(state.parent === null && state.child === ids.moving, 'undo did not restore subtree')
    expect(JSON.stringify(await store(p, (data, ids) => ({ parent: data.records[ids.moving].parentId, order: data.records[ids.moving].order, child: data.records[ids.movingChild].parentId, childOrder: data.records[ids.movingChild].order }), ids)) === JSON.stringify(original), 'undo did not restore subtree order')

    finger = await touch(p, ids.child)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    box = await row(p, ids.last).boundingBox()
    await move(finger.cdp, { x: box.x + 20, y: box.y + 3 })
    expect(await row(p, ids.last).locator('[data-tree-drop-line]').count() === 1, 'outdent drop line missing')
    await end(finger.cdp)
    state = await store(p, (data, ids) => ({ parent: data.records[ids.child].parentId, child: data.records[ids.deepest].parentId }), ids)
    expect(state.parent === null && state.child === ids.child, 'outdent did not carry subtree')
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect(await store(p, (data, ids) => data.records[ids.child].parentId === ids.parent, ids), 'outdent undo failed')

    finger = await touch(p, ids.moving)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    box = await row(p, ids.deepest).boundingBox()
    await move(finger.cdp, { x: box.x + 120, y: box.y + box.height / 2 })
    expect(await row(p, ids.deepest).locator('.ring-accent').count() === 0, 'invalid depth was highlighted')
    await end(finger.cdp)
    expect(await store(p, (data, ids) => data.records[ids.moving].parentId === null, ids), 'invalid nesting changed data')

    finger = await touch(p, ids.parent)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    box = await row(p, ids.child).boundingBox()
    await move(finger.cdp, { x: box.x + 120, y: box.y + box.height / 2 })
    expect(await row(p, ids.child).locator('.ring-accent').count() === 0, 'a cycle was offered as a target')
    await end(finger.cdp)
    expect(await store(p, (data, ids) => data.records[ids.parent].parentId === null && data.records[ids.child].parentId === ids.parent, ids), 'cycle drop changed the tree')

    finger = await touch(p, ids.moving)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    box = await row(p, ids.last).boundingBox()
    await move(finger.cdp, { x: box.x + 120, y: box.y + box.height - 3 })
    expect(await row(p, ids.last).locator('[data-tree-drop-line]').count() === 1, 'reorder line missing')
    await end(finger.cdp)
    expect(await store(p, (data, ids) => data.records[ids.moving].order > data.records[ids.last].order, ids), 'edge reorder failed')
  } },
  { id: 'mf3-tree-held-row-open', device: MOBILE, run: async (p) => {
    const ids = await makeTree(p)
    const finger = await touch(p, ids.moving)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    await end(finger.cdp)
    await p.getByRole('button', { name: 'Открыть «Купить краску»' }).click()
    await p.waitForURL(new RegExp(`/r/${ids.moving}`))
    await p.goBack()
    await row(p, ids.moving).locator('[data-row-text]').click()
    await p.waitForURL(new RegExp(`/r/${ids.moving}`))
  } },
  { id: 'mf3-tree-desktop-keys', device: DESKTOP, run: async (p) => {
    const ids = await makeTree(p)
    const name = row(p, ids.moving).locator('[data-row-text]')
    await name.focus()
    await p.keyboard.press('Alt+ArrowDown')
    expect(await store(p, (data, ids) => data.records[ids.moving].order > data.records[ids.last].order, ids), 'desktop keyboard reorder failed')
    await name.click({ button: 'right' })
    await p.getByRole('menuitem', { name: 'Переместить на другую страницу' }).waitFor()
  } },
  { id: 'mf3-tree-desktop-handle', device: DESKTOP, run: async (p) => {
    const ids = await makeTree(p)
    const moving = row(p, ids.moving)
    await moving.hover()
    const handle = moving.locator('[style*="grab"]')
    const from = await handle.boundingBox()
    const target = await row(p, ids.last).boundingBox()
    await p.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await p.mouse.down()
    await p.mouse.move(target.x + target.width / 2, target.y + target.height - 2, { steps: 8 })
    await p.mouse.up()
    expect(await store(p, (data, ids) => data.records[ids.moving].order > data.records[ids.last].order && data.records[ids.movingChild].parentId === ids.moving, ids), 'desktop handle did not move the subtree')
  } },
  { id: 'mf3-tree-property-drag', device: DESKTOP, run: async (p) => {
    const ids = await makeTree(p)
    await store(p, (data, id) => {
      data.addProp(id, { name: 'Первое', type: 'text' })
      data.addProp(id, { name: 'Второе', type: 'text' })
    }, ids.page)
    await p.locator('main').getByRole('button', { name: 'Действия со страницей' }).first().click()
    await p.getByRole('menu').getByText(/^Свойства/).first().click()
    const first = p.getByRole('button', { name: 'Изменить «Первое»' })
    const second = p.getByRole('button', { name: 'Изменить «Второе»' })
    const from = await first.boundingBox()
    const to = await second.boundingBox()
    await p.mouse.move(from.x + 30, from.y + from.height / 2)
    await p.mouse.down()
    await p.waitForTimeout(500)
    await p.mouse.move(to.x + 30, to.y + to.height - 2, { steps: 8 })
    await p.mouse.up()
    expect(await store(p, (data, id) => data.pages[id].props.map(x => x.name).join(',') === 'Второе,Первое', ids.page), 'property drag changed or stopped working')
  } },
  { id: 'mf3-tree-stock-session', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const ids = await store(p, async (data) => {
      const page = data.createPage({ title: 'Запасы и удержание' })
      data.updatePage(page.id, {
        props: [{ id: 'amount', name: 'Осталось', type: 'number', normProp: 'norm' }, { id: 'norm', name: 'Норма', type: 'number' }],
        stocks: [{ amountProp: 'amount', normProp: 'norm', buyViewId: 'buy', stockViewId: 'stock' }],
        views: [{ id: 'buy', name: 'Купить', layout: 'list', filter: [{ field: 'done', op: 'is', value: false }], groupBy: null, sort: 'manual', shown: ['amount'], stock: { mode: 'buy', amountProp: 'amount', normProp: 'norm' } }]
      })
      const bread = data.addRecord({ pageId: page.id, text: 'Хлеб', order: 0, values: { amount: 1, norm: 5 } })
      const cola = data.addRecord({ pageId: page.id, text: 'Кола', order: 1, values: { amount: 1, norm: 5 } })
      await data.flush()
      return { page: page.id, bread: bread.id, cola: cola.id }
    })
    await open(p, `/p/${ids.page}`, false)
    await p.getByRole('button', { name: 'Осталось 1/5: Хлеб' }).click()
    await p.getByRole('button', { name: 'Увеличить остаток: Хлеб' }).click()
    let finger = await touch(p, ids.cola)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    await end(finger.cdp)
    await p.getByRole('button', { name: 'Закрыть меню записи' }).click({ position: { x: 5, y: 5 } })
    expect(await p.getByRole('button', { name: 'Увеличить остаток: Хлеб' }).isVisible(), 'holding another row closed the stock stepper')
    expect(await store(p, (data, id) => data.records[id].values.amount === 2, ids.bread), 'holding restored a stale stock value')
    const order = await store(p, (data, ids) => [data.records[ids.bread].order, data.records[ids.cola].order], ids)
    finger = await touch(p, ids.cola)
    await p.locator('[data-record-hold-menu]').waitFor({ state: 'attached', timeout: 2000 })
    const target = await row(p, ids.bread).boundingBox()
    await move(finger.cdp, { x: target.x + 120, y: target.y + target.height / 2 })
    expect(await row(p, ids.bread).locator('.ring-accent').count() === 0, 'drag can change the list while the stepper is open')
    await end(finger.cdp)
    expect(JSON.stringify(await store(p, (data, ids) => [data.records[ids.bread].order, data.records[ids.cola].order], ids)) === JSON.stringify(order), 'drag changed the list while the stepper was open')
    await row(p, ids.bread).waitFor({ state: 'detached', timeout: 5000 })
  } }
]
