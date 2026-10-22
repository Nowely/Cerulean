// v23 delta, the editor slice: the «Check:» lines of items 1–11 (bodies, the page note, the editing bar, selection,
// «Сделать подпунктом», clean edges, mentions and «Связано», search, saving and export) and of D1, D2, D3 (the note and
// Поиск's snippet) and D7, on the phone and on desktop. Item 7's header and the rest of D3 belong to the flow slice.
import { BASE, DESKTOP, MOBILE, expect, open, shows, store } from './lib.mjs'

// ---------- helpers ----------

const recId = (p, text) => store(p, (data, t) => Object.values(data.records).find(r => r.text === t && !r.deletedAt)?.id, text)

/** A record page with its body in place */
async function openRecord(p, text) {
  await open(p, '/')
  const id = await recId(p, text)
  expect(id, `no record «${text}»`)
  await open(p, `/r/${id}`)
  await p.locator('.ProseMirror.body-text').first().waitFor({ timeout: 15000 })
  await p.waitForTimeout(200)
  return id
}

async function openPage(p, title) {
  await open(p, '/')
  await p.getByRole('link', { name: new RegExp(`^${title}`) }).first().click()
  await p.waitForURL(/\/p\//)
  await p.waitForTimeout(500)
}

/** The body being edited: the one with the caret, else the last one on screen (the panel's, when it is open) */
const editorOf = p => p.locator('.ProseMirror.body-text').last()
const bar = p => p.getByRole('toolbar', { name: 'Текст' })
const composer = p => p.getByRole('textbox', { name: /^(Новый подпункт|Новая запись)$/ })
const focused = p => p.evaluate(() => !!document.activeElement?.closest('.ProseMirror.body-text'))
const bodyText = p => editorOf(p).evaluate(el => el.innerText)

async function caretAfter(p, text) {
  await editorOf(p).getByText(text, { exact: false }).first().click()
  await p.keyboard.press('End')
  await p.waitForTimeout(150)
}

/** `text` selected in the body, as a long press and the handles would leave it */
async function select(p, text) {
  const ed = editorOf(p)
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
  await p.waitForTimeout(250)
}

/** An empty body focused: a record without text in it */
async function emptyBody(p) {
  await openRecord(p, 'Хлеб')
  await editorOf(p).click()
  await p.waitForTimeout(200)
  expect(await focused(p), 'the empty body did not take the caret')
}

/** Empties the body (an iPhone's Ctrl A is not select-all for the editor, whose Mod is ⌘ there) */
async function clear(p) {
  await editorOf(p).evaluate(el => el.editor.commands.clearContent(true))
  await p.waitForTimeout(100)
}

const tags = (p, sel) => editorOf(p).locator(sel).count()

/** «Вернуть книгу в библиотеку» with its second line typed up to «Сначала дочитать», the caret at its end */
async function library(p) {
  const id = await openRecord(p, 'Вернуть книгу в библиотеку')
  await store(p, (data, rid) => {
    const para = text => ({ type: 'paragraph', content: [{ type: 'text', text }] })
    data.setBody({ kind: 'record', id: rid }, { type: 'doc', content: [para('Сдать до воскресенья, продлить уже нельзя.'), para('Сначала дочитать')] })
  }, id)
  await p.waitForTimeout(300)
  await caretAfter(p, 'Сначала дочитать')
  return id
}

/** «Связано» of the record on screen: each row's two lines */
const related = p => p.getByRole('region', { name: 'Связано' }).or(p.getByRole('complementary', { name: 'Связано' })).first().locator('li')
  .evaluateAll(lis => lis.map(li => li.innerText.replace(/\s+/g, ' ').trim()))

/** iOS's keyboard: the visual viewport ends where the keys start (before the first open) */
async function withKeyboard(p) {
  await p.addInitScript(() => {
    const own = Object.getOwnPropertyDescriptor(VisualViewport.prototype, 'height')
    Object.defineProperty(VisualViewport.prototype, 'height', { configurable: true, get() {
      return window.__keyboardTop ?? own.get.call(this)
    } })
  })
}
const keyboardUp = p => p.evaluate(() => {
  window.__keyboardTop = 557
  window.visualViewport.dispatchEvent(new Event('resize'))
})

/** Text lines and rows cut by the top or bottom edge of the scroll area holding the body */
const cutRows = p => editorOf(p).evaluate((ed) => {
  const scroller = ed.closest('.overflow-y-auto')
  const box = scroller.getBoundingClientRect()
  const cut = []
  const check = (top, bottom, what) => {
    for (const edge of [box.top, box.bottom]) if (top < edge - 1 && bottom > edge + 1) cut.push(`${what} at ${Math.round(top)}–${Math.round(bottom)} over ${Math.round(edge)}`)
  }
  scroller.querySelectorAll('.body-text p, .body-text h2').forEach((el) => {
    const r = el.getBoundingClientRect()
    const lh = parseFloat(getComputedStyle(el).lineHeight)
    for (let y = r.top; y < r.bottom - 1; y += lh) check(y, y + lh, `a line of «${el.textContent.slice(0, 20)}»`)
  })
  scroller.querySelectorAll('li, h2, button, [role="checkbox"]').forEach((el) => {
    if (el.closest('.body-text')) return
    const r = el.getBoundingClientRect()
    if (r.height > 0 && r.height < 120) check(r.top, r.bottom, `«${el.textContent.trim().slice(0, 20)}»`)
  })
  return cut
})

// ---------- checks ----------

export default [
  // 1: «open Яйца → under «+ Свойство · Связать» the text «Брать С0, десяток…» with the heading «На неделю» and two
  // bullets; tap an empty record's body → the caret in a field with the faint «Заметка»»
  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `e-1-record-body-${name}`, device, run: async (p) => {
    await openRecord(p, 'Яйца')
    const ed = editorOf(p)
    expect((await bodyText(p)).startsWith('Брать С0, десяток'), `the body starts «${(await bodyText(p)).slice(0, 30)}»`)
    expect(await ed.locator('h2').innerText() === 'На неделю', 'no heading «На неделю»')
    expect(await ed.locator('ul > li').count() === 2, 'not two bullets')
    const link = await p.getByRole('button', { name: /^Связать/ }).first().boundingBox()
    const body = await ed.boundingBox()
    expect(body.y > link.y + link.height - 1, 'the body is not under «+ Свойство · Связать»')
    const subs = await p.getByRole('heading', { name: 'Подпункты' }).boundingBox()
    expect(body.y + body.height < subs.y, 'the body is not before «Подпункты»')
    if (name === 'phone') {
      const linked = await p.getByText('Связано', { exact: true }).first().boundingBox()
      expect(body.y + body.height < linked.y, 'the body is not before «Связано»')
    }
    expect(!(await p.getByText('Добавить заметку').count()), '«Добавить заметку» is still there')
    await emptyBody(p)
    const empty = editorOf(p).locator('p.is-editor-empty')
    expect(await empty.getAttribute('data-placeholder') === 'Заметка', 'the placeholder is not «Заметка»')
    const color = await empty.evaluate(el => getComputedStyle(el, '::before').color)
    const faint = await p.evaluate(() => {
      const s = document.createElement('span')
      s.style.color = 'var(--faint)'
      document.body.append(s)
      const c = getComputedStyle(s).color
      s.remove()
      return c
    })
    expect(color === faint, `the placeholder is ${color}, not faint ${faint}`)
  } })),

  // 2 and D3: «Дела по дому shows four lines and «Ещё ⌄»; tap it → the whole note and «Свернуть ⌃»; «⋯» → the
  // «Заметка к странице» row shows «Ключи от щитка…»; a page with no note shows nothing between the summary and the tabs»
  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `e-2-page-note-${name}`, device, run: async (p) => {
    await openPage(p, 'Дела по дому')
    const note = p.locator('.page-note')
    expect(await shows(note), 'no note on Дела по дому')
    // The editor takes over from the drawn text once it has loaded
    await note.locator('.ProseMirror.body-text').waitFor({ timeout: 10000 })
    const text = note.locator('.ProseMirror.body-text')
    const folded = await text.evaluate(el => ({ h: el.getBoundingClientRect().height, full: el.scrollHeight }))
    // Four lines: the paragraph's two, the heading, a bullet (24 + 24 + 28 + 14 + 24 and the gaps)
    expect(folded.h < folded.full - 20, `the note is not folded (${folded.h} of ${folded.full})`)
    expect(folded.h <= 4 * 28 + 24, `the folded note is ${folded.h}px high`)
    const tabs = await p.getByRole('tablist').first().boundingBox()
    const box = await note.boundingBox()
    expect(box.y + box.height <= tabs.y + 1, 'the note is not above the tabs')
    const more = note.getByRole('button', { name: /^Ещё/ })
    expect(await shows(more), 'no «Ещё»')
    const fade = await text.evaluate(el => getComputedStyle(el).maskImage + getComputedStyle(el).webkitMaskImage)
    expect(!/gradient/.test(fade), 'the fold fades')
    await more.click()
    await p.waitForTimeout(300)
    expect(await shows(note.getByRole('button', { name: /^Свернуть/ })), 'no «Свернуть» after «Ещё»')
    const open = await text.evaluate(el => el.getBoundingClientRect().height)
    expect(open > folded.h + 20, 'the note did not open')
    await p.getByRole('button', { name: /^(Действия со страницей|Меню страницы)/ }).last().click()
    await p.waitForTimeout(500)
    const row = p.getByRole(name === 'desktop' ? 'menuitem' : 'button', { name: /^Заметка к странице/ }).last()
    expect(await shows(row), 'no «Заметка к странице» in «⋯»')
    expect(/Ключи от щитка/.test(await row.innerText()), `the row reads «${await row.innerText()}»`)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    // Покупки has no note: nothing between the summary and the tabs, until «⋯» → «Заметка к странице»
    await openPage(p, 'Покупки')
    expect(!(await p.locator('.page-note').count()), 'Покупки draws an empty note')
    await p.getByRole('button', { name: /^(Действия со страницей|Меню страницы)/ }).last().click()
    await p.waitForTimeout(500)
    await p.getByRole(name === 'desktop' ? 'menuitem' : 'button', { name: /^Заметка к странице/ }).last().click()
    await p.waitForTimeout(700)
    expect(await shows(p.locator('.page-note')), 'the menu row drew no note')
    expect(await focused(p), 'the caret is not in the note')
    expect(await p.locator('.page-note p.is-editor-empty').getAttribute('data-placeholder') === 'Заметка к странице', 'no faint «Заметка к странице»')
    await p.keyboard.type('Список на неделю')
    await p.waitForTimeout(600)
    const saved = await store(p, data => JSON.stringify(data.livePages.find(x => x.title === 'Покупки').body ?? null))
    expect(saved.includes('Список на неделю'), 'the note was not saved')
  } })),

  // 3: «type `- ` → a bullet; Backspace → the dash comes back as text; `# ` → a heading; `**` or a pasted image does
  // nothing special (pasted images are dropped, text kept)»
  { id: 'e-3-shortcuts', device: MOBILE, run: async (p) => {
    await emptyBody(p)
    await p.keyboard.type('- ')
    expect(await tags(p, 'ul > li') === 1, '«- » made no bullet')
    await p.keyboard.press('Backspace')
    expect(!(await tags(p, 'ul')) && (await bodyText(p)).startsWith('- '), `Backspace left «${await bodyText(p)}»`)
    await clear(p)
    await p.keyboard.type('* ')
    expect(await tags(p, 'ul > li') === 1, '«* » made no bullet')
    await clear(p)
    await p.keyboard.type('# Мастера')
    expect(await editorOf(p).locator('h2').innerText() === 'Мастера', '«# » made no heading')
    await editorOf(p).evaluate(el => el.editor.commands.setTextSelection(1))
    await p.keyboard.press('Backspace')
    expect(!(await tags(p, 'h2')), 'Backspace at the start of the heading kept it')
    await clear(p)
    await p.keyboard.type('1. первое')
    expect(await tags(p, 'ol > li') === 1, '«1. » made no numbered list')
    await clear(p)
    await p.keyboard.type('> цитата')
    expect(await tags(p, 'blockquote') === 1, '«> » made no quote')
    await clear(p)
    await p.keyboard.type('---')
    expect(await tags(p, 'hr') === 1, '«---» made no divider')
    await clear(p)
    await p.keyboard.type('**жирно**')
    expect(!(await tags(p, 'strong')) && (await bodyText(p)).includes('**жирно**'), '«**» did something')
    await clear(p)
    // A pasted image is dropped; with words beside it the words come in
    const paste = withText => editorOf(p).evaluate((el, t) => {
      const dt = new DataTransfer()
      dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' }))
      if (t) dt.setData('text/plain', 'слова из буфера')
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    }, withText)
    await paste(false)
    await p.waitForTimeout(200)
    expect(!(await tags(p, 'img')) && !(await bodyText(p)).trim(), 'a pasted image went in')
    await paste(true)
    await p.waitForTimeout(200)
    expect(!(await tags(p, 'img')) && (await bodyText(p)).includes('слова из буфера'), `the pasted words are missing: «${await bodyText(p)}»`)
  } },

  // 4: «tap Яйца's body → the composer becomes the bar, same width; tap «Готово» → the composer comes back; tap the
  // title → the composer stays»
  { id: 'e-4-bar', device: MOBILE, run: async (p) => {
    await openRecord(p, 'Яйца')
    const form = await composer(p).locator('xpath=ancestor::form[1]').boundingBox()
    await caretAfter(p, 'шакшука в субботу')
    expect(await shows(bar(p)), 'no editing bar')
    expect(!(await composer(p).isVisible()), 'the composer stayed')
    const b = await bar(p).boundingBox()
    expect(Math.abs(b.x - form.x) <= 1 && Math.abs(b.width - form.width) <= 1, `the bar is ${b.x}+${b.width}, the composer ${form.x}+${form.width}`)
    expect(Math.abs(b.height - 44) <= 1, `the bar is ${b.height} high`)
    const names = await bar(p).getByRole('button').evaluateAll(bs => bs.map(x => x.getAttribute('aria-label') || x.innerText.trim()))
    expect(names.join(' · ') === 'Отменить ввод · Заголовок · Список · Нумерованный список · Цитата · Упомянуть · Готово', `caret face: ${names.join(' · ')}`)
    expect(await bar(p).getByRole('button', { name: 'Список', exact: true }).getAttribute('aria-pressed') === 'true', '«Список» is not pressed in a bullet')
    await bar(p).getByRole('button', { name: 'Готово' }).click()
    await p.waitForTimeout(300)
    expect(!(await bar(p).count()) && await composer(p).isVisible(), 'the composer did not come back after «Готово»')
    expect(!(await focused(p)), 'the body kept the caret after «Готово»')
    await p.getByRole('textbox', { name: 'Текст записи' }).click()
    await p.waitForTimeout(300)
    expect(!(await bar(p).count()) && await composer(p).isVisible(), 'a focused title shows the bar')
  } },

  // D1: «click Яйца's body → the composer becomes the bar, same width, the text does not move; hover «Ж» →
  // «Жирный · Ctrl B»; Esc → the composer is back; Журнал → click Молоко's body in the panel → the bar at the panel's
  // foot, the page's composer still there»
  { id: 'e-D1-bar-desktop', device: DESKTOP, run: async (p) => {
    await openRecord(p, 'Яйца')
    const form = await composer(p).locator('xpath=ancestor::form[1]').boundingBox()
    const line = () => editorOf(p).locator('p').first().boundingBox()
    const before = await line()
    await select(p, 'десяток')
    expect(await shows(bar(p)), 'no editing bar')
    const after = await line()
    expect(Math.abs(after.y - before.y) < 0.5 && Math.abs(after.x - before.x) < 0.5, `the text moved from ${before.x},${before.y} to ${after.x},${after.y}`)
    const b = await bar(p).boundingBox()
    expect(Math.abs(b.x - form.x) <= 1 && Math.abs(b.width - form.width) <= 1, `the bar is ${b.x}+${b.width}, the composer ${form.x}+${form.width}`)
    const tool = await bar(p).getByRole('button', { name: 'Отменить ввод' }).boundingBox()
    expect(tool.width === 36 && tool.height === 36, `a tool is ${tool.width}×${tool.height}`)
    await bar(p).getByRole('button', { name: 'Жирный' }).hover()
    const tip = p.getByRole('tooltip')
    expect(await shows(tip), 'no tooltip over «Ж»')
    const said = (await tip.first().innerText()).replace(/\s+/g, ' ')
    expect(/Жирный\s*Ctrl B/.test(said), `the tooltip says «${said}»`)
    await p.mouse.move(0, 0)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    expect(!(await bar(p).count()) && await composer(p).isVisible(), 'Esc did not bring the composer back')
    // The right panel: Молоко from «Связано»
    await p.getByRole('button', { name: /^Молоко/ }).first().click()
    await p.waitForTimeout(700)
    await editorOf(p).click()
    await p.waitForTimeout(300)
    expect(await shows(bar(p)), 'no bar for the panel\'s body')
    // The bar sits in the panel that holds the body: their nearest common box is the panel, not the page
    const shared = await p.evaluate(() => {
      const eds = document.querySelectorAll('.ProseMirror.body-text')
      const ed = eds[eds.length - 1]
      const tools = document.querySelector('[role="toolbar"][aria-label="Текст"]')
      let a = ed
      while (a && !a.contains(tools)) a = a.parentElement
      return { width: a.getBoundingClientRect().width, left: a.getBoundingClientRect().left, composer: !!a.querySelector('[aria-label="Новый подпункт"]') }
    })
    expect(shared.width < 600 && !shared.composer, `the bar is not at the panel's foot (shared box ${shared.width}px wide)`)
    expect(await composer(p).isVisible(), 'the page\'s composer went')
    await p.keyboard.type('Без лактозы')
    await p.waitForTimeout(600)
    const milk = await store(p, data => JSON.stringify(Object.values(data.records).find(r => r.text === 'Молоко').body))
    expect(milk.includes('Без лактозы'), 'the panel\'s body was not saved')
  } },

  // 5: «long-press a word in Яйца → handles and the system menu show, the tint is clearly visible in light and dark, the
  // bar shows Ж К and the ring»
  ...['light', 'dark'].map(scheme => ({ id: `e-5-selection-${scheme}`, device: { ...MOBILE, colorScheme: scheme }, run: async (p) => {
    await openRecord(p, 'Яйца')
    await select(p, 'десяток')
    const names = await bar(p).getByRole('button').evaluateAll(bs => bs.map(x => x.getAttribute('aria-label') || x.innerText.trim()))
    expect(names.join(' · ') === 'Отменить ввод · Жирный · Курсив · Ссылка · Упомянуть · Сделать подпунктом · Готово', `selection face: ${names.join(' · ')}`)
    const tint = await editorOf(p).evaluate(el => getComputedStyle(el, '::selection').backgroundColor)
    const want = scheme === 'light' ? 'rgb(185, 210, 230)' : 'rgb(39, 73, 106)'
    expect(tint === want, `the selection is ${tint}`)
    // At least 1.5:1 on bg
    const ratio = await p.evaluate((sel) => {
      const lum = (c) => {
        const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const bg = getComputedStyle(document.body).backgroundColor
      const [a, b] = [lum(sel), lum(bg)].sort((x, y) => y - x)
      return (a + 0.05) / (b + 0.05)
    }, tint)
    expect(ratio >= 1.5, `the tint is ${ratio.toFixed(2)}:1 on the background`)
  } })),

  // 6: «select «Проверить, что ни одно не треснуло.» → ring → the sentence is gone from the text and is the last row of
  // «Подпункты»; «Отменить» → back in the text, the subitem gone»
  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `e-6-to-sub-${name}`, device, run: async (p) => {
    const id = await openRecord(p, 'Яйца')
    await select(p, 'Проверить, что ни одно не треснуло.')
    await bar(p).getByRole('button', { name: 'Сделать подпунктом' }).click()
    await p.waitForTimeout(500)
    const text = await bodyText(p)
    expect(!text.includes('Проверить') && text.startsWith('Брать С0, десяток в картонной упаковке. Если нет, подойдут С1.\n'), `the text closed up as «${text.slice(0, 80)}»`)
    const subs = await store(p, (data, rid) => data.subitemsOf(rid).map(s => s.text), id)
    expect(subs.at(-1) === 'Проверить, что ни одно не треснуло', `the subitems are ${subs.join(' / ')}`)
    const rows = p.locator('section[aria-labelledby="subs-title"] li')
    expect((await rows.last().innerText()).includes('Проверить, что ни одно не треснуло'), 'the subitem is not the last row')
    const toast = p.locator('[data-notice]', { hasText: 'Строка стала подпунктом' })
    expect(await shows(toast), 'no toast «Строка стала подпунктом»')
    expect(await focused(p), 'the body lost the caret')
    await toast.getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(500)
    expect((await bodyText(p)).includes('подойдут С1. Проверить, что ни одно не треснуло.'), '«Отменить» did not put the words back')
    const back = await store(p, (data, rid) => data.subitemsOf(rid).map(s => s.text), id)
    expect(!back.includes('Проверить, что ни одно не треснуло'), '«Отменить» left the subitem')
  } })),

  // 7: «focus the last bullet of Яйца with the keyboard up → no half row shows between «Связано» and the bar»
  // (the header naming the record is the flow slice's)
  { id: 'e-7-edges', device: MOBILE, run: async (p) => {
    await withKeyboard(p)
    await openRecord(p, 'Яйца')
    const fades = () => editorOf(p).evaluate(el => ['data-fade-top', 'data-fade-bottom'].filter(a => el.closest('.scroll-fade')?.hasAttribute(a)).length)
    await caretAfter(p, 'шакшука в субботу')
    await keyboardUp(p)
    await p.waitForTimeout(700)
    let cut = await cutRows(p)
    expect(!cut.length, `cut at the edges: ${cut.join('; ')}`)
    expect(!(await fades()), 'the edges still fade while editing')
    const caret = await p.evaluate(() => getSelection().getRangeAt(0).getBoundingClientRect().bottom)
    const top = (await bar(p).boundingBox()).y
    expect(caret <= top, 'the caret\'s line is under the bar')
    // A line further up, then the ring's toast over the bar
    await select(p, 'Проверить, что ни одно не треснуло')
    await bar(p).getByRole('button', { name: 'Сделать подпунктом' }).click()
    await p.waitForTimeout(900)
    cut = await cutRows(p)
    expect(!cut.length, `cut at the edges after the ring: ${cut.join('; ')}`)
  } },

  // 8: «in «Вернуть книгу в библиотеку» type «Сначала дочитать @» → chips «24 книги за г…», «Атомные при…», «Ещё…»; type
  // a space → the face closes and «@ » stays text; pick «Атомные привычки» → a chip with the book glyph, «,» right after
  // it with no gap»
  { id: 'e-8-mention', device: MOBILE, run: async (p) => {
    await library(p)
    await p.keyboard.type(' @')
    const face = bar(p).getByRole('group', { name: 'Упомянуть' })
    expect(await shows(face), 'no «@» face')
    const chips = face.getByRole('button')
    const labels = await chips.evaluateAll(bs => bs.map(b => b.innerText.trim()))
    expect(labels[0] === '24 книги за год' && labels[1] === 'Атомные привычки', `the chips are ${labels.join(' / ')}`)
    const widths = await chips.evaluateAll(bs => bs.map(b => b.getBoundingClientRect()))
    const barBox = await bar(p).boundingBox()
    expect(widths.every(r => r.width <= 136.5), 'a chip is wider than 136')
    // Whole chips only: none is cut by the bar or by «Ещё…»
    const more = await bar(p).getByRole('button', { name: 'Ещё…' }).boundingBox()
    const shown = widths.filter(r => r.top < barBox.y + barBox.height - 4)
    expect(shown.length >= 1 && shown.length <= 3 && shown.every(r => r.right <= more.x), 'a chip under «Ещё…»')
    await p.keyboard.type(' ')
    await p.waitForTimeout(200)
    expect(!(await face.count()) && await shows(bar(p).getByRole('button', { name: 'Заголовок' })), 'a space did not close the face')
    expect((await bodyText(p)).includes('Сначала дочитать @ '), '«@ » did not stay text')
    await p.keyboard.press('Backspace')
    await p.keyboard.press('Backspace')
    await p.keyboard.type('@')
    await bar(p).getByRole('button', { name: 'Упомянуть «Атомные привычки»' }).click()
    await p.keyboard.type(', осталось две главы.')
    await p.waitForTimeout(200)
    const chip = editorOf(p).locator('.mention')
    expect(await chip.count() === 1 && (await chip.innerText()).includes('Атомные привычки'), 'no chip «Атомные привычки»')
    const glyph = await chip.locator('.mention-glyph').getAttribute('class')
    expect(/book/.test(glyph) && !/circle/.test(glyph), `the chip's glyph is ${glyph}`)
    const after = await chip.evaluate(el => el.nextSibling?.textContent ?? '')
    expect(after.startsWith(','), `after the chip comes «${after.slice(0, 5)}»`)
    const h = await chip.evaluate(el => el.getBoundingClientRect().height)
    expect(h <= 24, `the chip is ${h} high`)
    // Focused: a chip tap puts the caret right after it, and Backspace then takes it whole
    await chip.click()
    await p.keyboard.press('Backspace')
    expect(!(await editorOf(p).locator('.mention').count()), 'Backspace after a tapped chip did not take it')
    expect((await bodyText(p)).includes('дочитать , осталось') || (await bodyText(p)).includes('дочитать, осталось'), 'Backspace took more than the chip')
    await bar(p).getByRole('button', { name: 'Отменить ввод' }).click()
    await p.waitForTimeout(100)
    expect(await editorOf(p).locator('.mention').count() === 1, '↶ did not bring the chip back')
    // At rest: a chip tap opens the preview
    await bar(p).getByRole('button', { name: 'Готово' }).click()
    await p.waitForTimeout(300)
    await editorOf(p).locator('.mention').click()
    await p.waitForTimeout(600)
    expect(await shows(p.getByRole('dialog').getByText('Атомные привычки')), 'a chip at rest did not open the preview')
  } },
  { id: 'e-8-mention-more', device: MOBILE, run: async (p) => {
    await library(p)
    await p.keyboard.type(' @')
    await bar(p).getByRole('button', { name: 'Ещё…' }).click()
    await p.waitForTimeout(600)
    const field = p.getByRole('textbox', { name: 'Найти, что упомянуть' })
    expect(await shows(field), '«Ещё…» did not open «Связать» to mention')
    await field.fill('книги')
    await p.waitForTimeout(300)
    await p.getByRole('button', { name: 'Упомянуть «Книги»' }).click()
    await p.waitForTimeout(500)
    const chip = editorOf(p).locator('.mention')
    expect(await chip.count() === 1 && (await chip.innerText()).includes('Книги'), 'no chip «Книги» from «Ещё…»')
    expect(await focused(p), 'the caret did not come back to the text')
  } },

  // 9: «after item 8, «Связано» of the book record shows «Атомные привычки / Книги · в тексте»; open Атомные привычки →
  // «Вернуть книгу в библиотеку / Задачи · «Сначала дочитать …»»; delete the chip → both rows go»
  { id: 'e-9-linked', device: MOBILE, run: async (p) => {
    const id = await openRecord(p, 'Вернуть книгу в библиотеку')
    let rows = await related(p)
    expect(rows.some(r => r === 'Атомные привычки Книги · в тексте'), `«Связано» reads ${rows.join(' / ')}`)
    expect(rows.some(r => r.startsWith('24 книги за год')), 'the hand link «24 книги за год» is missing')
    const habits = await recId(p, 'Атомные привычки')
    await open(p, `/r/${habits}`)
    await p.locator('.ProseMirror.body-text').first().waitFor()
    rows = await related(p)
    expect(rows.some(r => r.startsWith('Вернуть книгу в библиотеку Задачи · «Сначала дочитать')), `the other side reads ${rows.join(' / ')}`)
    // Delete the chip: both rows go, the hand link stays
    await open(p, `/r/${id}`)
    await p.locator('.ProseMirror.body-text').first().waitFor()
    await editorOf(p).click({ position: { x: 4, y: 4 } })
    await editorOf(p).locator('.mention').click()
    await p.keyboard.press('Backspace')
    await bar(p).getByRole('button', { name: 'Готово' }).click()
    await p.waitForTimeout(500)
    rows = await related(p)
    expect(!rows.some(r => r.startsWith('Атомные привычки')) && rows.some(r => r.startsWith('24 книги за год')), `after deleting the chip: ${rows.join(' / ')}`)
    const other = await store(p, (data, rid) => data.relatedOf(rid).map(l => l.hit.kind === 'record' ? l.hit.rec.text : l.hit.page.title), habits)
    expect(!other.includes('Вернуть книгу в библиотеку'), 'the other side kept its row')
  } },
  // 9: «In «Связать» a mention's ✓ row says «упомянуто в тексте»; untick turns the chip into plain words»
  { id: 'e-9-untick', device: MOBILE, run: async (p) => {
    const id = await openRecord(p, 'Вернуть книгу в библиотеку')
    await p.getByRole('button', { name: /^Связать/ }).first().click()
    await p.waitForTimeout(600)
    const row = p.getByRole('list', { name: 'Что связать' }).getByRole('button', { name: /Атомные привычки/ })
    expect(await shows(row), 'no «Атомные привычки» in «Связать»')
    expect((await row.innerText()).includes('упомянуто в тексте'), `the row reads «${(await row.innerText()).replace(/\s+/g, ' ')}»`)
    expect(await row.getAttribute('aria-pressed') === 'true', 'the mention is not ticked')
    await row.click()
    await p.waitForTimeout(400)
    const body = await store(p, (data, rid) => JSON.stringify(data.records[rid].body), id)
    expect(!body.includes('"mention"') && body.includes('Атомные привычки'), 'untick did not turn the chip into words')
    expect(await row.getAttribute('aria-pressed') === 'false', 'still ticked after untick')
    await row.click()
    await p.waitForTimeout(400)
    const hand = await store(p, (data, rid) => data.records[rid].links, id)
    const habits = await recId(p, 'Атомные привычки')
    expect(hand.includes(habits), 'a second tap made no hand link')
  } },

  // 10: «Поиск «пробеж» → «Пробежать 5 км» … with «Пробеж» bold, and a snippet «…регулярность. Три пробежки в неделю…»
  // under the record that has it in its body»; D3: «Найти «пробеж» → Полумарафон with a snippet»
  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `e-10-search-${name}`, device, run: async (p) => {
    if (name === 'desktop') {
      await open(p, '/journal')
      await p.keyboard.press('Control+k')
    } else {
      await open(p, '/')
      await p.getByRole('button', { name: 'Найти' }).click()
    }
    await p.waitForTimeout(400)
    const field = name === 'desktop' ? p.getByRole('combobox', { name: 'Найти' }) : p.getByRole('searchbox', { name: 'Найти' })
    await field.fill('пробеж')
    await p.waitForTimeout(500)
    const scope = name === 'desktop' ? p.getByRole('dialog') : p.locator('body')
    const run5 = scope.getByRole(name === 'desktop' ? 'option' : 'button', { name: /Пробежать 5 км/ }).first()
    expect(await shows(run5), 'no «Пробежать 5 км»')
    const bold = await run5.locator('b').first().evaluate(b => ({ text: b.textContent, w: getComputedStyle(b).fontWeight }))
    expect(bold.text === 'Пробеж' && bold.w === '600', `the match is «${bold.text}» at ${bold.w}`)
    const marathon = scope.getByRole(name === 'desktop' ? 'option' : 'button', { name: /Полумарафон к маю/ }).last()
    const text = (await marathon.innerText()).replace(/\s+/g, ' ')
    expect(/…регулярность\. Три пробежки в неделю/.test(text), `Полумарафон reads «${text}»`)
    const snip = await marathon.locator('b').last().evaluate(b => ({ text: b.textContent, w: getComputedStyle(b).fontWeight, c: getComputedStyle(b).color }))
    expect(snip.text === 'пробеж' && snip.w === '600', `the snippet's match is «${snip.text}» at ${snip.w}`)
    // Names before bodies; a page note is read too
    const order = await scope.getByRole(name === 'desktop' ? 'option' : 'button').evaluateAll(bs => bs.map(b => b.innerText.split('\n')[0]))
    const at = t => order.findIndex(x => x.includes(t))
    expect(at('Длинная пробежка') < at('Полумарафон к маю'), 'a body hit comes before a name hit')
    await field.fill('щитка')
    await p.waitForTimeout(500)
    const page = scope.getByRole(name === 'desktop' ? 'option' : 'button', { name: /Дела по дому/ }).first()
    expect(await shows(page) && /Ключи от щитка/.test(await page.innerText()), 'a page note is not searched')
  } })),

  // 11: «type in a body, reload → the text is there; Настройки → «Сохранить копию» → Markdown: a mention reads
  // `[[Атомные привычки]]`»; two tabs; the old «Заметка» read as a body
  { id: 'e-11-save', device: MOBILE, run: async (p) => {
    const id = await openRecord(p, 'Хлеб')
    await editorOf(p).click()
    await p.keyboard.type('Бородинский, нарезка')
    await p.waitForTimeout(700)
    await p.reload()
    await p.locator('.ProseMirror.body-text').first().waitFor()
    await p.waitForTimeout(300)
    expect((await bodyText(p)).includes('Бородинский, нарезка'), 'the text was not there after reload')
    expect(!(await p.getByText(/сохранено/i).count()), 'something says «сохранено»')
    // Another tab changes it: this one shows the change
    const other = await p.context().newPage()
    await other.goto(`${BASE}/r/${id}`)
    await other.locator('.ProseMirror.body-text').first().waitFor()
    await other.waitForTimeout(300)
    await store(other, (data, rid) => data.setBody({ kind: 'record', id: rid }, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Из другой вкладки' }] }] }), id)
    await other.close()
    // As in v22: the open record says so and takes the change on «Обновить»
    expect(await shows(p.getByText('Запись изменили в другой вкладке')), 'no «Запись изменили в другой вкладке»')
    await p.getByRole('button', { name: 'Обновить' }).click()
    await p.waitForTimeout(400)
    expect((await bodyText(p)).includes('Из другой вкладки'), 'the other tab\'s change did not show after «Обновить»')
    // The old «Заметка» value is read as a one-paragraph body
    await openRecord(p, 'Полумарафон к маю')
    const legacy = await store(p, data => Object.values(data.records).find(r => r.text === 'Полумарафон к маю'))
    expect(!legacy.body && legacy.note, 'Полумарафон no longer has an old note')
    expect((await bodyText(p)).trim() === legacy.note.trim(), 'the old note is not the body')
  } },
  { id: 'e-11-markdown', device: DESKTOP, run: async (p) => {
    await open(p, '/settings')
    const md = p.getByRole('button', { name: 'Markdown', exact: true })
    if (!(await md.count())) {
      await p.getByRole('button', { name: /^Сохранить копию/ }).first().click()
      await p.waitForTimeout(400)
    }
    const download = p.waitForEvent('download')
    await p.getByRole('button', { name: 'Markdown', exact: true }).or(p.getByRole('menuitem', { name: /^Markdown/ })).first().click()
    const file = await download
    const text = await (await file.createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8'))
    expect(text.includes('[[Атомные привычки]]'), 'no [[Атомные привычки]] in the Markdown')
    expect(text.includes('[[Молоко]]'), 'no [[Молоко]] in the Markdown')
    expect(/Ключи от щитка/.test(text), 'the page note is not in the Markdown')
  } },

  // D2: «select «десяток» → Ctrl B → bold, Ctrl K → the address field; a caret with nothing selected → Ctrl K →
  // «Найти»; on a new empty line «/» → the tools at the caret, ↓ Enter → a bullet; «@» → three chips, ↓ Enter → a chip
  // and a «Связано» row on both records»
  { id: 'e-D2-keys', device: DESKTOP, run: async (p) => {
    await openRecord(p, 'Яйца')
    await select(p, 'десяток')
    await p.keyboard.press('Control+b')
    expect(await editorOf(p).locator('strong').innerText() === 'десяток', 'Ctrl B made nothing bold')
    await p.keyboard.press('Control+i')
    expect(await editorOf(p).locator('em').count() === 1, 'Ctrl I made nothing italic')
    const em = await editorOf(p).locator('em').evaluate(e => getComputedStyle(e).fontStyle)
    // Chromium serialises a plain «oblique» as «italic»; Onest has no italic face, so it is the synthesized slant either way
    expect(/oblique|italic/.test(em), `italic is ${em}`)
    expect(!(await p.evaluate(() => [...document.fonts].some(f => /onest/i.test(f.family) && f.style !== 'normal'))), 'an italic Onest is loaded')
    await p.keyboard.press('Control+k')
    const url = p.getByRole('textbox', { name: 'Адрес ссылки' })
    expect(await shows(url), 'Ctrl K did not open the address field')
    await url.fill('example.com')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(200)
    expect(await editorOf(p).locator('a').getAttribute('href') === 'https://example.com', 'the link was not applied')
    // Esc closes what is over the bar first
    await p.keyboard.press('Control+k')
    await url.waitFor()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(!(await url.count()) && await focused(p), 'Esc did not close the address field back to the text')
    await p.keyboard.press('Control+z')
    await p.keyboard.press('Control+z')
    await p.keyboard.press('Control+z')
    expect(!(await editorOf(p).locator('strong, em, a').count()), 'Ctrl Z did not step back')
    await p.keyboard.press('End')
    // the caret move reaches the editor with the next selectionchange, not with the key itself
    await p.waitForTimeout(150)
    await p.keyboard.press('Control+k')
    await p.waitForTimeout(400)
    expect(await shows(p.getByRole('combobox', { name: 'Найти' })), 'Ctrl K with nothing selected did not open «Найти»')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    // «/» on a new empty line
    await caretAfter(p, 'шакшука в субботу')
    await p.keyboard.press('Enter')
    await p.keyboard.press('Enter')
    await p.keyboard.type('/')
    const menu = p.getByRole('listbox', { name: /Вставить|Инструменты|\// }).or(p.locator('[data-body-keep][role="listbox"]'))
    expect(await shows(menu), 'no «/» tools')
    const items = await menu.first().getByRole('option').evaluateAll(os => os.map(o => o.innerText.replace(/\s+/g, ' ').trim()))
    expect(items.length === 5 && items[1].startsWith('Список'), `the tools are ${items.join(' / ')}`)
    const caretBox = await p.evaluate(() => getSelection().getRangeAt(0).getBoundingClientRect().toJSON())
    const menuBox = await menu.first().boundingBox()
    expect(Math.abs(menuBox.y - caretBox.bottom) < 40 && Math.abs(menuBox.x - caretBox.left) < 40, 'the tools are not at the caret')
    await p.keyboard.press('ArrowDown')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(200)
    expect(await editorOf(p).locator('ul').count() === 2 || await editorOf(p).locator('ul > li').count() === 3, '↓ Enter made no bullet')
    expect(!(await bodyText(p)).includes('/'), 'the «/» stayed')
    // Esc with the tools open closes them, then Esc is «Готово»
    await p.keyboard.press('Enter')
    await p.keyboard.press('Enter')
    await p.keyboard.type('/')
    await menu.first().waitFor()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(!(await menu.count()) && await focused(p), 'Esc did not close the tools first')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    expect(!(await bar(p).count()) && !(await focused(p)), 'the second Esc was not «Готово»')
  } },
  { id: 'e-D2-mention-keys', device: DESKTOP, run: async (p) => {
    const id = await library(p)
    await p.keyboard.type(' @')
    const face = bar(p).getByRole('group', { name: 'Упомянуть' })
    expect(await shows(face), 'no «@» face')
    const labels = await face.getByRole('button').evaluateAll(bs => bs.map(b => b.innerText.trim()))
    expect(labels.length === 3, `the chips are ${labels.join(' / ')}`)
    const widths = await face.getByRole('button').evaluateAll(bs => bs.map(b => b.getBoundingClientRect().width))
    expect(widths.every(w => w <= 220.5), 'a chip is wider than 220')
    await p.keyboard.press('ArrowDown')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    const chip = editorOf(p).locator('.mention')
    expect(await chip.count() === 1, '↓ Enter made no chip')
    const name = (await chip.innerText()).trim()
    expect(name === labels[1], `↓ Enter picked «${name}», not the second chip «${labels[1]}»`)
    await p.waitForTimeout(500)
    const mine = await store(p, (data, rid) => data.relatedOf(rid).filter(l => l.why === 'text').map(l => l.hit.kind === 'record' ? l.hit.rec.text : l.hit.page.title), id)
    expect(mine.includes(name), `no «Связано» row for «${name}»`)
    // The second chip is the record «Атомные привычки»: its «Связано» has the row too, as a quote
    const other = await store(p, (data, t) => {
      const o = Object.values(data.records).find(r => r.text === t)
      return o ? data.relatedOf(o.id).map(l => `${l.hit.kind === 'record' ? l.hit.rec.text : l.hit.page.title} ${l.why}`) : []
    }, name)
    expect(other.includes('Вернуть книгу в библиотеку quote'), `the other record's rows: ${other.join(' / ')}`)
  } },

  // D7: «open «Вернуть книгу в библиотеку» → the caption and the long line; click its body → «Подпунктов пока нет.»»
  ...[['phone', MOBILE], ['desktop', DESKTOP]].map(([name, device]) => ({ id: `e-D7-empty-subitems-${name}`, device, run: async (p) => {
    await openRecord(p, 'Вернуть книгу в библиотеку')
    expect(await shows(p.getByRole('heading', { name: 'Подпункты' })), 'no «Подпункты»')
    expect(await shows(p.getByText('Подпунктов пока нет. Пиши внизу, и они появятся здесь.')), 'no long empty line')
    await caretAfter(p, 'осталось две главы')
    expect(await shows(p.getByText('Подпунктов пока нет.', { exact: true })), 'the short line did not show while the body has focus')
  } }))
]
