// Drag to reorder (spec «Drag», v22). A long press (about 400 ms, a light haptic tick) lifts an item: the `elev`
// fill, the float shadow with a 1px `ring` edge (so it reads in dark too, N24), scale 1.02. The others make room live in
// 150 ms, the list scrolls near its edges, and letting go drops it there. Letting go without moving is a press
// (the item's menu). A vertical scroll before the long press cancels it, Escape puts the item back, and under
// `prefers-reduced-motion` nothing animates. Pointer events only.
//
//   const drag = useDragSort({
//     onDrop: (id, group, index) => data.moveProp(page.id, id, index),
//     onPress: id => openMenu(id),
//   })
//   <section v-for="g in groups" v-bind="drag.group(g.key)">      <!-- a caption inside moves with its group -->
//     <h3>{{ g.label }}</h3>
//     <div v-for="r in g.records" :key="r.id" v-bind="drag.item(r.id)" :class="LIFTED">…</div>
//   </section>
//
// - `group(key)`: a container; the `item`s inside it, in DOM order, are that group. Items can sit in several groups.
// - `item(id)`: the long press, Alt+↑/↓, `touch-action: pan-y` (vertical scroll stays native) and no sheet drag.
// - `handle(id)`: an element that lifts its item at once on a pointer drag, no long press (the desktop ⋮⋮).
// - `onDrop(id, group, index)`: where it landed; `index` counts the items of that group without the dropped one.
// - `move(id, -1 | 1)`: one step for «Выше» / «Ниже» (screen readers) and Alt+↑/↓; past a group's end it goes
//   into the next group. `lifted` is the id being carried, `joining` the other group it is over (its caption turns
//   `accent-ink`), `LIFTED` the classes of its look.
import { nextTick, onBeforeUnmount, ref } from 'vue'

export type DragId = string

export interface DragSortOptions {
  onDrop: (id: DragId, group: string, index: number) => void
  /** Let go without moving */
  onPress?: (id: DragId) => void
  /** May an item go from one group to another (a group by date takes no rows from the others) */
  accepts?: (id: DragId, from: string, to: string) => boolean
  /** 'y': one column of stacked groups (the groups in between move too); 'xy': columns side by side */
  axis?: 'y' | 'xy'
  delay?: number
  disabled?: () => boolean
}

/** The lifted look; the composable sets `data-lifted` on the item */
export const LIFTED = 'data-lifted:relative data-lifted:z-10 data-lifted:bg-elev data-lifted:shadow-float data-lifted:ring data-lifted:ring-ring'

const MOVE_SLOP = 8
const EDGE = 56
const EASE = 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)'

interface Slot { id: DragId, el: HTMLElement, top: number, left: number, height: number, width: number }
interface Box { key: string, el: HTMLElement, top: number, bottom: number, left: number, right: number, items: Slot[], gap: number }

let scopes = 0

export function useDragSort(opts: DragSortOptions) {
  const scope = `d${++scopes}`
  const lifted = ref<DragId | null>(null)
  const joining = ref<string | null>(null)
  const delay = opts.delay ?? 400
  const axis = opts.axis ?? 'y'

  // One press at a time: where it started, its timer, and once lifted the picture of the lists
  let press: { id: DragId, el: HTMLElement, pointerId: number, x: number, y: number, timer?: ReturnType<typeof setTimeout>, handle: boolean } | null = null
  let boxes: Box[] = []
  let from: { box: number, index: number } = { box: 0, index: 0 }
  let to: { box: number, index: number } = { box: 0, index: 0 }
  let scroller: HTMLElement | null = null
  let scroll0 = 0
  let last = { x: 0, y: 0 }
  let travel = 0
  let frame = 0
  let still = false

  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const scrollTop = () => scroller ? scroller.scrollTop : window.scrollY

  function group(key: string) {
    return { 'data-drag-scope': scope, 'data-drag-group': key }
  }

  function item(id: DragId) {
    return {
      'data-drag-id': id,
      // A bottom sheet (vaul) must not follow the finger that carries a row
      'data-vaul-no-drag': '',
      'style': { touchAction: 'pan-y' },
      'onPointerdown': (e: PointerEvent) => start(e, id, false),
      'onKeydown': (e: KeyboardEvent) => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
        e.preventDefault()
        move(id, e.key === 'ArrowUp' ? -1 : 1)
      },
      'onContextmenu': (e: Event) => {
        if (press || lifted.value) e.preventDefault()
      }
    }
  }

  function handle(id: DragId) {
    return {
      style: { touchAction: 'none', cursor: 'grab' },
      onPointerdown: (e: PointerEvent) => start(e, id, true)
    }
  }

  // ---------- reading the lists ----------

  function measure(): Box[] {
    const top = scrollTop()
    return [...document.querySelectorAll<HTMLElement>(`[data-drag-scope="${scope}"]`)].map((el) => {
      const r = el.getBoundingClientRect()
      const items = [...el.querySelectorAll<HTMLElement>('[data-drag-id]')]
        .filter(x => x.closest('[data-drag-scope]') === el)
        .map((x) => {
          const b = x.getBoundingClientRect()
          return { id: x.dataset.dragId!, el: x, top: b.top + top, left: b.left, height: b.height, width: b.width }
        })
      const gap = items.length > 1 ? Math.max(0, items[1]!.top - items[0]!.top - items[0]!.height) : 0
      return { key: el.dataset.dragGroup!, el, top: r.top + top, bottom: r.bottom + top, left: r.left, right: r.right, items, gap }
    })
  }

  function locate(id: DragId, list: Box[]) {
    for (let b = 0; b < list.length; b++) {
      const index = list[b]!.items.findIndex(s => s.id === id)
      if (index >= 0) return { box: b, index }
    }
    return null
  }

  // ---------- the press ----------

  function start(e: PointerEvent, id: DragId, isHandle: boolean) {
    if (press || lifted.value || e.button !== 0 || opts.disabled?.()) return
    const target = e.target as HTMLElement
    // Text being edited keeps its own long press (selecting words)
    if (target.closest('input, textarea') && target === document.activeElement) return
    const el = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-drag-id]')
    if (!el) return
    press = { id, el, pointerId: e.pointerId, x: e.clientX, y: e.clientY, handle: isHandle }
    last = { x: e.clientX, y: e.clientY }
    travel = 0
    el.style.userSelect = 'none'
    el.style.setProperty('-webkit-touch-callout', 'none')
    if (!isHandle) press.timer = setTimeout(lift, delay)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('selectstart', onSelect)
  }

  function onSelect(e: Event) {
    if (press) e.preventDefault()
  }

  /** Once a row is lifted the page must not scroll under the finger */
  function onTouchMove(e: TouchEvent) {
    if (lifted.value) e.preventDefault()
  }

  function onMove(e: PointerEvent) {
    if (!press || e.pointerId !== press.pointerId) return
    last = { x: e.clientX, y: e.clientY }
    const dist = Math.hypot(e.clientX - press.x, e.clientY - press.y)
    travel = Math.max(travel, dist)
    if (!lifted.value) {
      // A handle lifts as soon as it is dragged; a long press that moves first was a scroll or a swipe
      if (press.handle && dist > 3) lift()
      else if (!press.handle && dist > MOVE_SLOP) end()
      return
    }
    e.preventDefault()
    update()
  }

  function onUp(e: PointerEvent) {
    if (!press || e.pointerId !== press.pointerId) return
    if (!lifted.value) return end()
    swallowClick()
    const id = press.id
    const moved = to.box !== from.box || to.index !== from.index
    if (moved) drop(id)
    else {
      settleBack()
      if (travel < MOVE_SLOP) opts.onPress?.(id)
    }
  }

  function onCancel() {
    if (lifted.value) settleBack()
    else end()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !lifted.value) return
    e.preventDefault()
    e.stopPropagation()
    swallowClick()
    settleBack()
  }

  // ---------- lifted ----------

  function lift() {
    if (!press) return
    clearTimeout(press.timer)
    boxes = measure()
    const at = locate(press.id, boxes)
    if (!at) return end()
    from = at
    to = { ...at }
    scroller = scrollParent(boxes[at.box]!.el)
    scroll0 = scrollTop()
    still = reduced()
    lifted.value = press.id
    const el = press.el
    el.dataset.lifted = ''
    el.style.transition = still ? 'none' : 'box-shadow 150ms'
    el.style.transform = 'scale(1.02)'
    if (document.activeElement instanceof HTMLElement && el.contains(document.activeElement) && document.activeElement.matches('input, textarea')) {
      document.activeElement.blur()
    }
    navigator.vibrate?.(10)
    window.addEventListener('keydown', onKey, true)
    frame = requestAnimationFrame(autoScroll)
  }

  /** The probe is the lifted item's centre, in the list's own coordinates (they hold while it scrolls) */
  function update() {
    if (!press || !lifted.value) return
    const slot = boxes[from.box]!.items[from.index]!
    const dy = last.y - press.y + scrollTop() - scroll0
    const dx = axis === 'xy' ? last.x - press.x : 0
    const cy = slot.top + slot.height / 2 + dy
    const cx = slot.left + slot.width / 2 + dx
    to = target(cx, cy)
    joining.value = to.box !== from.box ? boxes[to.box]!.key : null
    const shifts = layout()
    const own = shifts.boxes.get(from.box) ?? 0
    press.el.style.transform = `translate3d(${dx}px, ${dy - own}px, 0) scale(1.02)`
    paint(shifts)
  }

  function target(cx: number, cy: number) {
    const key = boxes[from.box]!.key
    const open = boxes.map((b, i) => i === from.box || !opts.accepts || opts.accepts(press!.id, key, b.key))
    // Stacked groups: a group below the one the row left rises by the row's room once it is the target, and a group
    // above it grows by that room, so each is judged where it will be drawn
    const src = boxes[from.box]!
    const room = src.items[from.index]!.height + src.gap
    const rise = (i: number) => axis === 'y' && i > from.box ? room : 0
    const grow = (i: number) => axis === 'y' && i < from.box ? room : 0
    let best = from.box
    let bestDist = Number.POSITIVE_INFINITY
    boxes.forEach((b, i) => {
      if (!open[i]) return
      const top = b.top - rise(i)
      const bottom = b.bottom + grow(i)
      const d = axis === 'xy'
        ? (cx < b.left ? b.left - cx : cx > b.right ? cx - b.right : 0) * 4 + (cy < top ? top - cy : cy > bottom ? cy - bottom : 0)
        : cy < top ? top - cy : cy > bottom ? cy - bottom : 0
      if (d < bestDist) {
        best = i
        bestDist = d
      }
    })
    const items = boxes[best]!.items.filter(s => s.id !== press!.id)
    const index = items.filter(s => s.top - rise(best) + s.height / 2 < cy).length
    return { box: best, index }
  }

  /** How far each item and each group moves to make room at `to` */
  function layout() {
    const src = boxes[from.box]!
    const lift = src.items[from.index]!
    const room = lift.height + src.gap
    const items = new Map<DragId, number>()
    const shift = new Map<number, number>()
    boxes.forEach((b, bi) => {
      let j = 0
      b.items.forEach((s, i) => {
        if (s.id === lift.id) return
        let d = 0
        if (bi === from.box && bi === to.box) {
          const f = j < to.index ? j : j + 1
          d = f < i ? -room : f > i ? room : 0
        } else if (bi === from.box) {
          d = i > from.index ? -room : 0
        } else if (bi === to.box) {
          d = j >= to.index ? room : 0
        }
        if (d) items.set(s.id, d)
        j++
      })
      // Stacked groups between the two follow: the one it left got shorter, the one it joins taller
      if (axis === 'y' && to.box > from.box && bi > from.box && bi <= to.box) shift.set(bi, -room)
      if (axis === 'y' && to.box < from.box && bi > to.box && bi <= from.box) shift.set(bi, room)
    })
    return { items, boxes: shift }
  }

  function paint(shifts: { items: Map<DragId, number>, boxes: Map<number, number> }) {
    const ease = still ? 'none' : EASE
    boxes.forEach((b, bi) => {
      const d = shifts.boxes.get(bi) ?? 0
      b.el.style.transition = ease
      b.el.style.transform = d ? `translate3d(0, ${d}px, 0)` : ''
      for (const s of b.items) {
        if (s.id === lifted.value) continue
        const v = shifts.items.get(s.id) ?? 0
        s.el.style.transition = ease
        s.el.style.transform = v ? `translate3d(0, ${v}px, 0)` : ''
      }
    })
  }

  function autoScroll() {
    if (!lifted.value) return
    const r = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
    const up = last.y - r.top
    const down = r.bottom - last.y
    const step = up < EDGE ? -Math.ceil((EDGE - up) / 4) : down < EDGE ? Math.ceil((EDGE - down) / 4) : 0
    if (step) {
      const before = scrollTop()
      if (scroller) scroller.scrollTop += step
      else window.scrollBy(0, step)
      if (scrollTop() !== before) update()
    }
    frame = requestAnimationFrame(autoScroll)
  }

  // ---------- letting go ----------

  /** The item lands: the data changes, the lists draw in their new order at once, and the item glides into its slot */
  function drop(id: DragId) {
    const el = press!.el
    const before = el.getBoundingClientRect()
    const box = boxes[to.box]!
    const index = to.index
    clearShifts()
    end()
    opts.onDrop(id, box.key, index)
    void nextTick(() => glide(id, before))
  }

  function glide(id: DragId, before: DOMRect) {
    const el = document.querySelector<HTMLElement>(`[data-drag-scope="${scope}"] [data-drag-id="${CSS.escape(id)}"]`)
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = ''
    if (still) return
    const after = el.getBoundingClientRect()
    el.style.transform = `translate3d(${before.left - after.left}px, ${before.top - after.top}px, 0)`
    el.style.zIndex = '10'
    el.style.position = 'relative'
    void el.offsetWidth
    el.style.transition = EASE
    el.style.transform = ''
    setTimeout(() => {
      el.style.transition = ''
      el.style.zIndex = ''
      el.style.position = ''
    }, 160)
  }

  /** Back to where it was: Escape, a cancelled pointer, or a drop on its own place */
  function settleBack() {
    const el = press?.el
    for (const b of boxes) {
      b.el.style.transform = ''
      for (const s of b.items) s.el.style.transform = ''
    }
    end()
    if (!el) return
    el.style.transition = still ? 'none' : EASE
    el.style.transform = ''
    setTimeout(() => clearShifts(), 160)
  }

  /** Transforms off at once: the new order is already in the DOM, so a transition would make them jump */
  function clearShifts() {
    const els = boxes.flatMap(b => [b.el, ...b.items.filter(s => !(s.id === lifted.value && press)).map(s => s.el)])
    for (const el of els) {
      el.style.transition = 'none'
      el.style.transform = ''
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const el of els) el.style.transition = ''
    }))
  }

  function end() {
    if (press) {
      clearTimeout(press.timer)
      press.el.style.userSelect = ''
      press.el.style.removeProperty('-webkit-touch-callout')
      delete press.el.dataset.lifted
    }
    press = null
    lifted.value = null
    joining.value = null
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('selectstart', onSelect)
    window.removeEventListener('keydown', onKey, true)
  }

  /** The click that follows letting go belongs to the drag, not to the row under the finger */
  function swallowClick() {
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 400)
  }

  // ---------- one step ----------

  /** «Выше» / «Ниже» and Alt+↑/↓: one place up or down; past the end of a group, into the next one */
  function move(id: DragId, by: -1 | 1) {
    const list = measure()
    const at = locate(id, list)
    if (!at) return
    const here = list[at.box]!
    let key = here.key
    let index = at.index + by
    if (index < 0 || index >= here.items.length) {
      const next = list[at.box + by]
      if (!next || (opts.accepts && !opts.accepts(id, here.key, next.key))) return
      key = next.key
      index = by > 0 ? 0 : next.items.length
    }
    const focused = document.activeElement
    const inside = focused instanceof HTMLElement && here.items[at.index]!.el.contains(focused)
    opts.onDrop(id, key, index)
    // The row keeps the focus when the list redraws it somewhere else
    if (inside) {
      void nextTick(() => {
        if (focused.isConnected && document.activeElement === focused) return
        const el = document.querySelector<HTMLElement>(`[data-drag-scope="${scope}"] [data-drag-id="${CSS.escape(id)}"]`)
        const into = el?.matches('button, [tabindex], input') ? el : el?.querySelector<HTMLElement>('button, [tabindex], input')
        into?.focus()
      })
    }
  }

  function cancel() {
    if (lifted.value) settleBack()
    else end()
  }

  onBeforeUnmount(cancel)

  return { group, item, handle, move, cancel, lifted, joining }
}

/** The element that scrolls the lists: the nearest scrolling ancestor, or the page */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
}
