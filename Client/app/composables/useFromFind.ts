// A result opened from Поиск comes back to Поиск with its query and results (v22, G11). Поиск keeps them in the
// URL (?find=…&in=…) when it opens a result, so the history entry before a page or record says where it came from.
import { computed } from 'vue'
import { useRoute, useRouter } from '#imports'

const FIND = /[?&]find(=|&|$)/

export function useFromFind() {
  const route = useRoute()
  const router = useRouter()

  /** The path of Поиск this screen was opened from, or null */
  const back = computed(() => {
    void route.fullPath // history.state changes with every navigation
    const prev = typeof window === 'undefined' ? null : window.history.state?.back
    return typeof prev === 'string' && FIND.test(prev) ? prev : null
  })

  /** One step back in history: Поиск comes back as it was, and its «Отмена» still returns where it was opened */
  function goBack(e?: MouseEvent) {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return
    e?.preventDefault()
    router.back()
  }

  return { back, goBack }
}
