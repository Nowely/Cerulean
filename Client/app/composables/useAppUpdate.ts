// A new version of the app (Josh 29 Oct, option В): the service worker keeps the old build until this file says it is a
// safe moment to switch (plugins/app-update.client.ts). What holds the switch back lives here, so components can add to it
import { onScopeDispose, ref } from 'vue'

/** A new build is downloaded and waits for a safe moment */
export const updateWaiting = ref(false)
/** The update has waited 30 minutes with the app in front: the banner «Есть новая версия» shows over the closed field */
export const updateStale = ref(false)
/** Swiped away: hidden until the next launch (the swipe is still Josh's open question, so it is one switch) */
export const bannerHidden = ref(false)
export const BANNER_SWIPE = true

let applyNow: () => Promise<void> = async () => window.location.reload()
/** The plugin's way to switch at once, whatever is typed: «Обновить» keeps the field's words itself */
export function setUpdateApply(fn: () => Promise<void>) {
  applyNow = fn
}
export const applyUpdate = () => applyNow()

/** The field's words kept across «Обновить», for the same field (Главная, or one page) */
const DRAFT_KEY = 'cerulean:update-draft'
export interface UpdateDraft { where: string, title: string, note: string, links: string[], picked: string | null }
export function keepDraft(d: UpdateDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch { /* private mode: the words go, as on any reload */ }
}
export function takeDraft(where: string): UpdateDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    const d = raw ? JSON.parse(raw) as UpdateDraft : null
    if (!d || d.where !== where) return null
    sessionStorage.removeItem(DRAFT_KEY)
    return d
  } catch {
    return null
  }
}

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
