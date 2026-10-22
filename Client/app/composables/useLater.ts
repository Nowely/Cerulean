// Menus, sheets, popovers and dialogs are not on the first screen, so their code (Reka menus, Floating UI,
// vaul) is not in the first download: it loads once the browser is idle after the first paint, or at once
// when one is asked for. Until then a menu's button renders on its own, and a tap on it opens the menu
// as soon as the code is in.
import { ref, type Component } from 'vue'
import { LazyUContextMenu, LazyUDrawer, LazyUDropdownMenu, LazyUModal, LazyUPopover, LazyUTooltip } from '#components'

const ready = ref(false)
let loading: Promise<void> | undefined

/** Resolving the lazy components themselves, not only their modules, lets them render at once when `ready`
 * flips: a menu trigger nested in a context menu never sees a loading placeholder (a Reka anchor with no element) */
const resolve = (c: Component) => (c as { __asyncLoader?: () => Promise<unknown> }).__asyncLoader?.()

function load() {
  loading ??= Promise.all([LazyUContextMenu, LazyUDrawer, LazyUDropdownMenu, LazyUModal, LazyUPopover, LazyUTooltip].map(resolve)).then(() => {
    ready.value = true
  }, () => {
    loading = undefined
  })
  return loading
}

function loadWhenIdle() {
  if ('requestIdleCallback' in window) requestIdleCallback(() => void load(), { timeout: 2000 })
  else setTimeout(() => void load(), 300)
}

export function useLater() {
  return { ready, load, loadWhenIdle }
}
