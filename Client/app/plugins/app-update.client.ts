// A new version of the app (Josh 29 Oct, option В). The service worker caches the whole app, so a new deploy reaches an
// open app only when the worker looks for it and is told to switch. It looks when the app comes back to the front, every
// 15 minutes while in front, and when the network returns. A downloaded build switches only at a safe moment: the app is
// hidden, or it has just opened or come back and the person has not touched it yet, and in both cases nothing is being
// typed (`updateBusy`). The switch reloads every tab, so a tab in the middle of typing waits for its own safe moment
import { defineNuxtPlugin } from '#imports'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useDataStore } from '~/stores/data'
import { updateBusy, updateStale, updateWaiting } from '~/composables/useAppUpdate'

const CHECK_MS = 15 * 60_000
/** How long an update waits in front of the person before the quiet notice may show (option В) */
const STALE_MS = 30 * 60_000

export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return
  const data = useDataStore()

  let registration: ServiceWorkerRegistration | undefined
  /** The person has tapped or typed since the app opened or last came to the front */
  let touched = false
  /** Time the waiting update has spent with the app in front, and since when it is in front now */
  let shownFor = 0
  let shownSince = 0
  let switching = false
  let reloadWanted = false

  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      registration = r
    },
    onNeedRefresh() {
      updateWaiting.value = true
      shownSince = Date.now()
      if (safe()) void apply()
    },
    // Another tab (or this one) switched: the old code here cannot load its lazy parts any more, so it reloads as soon as
    // nothing is being typed
    onNeedReload() {
      reloadWanted = true
      reloadIfFree()
    }
  })

  const hidden = () => document.visibilityState === 'hidden'
  const safe = () => updateWaiting.value && !updateBusy() && (hidden() || !touched)

  async function apply() {
    if (switching) return
    switching = true
    await data.flush()
    await updateServiceWorker()
  }

  function reloadIfFree() {
    if (reloadWanted && !updateBusy()) window.location.reload()
  }

  function check() {
    if (!registration || registration.installing || !navigator.onLine) return
    registration.update().catch(() => {})
  }

  function tallyShown() {
    if (!updateWaiting.value || hidden()) return
    const now = Date.now()
    shownFor += now - shownSince
    shownSince = now
    updateStale.value = shownFor >= STALE_MS
  }

  const touch = () => {
    touched = true
  }
  window.addEventListener('pointerdown', touch, { capture: true, passive: true })
  window.addEventListener('keydown', touch, { capture: true })
  // Leaving a field may be the moment a waiting reload was held for
  window.addEventListener('focusout', () => setTimeout(reloadIfFree, 0))

  document.addEventListener('visibilitychange', () => {
    if (hidden()) {
      tallyShown()
      if (safe()) void apply()
      else reloadIfFree()
      return
    }
    touched = false
    shownSince = Date.now()
    check()
  })
  window.addEventListener('online', check)
  setInterval(tallyShown, 60_000)
  setInterval(() => {
    if (!hidden()) check()
  }, CHECK_MS)
})
