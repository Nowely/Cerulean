// v24 delta, the templates slice: the «Check:» lines of items 3–6 («В заметку», «Сделать шаблоном», «Шаблоны» and the
// template's own page, a record by template), 28 and 29 (copy), and the desktop D1, D2, D7 and D8 for these. Встреча is
// seeded through the store, as the delta says; the demo seed itself has no Встреча.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DESKTOP, MOBILE, expect, open, send, shows, store } from './lib.mjs'

const NOW = new Date('2026-10-19T09:14:00+03:00')
const plain = s => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
const isDesk = p => p.viewportSize().width >= 1024
const notice = p => p.locator('[data-notice]')

/** Встреча on Задачи: чт 22 окт, «вручную · 16 окт», its body, three subitems with the first done */
export const seedMeeting = p => store(p, (data) => {
  const pg = data.livePages.find(x => x.title === 'Задачи')
  const at = new Date('2026-10-16T12:00:00+03:00').getTime()
  const r = data.addRecord({ pageId: pg.id, text: 'Встреча', due: { date: '2026-10-22' }, via: 'manual', addedAt: at })
  const para = text => ({ type: 'paragraph', content: [{ type: 'text', text }] })
  const head = text => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
  data.setBody({ kind: 'record', id: r.id }, { type: 'doc', content: [
    head('Повестка'),
    { type: 'bulletList', content: ['что сделано за неделю', 'что мешает', 'решения и сроки'].map(t => ({ type: 'listItem', content: [para(t)] })) },
    head('Итоги'),
    para('Кто что делает и к какому сроку. Разослать в тот же день.')
  ] })
  const subs = ['Разослать повестку', 'Записать решения', 'Отправить итоги'].map(text => data.addRecord({ pageId: pg.id, parentId: r.id, text, via: 'manual', addedAt: at }))
  data.updateRecord(subs[0].id, { done: true, doneAt: at, tickedAt: at })
  return r.id
})

/** Встреча's template on Задачи, as «Сделать шаблоном» makes it */
const seedTemplate = p => store(p, (data) => {
  const r = data.liveRecords.find(x => x.text === 'Встреча' && !x.parentId)
  return data.makeTemplate(r.id).tpl.id
})
const templatesOf = (p, title) => store(p, (data, t) => (data.livePages.find(x => x.title === t)?.templates ?? []).map(x => ({ name: x.name, subs: x.subs, body: !!x.body })), title)
const recordId = (p, text) => store(p, (data, t) => data.liveRecords.find(r => r.text === t && !r.parentId)?.id, text)

/** In-app navigation: what was just seeded may not be on disk yet, so the page is never reloaded */
async function go(p, path) {
  await p.evaluate(to => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), path)
  await p.waitForTimeout(600)
}
async function openRecord(p, text) {
  const id = await recordId(p, text)
  expect(id, `no record «${text}»`)
  await go(p, `/r/${id}`)
}
async function openTasks(p) {
  await go(p, `/p/${await store(p, data => data.livePages.find(x => x.title === 'Задачи').id)}`)
}
/** Встреча on Задачи with its template, then Задачи */
async function withTemplate(p) {
  await p.clock.install({ time: NOW })
  await open(p, '/')
  await seedMeeting(p)
  await seedTemplate(p)
  await openTasks(p)
}

/** The visible «⋯» named `label` (a phone header or the desktop title row) */
async function dots(p, label) {
  await p.locator(`button[aria-label="${label}"]:visible`).first().click()
  await p.waitForTimeout(500)
}
/** The rows of the open «⋯», as read: «Переместить на другую страницу · Задачи», «Шаблоны 1» */
const menuRows = p => isDesk(p)
  ? p.getByRole('menuitem').evaluateAll(els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()))
  : p.getByRole('dialog').last().locator('button').evaluateAll(els => els.map(e => [...e.querySelectorAll('span')].filter(s => !s.querySelector('span') && s.textContent.trim()).map(s => s.textContent.trim()).join(' · ') || e.textContent.trim()))
const menuRow = (p, name) => isDesk(p) ? p.getByRole('menuitem', { name }) : p.getByRole('dialog').last().getByRole('button', { name })

/** The composer chip: its words and its glyph («i-cer:ring», «i-cer:stamp») */
const chipOf = p => p.locator('form button[aria-label^="Куда"]').first().evaluate(b => ({
  text: b.querySelector('.truncate')?.textContent.trim(),
  icon: [...b.querySelector('.iconify')?.classList ?? []].find(c => c.startsWith('i-')) ?? ''
}))
const field = p => p.locator('form textarea').first()

/** The body's blocks as read */
const bodyBlocks = p => p.locator('main .body-text').filter({ visible: true }).first().evaluate(el => [...el.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()))

/** The rows of the «Шаблоны» sheet or popover */
const templatesLayer = p => p.getByRole('dialog', { name: /^Шаблоны/ })

export default [
  // 3: «В заметку» in the record composer chip
  ...[MOBILE, DESKTOP].map(device => ({ id: `t24-03-to-note${device === DESKTOP ? '-desktop' : ''}`, device, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await openRecord(p, 'Яйца')
    let chip = await chipOf(p)
    expect(chip.text === 'Подпункт' && chip.icon === 'i-cer:ring', `the chip reads «${chip.text}» with ${chip.icon}`)
    const subsBefore = await store(p, (data, id) => data.subitemsOf(id).map(s => s.text), await recordId(p, 'Яйца'))
    await p.locator('form button[aria-label^="Куда"]').first().click()
    const sheet = p.getByRole('dialog', { name: 'Куда записать' })
    expect(await shows(sheet), 'no «Куда записать»')
    await p.waitForTimeout(500)
    expect(plain(await sheet.locator('h2 + p:visible').first().textContent()) === 'Яйца', 'the record\'s name is not under the title')
    const rows = await sheet.locator('li button').evaluateAll(bs => bs.map(b => ({ text: [...b.querySelectorAll('span.truncate, span.shrink-0.text-meta')].map(s => s.textContent.trim()).join(' · '), on: b.getAttribute('aria-current') === 'true' })))
    expect(rows.length === 2, `${rows.length} rows`)
    expect(rows[0].text === 'Подпункт · строкой в «Подпунктах»' && rows[0].on, `row 1 reads «${rows[0].text}»${rows[0].on ? '' : ', no check'}`)
    expect(rows[1].text === 'В заметку · абзацем в конце заметки' && !rows[1].on, `row 2 reads «${rows[1].text}»`)
    expect(!(await sheet.locator('input').count()), 'the sheet has a search field')
    const box = await sheet.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const last = [...el.querySelectorAll('li button')].at(-1).getBoundingClientRect()
      const scroller = el.querySelector('.overflow-y-auto')
      return { under: r.bottom - last.bottom, width: r.width, bottom: r.bottom, scrolls: scroller ? scroller.scrollHeight > scroller.clientHeight + 1 : false }
    })
    if (isDesk(p)) {
      // D1: 400px right above the chip, sized to its two rows with no scroll
      const chipTop = await p.locator('form button[aria-label^="Куда"]').first().evaluate(b => b.getBoundingClientRect().top)
      expect(Math.abs(box.width - 400) <= 2, `the popover is ${box.width}px wide`)
      expect(box.bottom <= chipTop && chipTop - box.bottom < 16, `the popover ends ${chipTop - box.bottom}px above the chip`)
      expect(!box.scrolls, 'the popover scrolls')
      // D2: Esc closes it; Enter on a row picks it
      await p.keyboard.press('Escape')
      await p.waitForTimeout(400)
      expect(!(await sheet.count()), 'Esc does not close «Куда записать»')
      await p.locator('form button[aria-label^="Куда"]').first().click()
      await p.waitForTimeout(500)
      await sheet.getByRole('button', { name: /^В заметку/ }).focus()
      await p.keyboard.press('Enter')
    } else {
      expect(Math.abs(box.under - 22) <= 3, `the sheet ends ${box.under}pt under the second row`)
      await sheet.getByRole('button', { name: /^В заметку/ }).click()
    }
    await p.waitForTimeout(700)
    expect(!(await sheet.count()), 'the pick does not close the sheet')
    expect(await field(p).getAttribute('placeholder') === 'Новый абзац', `placeholder «${await field(p).getAttribute('placeholder')}»`)
    await field(p).fill('мама просила ещё перепелиные, если будут.')
    if (isDesk(p)) expect(await p.locator('form button[type="submit"]').getAttribute('aria-label') === 'Добавить абзац', 'the send button keeps its old name')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(600)
    let blocks = await bodyBlocks(p)
    expect(blocks.at(-1) === 'Мама просила ещё перепелиные, если будут.', `the last paragraph reads «${blocks.at(-1)}»`)
    expect(await shows(p.locator('main .fresh-tint')), 'the paragraph is not tinted fresh')
    expect(await field(p).inputValue() === '', 'the field keeps the text')
    expect(await field(p).evaluate(el => el === document.activeElement), 'the field lost the focus (the keyboard went down)')
    chip = await chipOf(p)
    expect(chip.text === 'В заметку' && chip.icon === 'i-cer:note', `after the send the chip reads «${chip.text}»`)
    await field(p).fill('и ещё один абзац')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(600)
    blocks = await bodyBlocks(p)
    expect(blocks.at(-2) === 'Мама просила ещё перепелиные, если будут.' && blocks.at(-1) === 'И ещё один абзац', `the body ends «${blocks.slice(-2).join(' / ')}»`)
    const subsAfter = await store(p, (data, id) => data.subitemsOf(id).map(s => s.text), await recordId(p, 'Яйца'))
    expect(JSON.stringify(subsAfter) === JSON.stringify(subsBefore), '«Подпункты» changed')
    // ↶ in the editing bar (Ctrl Z on desktop) takes the last paragraph back
    await p.locator('main .ProseMirror').first().getByText('Брать С0').click()
    await p.waitForTimeout(400)
    if (isDesk(p)) await p.keyboard.press('Control+z')
    else await p.getByRole('button', { name: 'Отменить' }).first().click()
    await p.waitForTimeout(500)
    blocks = await bodyBlocks(p)
    expect(blocks.at(-1) === 'Мама просила ещё перепелиные, если будут.', `after ↶ the body ends «${blocks.at(-1)}»`)
    // The next record opened: «Подпункт» again
    await p.goBack()
    await p.waitForTimeout(400)
    await openRecord(p, 'Молоко')
    chip = await chipOf(p)
    expect(chip.text === 'Подпункт', `Молоко's chip reads «${chip.text}»`)
  } })),

  // 4: «Сделать шаблоном» (and 29: the toasts without quotes on the page)
  ...[MOBILE, DESKTOP].map(device => ({ id: `t24-04-make${device === DESKTOP ? '-desktop' : ''}`, device, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await seedMeeting(p)
    await openRecord(p, 'Встреча')
    await dots(p, 'Действия с записью')
    // The mockup's rows in its order; «Добавить в избранное» stays between them (kept from v21)
    const rows = (await menuRows(p)).map(r => plain(r).replace(/\s*·\s*|\s+/g, ''))
    const want = ['Переименовать', 'Переместить на другую страницу · Задачи', 'Сделать шаблоном', 'Скопировать как текст', 'Удалить'].map(w => w.replace(/\s*·\s*|\s+/g, ''))
    expect(JSON.stringify(rows.filter(r => want.includes(r))) === JSON.stringify(want), `the «⋯» reads ${JSON.stringify(rows)}`)
    await menuRow(p, 'Сделать шаблоном').click()
    await p.waitForTimeout(900)
    expect(!(await p.getByRole(isDesk(p) ? 'menu' : 'dialog').count()), 'the menu stays open')
    expect(await shows(notice(p).filter({ hasText: 'Шаблон «Встреча» сохранён в Задачи' })), `the toast reads «${plain(await notice(p).first().textContent().catch(() => ''))}»`)
    expect(await shows(notice(p).getByRole('button', { name: 'Отменить' })), 'no «Отменить» in the toast')
    expect(!(await notice(p).filter({ hasText: 'в «Задачи»' }).count()), 'the toast quotes the page')
    let list = await templatesOf(p, 'Задачи')
    expect(list.length === 1 && list[0].name === 'Встреча' && list[0].body && list[0].subs.join('|') === 'Разослать повестку|Записать решения|Отправить итоги', `templates: ${JSON.stringify(list)}`)
    // «Отменить» on the first toast leaves no template, and Задачи's «⋯» has no «Шаблоны»
    await notice(p).getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(400)
    expect(!(await templatesOf(p, 'Задачи')).length, '«Отменить» left a template')
    await dots(p, 'Действия с записью')
    await menuRow(p, 'Сделать шаблоном').click()
    await p.waitForTimeout(900)
    await dots(p, 'Действия с записью')
    await menuRow(p, 'Сделать шаблоном').click()
    await p.waitForTimeout(900)
    expect(await shows(notice(p).filter({ hasText: 'Шаблон «Встреча» обновлён в Задачи' })), `again, the toast reads «${plain(await notice(p).first().textContent().catch(() => ''))}»`)
    list = await templatesOf(p, 'Задачи')
    expect(list.length === 1, `${list.length} templates after making it twice`)
    // Встреча is still a row of Задачи with «1/3»
    await openTasks(p)
    const row = p.locator('main li').filter({ hasText: 'Встреча' }).first()
    expect(await shows(row), 'Встреча left Задачи')
    expect(plain(await row.textContent()).includes('1/3'), `Встреча's row reads «${plain(await row.textContent())}»`)
    await store(p, data => data.removeTemplate(data.livePages.find(x => x.title === 'Задачи').templates[0].id))
    await dots(p, isDesk(p) ? 'Действия со страницей' : 'Действия со страницей')
    expect(!(await menuRows(p)).some(r => r.startsWith('Шаблоны')), 'Задачи «⋯» has «Шаблоны» with no template')
  } })),

  // 5: «Шаблоны» and the template's own page
  ...[MOBILE, DESKTOP].map(device => ({ id: `t24-05-templates${device === DESKTOP ? '-desktop' : ''}`, device, run: async (p) => {
    await withTemplate(p)
    await dots(p, 'Действия со страницей')
    const rows = (await menuRows(p)).map(plain)
    const at = rows.findIndex(r => /^Шаблоны\s?·?\s?1$/.test(r))
    expect(at >= 0 && /^Скопировать как текст/.test(rows[at + 1] ?? ''), `the page «⋯» reads ${JSON.stringify(rows)}`)
    // Desktop: after «Настроить вид» (no «Свойства» row there in the mockup); the phone: after «Свойства»
    expect(/^(Свойства|Настроить вид)/.test(rows[at - 1] ?? ''), `«Шаблоны» follows «${rows[at - 1]}»`)
    await menuRow(p, /^Шаблоны/).click()
    const sheet = templatesLayer(p)
    expect(await shows(sheet), 'no «Шаблоны»')
    await p.waitForTimeout(500)
    const head = plain(await sheet.locator('h2:visible').first().textContent()) + ' / ' + plain(await sheet.locator('h2 + p:visible').first().textContent())
    expect(head === 'Шаблоны / Задачи', `the sheet heads «${head}»`)
    const items = await sheet.locator('li').evaluateAll(lis => lis.map(li => ({
      stamp: !!li.querySelector('.i-cer\\:stamp'),
      text: [...li.querySelectorAll('span.truncate')].map(s => s.textContent.trim()).join(' · '),
      plus: li.querySelectorAll('button').length === 2 && li.querySelectorAll('button')[1].getAttribute('aria-label')
    })))
    expect(items.length === 1 && items[0].stamp && items[0].text === 'Встреча · текст и 3 подпункта' && items[0].plus === 'Запись по шаблону «Встреча»', `rows: ${JSON.stringify(items)}`)
    if (isDesk(p)) {
      // D1: 340px at the «⋯»; a click outside closes it
      const w = await sheet.evaluate(el => el.getBoundingClientRect().width)
      expect(Math.abs(w - 340) <= 2, `the popover is ${w}px wide`)
      const dotsBox = await p.locator('button[aria-label="Действия со страницей"]:visible').first().boundingBox()
      const box = await sheet.boundingBox()
      expect(Math.abs(box.x + box.width - (dotsBox.x + dotsBox.width)) <= 2 && box.y >= dotsBox.y + dotsBox.height, 'the popover does not stand at «⋯»')
      await p.mouse.click(700, 700)
      await p.waitForTimeout(500)
      expect(!(await sheet.count()), 'a click outside does not close «Шаблоны»')
      await dots(p, 'Действия со страницей')
      await menuRow(p, /^Шаблоны/).click()
      await p.waitForTimeout(500)
    }
    await sheet.getByRole('button', { name: 'Открыть шаблон «Встреча»' }).click()
    await p.waitForURL(/\/t\//)
    await p.waitForTimeout(600)
    // The template's page: stamp, name, «Шаблон для новых записей», body, three dotted subitems, nothing else
    expect(await p.locator('main [role="img"][aria-label="Шаблон"]').count(), 'no stamp in the checkbox slot')
    expect(await p.getByRole('textbox', { name: 'Название шаблона' }).inputValue() === 'Встреча', 'the title is not «Встреча»')
    expect(await shows(p.getByText('Шаблон для новых записей')), 'no «Шаблон для новых записей»')
    const blocks = await bodyBlocks(p)
    expect(blocks.includes('Повестка') && blocks.includes('Итоги'), `the body reads ${JSON.stringify(blocks)}`)
    const subs = await p.getByRole('textbox', { name: 'Подпункт шаблона' }).evaluateAll(els => els.map(e => e.value))
    expect(subs.join('|') === 'Разослать повестку|Записать решения|Отправить итоги', `subitems: ${JSON.stringify(subs)}`)
    expect(!(await p.locator('main [role="checkbox"]').count()), 'a checkbox on the template page')
    expect(await p.locator('main section .bg-ring.rounded-full').count() === 3, 'the subitems have no dots')
    for (const word of ['Связать', 'Связано', 'Добавлено', 'Срок']) expect(!(await p.locator('main').getByText(word, { exact: true }).count()), `«${word}» on the template page`)
    // Edit in place: Esc puts back, an emptied one goes on Enter
    const second = p.getByRole('textbox', { name: 'Подпункт шаблона' }).nth(1)
    await second.click()
    await second.fill('Записать всё')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
    expect(await second.inputValue() === 'Записать решения', `after Esc it reads «${await second.inputValue()}»`)
    expect((await templatesOf(p, 'Задачи'))[0].subs[1] === 'Записать решения', 'Esc saved the edit')
    const third = p.getByRole('textbox', { name: 'Подпункт шаблона' }).nth(2)
    await third.click()
    await third.fill('')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    expect((await templatesOf(p, 'Задачи'))[0].subs.join('|') === 'Разослать повестку|Записать решения', 'an emptied subitem stays')
    // Not a record: Задачи's rows and count, Поиск
    const counts = await store(p, (data) => {
      const pg = data.livePages.find(x => x.title === 'Задачи')
      return { recs: data.liveRecords.filter(r => r.pageId === pg.id && !r.parentId && r.text === 'Встреча').length }
    })
    expect(counts.recs === 1, `${counts.recs} records «Встреча»`)
    await p.getByRole('button', { name: 'Действия с шаблоном' }).filter({ visible: true }).first().click()
    await p.waitForTimeout(500)
    const tplRows = (await menuRows(p)).map(plain)
    expect(tplRows.length === 2 && tplRows[0] === 'Переименовать' && /^Удалить шаблон.*Записи по нему останутся/.test(tplRows[1]), `the template «⋯» reads ${JSON.stringify(tplRows)}`)
    await menuRow(p, /^Удалить шаблон/).click()
    await p.waitForURL(/\/p\//)
    await p.waitForTimeout(700)
    expect(await shows(notice(p).filter({ hasText: 'Шаблон «Встреча» удалён' })), `the toast reads «${plain(await notice(p).first().textContent().catch(() => ''))}»`)
    expect(!(await templatesOf(p, 'Задачи')).length, 'the template is still there')
    await notice(p).getByRole('button', { name: 'Отменить' }).click()
    await p.waitForTimeout(400)
    expect((await templatesOf(p, 'Задачи')).length === 1, '«Отменить» does not bring the template back')
    // Задачи's rows: one Встреча; Поиск «встреча» finds only the record
    expect(await p.locator('main li').filter({ hasText: /^Встреча/ }).count() <= 1, 'the template shows as a row')
    await go(p, '/')
    await p.getByRole('button', { name: 'Найти' }).first().click()
    await p.waitForTimeout(400)
    // The phone's Поиск is a sheet with a search field; desktop Найти a palette with a combobox and its options
    await p.getByRole(isDesk(p) ? 'combobox' : 'searchbox', { name: 'Найти' }).fill('встреча')
    await p.waitForTimeout(500)
    const found = await (isDesk(p) ? p.getByRole('option') : p.getByRole('dialog', { name: 'Поиск' }).locator('li')).filter({ hasText: 'Встреча' }).count()
    expect(found === 1, `Поиск finds ${found} «Встреча»`)
  } })),

  // 6: a record by template (and D7 on desktop: the 36px «+» with its tooltip)
  ...[MOBILE, DESKTOP].map(device => ({ id: `t24-06-by-template${device === DESKTOP ? '-desktop' : ''}`, device, run: async (p) => {
    await withTemplate(p)
    await p.locator('form button[aria-label^="Куда"]').first().click()
    const picker = p.getByRole('dialog').last()
    await p.waitForTimeout(600)
    const lines = await picker.evaluate(el => [...el.querySelectorAll('ul > li > button, section > h3, section')].map((n) => {
      if (n.tagName === 'SECTION') return null
      if (n.tagName === 'H3') return `# ${n.textContent.trim()}`
      return [...n.querySelectorAll('span.truncate')].map(s => s.textContent.trim()).join(' · ') + (n.querySelector('.i-lucide\\:check') ? ' ✓' : '')
    }).filter(Boolean))
    const top = lines.slice(0, 5)
    expect(top[0] === 'Эта страница · Задачи ✓' && /^Авто · /.test(top[1]) && top[2] === '# Шаблоны' && top[3] === 'Встреча · текст и 3 подпункта' && top[4]?.startsWith('# '), `the picker reads ${JSON.stringify(lines.slice(0, 6))}`)
    await picker.getByRole('button', { name: /^Встреча/ }).click()
    await p.waitForTimeout(500)
    let chip = await chipOf(p)
    expect(chip.text === 'По шаблону' && chip.icon === 'i-cer:stamp', `the chip reads «${chip.text}» with ${chip.icon}`)
    await field(p).fill('созвон с Лизой')
    await p.waitForTimeout(300)
    expect(await shows(p.getByText('→ Задачи · по шаблону «Встреча», только эта запись')), 'no guess line «→ Задачи · по шаблону «Встреча», только эта запись»')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(700)
    const first = p.locator('main li').first()
    const row = plain(await first.textContent())
    const name = plain(await first.locator('[data-row-text]').first().textContent())
    expect(name.startsWith('Созвон с Лизой') && row.includes('0/3'), `the top row reads «${row}»`)
    expect(await first.locator('.fresh-tint').count(), 'the new row is not fresh')
    expect(await first.locator('[class*="i-cer:note"], [class*="file-text"]').count(), 'the new row has no note glyph')
    expect(await shows(p.getByText('5 дел · 1 просрочено')), 'the header does not read «5 дел · 1 просрочено»')
    chip = await chipOf(p)
    expect(chip.text === 'Задачи', `after the send the chip reads «${chip.text}»`)
    expect(!(await notice(p).count()), `a toast: «${plain(await notice(p).first().textContent().catch(() => ''))}»`)
    const made = await store(p, (data) => {
      const r = data.liveRecords.find(x => x.text === 'Созвон с Лизой')
      return { body: JSON.stringify(r.body ?? null), subs: data.subitemsOf(r.id).map(s => `${s.text}${s.done ? '+' : ''}`) }
    })
    expect(made.body.includes('Повестка') && made.subs.join('|') === 'Разослать повестку|Записать решения|Отправить итоги', `the record holds ${JSON.stringify(made)}`)
    // «⋯» → «Шаблоны» → «+»
    await dots(p, 'Действия со страницей')
    await menuRow(p, /^Шаблоны/).click()
    const sheet = templatesLayer(p)
    await sheet.waitFor()
    await p.waitForTimeout(500)
    const plus = sheet.getByRole('button', { name: 'Запись по шаблону «Встреча»' })
    if (isDesk(p)) {
      const size = await plus.boundingBox()
      expect(Math.round(size.width) === 36 && Math.round(size.height) === 36, `the «+» is ${size.width}×${size.height}`)
      await plus.hover()
      expect(await shows(p.getByRole('tooltip').filter({ hasText: 'Запись по шаблону' })), 'no tooltip «Запись по шаблону»')
    }
    await plus.click()
    await p.waitForTimeout(1000)
    expect(!(await sheet.count()), 'the sheet stays open')
    chip = await chipOf(p)
    expect(chip.text === 'По шаблону' && chip.icon === 'i-cer:stamp', `after «+» the chip reads «${chip.text}»`)
    expect(await field(p).evaluate(el => el === document.activeElement), 'the caret is not in the field')
    if (isDesk(p)) expect(await shows(p.getByText('→ Задачи · по шаблону «Встреча», только эта запись')), 'no guess line after «+»')
    // Сегодня (no templates there); На неделе too once the collecting slice brings it
    for (const title of ['Сегодня', 'На неделе']) {
      const id = await store(p, (data, t) => data.livePages.find(x => x.title === t)?.id, title)
      if (!id) continue
      await go(p, `/p/${id}`)
      await p.locator('form button[aria-label^="Куда"]').first().click()
      await p.waitForTimeout(600)
      expect(!(await p.getByRole('dialog').last().getByRole('heading', { name: 'Шаблоны' }).count()), `${title}'s chip lists templates`)
      await p.keyboard.press('Escape')
    }
  } })),

  // 28: «Переместить на другую страницу», and no UI string says «в другую страницу»
  ...[MOBILE, DESKTOP].map(device => ({ id: `t24-28-move-words${device === DESKTOP ? '-desktop' : ''}`, device, run: async (p) => {
    await open(p, '/')
    await openRecord(p, 'Яйца')
    await dots(p, 'Действия с записью')
    const rows = (await menuRows(p)).map(plain)
    expect(rows.some(r => /^Переместить на другую страницу\s?·?\s?Покупки$/.test(r)), `Яйца «⋯» reads ${JSON.stringify(rows)}`)
    await p.keyboard.press('Escape')
    // The receipt's «Не туда» chips are the group «Переместить на другую страницу»
    await go(p, '/')
    await send(p, 'купить батарейки')
    await p.getByRole('button', { name: 'Не туда' }).first().click()
    await p.waitForTimeout(400)
    expect(await shows(p.getByRole('group', { name: 'Переместить на другую страницу' })), 'the «Не туда» chips have no group «Переместить на другую страницу»')
    const app = new URL('../../app/', import.meta.url).pathname
    const walk = dir => readdirSync(dir).flatMap(f => statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)])
    const hits = walk(app).filter(f => /\.(vue|ts)$/.test(f) && readFileSync(f, 'utf8').includes('в другую страницу'))
    expect(!hits.length, `«в другую страницу» in ${hits.join(', ')}`)
  } })),

  // 29 and D8: the template toasts name the page without quotes; on desktop the toast sits above the composer, at its right end
  { id: 't24-29-toast-words-desktop', device: DESKTOP, run: async (p) => {
    await p.clock.install({ time: NOW })
    await open(p, '/')
    await seedMeeting(p)
    await openRecord(p, 'Встреча')
    await dots(p, 'Действия с записью')
    await menuRow(p, 'Сделать шаблоном').click()
    const toast = notice(p).filter({ hasText: 'Шаблон «Встреча» сохранён в Задачи' })
    expect(await shows(toast), 'no «Шаблон «Встреча» сохранён в Задачи»')
    const t = await toast.boundingBox()
    const c = await p.locator('form').first().boundingBox()
    expect(t.y + t.height <= c.y + 1 && c.y - (t.y + t.height) < 24, 'the toast is not right above the composer')
    expect(Math.abs(t.x + t.width - (c.x + c.width)) <= 2, `the toast ends ${c.x + c.width - t.x - t.width}px left of the composer's right end`)
  } },

  // D2: template subitems keep on Enter or leaving, Esc puts back, Alt+↑/↓ moves
  { id: 't24-d2-template-subs-desktop', device: DESKTOP, run: async (p) => {
    await withTemplate(p)
    await go(p, `/t/${await store(p, data => data.livePages.find(x => x.title === 'Задачи').templates[0].id)}`)
    const subs = p.getByRole('textbox', { name: 'Подпункт шаблона' })
    const size = await subs.first().evaluate(el => getComputedStyle(el).fontSize)
    expect(size === '15px', `subitems are ${size}`)
    await subs.nth(0).click()
    await p.keyboard.press('End')
    await p.keyboard.type(' всем')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    expect(await subs.nth(0).inputValue() === 'Разослать повестку', 'Esc does not put the text back')
    await subs.nth(0).click()
    await p.keyboard.press('Alt+ArrowDown')
    await p.waitForTimeout(300)
    const order = (await templatesOf(p, 'Задачи'))[0].subs.join('|')
    expect(order === 'Записать решения|Разослать повестку|Отправить итоги', `after Alt+↓: ${order}`)
    expect(await subs.nth(1).evaluate(el => el === document.activeElement), 'the caret did not move with it')
    await p.keyboard.press('Alt+ArrowUp')
    await p.waitForTimeout(300)
    expect((await templatesOf(p, 'Задачи'))[0].subs[0] === 'Разослать повестку', 'Alt+↑ does not move it back')
    await subs.nth(2).click()
    await p.keyboard.press('End')
    await p.keyboard.type(' к пятнице')
    await p.locator('main').getByText('Шаблон для новых записей').click()
    await p.waitForTimeout(200)
    expect((await templatesOf(p, 'Задачи'))[0].subs[2] === 'Отправить итоги к пятнице', 'leaving the field does not keep the edit')
    // The composer writes into the template: a subitem, then a paragraph «В заметку»
    await field(p).fill('обсудить бюджет')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(400)
    expect((await templatesOf(p, 'Задачи'))[0].subs.at(-1) === 'Обсудить бюджет', 'the composer does not add a subitem to the template')
    await p.locator('form button[aria-label^="Куда"]').first().click()
    await p.waitForTimeout(500)
    await p.getByRole('dialog', { name: 'Куда записать' }).getByRole('button', { name: /^В заметку/ }).click()
    await p.waitForTimeout(500)
    await field(p).fill('пригласить Лизу')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(600)
    const blocks = await bodyBlocks(p)
    expect(blocks.at(-1) === 'Пригласить Лизу', `the template's body ends «${blocks.at(-1)}»`)
    const body = await store(p, data => JSON.stringify(data.livePages.find(x => x.title === 'Задачи').templates[0].body))
    expect(body.includes('Пригласить Лизу'), 'the paragraph is not in the template')
    // Its body is edited as on a record
    await p.locator('main .ProseMirror').first().getByText('Итоги').click()
    await p.keyboard.press('End')
    await p.keyboard.type(' недели')
    await p.waitForTimeout(800)
    const edited = await store(p, data => JSON.stringify(data.livePages.find(x => x.title === 'Задачи').templates[0].body))
    expect(edited.includes('Итоги недели'), 'an edit of the body does not reach the template')
  } }
]
