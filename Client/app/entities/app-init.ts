import { useUserStore } from '~/entities/user/store'
import { useThreadStore } from '~/entities/thread/store'
import { useTaskStore } from '~/entities/task/store'
import { useMessageStore } from '~/entities/message/store'
import { useNotificationStore } from '~/entities/notification/store'
import { useTemplateStore } from '~/entities/template/store'

const STORAGE_KEY = 'taskchat-fsd-state'
const STORAGE_VERSION = 1

interface PersistedState {
  version: number
  user: { currentUserId: string | null }
  thread: { activeThreadId: string | null }
  task: { activeTaskId: string | null }
  notification: { notifications: import('~/shared/types').Notification[] }
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
      const userStore = useUserStore()
      const threadStore = useThreadStore()
      const taskStore = useTaskStore()
      const notificationStore = useNotificationStore()

      const state: PersistedState = {
        version: STORAGE_VERSION,
        user: { currentUserId: userStore.currentUserId },
        thread: { activeThreadId: threadStore.activeThreadId },
        task: { activeTaskId: taskStore.activeTaskId },
        notification: { notifications: notificationStore.notifications }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }

  function init() {
    if (initialized.value) return

    const userStore = useUserStore()
    const threadStore = useThreadStore()
    const taskStore = useTaskStore()
    const messageStore = useMessageStore()
    const notificationStore = useNotificationStore()
    const templateStore = useTemplateStore()

    userStore.init()
    threadStore.init()
    taskStore.init()
    messageStore.init()
    notificationStore.init()
    templateStore.init()

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
        notificationStore.notifications = persisted.notification.notifications
      }
    }

    if (import.meta.client) {
      watch(
        () => [
          userStore.currentUserId,
          threadStore.activeThreadId,
          taskStore.activeTaskId,
          notificationStore.notifications
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
