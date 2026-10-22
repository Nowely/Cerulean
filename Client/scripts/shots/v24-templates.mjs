// v24, the templates slice: «В заметку» in a record's composer, «Сделать шаблоном», «Шаблоны», a template's own page and
// a record by template (canvas pages «v24: шаблоны, сборные страницы, заметки» and «Десктоп v24: пустая страница, «В
// заметку», шаблоны»). Встреча is seeded through the store, as the delta says, and the screens are reached in the app,
// so what was just seeded never waits on a reload.

const KEYBOARD_TOP = 557

/** The keyboard as iOS reports it: the visual viewport ends where the keys start (call before the first open) */
async function withKeyboard(page) {
  await page.addInitScript(() => {
    const own = Object.getOwnPropertyDescriptor(VisualViewport.prototype, 'height')
    Object.defineProperty(VisualViewport.prototype, 'height', {
      configurable: true,
      get() {
        return window.__keyboardTop ?? own.get.call(this)
      }
    })
  })
}
async function keyboardUp(page) {
  await page.evaluate((top) => {
    window.__keyboardTop = top
    window.visualViewport.dispatchEvent(new Event('resize'))
  }, KEYBOARD_TOP)
}

/** Встреча on Задачи: чт 22 окт, «вручную · 16 окт», its body, three subitems with the first done */
function seedMeeting(d) {
  const pg = d.livePages.find(x => x.title === 'Задачи')
  const at = new Date('2026-10-16T12:00:00+03:00').getTime()
  const r = d.addRecord({ pageId: pg.id, text: 'Встреча', due: { date: '2026-10-22' }, via: 'manual', addedAt: at })
  const para = text => ({ type: 'paragraph', content: [{ type: 'text', text }] })
  const head = text => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
  d.setBody({ kind: 'record', id: r.id }, { type: 'doc', content: [
    head('Повестка'),
    { type: 'bulletList', content: ['что сделано за неделю', 'что мешает', 'решения и сроки'].map(t => ({ type: 'listItem', content: [para(t)] })) },
    head('Итоги'),
    para('Кто что делает и к какому сроку. Разослать в тот же день.')
  ] })
  const subs = ['Разослать повестку', 'Записать решения', 'Отправить итоги'].map(text => d.addRecord({ pageId: pg.id, parentId: r.id, text, via: 'manual', addedAt: at }))
  d.updateRecord(subs[0].id, { done: true, doneAt: at, tickedAt: at })
  return r.id
}

export default (h) => {
  const desk = p => p.viewportSize().width >= 1024

  /** In-app navigation, so the seeded data never waits on a reload */
  async function go(p, path) {
    await p.evaluate(to => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), path)
    await h.settle(p, 700)
  }
  /** Главная with Встреча seeded, and its template when `template` */
  async function seeded(p, { template = false } = {}) {
    await h.open(p, '/')
    const id = await h.data(p, seedMeeting)
    const tpl = template ? await h.data(p, (d, rid) => d.makeTemplate(rid).tpl.id, id) : null
    return { id, tpl }
  }
  async function tasks(p) {
    await go(p, `/p/${await h.data(p, d => d.livePages.find(x => x.title === 'Задачи').id)}`)
  }
  async function eggs(p) {
    await h.open(p, '/')
    await go(p, `/r/${await h.data(p, d => d.liveRecords.find(r => r.text === 'Яйца').id)}`)
  }
  const chip = p => p.locator('form button[aria-label^="Куда"]').first()
  /** No hover or focus ring left where the pointer or a click was */
  async function rest(p) {
    await p.mouse.move(0, 0)
    await h.settle(p, 300)
  }
  async function dots(p, label) {
    await p.locator(`button[aria-label="${label}"]:visible`).first().click()
    await h.settle(p, 600)
  }
  const menuRow = (p, name) => desk(p) ? p.getByRole('menuitem', { name }) : p.getByRole('dialog').last().getByRole('button', { name })

  /** Яйца with «В заметку» picked and a paragraph sent; the field keeps the focus */
  async function toNote(p) {
    await eggs(p)
    await chip(p).click()
    await h.settle(p, 600)
    await p.getByRole('dialog', { name: 'Куда записать' }).getByRole('button', { name: /^В заметку/ }).click()
    await h.settle(p, 600)
    await p.locator('form textarea').first().fill('мама просила ещё перепелиные, если будут.')
    await p.keyboard.press('Enter')
    await h.settle(p, 900)
  }
  /** Задачи with Встреча's template, its chip on «По шаблону» and «созвон с Лизой» typed */
  async function typed(p) {
    await seeded(p, { template: true })
    await tasks(p)
    await chip(p).click()
    await h.settle(p, 700)
    await p.getByRole('dialog').last().getByRole('button', { name: /^Встреча/ }).click()
    await h.settle(p, 500)
    await p.locator('form textarea').first().fill('созвон с Лизой')
    await h.settle(p, 400)
  }

  return [
    // Phone
    { name: 'MobileToNote', device: h.MOBILE, run: async (p) => {
      await withKeyboard(p)
      await toNote(p)
      await keyboardUp(p)
      await h.settle(p, 500)
    } },
    { name: 'MobileTemplateMake', device: h.MOBILE, run: async (p) => {
      const { id } = await seeded(p)
      await go(p, `/r/${id}`)
      await dots(p, 'Действия с записью')
    } },
    { name: 'MobileTemplates', device: h.MOBILE, run: async (p) => {
      await seeded(p, { template: true })
      await tasks(p)
      await dots(p, 'Действия со страницей')
      await menuRow(p, /^Шаблоны/).click()
      await h.settle(p, 900)
    } },
    { name: 'MobileTemplate', device: h.MOBILE, run: async (p) => {
      const { tpl } = await seeded(p, { template: true })
      await go(p, `/t/${tpl}`)
    } },
    { name: 'MobileTemplateUse', device: h.MOBILE, run: async (p) => {
      await seeded(p, { template: true })
      await tasks(p)
      await chip(p).click()
      await h.settle(p, 900)
    } },
    { name: 'MobileTemplateTyped', device: h.MOBILE, run: async (p) => {
      await withKeyboard(p)
      await typed(p)
      await keyboardUp(p)
      await h.settle(p, 500)
    } },
    { name: 'MobileTemplateNew', device: h.MOBILE, run: async (p) => {
      await withKeyboard(p)
      await typed(p)
      await p.keyboard.press('Enter')
      await keyboardUp(p)
      await h.settle(p, 700)
    } },

    // Desktop
    { name: 'PageNoteDest', device: h.DESKTOP, run: async (p) => {
      await eggs(p)
      await chip(p).click()
      await h.settle(p, 700)
    } },
    { name: 'PageToNote', device: h.DESKTOP, run: async (p) => {
      await toNote(p)
      await rest(p)
    } },
    { name: 'PageTplMake', device: h.DESKTOP, run: async (p) => {
      const { id } = await seeded(p)
      await go(p, `/r/${id}`)
      await dots(p, 'Действия с записью')
    } },
    { name: 'PagesTpls', device: h.DESKTOP, run: async (p) => {
      await seeded(p, { template: true })
      await tasks(p)
      await dots(p, 'Действия со страницей')
      await menuRow(p, /^Шаблоны/).click()
      await h.settle(p, 900)
    } },
    { name: 'PageTpl', device: h.DESKTOP, run: async (p) => {
      const { tpl } = await seeded(p, { template: true })
      await go(p, `/t/${tpl}`)
      await rest(p)
    } },
    { name: 'PagesTplUse', device: h.DESKTOP, run: async (p) => {
      await seeded(p, { template: true })
      await tasks(p)
      await chip(p).click()
      await h.settle(p, 900)
    } },
    { name: 'PagesTplTyped', device: h.DESKTOP, run: async (p) => {
      await typed(p)
      await rest(p)
    } },
    { name: 'PagesTplNew', device: h.DESKTOP, run: async (p) => {
      await typed(p)
      await p.keyboard.press('Enter')
      await h.settle(p, 700)
      await rest(p)
    } }
  ]
}
