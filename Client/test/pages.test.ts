import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { closeUp, subText } from '~/domain/body'
import { findGlyphs, glyphFor } from '~/domain/look'
import { GLYPH_WORDS } from '~/domain/types'
import type { Glyph } from '~/domain/types'
import { useDataStore } from '~/stores/data'

const page = (id: string, glyph: Glyph | null, deletedAt: number | null = null) => ({ id, glyph, deletedAt })

describe('the calendar-week glyph (v24 fixes, 13)', () => {
  it('a starter that would wear the calendar wears the week: Сегодня wears the calendar', () => {
    const pages = [page('today', 'cal'), page('home', 'home')]
    expect(glyphFor('cal', pages)).toBe('calweek')
    // Сегодня wears the first even when it is not among the pages given
    expect(glyphFor('cal', [])).toBe('calweek')
    // The page itself does not count, nor does one in Корзина
    expect(glyphFor('cal', [...pages, page('week', 'calweek')], 'week')).toBe('calweek')
    expect(glyphFor('cal', [...pages, page('old', 'calweek', 1)])).toBe('calweek')
    // With both taken there is no third: the family's first again
    expect(glyphFor('cal', [...pages, page('week', 'calweek')])).toBe('cal')
  })

  it('other glyphs have no family', () => {
    for (const g of ['basket', 'check', 'target', 'bulb'] as Glyph[]) expect(glyphFor(g, [page('x', g)])).toBe(g)
  })

  it('«Значок и цвет» lists «Календарь» and «Неделя» together, 36 icons', () => {
    expect(GLYPH_WORDS).toHaveLength(36)
    const at = GLYPH_WORDS.findIndex(([g]) => g === 'cal')
    expect(GLYPH_WORDS[at + 1]![0]).toBe('calweek')
    expect(findGlyphs('календ').map(x => x.name)).toEqual(['Календарь', 'Неделя'])
    expect(findGlyphs('распис').map(x => x.glyph)).toEqual(['calweek'])
  })
})

describe('«Сделать записью» (v24, И9)', () => {
  it('cuts a sentence from the note as «Сделать подпунктом» does', () => {
    const before = 'Ключи от щитка в верхнем ящике у двери. '
    const after = '.'
    const c = closeUp(before, after)
    // The full stop goes with the sentence, the space before it too: «…у двери.» with the caret after it
    expect(before.slice(0, before.length - c.cutBefore) + c.join + after.slice(c.cutAfter)).toBe('Ключи от щитка в верхнем ящике у двери.')
    expect(subText('Показания счётчиков отправлять до 25-го')).toBe('Показания счётчиков отправлять до 25-го')
  })

  it('the record lands on top of its page with no group and no date', async () => {
    setActivePinia(createPinia())
    const data = useDataStore()
    await data.init({ demo: true, dbName: 'pages-1' })
    const shop = data.livePages.find(p => p.title === 'Покупки')!
    const rec = data.addRecord({ pageId: shop.id, text: 'Показания счётчиков отправлять до 25-го' })
    expect(data.recordsOf(shop.id).reduce((m, r) => Math.min(m, r.order), Infinity)).toBe(rec.order)
    expect(rec.due).toBeNull()
    expect(rec.values).toEqual({})
  })
})
