// A page's look: its icon, found by a word in «Значок и цвет», and its own colour (v23, Josh 21 Oct 06:42): grey
// until one is chosen, as in Notion. Nothing derives a colour from an icon any more; templates and Авто set none.
// Option colours (the pills) keep all eight colours in PAGE_COLORS.
import type { Glyph, Page, PageColor } from './types'
import { GLYPH_WORDS } from './types'
import { fold } from './text'

/** The colour row of «Значок и цвет»: «Без цвета» first, then seven colours; gray is what «Без цвета» looks like */
export const PAGE_CHOICES: (PageColor | null)[] = [null, 'green', 'blue', 'brown', 'yellow', 'pink', 'purple', 'teal']

/**
 * A page's chosen colour, null for «Без цвета». Read at read time, so older data needs no step: the grey every page
 * made by hand used to get reads as none, and so do Входящие and Сегодня, which have no colour to choose
 */
export function pageColor(page: Pick<Page, 'kind' | 'color'> | null | undefined): PageColor | null {
  if (!page || page.kind !== 'page' || !page.color || page.color === 'gray') return null
  return page.color
}

/** An icon's name for screen readers: the first of its words («Машина») */
export const glyphName = (words: string) => words.split(' ')[0]!

/** The icons a word finds: any of their words starts with it («маш» → Машина); an empty query lists all 35 */
export function findGlyphs(query: string): { glyph: Glyph, name: string }[] {
  const q = fold(query.trim())
  return GLYPH_WORDS
    .filter(([, words]) => !q || fold(words).split(' ').some(w => w.startsWith(q)))
    .map(([glyph, words]) => ({ glyph, name: glyphName(words) }))
}
