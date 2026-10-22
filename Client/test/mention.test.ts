// «@» in the composer (v24, items 12, 13) and «Открыто недавно» (item 16)
import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { fieldDoc, fieldText, inlineOf, mdTitle, menLinks, retitle } from '~/domain/mention'
import { demoOpened, openedFromPages, openedHits, touchOpened, type Opened } from '~/domain/opened'
import { toMarkdown } from '~/domain/export'
import { demo } from '~/domain/seed'
import type { Id, Page, Rec } from '~/domain/types'

// Monday 19 October 2026, 9:14: the moment of the mockups
const NOW = new Date(2026, 9, 19, 9, 14).getTime()

describe('the mention marker in a title', () => {
  it('follows a rename of the whole name only', () => {
    expect(retitle('Позвонить @Стоматолог', 'Стоматолог', 'Зубной врач')).toBe('Позвонить @Зубной врач')
    expect(retitle('Позвонить @Стоматологу', 'Стоматолог', 'Зубной врач')).toBe('Позвонить @Стоматологу')
    expect(retitle('Позвонить @Стоматолог, @Стоматолог.', 'Стоматолог', 'Врач')).toBe('Позвонить @Врач, @Врач.')
    expect(retitle('Позвонить Стоматолог', 'Стоматолог', 'Врач')).toBe('Позвонить Стоматолог')
    expect(retitle('Купить $5 (@цена)', 'цена', 'итог')).toBe('Купить $5 (@итог)')
  })

  it('exports the linked names as [[Name]], longest first', () => {
    expect(mdTitle('Позвонить @Зубной врач', ['Зубной врач'])).toBe('Позвонить [[Зубной врач]]')
    expect(mdTitle('@Сыр и @Сыр плавленый', ['Сыр', 'Сыр плавленый'])).toBe('[[Сыр]] и [[Сыр плавленый]]')
    expect(mdTitle('почта@Сыр', [])).toBe('почта@Сыр')
  })

  it('gives each record of a line only the links its own text names', () => {
    const links = [{ id: 'a', name: 'Стоматолог' }, { id: 'b', name: 'Хлеб' }]
    expect(menLinks('Позвонить @Стоматолог', links).map(l => l.id)).toEqual(['a'])
    expect(menLinks('Купить хлеб', links)).toEqual([])
    expect(menLinks('позвонить @стоматолог', links).map(l => l.id)).toEqual(['a'])
  })
})

describe('the composer field', () => {
  const links = [{ id: 'd', name: 'Стоматолог' }, { id: 'h', name: 'Здоровье' }]

  it('reads chips as «@Name» and builds them back', () => {
    const doc = fieldDoc('позвонить @Стоматолог\nи @Здоровье', links)
    expect(doc.content![0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'позвонить ' }, { type: 'mention', attrs: { id: 'd', label: 'Стоматолог', mentionSuggestionChar: '@' } }]
    })
    expect(fieldText(doc)).toBe('позвонить @Стоматолог\nи @Здоровье')
    // The live name wins over the label it was made with
    expect(fieldText(doc, id => id === 'd' ? 'Зубной врач' : '')).toBe('позвонить @Зубной врач\nи @Здоровье')
  })

  it('leaves a typed «@word» and an empty line alone', () => {
    expect(inlineOf('почта@Стоматолог @сто', links)).toEqual([{ type: 'text', text: 'почта' }, { type: 'mention', attrs: { id: 'd', label: 'Стоматолог', mentionSuggestionChar: '@' } }, { type: 'text', text: ' @сто' }])
    expect(fieldDoc('', links)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })
})

describe('Открыто недавно', () => {
  const d = demo(NOW)
  const pages = Object.fromEntries(d.pages.map(p => [p.id, p])) as Record<Id, Page>
  const records = Object.fromEntries(d.records.map(r => [r.id, r])) as Record<Id, Rec>
  const page = (t: string) => d.pages.find(p => p.title === t && !p.deletedAt)!
  const name = (h: ReturnType<typeof openedHits>[number]) => h.kind === 'page' ? h.page.title : h.rec.text

  it('keeps each once, newest first', () => {
    let list: Opened[] = []
    for (const id of ['a', 'b', 'a', 'c']) list = touchOpened(list, { kind: 'page', id }, 3)
    expect(list.map(x => x.id)).toEqual(['c', 'a', 'b'])
    list = touchOpened(list, { kind: 'record', id: 'a' }, 3)
    expect(list).toEqual([{ kind: 'record', id: 'a' }, { kind: 'page', id: 'c' }, { kind: 'page', id: 'a' }])
  })

  it('shows the demo history, narrowed by a section, without Сегодня or what is deleted', () => {
    const list = demoOpened(d.pages, d.records)
    expect(openedHits(list, pages, records, null).map(name)).toEqual(['Яйца', 'Задачи', 'Вернуть книгу в библиотеку', 'Дела по дому', 'Полумарафон к маю', 'Атомные привычки'])
    const personal = page('Книги').sectionId!
    expect(openedHits(list, pages, records, personal).map(name)).toEqual(['Задачи', 'Вернуть книгу в библиотеку', 'Полумарафон к маю', 'Атомные привычки'])
    const today = page('Сегодня')
    const gone = { ...page('Задачи'), deletedAt: NOW }
    expect(openedHits([{ kind: 'page', id: today.id }, ...list], { ...pages, [gone.id]: gone }, records, null).map(name)).not.toContain('Задачи')
    expect(openedHits(list, pages, records, null, 6).map(name)).not.toContain('Сегодня')
  })

  it('starts from the pages opened last before anything is opened here', () => {
    const list = openedFromPages(d.pages)
    expect(list.length).toBeLessThanOrEqual(6)
    expect(list.every(x => x.kind === 'page' && pages[x.id]!.kind !== 'today')).toBe(true)
  })
})

describe('what a send with «@» makes', () => {
  let n = 0
  async function seeded() {
    setActivePinia(createPinia())
    const data = useDataStore()
    await data.init({ demo: true, dbName: `mention-${++n}` })
    // Здоровье and Стоматолог, as the checks seed them (v24 delta)
    const books = data.livePages.find(p => p.title === 'Книги')!
    const health = data.createPage({ title: 'Здоровье', glyph: 'heart', sectionId: books.sectionId, order: books.order + 0.5 })
    const dentist = data.addRecord({ pageId: health.id, text: 'Стоматолог' })
    return { data, journal: useJournalStore(), health, dentist }
  }

  it('links each record to the names in its own text, on both sides, and follows a rename', async () => {
    const { data, journal, dentist } = await seeded()
    const e = await journal.send('позвонить @Стоматолог, купить хлеб', 'auto', { links: [dentist.id] })
    const made = (e.recordIds ?? []).map(id => data.records[id]!)
    const call = made.find(r => r.text.includes('@Стоматолог'))!
    expect(call.text).toBe('Позвонить @Стоматолог')
    expect(call.links).toEqual([dentist.id])
    expect(made.filter(r => r !== call).every(r => !r.links?.length)).toBe(true)
    expect(data.linksOf(call.id).map(h => h.kind === 'record' && h.rec.text)).toEqual(['Стоматолог'])
    expect(data.linksOf(dentist.id).map(h => h.kind === 'record' && h.rec.text)).toEqual(['Позвонить @Стоматолог'])
    // A typed «@word» with no link stays as it is
    const typed = data.addRecord({ pageId: call.pageId, text: 'Спросить @Стоматолог' })

    data.updateRecord(dentist.id, { text: 'Зубной врач' })
    expect(data.records[call.id]!.text).toBe('Позвонить @Зубной врач')
    expect(data.entries.find(x => x.id === e.id)!.text).toBe('позвонить @Зубной врач, купить хлеб')
    expect(data.records[typed.id]!.text).toBe('Спросить @Стоматолог')
    const md = toMarkdown(data.livePages, data.liveRecords, data.sectionList, NOW, data.nameOf)
    expect(md).toContain('- [ ] Позвонить [[Зубной врач]]\n')
    expect(md).not.toContain('Связано: Зубной врач')
  })

  it('follows a page rename, and «Отменить» takes the record and the link', async () => {
    const { data, journal, health } = await seeded()
    const tasks = data.livePages.find(p => p.title === 'Задачи')!
    const e = await journal.send('записаться @Здоровье', tasks.id, { links: [health.id] })
    const id = e.recordIds![0]!
    expect(data.records[id]).toMatchObject({ text: 'Записаться @Здоровье', links: [health.id] })
    data.updatePage(health.id, { title: 'Врачи' })
    expect(data.records[id]!.text).toBe('Записаться @Врачи')
    journal.undo(e.id)
    expect(data.records[id]).toBeUndefined()
    expect(data.linksOf(health.id)).toEqual([])
    // The line keeps its links, so «Отменить» can give the chip back
    expect(data.entries.find(x => x.id === e.id)).toMatchObject({ kind: 'undone', text: 'записаться @Врачи', links: [health.id] })
  })
})
