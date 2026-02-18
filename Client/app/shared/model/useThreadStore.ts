import type { Thread, ThreadId } from '../types/thread'
import { SEED_THREADS } from '~/shared/api/seed'

const threads = ref<Thread[]>([])
const activeThreadId = ref<ThreadId | null>(null)

export function useThreadStore() {
  const activeThread = computed(() =>
    threads.value.find(t => t.id === activeThreadId.value) ?? null
  )

  const sortedThreads = computed(() => {
    return [...threads.value].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    })
  })

  function filteredThreads(query: string) {
    if (!query) return sortedThreads.value
    const q = query.toLowerCase()
    return sortedThreads.value.filter(t =>
      t.name.toLowerCase().includes(q)
      || t.category?.toLowerCase().includes(q)
    )
  }

  function setActive(id: ThreadId | null) {
    activeThreadId.value = id
    if (id) {
      const thread = threads.value.find(t => t.id === id)
      if (thread) thread.unreadCount = 0
    }
  }

  function add(thread: Thread) {
    threads.value.unshift(thread)
  }

  function clearUnread(id: ThreadId) {
    const thread = threads.value.find(t => t.id === id)
    if (thread) thread.unreadCount = 0
  }

  function updateLastActivity(id: ThreadId, timestamp: string) {
    const thread = threads.value.find(t => t.id === id)
    if (thread) thread.lastActivity = timestamp
  }

  function init() {
    threads.value = SEED_THREADS.map(t => ({ ...t, members: [...t.members] }))
  }

  return {
    threads,
    activeThreadId,
    activeThread,
    sortedThreads,
    filteredThreads,
    setActive,
    add,
    clearUnread,
    updateLastActivity,
    init
  }
}
