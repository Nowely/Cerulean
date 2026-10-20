// Mobile first: the desktop layout (sidebar, right panel, popovers) starts at 1024px
import { useMediaQuery } from '@vueuse/core'

export function useScreen() {
  const isDesktop = useMediaQuery('(min-width: 64rem)')
  const finePointer = useMediaQuery('(pointer: fine)')
  return { isDesktop, finePointer }
}
