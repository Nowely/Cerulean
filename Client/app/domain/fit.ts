// A summary line that never cuts a name (v24 fixes, item 9): whole names are dropped from the end until the line fits
// its column, and «+N» counts every name not shown. The same helper as the mockups' shared/logic.js on both platforms

/** Glyph advances of Onest at 100px, as the mockups measured them; anything else counts as an average lowercase letter */
const ADVANCE: Record<string, number> = (() => {
  const out: Record<string, number> = {}
  const put = (chars: string, widths: number[]) => [...chars].forEach((c, i) => {
    out[c] = widths[i]!
  })
  put(' абвгдеёжзийклмнопрстуфхцчшщъыьэюя', [27, 56, 58, 55, 45, 59, 57, 57, 76, 51, 60, 60, 52, 56, 70, 57, 60, 57, 60, 55, 47, 55, 72, 52, 58, 53, 79, 81, 59, 68, 52, 55, 79, 53])
  put('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', [67, 65, 66, 57, 71, 61, 61, 86, 63, 73, 73, 63, 69, 86, 73, 76, 73, 63, 71, 57, 61, 84, 59, 72, 66, 97, 98, 73, 84, 63, 71, 99, 66])
  put('0123456789.,·+-«»:;!?()', [67, 36, 57, 60, 63, 62, 62, 51, 62, 62, 25, 26, 25, 55, 46, 48, 48, 25, 26, 27, 51, 31, 31])
  put('abcdefghijklmnopqrstuvwxyz', [56, 60, 55, 60, 57, 37, 60, 59, 22, 25, 52, 22, 82, 59, 60, 60, 60, 37, 51, 37, 58, 54, 84, 52, 60, 52])
  return out
})()

/** The width of a line of Onest at `px`, from the table (where the page can measure, it passes its own measure) */
export function textW(text: string, px: number): number {
  let n = 0
  for (const c of text) n += ADVANCE[c] ?? 58
  return n * px / 100
}

/**
 * «lead · name, name +N» that fits: `names` are the first ones on offer, `total` how many there are. Whole names go
 * from the end and «+N» counts every name not shown, so an ellipsis never falls inside a name; with no room for one
 * name, the lead alone (it carries the count). `fits` says whether a line fits the row's column
 */
export function fitNames(lead: string, names: string[], total: number, fits: (line: string) => boolean): string {
  for (let k = names.length; k > 0; k--) {
    const line = (lead ? `${lead} · ` : '') + names.slice(0, k).join(', ') + (total > k ? ` +${total - k}` : '')
    if (fits(line)) return line
  }
  return lead || names[0] || ''
}
