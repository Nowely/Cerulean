// v24, the pages slice: the empty page as its own manual and a page just made (canvas page «v24: шаблоны, сборные
// страницы, заметки» and «Десктоп v24: пустая страница, «В заметку», шаблоны»), and «Сделать записью» from a page note
// (canvas page «v24: сборные страницы, «@» в поле, запись из заметки» and its desktop page). The updated MobileBlank
// and MobileIcon stay in scripts/shots.mjs and v23-look.mjs: the same steps show v24.

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

/** «Ремонт на кухне», made from Дом's «⋯» and named, the keyboard down */
async function kitchen(h, page) {
  const desktop = page.viewportSize().width >= 1024
  await h.openHome(page)
  await page.getByRole('button', { name: 'Действия с секцией «Дом»' }).filter({ visible: true }).first().click()
  await h.settle(page, 500)
  await page.getByRole(desktop ? 'menuitem' : 'button', { name: 'Новая страница' }).last().click()
  await page.waitForURL(/\/p\//)
  const title = page.getByRole('textbox', { name: 'Название страницы' })
  await title.and(page.locator(':focus')).waitFor({ timeout: 3000 })
  await title.fill('Ремонт на кухне')
  await title.blur()
  await page.mouse.move(0, 0)
  await h.settle(page, 600)
}

/** `text` selected in the page note, as a long press and a drag of the handles would leave it */
async function select(page, text) {
  const ed = page.locator('.page-note .ProseMirror')
  await ed.waitFor({ timeout: 10000 })
  await ed.getByText(text, { exact: false }).first().click()
  await ed.evaluate((root, t) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.data.indexOf(t)
      if (i >= 0) {
        getSelection().setBaseAndExtent(n, i, n, i + t.length)
        return
      }
    }
    throw new Error(`no «${t}» in the note`)
  }, text)
}

const METERS = 'Показания счётчиков отправлять до 25-го'

export default h => [
  { name: 'MobilePageEmpty', device: h.MOBILE, run: p => kitchen(h, p) },
  { name: 'MobilePageSelect', device: h.MOBILE, run: async (p) => {
    await withKeyboard(p)
    await h.openPage(p, 'Дела по дому')
    await select(p, METERS)
    await keyboardUp(p)
    await h.settle(p, 500)
  } },
  { name: 'MobileToRecord', device: h.MOBILE, run: async (p) => {
    await withKeyboard(p)
    await h.openPage(p, 'Дела по дому')
    await select(p, METERS)
    await keyboardUp(p)
    await h.settle(p, 300)
    await p.getByRole('button', { name: 'Сделать записью' }).click()
    await h.settle(p, 700)
  } },

  { name: 'PagesEmpty', device: h.DESKTOP, run: p => kitchen(h, p) },
  { name: 'PagesSelect', device: h.DESKTOP, run: async (p) => {
    await h.openPage(p, 'Дела по дому')
    await select(p, METERS)
    await h.settle(p, 300)
    await p.getByRole('button', { name: 'Сделать записью' }).hover()
    await h.settle(p, 800)
  } },
  { name: 'PagesToRecord', device: h.DESKTOP, run: async (p) => {
    await h.openPage(p, 'Дела по дому')
    await select(p, METERS)
    await h.settle(p, 300)
    await p.getByRole('button', { name: 'Сделать записью' }).click()
    await p.mouse.move(0, 0)
    await h.settle(p, 700)
  } }
]
