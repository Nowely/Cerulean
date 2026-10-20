import { describe, expect, it } from 'vitest'
import { formatDue, formatDueLong, formatDay, formatAdded } from '~/domain/dates'
import { isQuestion, parseDue, parseQty, splitItems } from '~/domain/parse'
import { plural, lowerFirst } from '~/domain/text'
import { demo } from '~/domain/seed'
import { pageBadge, pageSubline, pageSummary, recordSummary, summaryText } from '~/domain/summary'
import { classify, guessOption } from '~/domain/rules'
import { answer, recent } from '~/domain/search'
import { applyView } from '~/domain/views'
import { draftsFor } from '~/domain/auto'
import { toMarkdown, parseSnapshot, toJSON } from '~/domain/export'

// Sunday 19 October 2026, 9:14: the moment of the mockups
const NOW = new Date(2026, 9, 19, 9, 14).getTime()

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
    expect(formatAdded('chat', new Date(2026, 9, 19, 8, 40).getTime(), NOW)).toBe('из чата · сегодня, 8:40')
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
  it('knows a question', () => {
    expect(isQuestion('когда менять фильтр воды?')).toBe(true)
    expect(isQuestion('где ключи')).toBe(true)
    expect(isQuestion('хлеб')).toBe(false)
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
  const d = demo(NOW)
  const page = (title: string) => d.pages.find(p => p.title === title)!
  const top = (title: string) => d.records.filter(r => r.pageId === page(title).id && !r.parentId)
  const line = (title: string) => summaryText(pageSummary(page(title), top(title), NOW, d.records))

  it('home rows', () => {
    expect(line('Продукты')).toBe('6 купить · хлеб, молоко, сыр +3')
    expect(line('Задачи')).toBe('3 дела · оплатить интернет, позвонить стоматологу, вернуть книгу в библиотеку')
    expect(line('Цели')).toBe('2 цели · полумарафон к маю, 24 книги за год')
    expect(line('Книги')).toBe('1 книга · «Атомные привычки»')
    expect(line('Входящие')).toBe('подарок маме на др, посмотреть тот сериал')
    expect(line('Сегодня')).toBe('3 дела со всех страниц')
    const marathon = d.records.find(r => r.text === 'Полумарафон к маю')!
    expect(summaryText(recordSummary(d.records.filter(r => r.parentId === marathon.id), NOW))).toBe('3 из 6 · дальше пробежка 6 км, 19:00')
  })

  it('badges', () => {
    expect(pageBadge(page('Продукты'), top('Продукты'), NOW)?.text).toBe('1 новая')
    expect(pageBadge(page('Задачи'), top('Задачи'), NOW)).toEqual({ text: '1 просрочено', tone: 'warn' })
    expect(pageBadge(page('Входящие'), top('Входящие'), NOW)).toEqual({ text: '2 уточнить', tone: 'accent' })
    expect(pageBadge(page('Сегодня'), [], NOW, d.records)?.text).toBe('1 просрочено')
  })

  it('page sub-lines', () => {
    expect(pageSubline(page('Продукты'), top('Продукты'), NOW)).toBe('6 купить · 2 заканчиваются')
    expect(pageSubline(page('Задачи'), top('Задачи'), NOW)).toBe('3 дела · 1 просрочено')
    expect(pageSubline(page('Входящие'), top('Входящие'), NOW)).toBe('2 уточнить')
    expect(pageSubline(page('Сегодня'), [], NOW, d.records)).toBe('3 дела со всех страниц · 1 просрочено')
  })

  it('«Купить» is grouped by Отдел in department order', () => {
    const p = page('Продукты')
    const groups = applyView(p, top('Продукты'), p.views[0]!, NOW)
    expect(groups.map(g => g.label)).toEqual(['Хлеб и выпечка', 'Молочное', 'Овощи и фрукты', 'Бытовая химия'])
    expect(groups[1]!.records.map(r => r.text)).toEqual(['Молоко', 'Сыр', 'Яйца'])
  })

  it('search answers a question and groups recent things', () => {
    expect(answer('когда менять фильтр воды?', d.records).map(r => r.text)).toEqual(['Поменять фильтр воды'])
    expect(recent(d.pages, d.records, NOW).map(g => g.label)).toEqual(['Открыто сегодня', 'На этой неделе', 'Раньше'])
  })

  it('export keeps everything readable and round-trips JSON', () => {
    const md = toMarkdown(d.pages, d.records, d.sections, NOW)
    expect(md).toContain('### Продукты')
    expect(md).toContain('- [ ] Молоко · Количество: 2 л, Отдел: Молочное')
    expect(md).toContain('  - [ ] Взять два десятка, если будет скидка')
    const json = toJSON({ ...d, settings: { model: 'fast', rulesFirst: true, homeRows: 'summary', dismissed: [] }, learned: {} }, NOW)
    expect(json).not.toContain('apiKey')
    expect(parseSnapshot(json).pages).toHaveLength(d.pages.length)
    expect(() => parseSnapshot('{"a":1}')).toThrow('Это не файл экспорта Cerulean')
  })
})

describe('simple rules', () => {
  const d = demo(NOW)
  const id = (title: string) => d.pages.find(p => p.title === title)!.id
  it('files clear lines', () => {
    expect(classify('кефир', d.pages).pageId).toBe(id('Продукты'))
    expect(classify('молоко, яйца, сыр', d.pages).pageId).toBe(id('Продукты'))
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
  it('learns from a move', () => {
    const r = classify('подарок маме на др', d.pages, { подар: id('Идеи'), маме: id('Идеи') })
    expect(r.pageId).toBe(id('Идеи'))
  })
  it('splits a shopping line and fills Количество and Отдел', () => {
    const p = d.pages.find(x => x.title === 'Продукты')!
    const dept = p.props.find(x => x.name === 'Отдел')!
    const drafts = draftsFor('кефир 1 л, батон и сметана', p, NOW)
    expect(drafts.map(x => x.text)).toEqual(['Кефир', 'Батон', 'Сметана'])
    expect(drafts[0]!.values[p.props[0]!.id]).toBe('1 л')
    expect(dept.options!.find(o => o.id === guessOption('батон', dept))!.name).toBe('Хлеб и выпечка')
  })
})
