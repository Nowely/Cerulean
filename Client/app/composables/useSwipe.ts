// Swipe a row left to show «Переместить» and «Удалить». Horizontal drags only; vertical scroll wins.
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

const open = ref<symbol | null>(null)

export function useSwipe(el: Ref<HTMLElement | null>, width: number) {
  const id = Symbol('row')
  const offset = ref(0)
  const dragging = ref(false)
  let x0 = 0
  let y0 = 0
  let base = 0
  let axis: 'x' | 'y' | null = null

  const isOpen = () => open.value === id

  function onStart(e: PointerEvent) {
    if (e.pointerType === 'mouse') return
    x0 = e.clientX
    y0 = e.clientY
    base = isOpen() ? -width : 0
    axis = null
    if (open.value && open.value !== id) open.value = null
  }

  function onMove(e: PointerEvent) {
    if (e.pointerType === 'mouse' || (e.buttons === 0 && e.pointerType !== 'touch')) return
    const dx = e.clientX - x0
    const dy = e.clientY - y0
    if (!axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (axis === 'x') {
        dragging.value = true
        el.value?.setPointerCapture(e.pointerId)
      }
    }
    if (axis !== 'x') return
    offset.value = Math.min(0, Math.max(-width - 24, base + dx))
  }

  function onEnd() {
    if (axis === 'x') {
      const shouldOpen = offset.value < -width / 2
      offset.value = shouldOpen ? -width : 0
      open.value = shouldOpen ? id : (isOpen() ? null : open.value)
    }
    dragging.value = false
    axis = null
  }

  function close() {
    offset.value = 0
    if (isOpen()) open.value = null
  }

  /** A tap right after a drag must not open the record */
  function swallowClick(e: MouseEvent) {
    if (offset.value !== 0) {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  // Opening another row closes this one
  watch(open, (v) => {
    if (v !== id && !dragging.value) offset.value = 0
  })
  onBeforeUnmount(() => {
    if (isOpen()) open.value = null
  })

  return { offset, dragging, onStart, onMove, onEnd, close, swallowClick, isOpen: () => open.value === id && offset.value !== 0, openId: open, id }
}
