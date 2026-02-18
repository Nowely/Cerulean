import { useThreadStore } from '~/entities/thread/store'
import { useUIStore } from '~/entities/ui/store'

export function useSearchThreads() {
  const threadStore = useThreadStore()
  const uiStore = useUIStore()

  const results = computed(() =>
    threadStore.filteredThreads(uiStore.searchQuery)
  )

  function setSearch(query: string) {
    uiStore.setSearch(query)
  }

  function clearSearch() {
    uiStore.setSearch('')
  }

  return {
    query: computed(() => uiStore.searchQuery),
    results,
    setSearch,
    clearSearch
  }
}
