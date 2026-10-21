// A page's own colour (v23, Josh 21 Oct 06:42): grey until one is chosen, as in Notion. Nothing derives a colour
// from an icon any more; templates and Авто set none. Option colours (the pills) keep all eight in PAGE_COLORS.
import type { Page, PageColor } from './types'

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
