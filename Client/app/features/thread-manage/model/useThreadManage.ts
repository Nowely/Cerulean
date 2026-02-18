import { useThreadStore, useUserStore, useUIStore } from '~/shared/model'
import { createThread } from '~/shared/lib'
import type { Thread } from '~/shared/types'

interface CreateThreadInput {
  name: string
  kind: Thread['kind']
}

export function useThreadManage() {
  const threadStore = useThreadStore()
  const userStore = useUserStore()
  const uiStore = useUIStore()

  function create(input: CreateThreadInput): Thread | null {
    const currentUser = userStore.currentUser.value
    if (!currentUser) return null

    const thread = createThread(input.name, input.kind, currentUser)
    threadStore.add(thread)
    threadStore.setActive(thread.id)

    return thread
  }

  function search(query: string) {
    uiStore.setSearch(query)
  }

  function clearSearch() {
    uiStore.setSearch('')
  }

  const results = computed(() =>
    threadStore.filteredThreads(uiStore.searchQuery.value)
  )

  return {
    create,
    search,
    clearSearch,
    results,
    query: computed(() => uiStore.searchQuery.value)
  }
}
