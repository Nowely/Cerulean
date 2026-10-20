// Overlays any screen can ask for: choosing a page, confirming a deletion
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Id } from '~/domain/types'

export type PageChoice = { pageId: Id } | { newPage: string }

export interface Picker {
  title: string
  /** The page the records are on now: shown as current, not offered */
  current?: Id
  /** Name for «Новая страница «…»», or empty for «Новая страница…» */
  newName?: string | null
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

  return {
    picker,
    confirming,
    focusTitle,
    pick: (p: Picker) => { picker.value = p },
    confirm: (c: Confirm) => { confirming.value = c }
  }
})
