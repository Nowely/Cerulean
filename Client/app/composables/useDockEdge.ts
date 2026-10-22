// The opaque dock (v24 fixes 2, F17; item 14), v23 F6's rule for the editing bar now for every dock: while the dock shows the
// guess line or the «@» row, the list above ends at a hard edge with no fade, and nothing is ever drawn cut by that edge. The
// dock's surface reaches up over a line or glyph the edge would cut, and over a section caption left with nothing under it.
// A row that fits wholly above the edge stays. With no guess line the usual bottom fade returns. (shared/logic.js, coverDocks)
import type { InjectionKey, Ref } from 'vue'

/** Set by the composer in a screen's dock while its guess line or «@» row shows */
export const DOCK_LINE: InjectionKey<Ref<boolean>> = Symbol('dockLine')

/** What counts as drawn: text, glyphs, checkboxes and dots */
const INK = 'svg, img, .iconify, [role="checkbox"], .rounded-full'
/** Section captions: Главная's sections, a page's groups, Журнал's days */
const CAPS = '.text-cap, .sticky'

/**
 * How far the dock's surface reaches up over the scroll area `box` (px) so that no line, glyph or lone caption is cut by
 * its bottom edge
 */
export function coverHeight(box: HTMLElement): number {
  const bb = box.getBoundingClientRect()
  const ink: { top: number, bottom: number, el: Element }[] = []
  const range = document.createRange()
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement
    if (!n.nodeValue?.trim() || !el || el.closest('.sr-only, textarea, input')) continue
    range.selectNodeContents(n)
    for (const q of range.getClientRects()) if (q.height > 2 && q.width > 0) ink.push({ top: q.top, bottom: q.bottom, el })
  }
  box.querySelectorAll(INK).forEach((el) => {
    const q = el.getBoundingClientRect()
    if (q.height > 2 && q.width > 0) ink.push({ top: q.top, bottom: q.bottom, el })
  })
  const seen = ink.filter(x => x.top > bb.top && x.top < bb.bottom)
  let cut = bb.bottom
  let moved = true
  while (moved) {
    moved = false
    for (const x of seen) {
      if (x.top < cut - 1 && x.bottom > cut + 1) {
        cut = x.top - 2
        moved = true
      }
    }
    // A caption left with nothing under it in view goes under the surface too
    let last: (typeof seen)[number] | null = null
    for (const x of seen) if (x.bottom <= cut + 1 && (!last || x.bottom > last.bottom)) last = x
    const cap = last?.el.closest(CAPS)
    const q = cap && box.contains(cap) ? cap.getBoundingClientRect() : null
    const top = q && q.height < 48 ? q.top - 2 : null
    if (top !== null && top < cut && top > bb.top) {
      cut = top
      moved = true
    }
  }
  return Math.max(0, Math.ceil(bb.bottom - cut))
}
