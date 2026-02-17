import type { Ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'

const MOBILE_BREAKPOINT = 768

type ViewportMode = 'auto' | 'mobile' | 'desktop'

function useViewportOverride() {
  const state = useState<ViewportMode>('dev-viewport-override', () => 'auto')
  return state as Ref<ViewportMode>
}

export function useIsMobile() {
  const isMobileQuery = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

  if (import.meta.dev) {
    const override = useViewportOverride()
    return computed(() => {
      const mode = override.value ?? 'auto'
      if (mode === 'mobile') return true
      if (mode === 'desktop') return false
      return isMobileQuery.value
    })
  }

  return isMobileQuery
}

export function useDevViewport() {
  const override = useViewportOverride()

  const cycleMode = () => {
    const modes: ViewportMode[] = ['auto', 'mobile', 'desktop']
    const current = override.value ?? 'auto'
    const currentIndex = modes.indexOf(current)
    const nextIndex = (currentIndex + 1) % modes.length
    override.value = modes[nextIndex]!
  }

  return {
    mode: computed(() => override.value ?? 'auto'),
    cycleMode,
    setMode: (mode: ViewportMode) => { override.value = mode },
    reset: () => { override.value = 'auto' }
  }
}
