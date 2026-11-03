import { onBeforeUnmount, shallowRef } from 'vue'
import type { Id } from '~/domain/types'

export type TreeDrop = { id: Id, target: Id, zone: 'inside' | 'before' | 'after', x: number }
type Held = { id: Id, rect: DOMRect, down: boolean, offset: { x: number, y: number } | null }

export function useListTreeHold(options: {
  disabled: (id: Id) => boolean
  target: (drop: TreeDrop) => boolean
  drop: (drop: TreeDrop) => void
}) {
  const held = shallowRef<Held | null>(null)
  const over = shallowRef<TreeDrop | null>(null)
  let press: { id: Id, el: HTMLElement, pointer: number, x: number, y: number, timer: ReturnType<typeof setTimeout> } | null = null

  function clearPress() {
    if (press) clearTimeout(press.timer)
    press = null
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('touchmove', stopScroll)
  }
  function close() {
    clearPress()
    held.value = null
    over.value = null
  }
  function stopScroll(e: TouchEvent) {
    if (held.value?.down) e.preventDefault()
  }
  function down(e: PointerEvent, id: Id) {
    if (e.pointerType === 'mouse' || e.button !== 0 || press || held.value || options.disabled(id)) return
    const target = e.target as HTMLElement
    if (target.closest('button, input, textarea, a') && !target.closest('[data-row-text]')) return
    const el = e.currentTarget as HTMLElement
    const pointer = e.pointerId
    const { clientX: x, clientY: y } = e
    const timer = setTimeout(() => {
      if (!press || options.disabled(id)) return
      held.value = { id, rect: el.getBoundingClientRect(), down: true, offset: null }
      navigator.vibrate?.(10)
    }, 400)
    press = { id, el, pointer, x, y, timer }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('touchmove', stopScroll, { passive: false })
  }
  function move(e: PointerEvent) {
    if (!press || e.pointerId !== press.pointer) return
    const dx = e.clientX - press.x
    const dy = e.clientY - press.y
    const distance = Math.hypot(dx, dy)
    if (!held.value) {
      if (distance > 8) clearPress()
      return
    }
    if (distance <= 6 && !held.value.offset) return
    e.preventDefault()
    held.value = { ...held.value, offset: { x: dx, y: dy } }
    const el = document.elementsFromPoint(e.clientX, e.clientY).map(x => x.closest<HTMLElement>('[data-tree-row]')).find(Boolean)
    const rect = el?.getBoundingClientRect()
    if (!el || !rect || !el.dataset.treeRow) return void (over.value = null)
    const fraction = (e.clientY - rect.top) / rect.height
    const zone = fraction < 0.25 ? 'before' : fraction > 0.75 ? 'after' : 'inside'
    const candidate: TreeDrop = { id: press.id, target: el.dataset.treeRow, zone, x: e.clientX }
    over.value = options.target(candidate) ? candidate : null
  }
  function suppressClick() {
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      off()
    }
    const off = () => {
      window.removeEventListener('click', stop, true)
      window.removeEventListener('pointerdown', off, true)
    }
    window.addEventListener('click', stop, true)
    window.addEventListener('pointerdown', off, true)
    setTimeout(off, 400)
  }
  function up(e: PointerEvent) {
    if (!press || e.pointerId !== press.pointer) return
    if (!held.value) return clearPress()
    suppressClick()
    const drop = over.value
    const dragging = !!held.value.offset
    clearPress()
    if (dragging) {
      held.value = null
      over.value = null
      if (drop) options.drop(drop)
    } else held.value = { ...held.value, down: false }
  }
  function cancel() {
    close()
  }
  onBeforeUnmount(close)
  return { held, over, down, close }
}
