import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** The shared sideways dismissal for a notice and the update banner. */
export function useNoticeSwipe(
  box: Ref<HTMLElement | null | undefined>,
  identity: () => number | boolean | null | undefined,
  dismiss: (identity: number | boolean) => void
) {
  const offset = ref(0)
  const dragging = ref(false)
  let pointer: number | null = null
  let startX = 0
  let startY = 0
  let started = 0
  let axis: 'x' | 'y' | null = null
  let pressedButton = false
  let suppressClick = false
  let current: number | boolean | null | undefined
  let touch: { id: number, x: number, y: number, lastY: number, axis: 'x' | 'y' | null, scroller: HTMLElement } | null = null

  const style = computed(() => offset.value
    ? {
        transform: `translateX(${offset.value}px)`,
        opacity: String(1 - Math.min(1, Math.abs(offset.value) / (box.value?.offsetWidth || 1)))
      }
    : undefined)

  function reset() {
    pointer = null
    axis = null
    dragging.value = false
    offset.value = 0
  }

  function down(e: PointerEvent) {
    if (pointer !== null || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    suppressClick = false
    pointer = e.pointerId
    startX = e.clientX
    startY = e.clientY
    started = performance.now()
    current = identity()
    pressedButton = !!(e.target as Element).closest('button')
  }

  function move(e: PointerEvent) {
    if (e.pointerId !== pointer) return
    const x = e.clientX - startX
    const y = e.clientY - startY
    if (pressedButton) {
      if (Math.hypot(x, y) >= 6) suppressClick = true
      return
    }
    if (!axis) {
      if (Math.abs(x) < 6 && Math.abs(y) < 6) return
      axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y'
      if (axis === 'y') return
      box.value?.setPointerCapture(e.pointerId)
      dragging.value = true
      suppressClick = true
    }
    if (axis === 'x') offset.value = x
  }

  function up(e: PointerEvent) {
    if (e.pointerId !== pointer) return
    const width = box.value?.offsetWidth || 1
    const speed = Math.abs(offset.value) / Math.max(1, performance.now() - started)
    const shouldDismiss = axis === 'x' && (Math.abs(offset.value) > width / 3 || speed > 0.5)
    const target = current
    reset()
    if (shouldDismiss && target != null && identity() === target) dismiss(target)
  }

  function click(e: MouseEvent) {
    if (!suppressClick) return
    suppressClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  // The dock and sheet foot are siblings of their scroll area, not children of it.
  function scrollSibling(el: HTMLElement): HTMLElement | undefined {
    let child: HTMLElement = el
    for (let parent = child.parentElement; parent; parent = parent.parentElement) {
      if (parent.scrollHeight > parent.clientHeight && /auto|scroll/.test(getComputedStyle(parent).overflowY)) return
      for (const sibling of parent.children) {
        if (sibling === child || !(sibling instanceof HTMLElement)) continue
        if (sibling.scrollHeight > sibling.clientHeight && /auto|scroll/.test(getComputedStyle(sibling).overflowY)) return sibling
      }
      child = parent
    }
  }

  function touchStart(e: TouchEvent) {
    touch = null
    const point = e.changedTouches[0]
    const scroller = box.value && scrollSibling(box.value)
    if (!point || !scroller || e.touches.length !== 1) return
    touch = { id: point.identifier, x: point.clientX, y: point.clientY, lastY: point.clientY, axis: null, scroller }
  }

  function touchMove(e: TouchEvent) {
    if (!touch) return
    const point = Array.from(e.changedTouches).find(t => t.identifier === touch?.id)
    if (!point) return
    if (!touch.axis) {
      const x = point.clientX - touch.x
      const y = point.clientY - touch.y
      if (Math.abs(x) < 6 && Math.abs(y) < 6) return
      touch.axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y'
    }
    if (touch.axis === 'y') touch.scroller.scrollTop += touch.lastY - point.clientY
    touch.lastY = point.clientY
  }

  function touchEnd() {
    touch = null
  }

  watch(identity, () => {
    reset()
    touchEnd()
    suppressClick = false
  }, { flush: 'sync' })
  onBeforeUnmount(() => {
    reset()
    touchEnd()
  })

  return { dragging, style, down, move, up, cancel: reset, click, touchStart, touchMove, touchEnd }
}
