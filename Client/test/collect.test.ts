// Pages that collect records (v24 item 4 and its fixes): «Откуда записи», «Фильтр», the rows, the first day, the
// summaries that never cut a name, and the one demo world
import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { demo } from '~/domain/seed'
import type { Rec, ViewDef } from '~/domain/types'
import { collectLead, collected, collects, filterWords, firstCollects, firstDay, onlyCollects, rowEnd, togglePicked } from '~/domain/collect'
import { fitNames, textW } from '~/domain/fit'
import { dueThisWeek, dueToday, pageBadge, pageSubline, pageSummary } from '~/domain/summary'
import { filterRecords } from '~/domain/views'
import { applyTemplate, STARTERS, TEMPLATES } from '~/domain/templates'
import { choosable } from '~/domain/picker'

// Monday 19 October 2026, 9:14: the moment of the mockups
const NOW = new Date(2026, 9, 19, 9, 14).getTime()

function world() {
  const d = demo(NOW)
  const pages = d.pages.filter(p => !p.deletedAt)
  const ids = new Set(pages.map(p => p.id))
  const records = d.records.filter(r => !r.deletedAt && ids.has(r.pageId))
  const page = (title: string) => pages.find(p => p.title === title)!
  const home = (r: Rec) => r.parentId ? records.find(p => p.id === r.parentId)!.text : pages.find(p => p.id === r.pageId)!.title
  return { pages, records, page, home }
}

describe('На неделе (v24 items 9, 11, 18, 19)', () => {
  const w = world()
  const week = w.page('На неделе')
  const view = week.views[0]!

  it('is a page in Избранное after Полумарафон к маю, whose only view collects', () => {
    expect(week.kind).toBe('page')
    expect(collects(view)).toBe(true)
    expect(onlyCollects(week)).toBe(true)
    expect(firstCollects(week)).toBe(true)
    expect(onlyCollects(w.page('Задачи'))).toBe(false)
    const favs = w.pages.filter(p => p.favorite !== null).sort((a, b) => a.favorite! - b.favorite!).map(p => p.title)
    expect(favs).toEqual(['Сегодня', 'На неделе'])
    expect(week.description).toBe('')
  })

  it('draws seven rows by date, each with its home page and its right column', () => {
    const rows = collected(view, w.records, NOW)
    expect(rows.map(r => [r.text, w.home(r), rowEnd(r, view, NOW).text])).toEqual([
      ['Оплатить интернет', 'Задачи', 'было вчера'],
      ['Позвонить стоматологу', 'Задачи', 'сегодня, 10:00'],
      ['Пробежка 6 км', 'Полумарафон к маю', 'сегодня, 19:00'],
      ['Поменять фильтр воды', 'Дела по дому', 'ср'],
      ['Вызвать мастера', 'Дела по дому', 'пт'],
      ['Длинная пробежка 14 км', 'Полумарафон к маю', 'сб'],
      ['Вернуть книгу в библиотеку', 'Задачи', 'вс']
    ])
    expect(rowEnd(rows[0]!, view, NOW).late).toBe(true)
    expect(rows.slice(1).every(r => !rowEnd(r, view, NOW).late)).toBe(true)
  })

  it('is Сегодня plus its fold, exactly', () => {
    const today = [...dueToday(w.records, NOW), ...dueThisWeek(w.records, NOW)].map(r => r.text).sort()
    expect(collected(view, w.records, NOW).map(r => r.text).sort()).toEqual(today)
    expect(dueThisWeek(w.records, NOW).map(r => r.text)).toEqual(['Поменять фильтр воды', 'Вызвать мастера', 'Длинная пробежка 14 км', 'Вернуть книгу в библиотеку'])
  })

  it('«На неделе» alone is today and the six days after it, never an overdue record', () => {
    const rows = collected({ ...view, dues: ['week'] }, w.records, NOW)
    expect(rows.map(r => r.text)).toEqual(['Позвонить стоматологу', 'Пробежка 6 км', 'Поменять фильтр воды', 'Вызвать мастера', 'Длинная пробежка 14 км', 'Вернуть книгу в библиотеку'])
    expect(collected({ ...view, dues: ['late'] }, w.records, NOW).map(r => r.text)).toEqual(['Оплатить интернет'])
  })

  it('«Любой» holds every open record, dated or not', () => {
    const texts = collected({ ...view, dues: [] }, w.records, NOW).map(r => r.text)
    expect(texts).toContain('Записаться на забег')
    expect(texts).toContain('Хлеб')
    expect(texts.length).toBeGreaterThan(7)
  })

  it('«Ждут уточнения» on every page leaves the two of Входящие', () => {
    const texts = collected({ ...view, dues: [], asking: true }, w.records, NOW).map(r => r.text).sort()
    expect(texts).toEqual(['Подарок маме на др', 'Посмотреть тот сериал'])
  })

  it('sums itself up from what it collects, with no overdue signal of its own', () => {
    expect(pageSubline(week, [], NOW, w.records)).toBe('7 дел со всех страниц · 1 просрочено')
    const s = pageSummary(week, [], NOW, w.records)
    expect(s.lead).toBe('7 дел')
    expect(s.list?.[0]).toBe('оплатить интернет')
    expect(s.total).toBe(7)
    expect(pageBadge(week, [], NOW, w.records)).toBeNull()
  })

  it('gives a record that names no day the filter\'s first day', () => {
    expect(firstDay(view, NOW)).toBe('2026-10-20')
    expect(firstDay({ ...view, dues: ['today'] }, NOW)).toBe('2026-10-19')
    expect(firstDay({ ...view, dues: ['late'] }, NOW)).toBeNull()
  })

  it('is never a place Авто or the picker files to', () => {
    expect(choosable(w.pages).map(p => p.title)).not.toContain('На неделе')
    expect(choosable(w.pages).map(p => p.title)).toContain('Задачи')
  })
})

describe('«Фильтр» (v24 items 8, 20, 27)', () => {
  const w = world()

  it('names the filter in words, chips in their order', () => {
    const week = w.page('На неделе')
    const view = week.views[0]!
    expect(filterWords(week, view)).toBe('Просрочено · На неделе · не сделано')
    expect(filterWords(week, { ...view, dues: ['week', 'today', 'late'] })).toBe('Просрочено · Сегодня · На неделе · не сделано')
    expect(filterWords(week, { ...view, dues: ['late'], asking: true })).toBe('Просрочено · не сделано · ждут уточнения')
    const tasks = w.page('Задачи')
    expect(filterWords(tasks, tasks.views[0]!)).toBe('Не сделано')
    const shop = w.page('Покупки')
    expect(filterWords(shop, shop.views[0]!)).toBe('Не куплено')
  })

  it('works on a page\'s own records: Задачи with «Срок · Сегодня» keeps Позвонить стоматологу', () => {
    const tasks = w.page('Задачи')
    const own = w.records.filter(r => r.pageId === tasks.id && !r.parentId)
    const view: ViewDef = { ...tasks.views[0]!, dues: ['today'] }
    expect(filterRecords(own, view, undefined, NOW).map(r => r.text)).toEqual(['Позвонить стоматологу'])
  })

  it('«Выбранные» counts its pages; a tap adds or takes one away', () => {
    const tasks = w.page('Задачи')
    const home = w.page('Дела по дому')
    const view: ViewDef = { ...w.page('На неделе').views[0]!, from: 'pick', pages: [tasks.id] }
    const two = { ...view, pages: togglePicked(view, home.id) }
    expect(two.pages).toEqual([tasks.id, home.id])
    expect(togglePicked(two, tasks.id)).toEqual([home.id])
    const rows = collected(two, w.records, NOW)
    expect(collectLead(w.page('На неделе'), two, rows.length)).toBe('5 дел с 2 страниц')
  })
})

describe('summaries never cut a name (v24 item 17)', () => {
  const w = world()
  const fit = (title: string, width: number, k?: number) => {
    const p = w.page(title)
    const s = pageSummary(p, w.records.filter(r => r.pageId === p.id && !r.parentId), NOW, w.records)
    return fitNames(s.lead, (s.list ?? []).slice(0, k), s.total ?? 0, line => textW(line, 14) <= width)
  }

  it('drops whole names at 330 on the phone', () => {
    expect(fit('Сегодня', 330)).toBe('3 дела · оплатить интернет +2')
    expect(fit('Задачи', 330)).toBe('3 дела · оплатить интернет +2')
    expect(fit('На неделе', 330)).toBe('7 дел · оплатить интернет +6')
    expect(fit('Покупки', 330)).toBe('6 купить · хлеб, молоко, сыр +3')
    expect(fit('Дела по дому', 330)).toBe('2 дела · поменять фильтр воды, вызвать мастера')
  })

  it('names three at most at 634 on desktop', () => {
    expect(fit('Сегодня', 634)).toBe('3 дела · оплатить интернет, позвонить стоматологу, пробежка 6 км')
    expect(fit('На неделе', 634)).toBe('7 дел · оплатить интернет, позвонить стоматологу, пробежка 6 км +4')
    expect(fit('Задачи', 634)).toBe('3 дела · оплатить интернет, позвонить стоматологу, вернуть книгу в библиотеку')
  })

  it('with no room for one name, the count alone', () => {
    expect(fitNames('9 дел', ['очень длинное название записи'], 9, line => textW(line, 14) <= 60)).toBe('9 дел')
  })
})

describe('the composer of a collecting page (v24 item 10)', () => {
  let n = 0
  async function fresh() {
    setActivePinia(createPinia())
    const data = useDataStore()
    await data.init({ demo: true, dbName: `collect-${++n}` })
    return { data, journal: useJournalStore() }
  }
  const find = (data: ReturnType<typeof useDataStore>, text: string) => Object.values(data.records).find(r => r.text === text && !r.deletedAt)

  it('gives a record that names no day the filter\'s first day, wherever Авто files it', async () => {
    const { data, journal } = await fresh()
    await journal.send('повесить полку', 'auto', { day: '2026-10-20' })
    const rec = find(data, 'Повесить полку')
    expect(data.pages[rec!.pageId]!.title).toBe('Дела по дому')
    expect(rec!.due?.date).toBe('2026-10-20')
  })

  it('a day named in the text wins', async () => {
    const { data, journal } = await fresh()
    await journal.send('повесить полку завтра', 'auto', { day: '2000-01-01' })
    expect(find(data, 'Повесить полку')!.due?.date).not.toBe('2000-01-01')
  })

  it('never files into a page that only collects', async () => {
    const { data, journal } = await fresh()
    await journal.send('на неделе: позвонить маме', 'auto')
    const rec = Object.values(data.records).find(r => /позвонить маме/i.test(r.text))
    expect(data.pages[rec!.pageId]!.title).not.toBe('На неделе')
  })
})

describe('the «На неделе» starter (v24 item 11)', () => {
  it('is the fifth starter of a new page; the first-run card keeps four', () => {
    expect(STARTERS.map(t => t.name)).toEqual([...TEMPLATES.map(t => t.name), 'На неделе'])
    expect(TEMPLATES).toHaveLength(4)
  })

  it('makes the first view collect, and another starter makes it a page of its own records again', () => {
    const w = world()
    const page = { ...w.page('Задачи'), title: 'Ремонт на кухне', template: null, description: '' }
    const week = applyTemplate(page, 'week')
    expect(week.views![0]!.from).toBe('all')
    expect(week.views![0]!.dues).toEqual(['late', 'week'])
    expect(week.description).toBe('')
    expect(week.title).toBe('Ремонт на кухне')
    const tasks = applyTemplate({ ...page, ...week }, 'todo')
    expect(tasks.views!.some(collects)).toBe(false)
  })
})
