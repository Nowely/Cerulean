import { describe, expect, it } from 'vitest'
import { formatDue, formatDueLong, formatDay, formatAdded } from '~/domain/dates'
import { cleanRecordText, dropPrefix, isQuestion, isSearch, parseDue, parseQty, splitItems, splitParts } from '~/domain/parse'
import { plural, lowerFirst, genitive } from '~/domain/text'
import { demo } from '~/domain/seed'
import { pageBadge, pageSubline, pageSummary, recordSummary, summaryText } from '~/domain/summary'
import { classify, guessOption, pageNamed, placeOptions } from '~/domain/rules'
import { addQty, duplicateOf, duplicateWords } from '~/domain/merge'
import { answer, lastAdded, recent } from '~/domain/search'
import { applyView, noValueLabel } from '~/domain/views'
import { canCreate, convertValues, formatValue, nextColor, optionColor, orderFromListed, propKeys, propList, readDate, readNumber } from '~/domain/props'
import { PAGE_COLORS } from '~/domain/types'
import type { PropDef } from '~/domain/types'
import { draftsFor } from '~/domain/auto'
import { toMarkdown, parseSnapshot, toJSON } from '~/domain/export'

// Sunday 19 October 2026, 9:14: the moment of the mockups
const NOW = new Date(2026, 9, 19, 9, 14).getTime()

/** The demo as the app shows it: what is in Корзина is left out */
function liveDemo() {
  const d = demo(NOW)
  const pages = d.pages.filter(p => !p.deletedAt)
  const ids = new Set(pages.map(p => p.id))
  return { ...d, pages, records: d.records.filter(r => !r.deletedAt && ids.has(r.pageId)) }
}

describe('dates', () => {
  it('writes dates the way the interface does', () => {
    expect(formatDue({ date: '2026-10-19', time: '10:00' }, NOW)).toBe('сегодня, 10:00')
    expect(formatDue({ date: '2026-10-18' }, NOW)).toBe('вчера')
    expect(formatDue({ date: '2026-10-25' }, NOW)).toBe('вс, 25 окт')
    expect(formatDue({ date: '2026-10-21' }, NOW)).toBe('ср, 21 окт')
    expect(formatDue({ date: '2026-12-12' }, NOW)).toBe('12 дек')
    expect(formatDue({ date: '2027-05-18' }, NOW)).toBe('18 мая 2027')
    expect(formatDueLong({ date: '2027-05-18' }, NOW)).toBe('18 мая 2027 · через 7 месяцев')
    expect(formatDay(NOW, NOW)).toBe('Сегодня, 19 октября')
    expect(formatAdded('chat', new Date(2026, 9, 19, 8, 40).getTime(), NOW)).toBe('с Главной · сегодня, 8:40')
  })
})

describe('parse', () => {
  it('finds dates and times', () => {
    expect(parseDue('позвонить стоматологу сегодня в 10', NOW)).toEqual({ due: { date: '2026-10-19', time: '10:00' }, rest: 'позвонить стоматологу' })
    expect(parseDue('пробежка в 7', NOW).due).toEqual({ date: '2026-10-19', time: '19:00' })
    expect(parseDue('встреча в 7 утра', NOW).due).toEqual({ date: '2026-10-20', time: '7:00' })
    expect(parseDue('вернуть книгу в субботу', NOW)).toEqual({ due: { date: '2026-10-24' }, rest: 'вернуть книгу' })
    expect(parseDue('записаться на забег до 1 ноября', NOW)).toEqual({ due: { date: '2026-11-01' }, rest: 'записаться на забег' })
    expect(parseDue('оплатить через неделю', NOW).due).toEqual({ date: '2026-10-26' })
    expect(parseDue('хлеб', NOW)).toEqual({ due: null, rest: 'хлеб' })
  })
  it('reads quantities and lists', () => {
    expect(parseQty('молоко 2 л')).toEqual({ qty: '2 л', rest: 'молоко' })
    expect(parseQty('сыр 300 грамм')).toEqual({ qty: '300 г', rest: 'сыр' })
    expect(splitItems('молоко, яйца и сыр')).toEqual(['Молоко', 'Яйца', 'Сыр'])
    expect(splitItems('купить молоко и хлеб')).toEqual(['Молоко', 'Хлеб'])
    expect(splitItems('надо взять сыр')).toEqual(['Сыр'])
  })
  it('knows a search and a question written down (v22, U10)', () => {
    expect(isSearch('где ключи')).toBe(true)
    expect(isSearch('найти паспорт')).toBe(true)
    expect(isSearch('когда менять фильтр воды?')).toBe(false)
    expect(isQuestion('когда менять фильтр воды?')).toBe(true)
    expect(isQuestion('хлеб')).toBe(false)
  })
  it('splits a send on commas, semicolons and new lines, but not «2,5 л» (v22, U3)', () => {
    expect(splitParts('сыр, позвонить бабушке')).toEqual(['сыр', 'позвонить бабушке'])
    expect(splitParts('молоко 2,5 л; хлеб\nсыр')).toEqual(['молоко 2,5 л', 'хлеб', 'сыр'])
    expect(splitItems('молоко 2,5 л, яйца')).toEqual(['Молоко 2,5 л', 'Яйца'])
  })
  it('keeps the text as typed, drops only a routing prefix (v22, U11)', () => {
    expect(cleanRecordText('где паспорт?')).toBe('Где паспорт?')
    expect(cleanRecordText('позвонить в ЖЭК!,')).toBe('Позвонить в ЖЭК!')
    expect(dropPrefix('идея: сервис для обмена книгами')).toBe('сервис для обмена книгами')
  })
  it('agrees numbers and keeps abbreviations', () => {
    expect(plural(1, ['дело', 'дела', 'дел'])).toBe('дело')
    expect(plural(3, ['дело', 'дела', 'дел'])).toBe('дела')
    expect(plural(11, ['дело', 'дела', 'дел'])).toBe('дел')
    expect(lowerFirst('ДР маме')).toBe('ДР маме')
    expect(lowerFirst('Хлеб')).toBe('хлеб')
  })
})

describe('demo summaries match the spec', () => {
  const d = liveDemo()
  const page = (title: string) => d.pages.find(p => p.title === title)!
  const top = (title: string) => d.records.filter(r => r.pageId === page(title).id && !r.parentId)
  const line = (title: string) => summaryText(pageSummary(page(title), top(title), NOW, d.records))

  it('home rows', () => {
    expect(line('Покупки')).toBe('6 купить · хлеб, молоко, сыр +3')
    expect(line('Задачи')).toBe('3 дела · оплатить интернет, позвонить стоматологу, вернуть книгу в библиотеку')
    expect(line('Цели')).toBe('2 цели · полумарафон к маю, 24 книги за год')
    expect(line('Книги')).toBe('1 книга · «Атомные привычки»')
    expect(line('Входящие')).toBe('подарок маме на др, посмотреть тот сериал')
    expect(line('Сегодня')).toBe('3 дела со всех страниц')
    const marathon = d.records.find(r => r.text === 'Полумарафон к маю')!
    expect(summaryText(recordSummary(d.records.filter(r => r.parentId === marathon.id), NOW))).toBe('3 из 6 · дальше пробежка 6 км, 19:00')
  })

  it('badges', () => {
    expect(pageBadge(page('Покупки'), top('Покупки'), NOW)?.text).toBe('1 новая')
    expect(pageBadge(page('Задачи'), top('Задачи'), NOW)).toEqual({ text: '1 просрочено', tone: 'warn' })
    expect(pageBadge(page('Входящие'), top('Входящие'), NOW)).toEqual({ text: '2 уточнить', tone: 'accent' })
    expect(pageBadge(page('Сегодня'), [], NOW, d.records)?.text).toBe('1 просрочено')
  })

  it('page sub-lines', () => {
    expect(pageSubline(page('Покупки'), top('Покупки'), NOW)).toBe('6 купить · 2 заканчиваются')
    expect(pageSubline(page('Задачи'), top('Задачи'), NOW)).toBe('3 дела · 1 просрочено')
    expect(pageSubline(page('Входящие'), top('Входящие'), NOW)).toBe('2 уточнить')
    expect(pageSubline(page('Сегодня'), [], NOW, d.records)).toBe('3 дела со всех страниц · 1 просрочено')
  })

  it('«Купить» is grouped by Отдел in department order', () => {
    const p = page('Покупки')
    const groups = applyView(p, top('Покупки'), p.views[0]!, NOW)
    expect(groups.map(g => g.label)).toEqual(['Хлеб и выпечка', 'Молочное', 'Овощи и фрукты', 'Бытовая химия'])
    expect(groups[1]!.records.map(r => r.text)).toEqual(['Молоко', 'Сыр', 'Яйца'])
  })

  it('search answers a question and groups recent things', () => {
    expect(answer('когда менять фильтр воды?', d.records).map(r => r.text)).toEqual(['Поменять фильтр воды'])
    expect(recent(d.pages, d.records, NOW).map(g => g.label)).toEqual(['Открыто сегодня', 'На этой неделе', 'Раньше'])
  })

  it('export keeps everything readable and round-trips JSON', () => {
    const md = toMarkdown(d.pages, d.records, d.sections, NOW)
    expect(md).toContain('### Покупки')
    expect(md).toContain('- [ ] Молоко · Количество: 2 л, Отдел: Молочное')
    expect(md).toContain('  - [ ] Взять два десятка, если будет скидка')
    const json = toJSON({ ...d, settings: { model: 'fast', rulesFirst: true, homeRows: 'summary', dismissed: [] }, learned: {} }, NOW)
    expect(json).not.toContain('apiKey')
    expect(parseSnapshot(json).pages).toHaveLength(d.pages.length)
    expect(() => parseSnapshot('{"a":1}')).toThrow('Это не файл экспорта Cerulean')
  })
})

describe('words and lists', () => {
  it('names a board column without a value', () => {
    expect(genitive('Статус')).toBe('статуса')
    expect(genitive('Отдел')).toBe('отдела')
    expect(genitive('Стадия')).toBe('стадии')
  })

  it('shows the records added last on an empty Поиск', () => {
    const d = liveDemo()
    expect(lastAdded(d.records).map(r => r.text)).toEqual(['Хлеб', 'Подарок маме на др', 'Позвонить стоматологу', 'Молоко', 'Сыр', 'Яйца'])
  })
})

describe('simple rules', () => {
  const d = liveDemo()
  const id = (title: string) => d.pages.find(p => p.title === title)!.id
  it('files clear lines', () => {
    expect(classify('кефир', d.pages).pageId).toBe(id('Покупки'))
    expect(classify('молоко, яйца, сыр', d.pages).pageId).toBe(id('Покупки'))
    expect(classify('позвонить стоматологу сегодня в 10', d.pages).pageId).toBe(id('Задачи'))
    expect(classify('вызвать сантехника', d.pages).pageId).toBe(id('Дела по дому'))
    expect(classify('прочитать «Мастер и Маргарита»', d.pages).pageId).toBe(id('Книги'))
  })
  it('leaves unclear lines to Уточнение, with a name for a new page', () => {
    const r = classify('подарок маме на др', d.pages, {}, [id('Задачи'), id('Идеи')])
    expect(r.pageId).toBeNull()
    expect(r.newName).toBe('Подарки')
    expect(r.guesses).toEqual([id('Задачи'), id('Идеи')])
    expect(classify('посмотреть тот сериал', d.pages).newName).toBe('Фильмы')
  })
  it('files calls and payments to Задачи (U5)', () => {
    expect(classify('позвонить маме', d.pages).pageId).toBe(id('Задачи'))
    expect(classify('оплатить интернет', d.pages).pageId).toBe(id('Задачи'))
  })
  it('offers the starter, not an unrelated recent page, when no page fits (U5)', () => {
    const shop = d.pages.find(p => p.title === 'Покупки')!
    const r = classify('позвонить маме', [shop], {}, [shop.id])
    expect(r.pageId).toBeNull()
    expect(r.guesses).toEqual([])
  })
  it('learns from a move', () => {
    const r = classify('подарок маме на др', d.pages, { подар: id('Идеи'), маме: id('Идеи') })
    expect(r.pageId).toBe(id('Идеи'))
  })
  it('splits a shopping line and fills Количество and Отдел', () => {
    const p = d.pages.find(x => x.title === 'Покупки')!
    const dept = p.props.find(x => x.name === 'Отдел')!
    const drafts = draftsFor('кефир 1 л, батон и сметана', p, NOW)
    expect(drafts.map(x => x.text)).toEqual(['Кефир', 'Батон', 'Сметана'])
    expect(drafts[0]!.values[p.props[0]!.id]).toBe('1 л')
    expect(dept.options!.find(o => o.id === guessOption('батон', dept))!.name).toBe('Хлеб и выпечка')
  })
})

describe('duplicates (v22, G3)', () => {
  const d = liveDemo()
  const shop = d.pages.find(p => p.title === 'Покупки')!
  const milk = d.records.find(r => r.text === 'Молоко')!
  const typed = { ...milk, id: 'new', values: { [shop.props[0]!.id]: '1 л' } }
  it('finds the open record on the same page that says the same thing', () => {
    expect(duplicateOf({ ...typed, text: 'молоко' }, d.records)?.id).toBe(milk.id)
    // Not itself, not a record of the same send, not a ticked one, not on another page
    expect(duplicateOf(milk, d.records)).toBeUndefined()
    expect(duplicateOf(typed, d.records, new Set([milk.id]))).toBeUndefined()
    expect(duplicateOf(typed, d.records.map(r => r.id === milk.id ? { ...r, done: true } : r))).toBeUndefined()
    expect(duplicateOf({ ...typed, pageId: 'elsewhere' }, d.records)).toBeUndefined()
    expect(duplicateOf({ ...typed, text: 'Молоко овсяное' }, d.records)).toBeUndefined()
  })
  it('names the duplicate with its quantity', () => {
    expect(duplicateWords(milk, shop)).toEqual({ sub: 'уже есть в списке, 2 л', label: 'Объединить с «Молоко, 2 л»' })
    const call = d.records.find(r => r.text === 'Позвонить стоматологу')!
    expect(duplicateWords(call, d.pages.find(p => p.id === call.pageId))).toEqual({ sub: 'уже есть в списке', label: 'Объединить с «Позвонить стоматологу»' })
  })
  it('adds quantities in the same unit and keeps the first otherwise', () => {
    expect(addQty('2 л', '1 л')).toBe('3 л')
    expect(addQty('2,5 кг', '1 кг')).toBe('3,5 кг')
    expect(addQty('0,1 кг', '0,2 кг')).toBe('0,3 кг')
    expect(addQty('10 шт', '6 шт')).toBe('16 шт')
    expect(addQty('2', '3')).toBe('5')
    expect(addQty('2 л', '500 мл')).toBe('2 л')
    expect(addQty(null, '1 л')).toBe('1 л')
    expect(addQty('2 л', null)).toBe('2 л')
    expect(addQty(undefined, '')).toBeNull()
  })
})

describe('Уточнение offers an existing page, not «Новая страница» (v22, N23)', () => {
  const d = liveDemo()
  const id = (title: string) => d.pages.find(p => p.title === title)!.id
  const gifts = { ...d.pages.find(p => p.title === 'Идеи')!, id: 'gifts', title: 'Подарки' }
  const pages = [...d.pages, gifts]
  it('finds a page by its name in any case', () => {
    expect(pageNamed(' подарки ', pages)?.id).toBe('gifts')
    expect(pageNamed('Подарки', d.pages)).toBeUndefined()
    expect(pageNamed('Входящие', d.pages)).toBeUndefined()
  })
  it('offers that page after the guesses and drops the new-page name', () => {
    expect(placeOptions([id('Задачи')], 'Подарки', pages)).toEqual({ pageIds: [id('Задачи'), 'gifts'], newName: null })
    expect(placeOptions(['gifts', id('Задачи')], 'подарки', pages)).toEqual({ pageIds: ['gifts', id('Задачи')], newName: null })
    expect(placeOptions([id('Задачи')], 'Подарки', d.pages)).toEqual({ pageIds: [id('Задачи')], newName: 'Подарки' })
  })
  it('the rules name no new page that exists', () => {
    expect(classify('подарок маме на др', d.pages).newName).toBe('Подарки')
    expect(classify('подарок маме на др', [...d.pages, { ...gifts, id: 'gifts2', title: 'Подарки на НГ' }, gifts]).newName).toBeNull()
  })
})

describe('properties (v22 item 30)', () => {
  const d = liveDemo()
  const shop = d.pages.find(p => p.title === 'Покупки')!
  const [qty, dept, left, norm] = shop.props as [PropDef, PropDef, PropDef, PropDef]
  let n = 0
  const id = () => `n${++n}`

  it('lists the own properties, then Срок and Заметка; a «Норма» goes with its number', () => {
    expect(propList(shop).map(p => p.name)).toEqual(['Количество', 'Отдел', 'Осталось', 'Срок', 'Заметка'])
    expect(propList(shop).filter(p => p.builtin).map(p => p.key)).toEqual(['due', 'note'])
    expect(propList(shop, { norms: true }).map(p => p.name)).toContain('Норма')
    expect(orderFromListed(shop, ['due', left.id, qty.id, dept.id, 'note'])).toEqual(['due', left.id, norm.id, qty.id, dept.id, 'note'])
  })

  it('puts a new property after the own ones, wherever Срок and Заметка are', () => {
    const extra: PropDef = { id: 'x', name: 'Магазин', type: 'text' }
    const order = ['due', qty.id, dept.id, left.id, norm.id, 'note']
    expect(propKeys({ ...shop, props: [...shop.props, extra], propOrder: order })).toEqual(['due', qty.id, dept.id, left.id, norm.id, 'x', 'note'])
    expect(propKeys({ ...shop, props: [extra], propOrder: ['note', 'due'] })).toEqual(['x', 'note', 'due'])
    // A page from before v22 has no order: own ones, Срок, Заметка
    expect(propKeys({ ...shop, propOrder: undefined })).toEqual([qty.id, dept.id, left.id, norm.id, 'due', 'note'])
  })

  it('turns text into options and back, keeping the options and their colours aside', () => {
    const text: PropDef = { id: 'p', name: 'Магазин', type: 'text' }
    const toSelect = convertValues(text, 'select', [['a', 'Лента'], ['b', 'лента'], ['c', 'Ашан'], ['d', null]], NOW, id)
    expect(toSelect.prop.options!.map(o => o.name)).toEqual(['Лента', 'Ашан'])
    expect(toSelect.prop.options!.every(o => o.color)).toBe(true)
    const [lenta, ashan] = toSelect.prop.options!
    expect([...toSelect.values]).toEqual([['a', lenta!.id], ['b', lenta!.id], ['c', ashan!.id]])
    expect(toSelect.dropped).toEqual([])
    const back = convertValues(toSelect.prop, 'text', [['a', lenta!.id]], NOW, id)
    expect(back.values.get('a')).toBe('Лента')
    expect(back.prop).toMatchObject({ type: 'text', stash: toSelect.prop.options })
    expect(back.prop.options).toBeUndefined()
    const again = convertValues(back.prop, 'select', [['a', 'Лента']], NOW, id)
    expect(again.prop.options).toEqual(toSelect.prop.options)
    expect(again.prop.stash).toBeUndefined()
    expect(again.values.get('a')).toBe(lenta!.id)
  })

  it('keeps numbers and dates that read as such and drops the rest', () => {
    const toNumber = convertValues(qty, 'number', [['a', '2 л'], ['b', '2,5'], ['c', '10'], ['d', '-3']], NOW, id)
    expect([...toNumber.values]).toEqual([['a', null], ['b', 2.5], ['c', 10], ['d', -3]])
    expect(toNumber.dropped).toEqual(['a'])
    const toText = convertValues(left, 'text', [['a', 10], ['b', 2.5]], NOW, id)
    expect([...toText.values.values()]).toEqual(['10 шт', '2,5 шт'])
    expect(toText.prop.unit).toBeUndefined()
    const when: PropDef = { id: 'w', name: 'Когда', type: 'text' }
    const toDate = convertValues(when, 'date', [['a', 'завтра'], ['b', '2026-11-02'], ['c', 'купить завтра'], ['d', 'когда-нибудь']], NOW, id)
    expect([...toDate.values]).toEqual([['a', '2026-10-20'], ['b', '2026-11-02'], ['c', null], ['d', null]])
    expect(toDate.dropped).toEqual(['c', 'd'])
    expect(convertValues(toDate.prop, 'text', [['b', '2026-11-02']], NOW, id).values.get('b')).toBe(formatValue(toDate.prop, '2026-11-02', NOW))
    expect(readNumber('1 000')).toBeNull()
    expect(readDate('2026-11-02', NOW)).toBe('2026-11-02')
  })

  it('writes a value the way the record page shows it', () => {
    expect(formatValue(dept, dept.options![1]!.id, NOW)).toBe('Молочное')
    expect(formatValue(left, 2.5, NOW)).toBe('2,5 шт')
    expect(formatValue(qty, '', NOW)).toBe('')
  })

  it('creates only with a name and, for «Выбор», a named option (B12)', () => {
    expect(canCreate({ name: ' ', type: 'text', options: [] })).toBe(false)
    expect(canCreate({ name: 'Магазин', type: 'text', options: [] })).toBe(true)
    expect(canCreate({ name: 'Магазин', type: 'select', options: [] })).toBe(false)
    expect(canCreate({ name: 'Магазин', type: 'select', options: [{ id: 'o', name: ' ' }] })).toBe(false)
    expect(canCreate({ name: 'Магазин', type: 'select', options: [{ id: 'o', name: 'Лента' }] })).toBe(true)
  })

  it('gives each option a colour: its own, else one by its place', () => {
    expect(dept.options!.map(o => optionColor(dept.options!, o))).toEqual(['yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'gray'])
    expect(optionColor([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { id: 'b', name: 'B' })).toBe(PAGE_COLORS[1])
    expect(nextColor([{ id: 'a', name: 'A', color: PAGE_COLORS[0] }])).toBe(PAGE_COLORS[1])
  })

  it('names the group without a value in the genitive, or in quotes', () => {
    const label = (name: string) => noValueLabel({ id: 'p', name, type: 'select' })
    expect(['Отдел', 'Статус', 'Стадия', 'Норма', 'Количество', 'Время', 'Цель'].map(label))
      .toEqual(['Без отдела', 'Без статуса', 'Без стадии', 'Без нормы', 'Без количества', 'Без времени', 'Без цели'])
    expect(['Тип связи', 'Осталось', 'Новое', ''].map(label)).toEqual(['Без «Тип связи»', 'Без «Осталось»', 'Без «Новое»', 'Без значения'])
  })

  it('puts «Без отдела» first, and only while a record is in it', () => {
    const recs = d.records.filter(r => r.pageId === shop.id && !r.parentId)
    const view = shop.views[0]!
    const loose = recs.map(r => r.text === 'Хлеб' ? { ...r, values: { ...r.values, [dept.id]: null } } : r)
    expect(applyView(shop, loose, view, NOW).map(g => g.label)).toEqual(['Без отдела', 'Молочное', 'Овощи и фрукты', 'Бытовая химия'])
    expect(applyView(shop, recs, view, NOW)[0]!.label).toBe('Хлеб и выпечка')
  })
})
