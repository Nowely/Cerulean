import { MOBILE, expect, open, store } from './lib.mjs'
import { BUCKET, KEY_ID, SECRET, fakeBucket } from './sync.mjs'

const section = (p, name) => p.locator('[data-home-section]').filter({ has: p.getByRole('heading', { name: new RegExp(`^${name}`) }) })
const row = (p, name) => p.locator('[data-home-section] [data-home-page]').filter({ has: p.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) }).first()
const names = s => s.locator('[data-home-page] [data-name]').allTextContents()

async function drag(p, source, target, at = 'before') {
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  const x = from.x + 40
  const y = from.y + from.height / 2
  const tx = to.x + Math.min(40, to.width / 2)
  const ty = at === 'before' ? to.y + to.height * 0.2 : at === 'after' ? to.y + to.height * 0.8 : to.y + to.height / 2
  const beforeScroll = await p.locator('.scroll-fade').first().evaluate(el => el.scrollTop)
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await p.waitForTimeout(500)
  await p.locator('[data-home-hold-menu]').waitFor()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty }] })
  await p.waitForTimeout(120)
  expect(await p.locator('[data-home-drop-line]').count() === 1, 'drag did not produce a drop target')
  expect(await p.locator('[data-home-hold-menu]').count() === 0, 'menu stayed open during drag')
  expect(await p.locator('.scroll-fade').first().evaluate(el => el.scrollTop) === beforeScroll, 'list scrolled after lift')
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await p.waitForTimeout(300)
}

export default [
  { id: 'mf3-home-drag-system-immovable', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    const before = await store(p, data => JSON.stringify(data.livePages.filter(x => x.kind === 'today' || x.kind === 'inbox')))
    for (const name of ['Входящие', 'Сегодня']) {
      const card = p.locator('[data-home] [data-home-page]').filter({ has: p.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) }).first()
      const box = await card.boundingBox()
      const x = box.x + 40
      const y = box.y + box.height / 2
      const cdp = await p.context().newCDPSession(p)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await p.waitForTimeout(500)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 80 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.detach()
      expect(await p.locator('[data-home-hold-menu]').count() === 1, `${name} lost its menu`)
      expect(await p.locator('[data-home-drop-line]').count() === 0, `${name} started dragging`)
      await p.locator('[data-home-hold-veil]').click({ position: { x: 5, y: 5 } })
    }
    expect(await store(p, data => JSON.stringify(data.livePages.filter(x => x.kind === 'today' || x.kind === 'inbox'))) === before, 'a system page changed')
  } },
  { id: 'mf3-home-drag-recent-repeat-reload', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await store(p, (data) => {
      for (const [i, name] of ['Идеи', 'Задачи', 'Покупки', 'Быстрый старт'].entries()) {
        data.updatePage(data.livePages.find(x => x.title === name).id, { order: i })
      }
    })
    const recent = section(p, 'Мои страницы')
    const baseline = await names(recent)
    expect(baseline.join('|') === 'Быстрый старт|Покупки|Задачи|Идеи', `legacy order: ${baseline}`)
    const untouched = await store(p, data => data.livePages.filter(x => x.kind === 'page').map(x => ({ id: x.id, home: x.homeOrder })))
    expect(untouched.every(x => !x.home), 'opening home wrote positions')
    await drag(p, row(p, 'Идеи'), row(p, 'Покупки'))
    expect((await names(recent)).join('|') === 'Быстрый старт|Идеи|Покупки|Задачи', `first reorder: ${await names(recent)}`)
    await drag(p, row(p, 'Быстрый старт'), row(p, 'Задачи'), 'after')
    expect((await names(recent)).join('|') === 'Идеи|Покупки|Задачи|Быстрый старт', `second reorder: ${await names(recent)}`)
    await store(p, data => data.flush())
    await p.reload()
    await p.locator('[data-home]').waitFor()
    expect((await names(recent)).join('|') === 'Идеи|Покупки|Задачи|Быстрый старт', `reloaded order: ${await names(recent)}`)
    await store(p, data => data.createPage({ title: 'Новая тестовая страница' }))
    expect((await names(recent)).join('|') === 'Новая тестовая страница|Идеи|Покупки|Задачи|Быстрый старт', `new page order: ${await names(recent)}`)
    await drag(p, row(p, 'Новая тестовая страница'), row(p, 'Быстрый старт'), 'after')
    expect((await names(recent)).join('|') === 'Идеи|Покупки|Задачи|Быстрый старт|Новая тестовая страница', `new page reorder: ${await names(recent)}`)
    await store(p, data => data.flush())
    await p.reload()
    await p.locator('[data-home]').waitFor()
    expect((await names(recent)).join('|') === 'Идеи|Покупки|Задачи|Быстрый старт|Новая тестовая страница', `new page order after reload: ${await names(recent)}`)
  } },
  { id: 'mf3-home-drag-fake-s3-lww', device: MOBILE, run: async (p) => {
    const bucket = fakeBucket()
    await bucket.attach(p.context())
    await open(p, '/', false)
    const cloud = (page, fn, arg) => page.evaluate(([src, a]) => {
      const stores = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s
      return new Function('cloud', 'data', 'a', `return (${src})(cloud, data, a)`)(stores.get('cloud'), stores.get('data'), a)
    }, [fn.toString(), arg])
    const connect = page => cloud(page, (c, data, form) => c.connect(form), { bucket: BUCKET, keyId: KEY_ID, secret: SECRET })
    expect((await connect(p)).ok, 'first fake-S3 connection failed')
    await drag(p, row(p, 'Идеи'), row(p, 'Покупки'))
    await cloud(p, c => c.roundTrip())
    const remote = bucket.file()
    expect(remote.pages.some(x => x.title === 'Идеи' && x.homeOrder), 'fake S3 did not receive home positions')
    const context = await p.context().browser().newContext({ ...MOBILE, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
    try {
      await bucket.attach(context)
      const q = await context.newPage()
      await open(q, '/', false)
      expect((await connect(q)).ok, 'second fake-S3 connection failed')
      expect((await names(section(q, 'Мои страницы'))).join('|') === (await names(section(p, 'Мои страницы'))).join('|'), 'second device did not receive the order')
      const id = await store(p, data => data.livePages.find(x => x.title === 'Идеи').id)
      await store(q, (data, id) => data.updatePage(id, { homeOrder: { sectionId: null, position: 77 } }), id)
      const older = await store(q, (data, id) => data.pages[id].updatedAt, id)
      await cloud(q, c => c.roundTrip())
      await p.waitForTimeout(30)
      await store(p, (data, id) => data.updatePage(id, { homeOrder: { sectionId: null, position: 88 } }), id)
      const newer = await store(p, (data, id) => data.pages[id].updatedAt, id)
      expect(newer > older, 'test did not produce a later page version')
      await cloud(p, c => c.roundTrip())
      await cloud(q, c => c.roundTrip())
      expect(bucket.file().pages.find(x => x.id === id).homeOrder.position === 88, 'fake S3 did not keep the later whole page')
      expect(await store(q, (data, id) => data.pages[id].homeOrder.position, id) === 88, 'second device did not apply the later page')
      const imported = await store(p, (data) => {
        const source = JSON.parse(JSON.stringify(data.pages[data.livePages.find(x => x.title === 'Идеи').id]))
        Object.assign(source, { id: 'fake-s3-imported', title: 'Импорт для sync', sectionId: null, homeOrder: { sectionId: null, position: -1 } })
        const legacy = { ...source, id: 'fake-s3-unranked', title: 'Без позиции для sync', createdAt: Date.now() + 100000 }
        delete legacy.homeOrder
        const file = { app: 'cerulean', version: 1, exportedAt: Date.now(), pages: [source, legacy], sections: [], records: [], entries: [], settings: data.snapshot().settings, learned: {} }
        const added = data.addSnapshot(file)
        return { ids: added.pages, group: data.pages[added.pages[0]].homeOrder.importGroup }
      })
      await cloud(p, c => c.roundTrip())
      await cloud(q, c => c.roundTrip())
      expect(imported.ids.every(id => bucket.file().pages.find(x => x.id === id).homeOrder.importGroup === imported.group), 'fake S3 lost the import group')
      const remoteOrder = await store(q, (data, ids) => ({ groups: ids.map(id => data.pages[id].homeOrder.importGroup), names: data.homePages(null).map(x => x.title) }), imported.ids)
      expect(remoteOrder.groups.every(group => group === imported.group), 'second device lost the import group')
      expect(remoteOrder.names.slice(-2).join('|') === 'Импорт для sync|Без позиции для sync', `second device import order: ${remoteOrder.names}`)
    } finally {
      await context.close()
    }
  } },
  { id: 'mf3-home-drag-section-undo-folded', device: MOBILE, run: async (p) => {
    await open(p, '/', false)
    await store(p, (data) => {
      const s = data.createSection('Дом')
      for (const name of ['Покупки', 'Задачи']) data.updatePage(data.livePages.find(x => x.title === name).id, { sectionId: s.id })
    })
    const home = section(p, 'Дом')
    expect((await names(home)).join('|') === 'Покупки|Задачи', `legacy section order: ${await names(home)}`)
    await drag(p, row(p, 'Задачи'), row(p, 'Покупки'))
    expect((await names(home)).join('|') === 'Задачи|Покупки', `section reorder: ${await names(home)}`)
    await drag(p, row(p, 'Идеи'), row(p, 'Покупки'))
    expect((await names(home)).join('|') === 'Задачи|Идеи|Покупки', `cross-section: ${await names(home)}`)
    await p.locator('[data-notice]').getByRole('button', { name: 'Отменить' }).click()
    expect((await names(home)).join('|') === 'Задачи|Покупки', `undo section: ${await names(home)}`)
    expect((await names(section(p, 'Мои страницы'))).includes('Идеи'), 'undo did not return page')
    await home.getByRole('button', { name: /^Дом/ }).click()
    await drag(p, row(p, 'Идеи'), home.getByRole('heading'), 'center')
    const state = await store(p, data => ({ page: data.livePages.find(x => x.title === 'Идеи').sectionId, section: data.sectionList.find(x => x.name === 'Дом').id, folded: data.sectionList.find(x => x.name === 'Дом').collapsed }))
    expect(state.page === state.section && state.folded, `folded drop: ${JSON.stringify(state)}`)
    await home.getByRole('button', { name: /^Дом/ }).click()
    expect((await names(home)).join('|') === 'Идеи|Задачи|Покупки', `folded drop position: ${await names(home)}`)
    await store(p, data => data.flush())
    await p.reload()
    await p.locator('[data-home]').waitFor()
    expect((await names(home)).join('|') === 'Идеи|Задачи|Покупки', `section after reload: ${await names(home)}`)
  } }
]
