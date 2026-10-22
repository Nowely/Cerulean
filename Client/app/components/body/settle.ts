// Clean edges while a body has focus on a phone (v23, F6): the header and the bar are opaque, so the scroll settles
// where neither edge cuts a line of text or a row, and the caret's line stays in view. It takes the nearest such stop,
// whatever the keyboard's height; the title may go under the header for it (the header then names the record). When no
// stop in the caret's range is clean (a long note, the caret near its top), the caret wins: the stop keeps the header's
// edge clean, and the dock's opaque surface covers the line its own edge would cut (AppScreen, as for v24 item 14).

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

const ROWS = 'li, h1, h2, dt, dd, p, button, textarea, input, [role="status"], [role="img"], svg, [data-settle]'

export function settleEdges(scroller: HTMLElement, caret: { top: number, bottom: number } | null) {
  const box = scroller.getBoundingClientRect()
  const units: Unit[] = []
  scroller.querySelectorAll('.body-text').forEach(el => lines(el, units))
  scroller.querySelectorAll(ROWS).forEach((el) => {
    if (el.closest('.body-text')) return
    const r = el.getBoundingClientRect()
    if (r.height > 0 && r.height <= 120 && r.bottom > box.top - box.height && r.top < box.bottom + box.height) units.push({ top: r.top, bottom: r.bottom })
  })
  const cut = (d: number, edge: number) => units.filter(u => u.top - d < edge - 0.5 && u.bottom - d > edge + 0.5).length
  // A cut under the header weighs most: the dock can cover its own edge, the header cannot
  const cost = (d: number) => 100 * cut(d, box.top) + cut(d, box.bottom)
  // How far it may go: within the scroll, and the caret's line never leaves the view
  let lo = -scroller.scrollTop
  let hi = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
  if (caret) {
    lo = Math.max(lo, Math.ceil(caret.bottom - box.bottom))
    hi = Math.min(hi, Math.floor(caret.top - box.top))
  }
  let best = 0
  let least = cost(0)
  // The nearest clean stop, further on first; with none, the stop that cuts the fewest, the header's edge first
  for (let k = 1; least && k <= Math.max(-lo, hi); k++) {
    for (const d of [k, -k]) {
      if (d < lo || d > hi) continue
      const c = cost(d)
      if (c < least) {
        best = d
        least = c
        if (!c) break
      }
    }
  }
  if (best) scroller.scrollTop += best
}
