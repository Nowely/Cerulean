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
  /** The page the records are on now: shown as current, not offered */
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
  /** A section whose name becomes a field («Новая секция», «Переименовать»), wherever its caption is on screen */
  const renameSection = ref<Id | null>(null)
  /** Text Поиск opens with («Найти» on the toast after a question was written on a page) */
  const findQuery = ref('')
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
    renameSection,
    findQuery,
    refill,
    notice,
    docks,
    pick: (p: Picker) => { picker.value = p },
    confirm: (c: Confirm) => { confirming.value = c }
  }
})
