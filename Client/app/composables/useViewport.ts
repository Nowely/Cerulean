// The on-screen keyboard: iOS overlays it instead of resizing the page, so the shell follows the visual viewport
import { onMounted, onBeforeUnmount } from 'vue'

export function useViewport() {
  let frame = 0
  const update = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const vv = window.visualViewport
      if (!vv) return
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
      // iOS scrolls the whole document to show the focused field; the shell already moved, so undo that
      if (window.scrollY) window.scrollTo(0, 0)
    })
  }
  onMounted(() => {
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    update()
  })
  onBeforeUnmount(() => {
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
  })
}
