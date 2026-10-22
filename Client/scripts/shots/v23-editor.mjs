// v23, the editor slice: record bodies and page notes (canvas pages «Текст страниц и записей» and «Десктоп v23: текст
// страниц и записей»). MobileItem, MobileLinked and MobilePageMenu stay in scripts/shots.mjs: the same steps show v23.
// A phone state with the keyboard up shrinks the visual viewport to 557px, where the mockup's keyboard starts.

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

/** The body being edited: the one with the caret, else the last one on screen (the panel's, when it is open) */
function editorOf(page) {
  return page.locator('.ProseMirror').last()
}

/** The caret right after `text` in the body (focuses it like a tap at the end of those words) */
async function caretAfter(page, text) {
  await editorOf(page).getByText(text, { exact: false }).first().click()
  await page.keyboard.press('End')
}

/** `text` selected in the body, as a long press and a drag of the handles would leave it */
async function select(page, text) {
  const ed = editorOf(page)
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
    throw new Error(`no «${t}» in the body`)
  }, text)
}

/** The record scrolled just past its title, as the mockup draws it: the properties start under the header, which
 * then names the record */
async function pastTitle(page) {
  await page.evaluate(() => {
    const title = document.querySelector('main [data-title-block]')
    let box = title.parentElement
    while (box && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement
    const top = Math.max(box.getBoundingClientRect().top, document.querySelector('main header')?.getBoundingClientRect().bottom ?? 0)
    box.scrollTop += title.getBoundingClientRect().bottom - top
  })
}

/** «Вернуть книгу в библиотеку» while «Атомные привычки» is being mentioned: the second line typed up to «@» */
async function libraryMention(h, page) {
  await h.openRecord(page, 'Вернуть книгу в библиотеку')
  await h.data(page, (d) => {
    const rec = Object.values(d.records).find(r => r.text === 'Вернуть книгу в библиотеку')
    const p = text => ({ type: 'paragraph', content: [{ type: 'text', text }] })
    d.setBody({ kind: 'record', id: rec.id }, { type: 'doc', content: [p('Сдать до воскресенья, продлить уже нельзя.'), p('Сначала дочитать')] })
  })
  await h.settle(page, 300)
  await caretAfter(page, 'Сначала дочитать')
  await page.keyboard.type(' @')
}

export default h => [
  { name: 'MobileBodyEdit', device: h.MOBILE, run: async (p) => {
    await withKeyboard(p)
    await h.openRecord(p, 'Яйца')
    await caretAfter(p, 'шакшука в субботу')
    await keyboardUp(p)
    await h.settle(p, 500)
    await pastTitle(p)
    await h.settle(p, 300)
  } },
  { name: 'MobileBodySelect', device: h.MOBILE, run: async (p) => {
    await withKeyboard(p)
    await h.openRecord(p, 'Яйца')
    await select(p, 'Проверить, что ни одно не треснуло')
    await keyboardUp(p)
    await h.settle(p, 500)
    await pastTitle(p)
    await h.settle(p, 300)
  } },
  { name: 'MobileMention', device: h.MOBILE, run: async (p) => {
    await withKeyboard(p)
    await libraryMention(h, p)
    await keyboardUp(p)
    await h.settle(p, 500)
  } },
  { name: 'MobileToSub', device: h.MOBILE, run: async (p) => {
    await withKeyboard(p)
    await h.openRecord(p, 'Яйца')
    await select(p, 'Проверить, что ни одно не треснуло')
    await keyboardUp(p)
    await h.settle(p, 300)
    await p.getByRole('button', { name: 'Сделать подпунктом' }).click()
    await h.settle(p, 700)
  } },
  { name: 'MobilePageBody', device: h.MOBILE, run: p => h.openPage(p, 'Дела по дому') },
  { name: 'MobileFindBody', device: h.MOBILE, run: async (p) => {
    await withKeyboard(p)
    await h.open(p, '/')
    await h.dismissKeyCard(p)
    await p.getByRole('button', { name: 'Найти' }).click()
    await h.settle(p)
    await p.getByRole('combobox', { name: 'Найти' }).or(p.getByRole('searchbox')).or(p.getByRole('textbox', { name: 'Найти' })).first().fill('пробеж')
    await keyboardUp(p)
    await h.settle(p, 500)
  } },

  { name: 'PageBody', device: h.DESKTOP, run: p => h.openRecord(p, 'Яйца') },
  { name: 'PageCaret', device: h.DESKTOP, run: async (p) => {
    await h.openRecord(p, 'Яйца')
    await caretAfter(p, 'шакшука в субботу')
    await p.getByRole('toolbar', { name: 'Текст' }).getByRole('button', { name: 'Список', exact: true }).hover()
    await h.settle(p, 800)
  } },
  { name: 'PageSelect', device: h.DESKTOP, run: async (p) => {
    await h.openRecord(p, 'Яйца')
    await select(p, 'Проверить, что ни одно не треснуло')
    await h.settle(p, 300)
    await p.getByRole('toolbar', { name: 'Текст' }).getByRole('button', { name: 'Жирный' }).hover()
    await h.settle(p, 800)
  } },
  { name: 'PageToSub', device: h.DESKTOP, run: async (p) => {
    await h.openRecord(p, 'Яйца')
    await select(p, 'Проверить, что ни одно не треснуло')
    await h.settle(p, 300)
    await p.getByRole('button', { name: 'Сделать подпунктом' }).click()
    await p.mouse.move(0, 0)
    await h.settle(p, 700)
  } },
  { name: 'PageSlash', device: h.DESKTOP, run: async (p) => {
    await h.openRecord(p, 'Яйца')
    await caretAfter(p, 'шакшука в субботу')
    await p.keyboard.press('Enter')
    await p.keyboard.press('Enter')
    await p.keyboard.type('/')
    await h.settle(p, 500)
  } },
  { name: 'PageMention', device: h.DESKTOP, run: async (p) => {
    await libraryMention(h, p)
    await h.settle(p, 500)
  } },
  { name: 'PagePeekEdit', device: h.DESKTOP, run: async (p) => {
    await h.openRecord(p, 'Яйца')
    await p.getByRole('button', { name: /^Молоко/ }).first().click()
    await h.settle(p, 600)
    await editorOf(p).click()
    await p.keyboard.type('Без лактозы, 2,5%, на неделю хватит одной')
    await h.settle(p, 500)
  } },
  { name: 'Pages', device: h.DESKTOP, run: p => h.openPage(p, 'Дела по дому') },
  { name: 'PaletteBody', device: h.DESKTOP, run: async (p) => {
    await h.open(p, '/journal')
    await p.keyboard.press('Control+k')
    await p.getByRole('combobox', { name: 'Найти' }).fill('пробеж')
    await h.settle(p, 300)
    await p.getByRole('dialog').getByRole('option', { name: /Полумарафон к маю/ }).last().hover()
    await h.settle(p, 500)
  } }
]
