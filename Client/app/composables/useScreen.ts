// Mobile first (computer delta, item 24): from 900px the computer's two columns, Главная on the left beside the open page;
// from 1200px the left column is 390 and the page sits in a 752 column, as drawn. Under 900 it is the phone
import { useMediaQuery } from '@vueuse/core'

export function useScreen() {
  const isDesktop = useMediaQuery('(min-width: 56.25rem)')
  const isWide = useMediaQuery('(min-width: 75rem)')
  const finePointer = useMediaQuery('(pointer: fine)')
  return { isDesktop, isWide, finePointer }
}
