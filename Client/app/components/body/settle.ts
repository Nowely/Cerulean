// Clean edges while a body has focus on a phone (v23, F6): the header and the bar are opaque, so the scroll settles
// where neither edge cuts a line of text or a row, and the caret's line stays in view. A small nudge, never a jump.

interface Unit {
  top: number
  bottom: number
}

/** The line boxes of a body's blocks: a paragraph of three lines gives three units */
function lines(root: Element, out: Unit[]) {
  root.querySelectorAll('p, h2, hr').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (!r.height) return
    if (el.tagName === 'HR') {
      out.push({ top: r.top - 8, bottom: r.bottom + 8 })
      return
    }
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 24
    const n = Math.max(1, Math.round(r.height / lh))
    for (let i = 0; i < n; i++) out.push({ top: r.top + i * lh, bottom: r.top + (i + 1) * lh })
  })
}

const ROWS = 'li, h1, h2, dt, dd, p, button, textarea, input, [role="status"], [data-settle]'

export function settleEdges(scroller: HTMLElement, caret: { top: number, bottom: number } | null) {
  const box = scroller.getBoundingClientRect()
  const units: Unit[] = []
  scroller.querySelectorAll('.body-text').forEach(el => lines(el, units))
  scroller.querySelectorAll(ROWS).forEach((el) => {
    if (el.closest('.body-text')) return
    const r = el.getBoundingClientRect()
    if (r.height > 0 && r.height <= 120 && r.bottom > box.top - 120 && r.top < box.bottom + 120) units.push({ top: r.top, bottom: r.bottom })
  })
  const cuts = (d: number, edge: number) => units.some(u => u.top - d < edge - 1 && u.bottom - d > edge + 1)
  const max = scroller.scrollHeight - scroller.clientHeight
  const fits = (d: number) => {
    const at = scroller.scrollTop + d
    if (at < 0 || at > max) return false
    if (caret && (caret.top - d < box.top || caret.bottom - d > box.bottom)) return false
    return !cuts(d, box.top) && !cuts(d, box.bottom)
  }
  if (fits(0)) return
  for (let k = 1; k <= 40; k++) {
    for (const d of [k, -k]) {
      if (fits(d)) {
        scroller.scrollTop += d
        return
      }
    }
  }
}
