import { useUserStore, useNotificationStore } from '~/entities/user'
import { useThreadStore, useMessageStore } from '~/entities/thread'
import { useTaskStore } from '~/entities/task'
import type { Notification } from '~/entities/user'

const STORAGE_KEY = 'taskchat-fsd-state'
const STORAGE_VERSION = 1

interface PersistedState {
  version: number
  user: { currentUserId: string | null }
  thread: { activeThreadId: string | null }
  task: { activeTaskId: string | null }
  notification: { notifications: Notification[] }
}

export function useAppInit() {
  const initialized = ref(false)

  function loadPersistedState(): PersistedState | null {
    if (import.meta.server) return null
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as PersistedState
        if (parsed.version === STORAGE_VERSION) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return null
  }

  function saveState() {
    if (import.meta.server) return
    try {
      const { currentUserId } = useUserStore()
      const { activeThreadId } = useThreadStore()
      const { activeTaskId } = useTaskStore()
      const { notifications } = useNotificationStore()

      const state: PersistedState = {
        version: STORAGE_VERSION,
        user: { currentUserId: currentUserId.value },
        thread: { activeThreadId: activeThreadId.value },
        task: { activeTaskId: activeTaskId.value },
        notification: { notifications: notifications.value }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }

  function init() {
    if (initialized.value) return

    const userStore = useUserStore()
    const notificationStore = useNotificationStore()
    const threadStore = useThreadStore()
    const messageStore = useMessageStore()
    const taskStore = useTaskStore()

    userStore.init()
    notificationStore.init()
    threadStore.init()
    messageStore.init()
    taskStore.init()

    const persisted = loadPersistedState()
    if (persisted) {
      if (persisted.user.currentUserId) {
        userStore.setCurrentUser(persisted.user.currentUserId)
      }
      if (persisted.thread.activeThreadId) {
        threadStore.setActive(persisted.thread.activeThreadId)
      }
      if (persisted.task.activeTaskId) {
        taskStore.setActive(persisted.task.activeTaskId)
      }
      if (persisted.notification.notifications) {
        notificationStore.notifications.value = persisted.notification.notifications
      }
    }

    if (import.meta.client) {
      const { currentUserId } = useUserStore()
      const { activeThreadId } = useThreadStore()
      const { activeTaskId } = useTaskStore()
      const { notifications } = useNotificationStore()

      watch(
        () => [
          currentUserId.value,
          activeThreadId.value,
          activeTaskId.value,
          notifications.value
        ],
        saveState,
        { deep: true }
      )
    }

    initialized.value = true
  }

  return {
    initialized,
    init
  }
}
