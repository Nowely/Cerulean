// Поиск: a sheet on mobile, a ⌘K palette on desktop; ?find in the URL so back closes it
import { computed } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useUiStore } from '~/stores/ui'

export function useFind() {
  const route = useRoute()
  const router = useRouter()
  const ui = useUiStore()
  const isOpen = computed(() => route.query.find !== undefined)

  function open(query = '') {
    ui.findQuery = query
    if (!isOpen.value) void router.push({ query: { ...route.query, find: null } })
  }

  function close() {
    if (!isOpen.value) return
    if (window.history.state?.back) router.back()
    else {
      const { find: _, ...query } = route.query
      void router.replace({ query })
    }
  }

  return { isOpen, open, close }
}
