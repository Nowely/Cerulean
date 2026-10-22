// v24, the mention slice: «@» in the composer, the opaque dock and «Открыто недавно» (canvas pages «v24: сборные страницы,
// «@» в поле, запись из заметки» and «Десктоп v24: …»). MobileFind and Palette keep their scenarios in scripts/shots.mjs:
// the same steps show «Открыто недавно» now. Здоровье with Стоматолог, and Встреча on Задачи, exist in the mockups only
// in the states that show them, so the scenarios here seed them. A phone state with the keyboard up shrinks the visual
// viewport to 557px, where the mockup's keyboard starts.

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

export default (h) => {
  /** Здоровье (heart, no colour) in Личное after Книги, with Стоматолог and its body */
  const health = p => h.data(p, (d) => {
    if (d.livePages.some(x => x.title === 'Здоровье' && !x.deletedAt)) return
    const books = d.livePages.find(x => x.title === 'Книги')
    const page = d.createPage({ title: 'Здоровье', glyph: 'heart', sectionId: books.sectionId, hasDone: false, openedAt: books.openedAt - 1 })
    const rec = d.addRecord({ pageId: page.id, text: 'Стоматолог' })
    d.setBody({ kind: 'record', id: rec.id }, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Клиника на Садовой, 12. Ирина Павловна, звонить с 9 до 18.' }] }] })
    d.updatePage(page.id, { seenAt: Date.now() + 1 })
  })

  /** Встреча on Задачи: Срок чт, 22 окт, added by hand on 16 Oct, its agenda body and three subitems (one done) */
  const meeting = p => h.data(p, (d) => {
    const tasks = d.livePages.find(x => x.title === 'Задачи')
    if (Object.values(d.records).some(r => r.text === 'Встреча' && !r.deletedAt)) return
    const added = new Date(2026, 9, 16, 12, 0).getTime()
    const rec = d.addRecord({ pageId: tasks.id, text: 'Встреча', due: { date: '2026-10-22' }, via: 'manual', addedAt: added })
    const para = text => ({ type: 'paragraph', content: [{ type: 'text', text }] })
    const heading = text => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
    const bullets = items => ({ type: 'bulletList', content: items.map(t => ({ type: 'listItem', content: [para(t)] })) })
    d.setBody({ kind: 'record', id: rec.id }, { type: 'doc', content: [
      heading('Повестка'), bullets(['что сделано за неделю', 'что мешает', 'решения и сроки']),
      heading('Итоги'), para('Кто что делает и к какому сроку. Разослать в тот же день.')
    ] })
    ;[['Разослать повестку', true], ['Записать решения', false], ['Отправить итоги', false]].forEach(([text, done], i) => {
      d.addRecord({ pageId: tasks.id, parentId: rec.id, text, order: i, addedAt: added, ...(done ? { done: true, doneAt: added } : {}) })
    })
  })

  const field = p => p.getByRole('textbox', { name: /^(Новая запись|Новый абзац|Новый подпункт)$/ }).last()

  /** Types into the composer and lets the «@» row settle */
  async function typeIn(p, text) {
    await field(p).click()
    await p.keyboard.type(text)
    await h.settle(p, 400)
  }

  /** Главная with Здоровье, the composer focused (the keyboard up on a phone) */
  async function home(p) {
    const phone = p.viewportSize().width < 1024
    if (phone) await withKeyboard(p)
    await h.openHome(p)
    await health(p)
    await field(p).click()
    if (phone) await keyboardUp(p)
    await h.settle(p, 300)
  }

  /** «позвонить @сто» with «Стоматолог» picked: the chip in the field and the guess line naming the link */
  async function linked(p) {
    await home(p)
    await typeIn(p, 'позвонить @сто')
    await p.getByRole('button', { name: /^Упомянуть «Стоматолог»/ }).click()
    await h.settle(p, 400)
  }

  return [
    { name: 'MobileComposerMention', device: h.MOBILE, run: async (p) => {
      await home(p)
      await typeIn(p, 'позвонить @сто')
    } },
    { name: 'MobileComposerLinked', device: h.MOBILE, run: linked },
    { name: 'HomeMention', device: h.DESKTOP, run: async (p) => {
      await home(p)
      await typeIn(p, 'позвонить @сто')
    } },
    { name: 'HomeLinked', device: h.DESKTOP, run: linked },
    { name: 'PagesMention', device: h.DESKTOP, run: async (p) => {
      await h.open(p, '/')
      await health(p)
      await meeting(p)
      await p.getByRole('link', { name: /^Задачи/ }).first().click()
      await p.waitForURL(/\/p\//)
      await h.settle(p, 400)
      await typeIn(p, 'записаться к @сто')
    } },
    { name: 'PageNoteMention', device: h.DESKTOP, run: async (p) => {
      // Яйца with «В заметку» (the record's «Куда записать» comes with the templates slice; without it the state is «Подпункт»)
      await h.openRecord(p, 'Яйца')
      const chip = p.getByRole('button', { name: /^Куда записать: «Подпункт»/ })
      if (await chip.count()) {
        await chip.click()
        await h.settle(p, 400)
        await p.getByRole('button', { name: /^В заметку/ }).last().click()
        await h.settle(p, 400)
      }
      await typeIn(p, 'к омлету взять ещё @сы')
    } },
    { name: 'MainMention', device: h.DESKTOP, run: async (p) => {
      // As MainPast: the record of the 8:52 receipt open in the panel; the feed at its end
      await h.open(p, '/journal')
      await p.getByRole('button', { name: /^Позвонить стоматологу/ }).first().click()
      await h.settle(p, 400)
      await typeIn(p, 'записаться на забег к @пол')
    } }
  ]
}
