// Overlays any screen can ask for: choosing a page, confirming a deletion
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { Id } from '~/domain/types'

export type PageChoice = { pageId: Id } | { newPage: string }

/**
 * The one page picker («Ещё…», «Переместить», «Не туда», the composer chip). Its title says what happens
 * («Куда положить», «Куда записать», «Переместить») with the record under it.
 */
export interface Picker {
  title: string
  /** The record text under the title */
  subtitle?: string
  /** The page the records are on now: marked «сейчас здесь» once, in its section; a tap on it only closes */
  current?: Id
  /** «Похоже на»: Авто's guesses, on top */
  guesses?: Id[]
  /** Name for «Новая страница «…»», or empty for «Новая страница…» */
  newName?: string | null
  /** The composer chip: the top row «Авто» (with what it would pick) and, on a page, «Эта страница» */
  auto?: { picks?: string, chosen: boolean, run: () => void }
  thisPage?: Id
  /** The page the composer is aimed at now: a check on its row */
  chosen?: Id
  /** Desktop: the button it opens at, as a popover (without one, a dialog). By default the one that was just pressed */
  anchor?: HTMLElement | null
  /**
   * «Откуда записи» (v24): several pages at once. A tap adds or removes a page and the picker stays; the picked ones
   * are on top, checked. No guesses, no «Новая страница»; `skip` is left out (a page not offered to itself)
   */
  multi?: { picked: () => Id[], toggle: (id: Id) => void, skip?: Id[] }
  /** Runs once the picker is closed, whatever closed it (the sheet that opened it comes back) */
  onClose?: () => void
  run: (choice: PageChoice) => void
}

/** The one notice: an inverted line with at most one action (useNotify) */
export interface Notice {
  id: number
  title: string
  action?: { label: string, run: () => void }
  /** How long it stays while nothing holds it: 8 s with «Отменить» (deletions and moves), else 5 s */
  duration: number
  /** Said about the docked card itself («ИИ снова не ответил»): the card stays under it */
  keepCard?: boolean
}

/** Where the last press landed, so a picker opens at the button that asked for it */
let pressed: Element | null = null
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => {
    pressed = e.target instanceof Element ? e.target : null
  }, true)
}

/**
 * The button a picker was asked from: the one just pressed while it is still on screen, else the focused one
 * (a menu item is gone by then, and focus is back on the menu's own button)
 */
function anchorNow(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const hit = pressed?.isConnected ? pressed.closest<HTMLElement>('button, a, [role="button"]') : null
  if (hit) return hit
  const focused = document.activeElement
  return focused instanceof HTMLElement && focused !== document.body ? focused : null
}

export interface Confirm {
  title: string
  text: string
  action: string
  run: () => void
}

export const useUiStore = defineStore('ui', () => {
  const picker = ref<Picker | null>(null)
  const confirming = ref<Confirm | null>(null)
  /** A page created with «+»: its title takes focus as soon as it is on screen */
  const focusTitle = ref<Id | null>(null)
  /** «Значок и цвет» from a menu: the page opens its icon picker */
  const openGlyph = ref<Id | null>(null)
  /** «Заметка к странице» from a menu: the page draws its note with the caret at the end (v23) */
  const focusNote = ref<Id | null>(null)
  /** A section whose name becomes a field («Новая секция», «Переименовать»), wherever its caption is on screen */
  const renameSection = ref<Id | null>(null)
  /** Text Поиск opens with («Найти» on the toast after a question was written on a page) */
  const findQuery = ref('')
  /** «Записать «гараж»» in Поиск: Главная's composer sends it as typed and docks the receipt there (v22, N19) */
  const outbox = ref<string | null>(null)
  /** «Отменить» on a receipt: its text goes back to the composer on screen, aimed for that one send */
  const refill = ref<{ text: string, aim: Id | 'auto' } | null>(null)
  /** The notice on screen; a new one replaces it, and a docked card goes when one shows (useNotify) */
  const notice = shallowRef<Notice | null>(null)
  /**
   * What each composer's dock holds (Главная, a page, Сегодня), by screen: a receipt stays when its screen is left
   * and comes back with it, until it is replaced or dismissed (B9)
   */
  const docks = ref<Record<string, { ids: Id[], shown: boolean }>>({})

  return {
    picker,
    confirming,
    focusTitle,
    openGlyph,
    focusNote,
    renameSection,
    findQuery,
    outbox,
    refill,
    notice,
    docks,
    pick: (p: Picker) => {
      picker.value = { ...p, anchor: p.anchor === undefined ? anchorNow() : p.anchor }
    },
    confirm: (c: Confirm) => { confirming.value = c }
  }
})
