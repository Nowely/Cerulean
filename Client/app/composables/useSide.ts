// The computer's left column (computer delta, item 1): Главная itself beside the open page. What is inside it looks as on
// the phone's Главная screen on the column's own surface; the field there is the one field on a computer
import { inject, shallowRef, type InjectionKey } from 'vue'

export const SIDE: InjectionKey<boolean> = Symbol('side')

/** Inside the left column */
export function useSide() {
  return inject(SIDE, false)
}

/** Главная's field, so a key or a click anywhere can put it away (items 9, 20) */
export interface HomeField {
  close: () => void
  isOpen: () => boolean
}
const field = shallowRef<HomeField | null>(null)

export function useHomeField() {
  return field
}
