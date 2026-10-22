// The one notice slot (v22, U9, V4, B11, B20): an inverted line, its text and at most one action. It sits right above
// the composer (or above a docked card), at the foot of an open sheet, never over the list, a sheet or the composer.
// A new notice replaces the old one and takes the place of a docked card. With «Отменить» (deletions, moves) it stays
// 8 s, otherwise 5 s; a finger, the pointer or focus on it holds the clock. Its action closes it.
import { computed, effectScope, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useUiStore } from '~/stores/ui'

export const UNDO_MS = 8000
const PLAIN_MS = 5000

let seq = 0

/** Slots on screen; the top one shows the notice: a sheet's over its screen's, then the latest mounted */
const slots = ref<{ id: number, level: number }[]>([])
const top = computed(() => slots.value.reduce<{ id: number, level: number } | undefined>((t, s) => !t || s.level >= t.level ? s : t, undefined))
/** What holds the clock now */
const holds = reactive({ hover: false, focus: false, touch: false })
const held = computed(() => holds.hover || holds.focus || holds.touch)
/** Desktop dialogs open: the notice stays above the composer and rises over their scrim */
const lifts = ref(0)

/** The clock of the notice on screen: one for the whole app, so it keeps running when the notice changes slot */
let clock: { elapsed: () => number } | undefined

function startClock() {
  const ui = useUiStore()
  let timer: ReturnType<typeof setTimeout> | undefined
  let left = 0
  let started = 0
  const stop = () => {
    clearTimeout(timer)
    timer = undefined
  }
  const run = () => {
    stop()
    const n = ui.notice
    if (!n || held.value) return
    started = Date.now()
    timer = setTimeout(() => {
      if (ui.notice?.id === n.id) ui.notice = null
    }, left)
  }
  const pause = () => {
    if (!timer) return
    left = Math.max(0, left - (Date.now() - started))
    stop()
  }
  effectScope(true).run(() => {
    watch(() => ui.notice, (n) => {
      left = n?.duration ?? 0
      run()
    })
    watch(held, h => h ? pause() : run())
  })
  return { elapsed: () => (ui.notice?.duration ?? 0) - (timer ? left - (Date.now() - started) : left) }
}

/** Shows a notice: `notify('Запись в корзине', { label: 'Отменить', run })` */
export function useNotify() {
  const ui = useUiStore()
  clock ??= startClock()
  return (title: string, action?: { label: string, run: () => void }, duration?: number, opts: { keepCard?: boolean } = {}) => {
    const id = ++seq
    ui.notice = {
      id,
      title,
      duration: duration ?? (action?.label === 'Отменить' ? UNDO_MS : PLAIN_MS),
      keepCard: opts.keepCard,
      action: action && {
        label: action.label,
        // The action is done once tapped: the notice goes with it («Открыть» must not stay over the page it opened)
        run: () => {
          if (ui.notice?.id === id) ui.notice = null
          action.run()
        }
      }
    }
    return id
  }
}

/** A place the notice can show: a screen's (`level` 0) or an open sheet's foot (1) */
export function useNoticeSlot(level: number, active: () => boolean) {
  clock ??= startClock()
  const id = ++seq
  const off = () => {
    slots.value = slots.value.filter(s => s.id !== id)
  }
  watch(active, (on) => {
    if (on && !slots.value.some(s => s.id === id)) slots.value = [...slots.value, { id, level }]
    else if (!on) off()
  }, { immediate: true })
  onBeforeUnmount(off)
  return {
    shows: computed(() => top.value?.id === id),
    lifted: computed(() => lifts.value > 0),
    held,
    /** A finger, the pointer or focus on the notice */
    hold: (why: keyof typeof holds, on: boolean) => {
      holds[why] = on
    },
    /** The notice moved to another slot or went: nothing of this one holds the clock */
    release: () => {
      holds.hover = false
      holds.focus = false
      holds.touch = false
    },
    elapsed: () => clock?.elapsed() ?? 0
  }
}

/** A desktop dialog while it is open: the notice rises over its scrim, and a click on it does not close the dialog */
export function useNoticeLift(open: () => boolean) {
  let on = false
  const set = (v: boolean) => {
    if (v === on) return
    on = v
    lifts.value += v ? 1 : -1
  }
  watch(open, set, { immediate: true })
  onBeforeUnmount(() => set(false))
  return {
    /** For the dialog's `onPointerDownOutside` and `onFocusOutside`: the notice is not outside */
    keep: (e: Event) => {
      const target = ((e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent?.target ?? e.target) as Element | null
      if (target?.closest?.('[data-notice]')) e.preventDefault()
    }
  }
}
