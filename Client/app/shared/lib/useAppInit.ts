import { useBlockStore, useUserStore, useNotificationStore } from '~/shared/model'
import type { Notification } from '../types/user'

const STORAGE_KEY = 'cerulean-workspace-state'
const STORAGE_VERSION = 4

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

  async function init() {
    if (initialized.value) return

    const blockStore = useBlockStore()
    const userStore = useUserStore()
    const notificationStore = useNotificationStore()

    await blockStore.init()
    userStore.init()
    notificationStore.init()

    const persisted = loadPersistedState()
    if (persisted) {
      if (persisted.user.currentUserId) {
        userStore.setCurrentUser(persisted.user.currentUserId)
      }
      if (persisted.thread.activeThreadId) {
        blockStore.setActiveThread(persisted.thread.activeThreadId)
      }
      if (persisted.task.activeTaskId) {
        blockStore.setActiveTask(persisted.task.activeTaskId)
      }
      if (persisted.notification.notifications) {
        notificationStore.notifications.value = persisted.notification.notifications
      }
    }

    if (import.meta.client) {
      watch(
        () => [
          userStore.currentUserId.value,
          blockStore.activeThreadId.value,
          blockStore.activeTaskId.value,
          notificationStore.notifications.value
        ],
        () => {
          saveState({
            version: STORAGE_VERSION,
            user: { currentUserId: userStore.currentUserId.value },
            thread: { activeThreadId: blockStore.activeThreadId.value },
            task: { activeTaskId: blockStore.activeTaskId.value },
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
