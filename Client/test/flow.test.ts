// The main flow (first open → first record → its note): how the field reads a line, by the rules and with a model,
// and what Главная's cards say. Each case is a «Check:» of handoff/main-flow-delta.md
import { describe, expect, it } from 'vitest'
import type { Page, Rec } from '~/domain/types'
import { firstRun } from '~/domain/seed'
import { fieldDate, readLine, readModel, type LineContext } from '~/domain/auto'
import { readDue, splitParts } from '~/domain/parse'
import { learnWord } from '~/domain/rules'
import { cardLine } from '~/domain/summary'
import { newRecord } from '~/domain/factory'
import { onlyCollects } from '~/domain/collect'

// Monday 19 October 2026, 9:14: the moment of the mockups
const NOW = new Date(2026, 9, 19, 9, 14).getTime()
const TOMORROW = '2026-10-20'

function day() {
  const pages = firstRun(NOW).pages
  const by = (title: string) => pages.find(p => p.title === title)!
  const inbox = pages.find(p => p.kind === 'inbox')!
  const ctx = (extra: Partial<LineContext> = {}): LineContext => ({
    pages: pages.filter(p => !onlyCollects(p)),
    inboxId: inbox.id,
    learned: {},
    recent: [],
    now: NOW,
    ...extra
  })
  return { pages, by, inbox, ctx }
}

/** [title, page, by, due] of each record the field would add */
const read = (title: string, ctx: LineContext, note = '') => readLine(title, note, ctx).drafts.map(d => [d.text, ctx.pages.find(p => p.id === d.pageId)!.title, d.by, d.due])

describe('the field without a model (Josh 28 Oct, 4 and 9)', () => {
  it('sorts nothing: a line goes where the chip says, Входящие unless a place was picked, and the date is read', () => {
    const { by, ctx } = day()
    expect(read('Купить молоко', ctx())).toEqual([['Купить молоко', 'Входящие', 'auto', null]])
    expect(read('Позвонить маме завтра в 10', ctx())).toEqual([['Позвонить маме', 'Входящие', 'auto', { date: TOMORROW, time: '10:00' }]])
    // Learned words are not used
    const learned = learnWord({}, 'Подарок Оле', by('Идеи').id)
    expect(read('Подарок Пете', ctx({ learned }))).toEqual([['Подарок Пете', 'Входящие', 'auto', null]])
  })

  it('never splits a line: one line is one record, and Покупки still drops «купить» and reads the department', () => {
    const { by, ctx } = day()
    const shop = by('Покупки')
    expect(read('Купить сыр, кофе, чай', ctx({ place: { pageId: shop.id, by: 'user' } }))).toEqual([['Сыр, кофе, чай', 'Покупки', 'user', null]])
    expect(read('Хлеб, батон', ctx({ place: { pageId: shop.id, by: 'page' } })).map(d => d[0])).toEqual(['Хлеб, батон'])
    expect(read('Купить молоко и позвонить маме', ctx({ live: true }))).toHaveLength(1)
    const dept = shop.props.find(p => p.type === 'select')!
    const [milk] = readLine('Купить молоко', '', ctx({ place: { pageId: shop.id, by: 'user' } })).drafts
    expect(dept.options!.find(o => o.id === milk!.values[dept.id])?.name).toBe('Молочное')
  })
})

describe('the field\'s rules with a model, before it answers (main flow, items 4–8)', () => {
  it('shows the place Авто chose, and Входящие when it is unsure (item 5)', () => {
    const { ctx } = day()
    expect(read('Купить молоко', ctx({ sort: true }))).toEqual([['Молоко', 'Покупки', 'auto', null]])
    expect(read('Подарок Оле', ctx({ sort: true }))).toEqual([['Подарок Оле', 'Входящие', 'auto', null]])
  })

  it('learns a place picked by hand from the first word longer than two letters, «купить» skipped (item 5)', () => {
    const { by, ctx } = day()
    const ideas = by('Идеи')
    const learned = learnWord({}, 'Подарок Оле', ideas.id)
    expect(Object.values(learned)).toEqual([ideas.id])
    expect(read('Подарок Пете', ctx({ learned, sort: true }))).toEqual([['Подарок Пете', 'Идеи', 'auto', null]])
    expect(Object.keys(learnWord({}, 'Купить сыр', ideas.id))).toHaveLength(1)
    expect(learnWord({}, 'Купить', ideas.id)).toEqual({})
  })

  it('files to the place picked by hand, the place the page gives, and gives the note to the record (items 4, 12)', () => {
    const { by, ctx } = day()
    const ideas = by('Идеи')
    expect(read('Подарок Оле', ctx({ place: { pageId: ideas.id, by: 'user' } }))).toEqual([['Подарок Оле', 'Идеи', 'user', null]])
    const shop = by('Покупки')
    const [milk] = readLine('Купить молоко', '2,5%, большую пачку', ctx({ place: { pageId: shop.id, by: 'page' } })).drafts
    expect(milk).toMatchObject({ text: 'Молоко', note: '2,5%, большую пачку', by: 'page', pageId: shop.id })
  })

  it('tints a date where it was typed, files it to Задачи, and keeps the words once the chip is tapped (item 7)', () => {
    const { ctx } = day()
    const title = 'Позвонить маме завтра в 10'
    const date = fieldDate(title, NOW)!
    expect(date.words).toBe('завтра в 10')
    expect(date.spans.map(([a, b]) => title.slice(a, b + 1))).toEqual(['завтра в 10'])
    expect(date.due).toEqual({ date: TOMORROW, time: '10:00' })
    expect(read(title, ctx({ sort: true }))).toEqual([['Позвонить маме', 'Задачи', 'auto', { date: TOMORROW, time: '10:00' }]])
    expect(fieldDate(title, NOW, 'завтра в 10')).toBeNull()
    expect(read(title, ctx({ noDate: 'завтра в 10', sort: true }))).toEqual([['Позвонить маме завтра в 10', 'Задачи', 'auto', null]])
  })

  it('reads «сегодня в 19» and «сегодня» as dates (item 17)', () => {
    expect(readDue('Забрать посылку сегодня в 19', NOW).due).toEqual({ date: '2026-10-19', time: '19:00' })
    expect(readDue('Оплатить интернет сегодня', NOW).due).toEqual({ date: '2026-10-19' })
  })

  it('splits a line into records, keeping a detail with its thing (item 8)', () => {
    const { ctx } = day()
    expect(read('Купить молоко, хлеб, яйца', ctx({ sort: true })).map(d => [d[0], d[1]])).toEqual([['Молоко', 'Покупки'], ['Хлеб', 'Покупки'], ['Яйца', 'Покупки']])
    expect(read('Купить молоко 2,5%, большую пачку', ctx({ sort: true }))).toHaveLength(1)
    expect(splitParts('Купить молоко 2,5%, большую пачку')).toHaveLength(1)
    expect(read('Сыр, позвонить бабушке', ctx({ sort: true })).map(d => [d[0], d[1]])).toEqual([['Сыр', 'Покупки'], ['Позвонить бабушке', 'Задачи']])
  })

  it('does not read the word being typed as a detail word, and reads every word on send (acceptance 1)', () => {
    const { ctx } = day()
    const rows = (t: string) => read(t, ctx({ live: true, sort: true })).map(d => d[0])
    expect(['Купить молоко и п', 'Купить молоко и по', 'Купить молоко и поз'].map(rows)).toEqual([['Молоко', 'П'], ['Молоко', 'По'], ['Молоко', 'Поз']])
    // A space finishes the word; the send counts every word
    expect(rows('Купить молоко и по ')).toHaveLength(1)
    expect(read('Купить молоко и по', ctx({ sort: true }))).toHaveLength(1)
  })

  it('moves only the row whose chip was tapped, and keeps that pick for the same title (item 8)', () => {
    const { by, ctx } = day()
    const ideas = by('Идеи')
    expect(read('Сыр, позвонить бабушке', ctx({ rows: { 'Позвонить бабушке': ideas.id }, sort: true })).map(d => [d[0], d[1], d[2]]))
      .toEqual([['Сыр', 'Покупки', 'auto'], ['Позвонить бабушке', 'Идеи', 'user']])
  })

  it('gives a record written on Сегодня today\'s date (item 12)', () => {
    const { by, ctx } = day()
    const todo = by('Задачи')
    expect(read('Оплатить интернет', ctx({ place: { pageId: todo.id, by: 'page' }, today: true })))
      .toEqual([['Оплатить интернет', 'Задачи', 'page', { date: '2026-10-19' }]])
  })
})

describe('the field with a model (main flow, items 23–25)', () => {
  const item = (text: string, pageId: string | null, more: Partial<{ note: string, date: string, time: string }> = {}) =>
    ({ text, note: more.note ?? '', pageId, date: more.date ?? null, time: more.time ?? null, qty: null, option: null })

  it('fills the note of one record and puts several each on its page (item 23)', () => {
    const { by, ctx } = day()
    const shop = by('Покупки')
    const todo = by('Задачи')
    const one = readModel({ kind: 'record', items: [item('Молоко', shop.id, { note: '2,5%, большую пачку' })] }, 'Купить молоко 2,5% большую пачку', '', ctx())
    expect(one.map(d => [d.text, d.note, d.pageId, d.by])).toEqual([['Молоко', '2,5%, большую пачку', shop.id, 'auto']])
    const two = readModel({ kind: 'record', items: [
      item('Молоко', shop.id, { note: '2,5%, большую пачку' }),
      item('Позвонить маме', todo.id, { date: TOMORROW, time: '10:00' })
    ] }, 'Купить молоко 2,5% большую пачку и позвонить маме завтра в 10', '', ctx())
    expect(two.map(d => [d.text, d.note, d.pageId, d.due])).toEqual([
      ['Молоко', '2,5%, большую пачку', shop.id, null],
      ['Позвонить маме', '', todo.id, { date: TOMORROW, time: '10:00' }]
    ])
  })

  it('guesses the department when the model gives none, as the rules would (acceptance 1, G)', () => {
    const { by, ctx } = day()
    const shop = by('Покупки')
    const dept = shop.props.find(p => p.type === 'select')!
    const [milk] = readModel({ kind: 'record', items: [item('Молоко', shop.id)] }, 'Купить молоко', '', ctx())
    expect(dept.options!.find(o => o.id === milk!.values[dept.id])?.name).toBe('Молочное')
  })

  it('sends what it is unsure of to Входящие, and one record to the place picked by hand (items 23, 25)', () => {
    const { by, inbox, ctx } = day()
    const ideas = by('Идеи')
    expect(readModel({ kind: 'record', items: [item('Подарок Оле', null)] }, 'Подарок Оле', '', ctx())[0]!.pageId).toBe(inbox.id)
    expect(readModel({ kind: 'record', items: [item('Подарок Оле', null)] }, 'Подарок Оле', '', ctx({ place: { pageId: ideas.id, by: 'user' } }))[0])
      .toMatchObject({ pageId: ideas.id, by: 'user' })
    expect(readModel({ kind: 'question', items: [] }, 'где ключи', '', ctx())).toEqual([])
  })

  it('drops the model\'s date when the date chip was tapped away (item 7)', () => {
    const { by, ctx } = day()
    const todo = by('Задачи')
    const title = 'Позвонить маме завтра в 10'
    const d = readModel({ kind: 'record', items: [item('Позвонить маме', todo.id, { date: TOMORROW, time: '10:00' })] }, title, '', ctx({ noDate: 'завтра в 10' }))
    expect(d[0]!.due).toBeNull()
  })
})

describe('Главная\'s cards (main flow, item 17)', () => {
  function week() {
    const { pages, by } = day()
    const todo = by('Задачи')
    const shop = by('Покупки')
    const today = pages.find(p => p.kind === 'today')!
    // Written from Главная's field after the first open
    let at = NOW + 60_000
    const rec = (page: Page, text: string, due: Rec['due'] = null, extra: Partial<Rec> = {}) => newRecord({ pageId: page.id, text, due, addedAt: at++, via: 'chat', ...extra })
    const records = [
      ...['Молоко', 'Хлеб', 'Яйца', 'Сыр', 'Кофе', 'Порошок для стирки'].map(t => rec(shop, t)),
      rec(todo, 'Позвонить маме', { date: TOMORROW, time: '10:00' }),
      rec(todo, 'Забрать посылку', { date: '2026-10-19', time: '19:00' }),
      rec(todo, 'Оплатить интернет', { date: '2026-10-19' }),
      rec(todo, 'Записаться к стоматологу')
    ]
    return { todo, shop, today, records, by }
  }

  it('says what is in a page: dated first by day and time, then the newest; the open count on the right', () => {
    const { todo, shop, today, records } = week()
    const of = (p: Page) => records.filter(r => r.pageId === p.id)
    expect(cardLine(todo, of(todo), NOW, records)).toMatchObject({
      line: '19:00 забрать посылку, оплатить интернет, завтра 10:00 позвонить маме, записаться к стоматологу',
      open: 4,
      isNew: true
    })
    expect(cardLine(today, [], NOW, records)).toMatchObject({ line: '19:00 забрать посылку, оплатить интернет', open: 2, late: 0 })
    expect(cardLine(shop, of(shop), NOW, records)).toMatchObject({ line: 'порошок для стирки, кофе, сыр, яйца, хлеб, молоко', open: 6 })
  })

  it('keeps the typed order inside one send (acceptance 1)', () => {
    const { shop } = week()
    // As the field files a send: one time for all, the first typed on top of the page
    const sent = ['Молоко', 'Хлеб', 'Яйца'].map((text, i) => newRecord({ pageId: shop.id, text, addedAt: NOW + 1000, order: i - 3, via: 'chat' }))
    expect(cardLine(shop, [...sent].reverse(), NOW, sent).line).toBe('молоко, хлеб, яйца')
  })

  it('drops a ticked record, and the dot goes once the page is opened', () => {
    const { shop, records } = week()
    const own = records.filter(r => r.pageId === shop.id).map(r => r.text === 'Молоко' ? { ...r, done: true } : r)
    const card = cardLine(shop, own, NOW, records)
    expect(card.open).toBe(5)
    expect(card.line).not.toContain('молоко')
    expect(cardLine({ ...shop, seenAt: NOW + 120_000 }, own, NOW, records).isNew).toBe(false)
  })

  it('shows an empty page as its name alone, and a page of text its first line', () => {
    const { by } = day()
    expect(cardLine(by('Идеи'), [], NOW)).toEqual({ line: '', open: null, isNew: false, late: 0 })
    const trip: Page = { ...by('Идеи'), body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Билеты взять до 1 ноября' }] }] } as Page['body'] }
    expect(cardLine(trip, [], NOW)).toMatchObject({ line: 'Билеты взять до 1 ноября', open: null })
  })

  it('is not new for a record written on its own page', () => {
    const { shop } = week()
    const own = [newRecord({ pageId: shop.id, text: 'Сыр', addedAt: NOW, via: 'manual' })]
    expect(cardLine({ ...shop, seenAt: NOW - 1000 }, own, NOW).isNew).toBe(false)
  })
})
