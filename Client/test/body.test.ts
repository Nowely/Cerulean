import { describe, expect, it } from 'vitest'
import {
  bodyMarkdown, bodyOf, closeUp, docText, firstWords, isEmptyDoc, linesOf, mentionIds, mentionOptions, mentionReason,
  noteDoc, remapMentions, sentence, snippet, subText, unmention
} from '~/domain/body'
import type { BodyDoc, BodyNode } from '~/domain/types'
import { demo } from '~/domain/seed'
import { search } from '~/domain/search'
import { mergeSnapshot, parseSnapshot, toJSON, toMarkdown } from '~/domain/export'

const t = (text: string, ...marks: string[]): BodyNode => marks.length ? { type: 'text', text, marks: marks.map(type => ({ type })) } : { type: 'text', text }
const m = (id: string, label: string): BodyNode => ({ type: 'mention', attrs: { id, label } })
const p = (...content: BodyNode[]): BodyNode => ({ type: 'paragraph', content })
const li = (...content: BodyNode[]): BodyNode => ({ type: 'listItem', content: [p(...content)] })
const doc = (...content: BodyNode[]): BodyDoc => ({ type: 'doc', content })

const eggs = doc(
  p(t('Брать С0, десяток в картонной упаковке. Если нет, подойдут С1. Проверить, что ни одно не треснуло.')),
  { type: 'heading', attrs: { level: 2 }, content: [t('На неделю')] },
  { type: 'bulletList', content: [li(t('омлет на завтрак, к нему '), m('milk', 'Молоко')), li(t('шакшука в субботу'))] }
)
const names: Record<string, string> = { milk: 'Молоко', habits: 'Атомные привычки' }
const nameOf = (id: string, label?: string) => names[id] ?? label ?? ''

describe('bodies', () => {
  it('reads a note from before v23 as a body, a paragraph per line', () => {
    expect(noteDoc('')).toBeNull()
    expect(noteDoc('Зачем: вернуть форму.')).toEqual(doc(p(t('Зачем: вернуть форму.'))))
    expect(bodyOf({ note: 'а\n\nб' })?.content).toHaveLength(2)
    expect(bodyOf({ note: 'старое', body: eggs })).toBe(eggs)
    expect(bodyOf({ note: '', body: null })).toBeNull()
  })

  it('knows an empty body', () => {
    expect(isEmptyDoc(null)).toBe(true)
    expect(isEmptyDoc(doc(p()))).toBe(true)
    expect(isEmptyDoc(doc(p(t('  '))))).toBe(true)
    expect(isEmptyDoc(doc({ type: 'horizontalRule' }))).toBe(false)
    expect(isEmptyDoc(doc(p(m('milk', 'Молоко'))))).toBe(false)
  })

  it('reads lines and text, a mention by its live name', () => {
    const lines = linesOf(eggs)
    expect(lines.map(l => l.kind)).toEqual(['p', 'h', 'ul', 'ul'])
    names.milk = 'Молоко 2,5%'
    expect(docText(eggs, nameOf).split('\n')[2]).toBe('омлет на завтрак, к нему Молоко 2,5%')
    names.milk = 'Молоко'
    expect(mentionIds(eggs)).toEqual(['milk'])
    expect(firstWords('Ключи от щитка в верхнем ящике у двери. Показания')).toBe('Ключи от щитка в верхнем ящике')
  })

  it('numbers an ordered list and keeps nesting', () => {
    const d = doc({ type: 'orderedList', attrs: { start: 1 }, content: [li(t('раз')), { type: 'listItem', content: [p(t('два')), { type: 'bulletList', content: [li(t('вложено'))] }] }] })
    expect(linesOf(d).map(l => [l.kind, l.depth, l.n])).toEqual([['ol', 0, 1], ['ol', 0, 2], ['ul', 1, undefined]])
    expect(bodyMarkdown(d)).toBe('1. раз\n2. два\n  - вложено')
  })

  it('gives the sentence around a mention as its reason', () => {
    const book = doc(p(t('Сдать до воскресенья, продлить уже нельзя.')), p(t('Сначала дочитать '), m('habits', 'Атомные привычки'), t(', осталось две главы.')))
    expect(mentionReason(book, 'habits', nameOf)).toBe('Сначала дочитать Атомные привычки, осталось две главы.')
    expect(sentence('Раз. Два три. Четыре', 6)).toBe('Два три.')
    // A mention that is a sentence on its own gives the whole line
    const alone = doc(p(t('Купить к ужину. '), m('milk', 'Молоко')))
    expect(mentionReason(alone, 'milk', nameOf)).toBe('Купить к ужину. Молоко')
    expect(mentionReason(alone, 'nobody', nameOf)).toBe('')
  })

  it('turns a mention back into words', () => {
    const out = unmention(eggs, 'milk', nameOf)
    expect(mentionIds(out)).toEqual([])
    const item = out.content![2]!.content![0]!.content![0]!
    expect(item.content).toEqual([t('омлет на завтрак, к нему Молоко')])
    // The input is left as it was
    expect(mentionIds(eggs)).toEqual(['milk'])
  })

  it('remaps mentions on import, and a mention of something not brought becomes words', () => {
    const out = remapMentions(doc(p(m('milk', 'Молоко'), t(' и '), m('gone', 'Сыр'))), id => id === 'milk' ? 'milk2' : undefined)
    expect(mentionIds(out)).toEqual(['milk2'])
    expect(docText(out)).toBe('Молоко и Сыр')
  })

  it('exports Markdown with a mention as [[Name]]', () => {
    expect(bodyMarkdown(eggs, nameOf)).toBe('Брать С0, десяток в картонной упаковке. Если нет, подойдут С1. Проверить, что ни одно не треснуло.\n\n## На неделю\n\n- омлет на завтрак, к нему [[Молоко]]\n- шакшука в субботу')
    const marks = doc(p(t('жирно', 'bold'), t(' и '), t('косо', 'italic'), t(' '), { type: 'text', text: 'сайт', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }), { type: 'horizontalRule' }, { type: 'blockquote', content: [p(t('раз')), p(t('два'))] })
    expect(bodyMarkdown(marks)).toBe('**жирно** и *косо* [сайт](https://example.com)\n\n---\n\n> раз\n> два')
  })

  it('cuts a snippet from a word before the match', () => {
    const text = 'Зачем: вернуть форму и полгода держать регулярность. Три пробежки в неделю, длинная по выходным.'
    const s = snippet(text, 'пробеж')!
    expect(s.pre).toBe('…регулярность. Три ')
    expect(s.mid).toBe('пробеж')
    expect(s.post.startsWith('ки в неделю')).toBe(true)
    expect(snippet('Ёлка', 'елк')?.mid).toBe('Ёлк')
    expect(snippet('нет', 'да')).toBeNull()
    expect(snippet('Коротко про бег', 'бег')?.pre).toBe('Коротко про ')
  })

  it('closes a line up after its words became a subitem', () => {
    // A whole sentence at the end takes its full stop
    const line = 'Брать С0, десяток в картонной упаковке. Если нет, подойдут С1. Проверить, что ни одно не треснуло.'
    const sel = 'Проверить, что ни одно не треснуло'
    const k = line.indexOf(sel)
    const before = line.slice(0, k)
    const after = line.slice(k + sel.length)
    const c = closeUp(before, after)
    expect(before.slice(0, before.length - c.cutBefore) + c.join + after.slice(c.cutAfter)).toBe('Брать С0, десяток в картонной упаковке. Если нет, подойдут С1.')
    // Words at the start: the rest starts with a capital, its leading comma goes
    const c2 = closeUp('', ', а потом домой')
    expect(c2).toEqual({ cutBefore: 0, cutAfter: 2, join: '', capital: true })
    // Words in the middle: one space stays, none before a comma
    expect(closeUp('купить ', ' и хлеб')).toEqual({ cutBefore: 1, cutAfter: 1, join: ' ', capital: false })
    expect(closeUp('купить ', ', хлеб')).toEqual({ cutBefore: 1, cutAfter: 0, join: '', capital: false })
    expect(subText('проверить, что ни одно не треснуло.')).toBe('Проверить, что ни одно не треснуло')
  })

  it('offers what the record is about, then its links, then recent pages', () => {
    const records = [
      { id: 'goal', kind: 'record' as const, name: '24 книги за год', pageId: 'goals' },
      { id: 'habits', kind: 'record' as const, name: 'Атомные привычки', pageId: 'books' },
      { id: 'milk', kind: 'record' as const, name: 'Молоко', pageId: 'shop' },
      { id: 'old', kind: 'record' as const, name: 'Прочитать старое', pageId: 'books', done: true }
    ]
    const pages = [
      { id: 'books', kind: 'page' as const, name: 'Книги', openedAt: 1 },
      { id: 'shop', kind: 'page' as const, name: 'Покупки', openedAt: 5 },
      { id: 'goals', kind: 'page' as const, name: 'Цели', openedAt: 3 }
    ]
    const base = { records, pages, linked: [] as string[] }
    expect(mentionOptions({ ...base, query: '', context: 'Вернуть книгу в библиотеку Сначала дочитать ' }).map(x => x.name))
      .toEqual(['24 книги за год', 'Атомные привычки', 'Книги'])
    expect(mentionOptions({ ...base, query: '', context: 'Позвонить', linked: ['milk'] }).map(x => x.name))
      .toEqual(['Молоко', 'Покупки', 'Цели'])
    // A query: names that start with it first, then a word that starts with it; done records are left out
    expect(mentionOptions({ ...base, query: 'п', context: '' }).map(x => x.name)).toEqual(['Покупки', 'Атомные привычки'])
    expect(mentionOptions({ ...base, query: 'ато', context: '' }).map(x => x.name)).toEqual(['Атомные привычки'])
  })

  it('finds words in bodies after names, with a snippet, and in page notes', () => {
    const d = demo()
    const records = d.records.filter(r => !r.deletedAt)
    const hits = search('пробеж', d.pages, records, { titlesOnly: false, sectionId: null })
    const last = hits[hits.length - 1]!
    expect(hits.slice(0, -1).every(h => h.kind === 'record' && !h.snippet)).toBe(true)
    expect(last.kind === 'record' && last.rec.text).toBe('Полумарафон к маю')
    expect(last.snippet?.pre).toBe('…регулярность. Три ')
    const note = search('щитка', d.pages, records, { titlesOnly: false, sectionId: null })
    expect(note.map(h => h.kind === 'page' && h.page.title)).toEqual(['Дела по дому'])
  })

  it('exports bodies as Markdown and brings mentions through «Добавить к текущим»', () => {
    const d = demo()
    const live = d.pages.filter(p => !p.deletedAt)
    const md = toMarkdown(live, d.records.filter(r => !r.deletedAt), d.sections)
    expect(md).toContain('\n  - омлет на завтрак, к нему [[Молоко]]')
    expect(md).toContain('Сначала дочитать [[Атомные привычки]], осталось две главы.')
    expect(md).toContain('## Мастера')
    // Into an empty database: every id is free, so mentions keep pointing at the same records
    const file = parseSnapshot(toJSON({ ...d, settings: {} as never, learned: {} }))
    const here = { pages: [], records: [], sections: [], learned: {} }
    const merged = mergeSnapshot(here, file)
    const eggs = merged.records.find(r => r.text === 'Яйца')!
    const milk = merged.records.find(r => r.text === 'Молоко')!
    expect(eggs.mentions).toEqual([milk.id])
    expect(mentionIds(eggs.body)).toEqual([milk.id])
  })
})
