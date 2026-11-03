// Main flow 3: each scenario starts in the runner's fresh context, without demo data or a model key.
export default ({ MOBILE, DESKTOP, open, data, settle }) => {
  async function localOnly(page) {
    let origin
    await page.route('**/*', (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (!origin && request.isNavigationRequest() && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        origin = url.origin
      }
      const allowed = url.origin === origin && ['GET', 'HEAD'].includes(request.method())
        && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/fake-ai/')
      return allowed ? route.continue() : route.abort()
    })
  }

  async function first(page) {
    await localOnly(page)
    await open(page, '/', false)
  }

  async function fixture(page, table = false) {
    await first(page)
    await data(page, async (d, makeTable) => {
      const shop = d.livePages.find(p => p.title === 'Покупки')
      const dept = shop.props.find(p => p.name === 'Отдел')
      const qty = shop.props.find(p => p.name === 'Количество')
      const left = shop.props.find(p => p.name === 'Осталось')
      const norm = shop.props.find(p => p.name === 'Норма')
      const option = name => dept.options.find(o => o.name === name).id
      const home = d.createSection('Дом')
      const personal = d.createSection('Личное')
      d.updatePage(shop.id, { sectionId: home.id })
      d.createPage({ title: 'Дела по дому', sectionId: home.id })
      const repair = d.createPage({ title: 'Ремонт', sectionId: personal.id, props: [
        { id: 'mf3-shot-room', name: 'Комната', type: 'select', options: [
          { id: 'mf3-shot-bath', name: 'Ванная', color: 'blue' },
          { id: 'mf3-shot-kitchen', name: 'Кухня', color: 'green' }
        ] }
      ] })
      const add = (text, department, order, extra = {}) => d.addRecord({
        pageId: shop.id, text, order, addedAt: Date.now() - 3600000,
        values: { [dept.id]: option(department), ...extra }
      })
      add('Хлеб', 'Хлеб и выпечка', 0, { [left.id]: 1, [norm.id]: 2 })
      add('Сыр', 'Молочное', 1, { [qty.id]: '200 г' })
      add('Яйца', 'Молочное', 2, { [qty.id]: '10 шт' })
      add('Молоко', 'Молочное', 3, { [qty.id]: '1 л' })
      add('Йогурт', 'Молочное', 4, { [left.id]: 2, [norm.id]: 5 })
      const rec = d.addRecord({ pageId: repair.id, text: 'Выбрать плитку в ванную', order: 0,
        addedAt: Date.now() - 3600000, note: 'Белая матовая, 30×60. Затирка в тон', values: { 'mf3-shot-room': 'mf3-shot-bath' },
        due: { date: '2026-11-02' } })
      d.addRecord({ pageId: repair.id, parentId: rec.id, text: 'Замерить стены', order: 0, done: true, addedAt: Date.now() - 3600000 })
      d.addRecord({ pageId: repair.id, parentId: rec.id, text: 'Выбрать цвет', order: 1, addedAt: Date.now() - 3600000 })
      d.addRecord({ pageId: repair.id, parentId: rec.id, text: 'Купить плитку', order: 2, addedAt: Date.now() - 3600000 })
      if (makeTable) {
        d.updatePage(shop.id, { views: [{ ...shop.views[0], name: 'Таблица', layout: 'table', shown: [dept.id, qty.id, left.id] }, ...shop.views.slice(1)] })
      }
      await d.flush()
    }, table)
    await settle(page, 500)
  }

  async function goPage(page, name) {
    await page.locator('[data-home] [role="listitem"]')
      .filter({ has: page.locator('[data-name]', { hasText: new RegExp(`^${name}$`) }) })
      .locator('a').click()
    await page.waitForURL(/\/p\//)
    await settle(page, 500)
  }

  async function shop(page, table = false) {
    await fixture(page, table)
    await goPage(page, 'Покупки')
  }

  const states = {
    Home: async page => fixture(page),
    Shopping: async page => shop(page),
    Stock: async (page) => {
      await shop(page)
      await page.getByRole('tab', { name: 'Запасы', exact: true }).click()
      await page.getByRole('button', { name: 'Осталось 2/5: Йогурт' }).waitFor()
      await settle(page, 400)
    },
    Record: async (page) => {
      await fixture(page)
      await goPage(page, 'Ремонт')
      await page.locator('[data-rows] [data-row-text]').filter({ hasText: 'Выбрать плитку в ванную' }).click()
      await page.waitForURL(/\/r\//)
      await page.locator('[data-record-values]').waitFor()
      await settle(page, 400)
    },
    Table: async (page) => {
      await shop(page, true)
      await page.locator('[data-phone-table] tbody tr').first().waitFor()
      await settle(page, 400)
    },
    Filter: async (page) => {
      await shop(page)
      await page.getByRole('button', { name: 'Фильтр и сортировка', exact: true }).click()
      await page.locator('h2[class]').filter({ hasText: /^Фильтр и сортировка$/ }).waitFor()
      await settle(page, 400)
    },
    Settings: async (page) => {
      await first(page)
      await page.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/settings'))
      await page.waitForURL(/\/settings$/)
      await page.getByText('Раскладывать по страницам', { exact: true }).waitFor()
      await settle(page, 400)
    }
  }

  return Object.entries(states).flatMap(([name, run]) => [
    { name: `Flow3Mobile${name}`, device: MOBILE, run },
    { name: `Flow3Desktop${name}`, device: DESKTOP, run }
  ])
}
