// Overlays any screen can ask for: choosing a page, confirming a deletion
import { defineStore } from 'pinia'
import { ref } from 'vue'
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
  /** When the last toast showed: a toast and a docked card never show together */
  const toastAt = ref(0)

  return {
    picker,
    confirming,
    focusTitle,
    openGlyph,
    renameSection,
    findQuery,
    refill,
    toastAt,
    pick: (p: Picker) => { picker.value = p },
    confirm: (c: Confirm) => { confirming.value = c }
  }
})
