// Measures a line in an element's own font, so a summary drops whole names until it fits its column and never cuts
// one (v24 fixes, 9: `fitNames`). One canvas for every row; until the web font has loaded the line is measured again
// when it does. Without a canvas (tests) the table of Onest advances stands in (`textW`).
import { ref } from 'vue'
import { textW } from '~/domain/fit'

let ctx: CanvasRenderingContext2D | null | undefined
/** Bumped when fonts finish loading: what was measured with a fallback font is measured again */
const fonts = ref(0)
let watching = false

function watchFonts() {
  if (watching || typeof document === 'undefined' || !document.fonts) return
  watching = true
  document.fonts.addEventListener('loadingdone', () => fonts.value++)
  void document.fonts.ready.then(() => fonts.value++)
}

export function useTextFit() {
  watchFonts()
  /** The width of a line set in `el`'s font */
  function measurer(el: HTMLElement): (line: string) => number {
    const style = getComputedStyle(el)
    ctx ??= typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    if (!ctx) {
      const px = parseFloat(style.fontSize) || 14
      return line => textW(line, px)
    }
    const c = ctx
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    return (line) => {
      c.font = font
      return c.measureText(line).width
    }
  }
  return { fonts, measurer }
}
