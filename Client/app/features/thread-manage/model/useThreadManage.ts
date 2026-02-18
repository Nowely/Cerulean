import { useThreadStore, createThread } from '~/entities/thread'
import { useUserStore } from '~/entities/user'
import { useUIStore } from '~/shared/model'
import type { Thread } from '~/entities/thread'

interface CreateThreadInput {
  name: string
  type: Thread['type']
}

export function useThreadManage() {
  const threadStore = useThreadStore()
  const userStore = useUserStore()
  const uiStore = useUIStore()

  function create(input: CreateThreadInput): Thread | null {
    const currentUser = userStore.currentUser.value
    if (!currentUser) return null

    const thread = createThread(input.name, input.type, currentUser)
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
