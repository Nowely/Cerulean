// A new version of the app (Josh 29 Oct, option В): the service worker keeps the old build until this file says it is a
// safe moment to switch (plugins/app-update.client.ts). What holds the switch back lives here, so components can add to it
import { onScopeDispose, ref } from 'vue'

/** A new build is downloaded and waits for a safe moment */
export const updateWaiting = ref(false)
/**
 * The update has waited long enough while the app stayed in front ({@link STALE_MS}): the quiet notice of option В reads
 * this. Its look waits for the mockups, so nothing shows it yet
 */
export const updateStale = ref(false)

const holds = new Set<() => boolean>()

/** Keeps the switch off while `busy` says something here would be lost by a reload, such as an unsent field */
export function useUpdateHold(busy: () => boolean) {
  holds.add(busy)
  onScopeDispose(() => {
    holds.delete(busy)
  })
}

/** Typing anywhere, or a hold that says no: a reload now could lose what the person is doing */
export function updateBusy(): boolean {
  const el = document.activeElement
  if (el instanceof HTMLElement && (el.isContentEditable || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return true
  for (const busy of holds) if (busy()) return true
  return false
}
