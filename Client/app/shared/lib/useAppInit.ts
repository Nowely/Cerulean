import { useMessageStore, useNotificationStore, useTaskStore, useThreadStore, useUserStore } from '~/shared/model'
import type { Notification } from '../types/user'

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

  function saveState(state: PersistedState) {
    if (import.meta.server) return
    try {
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
      watch(
        () => [
          userStore.currentUserId.value,
          threadStore.activeThreadId.value,
          taskStore.activeTaskId.value,
          notificationStore.notifications.value
        ],
        () => {
          saveState({
            version: STORAGE_VERSION,
            user: { currentUserId: userStore.currentUserId.value },
            thread: { activeThreadId: threadStore.activeThreadId.value },
            task: { activeTaskId: taskStore.activeTaskId.value },
            notification: { notifications: notificationStore.notifications.value }
          })
        },
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
