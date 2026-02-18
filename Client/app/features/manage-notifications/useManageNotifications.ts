import { useNotificationStore, createNotification } from '~/entities/notification/store'
import type { Notification } from '~/shared/types'

export function useManageNotifications() {
  const notificationStore = useNotificationStore()

  function markRead(id: string) {
    notificationStore.markRead(id)
  }

  function markAllRead() {
    notificationStore.markAllRead()
  }

  function showPanel() {
    notificationStore.setShowPanel(true)
  }

  function hidePanel() {
    notificationStore.setShowPanel(false)
  }

  function togglePanel() {
    notificationStore.setShowPanel(!notificationStore.showPanel)
  }

  function add(
    type: Notification['type'],
    threadId: string,
    title: string,
    body: string,
    taskId?: string
  ) {
    const notification = createNotification(type, threadId, title, body, taskId)
    notificationStore.add(notification)
    return notification
  }

  return {
    markRead,
    markAllRead,
    showPanel,
    hidePanel,
    togglePanel,
    add
  }
}
