import { describe, expect, it } from 'vitest'
import { nb } from '~/domain/text'
import { weekday } from '~/domain/dates'
import { demo } from '~/domain/seed'
import { byAction, dueThisWeek, pageSubline, pageSummary, recordSummary, summaryText } from '~/domain/summary'
import { newRecord } from '~/domain/factory'

// Monday 19 October 2026, 9:14: the moment of the mockups
const NOW = new Date(2026, 9, 19, 9, 14).getTime()
const DAY = 86400000

describe('one-letter words stay with the next one (v23, F9)', () => {
  it('glues «в, к, с, у, о, и, а» with a no-break space', () => {
    expect(nb('Вернуть книгу в библиотеку')).toBe('Вернуть книгу в библиотеку')
    expect(nb('Кофе и сахар к чаю')).toBe('Кофе и сахар к чаю')
    expect(nb('В субботу «в кино»')).toBe('В субботу «в кино»')
  })

  it('glues two short words in a row', () => {
    expect(nb('Ключи а в сумке').replace(/\s/g, m => m === ' ' ? ' ' : '_')).toBe('Ключи а_в_сумке')
  })

  it('leaves longer words, a word at the end and other letters alone', () => {
    expect(nb('Позвонить во вторник')).toBe('Позвонить во вторник')
    expect(nb('План Б и')).toBe('План Б и')
    expect(nb('купить я сам')).toBe('купить я сам')
  })

  it('a saved title turns it back into a plain space', () => {
    expect(nb('Вернуть книгу в библиотеку').replace(/\s+/g, ' ')).toBe('Вернуть книгу в библиотеку')
  })
})

describe('summaries lead with what needs action (v23, B1)', () => {
  const d = demo(NOW)
  const page = (title: string) => d.pages.find(p => p.title === title)!
  const top = (title: string) => d.records.filter(r => r.pageId === page(title).id && !r.parentId && !r.deletedAt)
  const line = (title: string) => summaryText(pageSummary(page(title), top(title), NOW, d.records))

  it('Задачи: overdue, then today, then the rest', () => {
    expect(line('Задачи')).toBe('3 дела · оплатить интернет, позвонить стоматологу, вернуть книгу в библиотеку')
  })

  it('Покупки: the new record first', () => {
    expect(line('Покупки')).toBe('6 купить · хлеб, молоко, сыр +3')
  })

  it('ranks overdue, today, new, then page order', () => {
    const at = (text: string, extra = {}) => newRecord({ pageId: 'p', text, addedAt: NOW - 5 * DAY, ...extra }, NOW)
    const later = at('позже', { due: { date: '2026-10-25' } })
    const fresh = at('новое', { addedAt: NOW - 60_000 })
    const today = at('сегодня', { due: { date: '2026-10-19' } })
    const late = at('вчера', { due: { date: '2026-10-18' } })
    const done = at('сделано', { due: { date: '2026-10-18' }, done: true })
    const plain = at('просто')
    expect(byAction([later, plain, done, fresh, today, late], NOW, NOW - DAY).map(r => r.text))
      .toEqual(['вчера', 'сегодня', 'новое', 'позже', 'просто', 'сделано'])
  })

  it('«дальше» names what needs action first', () => {
    const marathon = d.records.find(r => r.text === 'Полумарафон к маю')!
    const subs = d.records.filter(r => r.parentId === marathon.id)
    expect(summaryText(recordSummary(subs, NOW))).toBe('3 из 6 · дальше пробежка 6 км, 19:00')
    const swapped = subs.map(s => s.text === 'Длинная пробежка 14 км' ? { ...s, order: -10 } : s)
    expect(summaryText(recordSummary(swapped, NOW))).toBe('3 из 6 · дальше пробежка 6 км, 19:00')
  })
})

describe('Сегодня (v23, B4, M15)', () => {
  const d = demo(NOW)
  const today = d.pages.find(p => p.kind === 'today')!

  it('«На неделе» holds the six days after today, by date', () => {
    // v24 fixes, 11: one demo world, Вызвать мастера on Friday and Длинная пробежка on Saturday
    expect(dueThisWeek(d.records, NOW).map(r => r.text)).toEqual(['Поменять фильтр воды', 'Вызвать мастера', 'Длинная пробежка 14 км', 'Вернуть книгу в библиотеку'])
  })

  it('names the weekday on the right, tomorrow in a word', () => {
    expect(weekday('2026-10-20', NOW)).toBe('завтра')
    expect(weekday('2026-10-21', NOW)).toBe('ср')
    expect(weekday('2026-10-25', NOW)).toBe('вс')
  })

  it('the header count is hidden with nothing today', () => {
    const done = d.records.map(r => r.due && r.due.date <= '2026-10-19' ? { ...r, done: true } : r)
    expect(pageSubline(today, [], NOW, done)).toBe('')
    expect(pageSubline(today, [], NOW, d.records)).toBe('3 дела со всех страниц · 1 просрочено')
  })
})

describe('Журнал demo (v23, B5)', () => {
  it('yesterday holds two receipts, and their records were added then', () => {
    const d = demo(NOW)
    const yesterday = d.entries.filter(e => e.at < new Date(2026, 9, 19).getTime())
    expect(yesterday.map(e => e.text)).toEqual(['бананы 1 кг, порошок', 'вызвать мастера', 'посмотреть тот сериал'])
    const bananas = d.records.find(r => r.text === 'Бананы')!
    expect(bananas.addedAt).toBe(yesterday[0]!.at)
    expect(bananas.via).toBe('chat')
  })
})
