// Menus, sheets, popovers and dialogs are not on the first screen, so their code (Reka menus, Floating UI,
// vaul) is not in the first download: it loads once the browser is idle after the first paint, or at once
// when one is asked for. Until then a menu's button renders on its own, and a tap on it opens the menu
// as soon as the code is in.
import { ref } from 'vue'

const ready = ref(false)
let loading: Promise<void> | undefined

function load() {
  loading ??= Promise.all([
    import('@nuxt/ui/components/DropdownMenu.vue'),
    import('@nuxt/ui/components/Popover.vue'),
    import('@nuxt/ui/components/Modal.vue'),
    import('@nuxt/ui/components/Drawer.vue')
  ]).then(() => {
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
