import { defineStore } from 'pinia'
import type { Notification } from '~/shared/types'
import { SEED_NOTIFICATIONS } from '~/shared/api/seed'
import { generateId } from '~/shared/utils'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const showPanel = ref(false)

  const unreadCount = computed(() =>
    notifications.value.filter(n => !n.read).length
  )

  function add(notification: Notification) {
    notifications.value.unshift(notification)
  }

  function markRead(id: string) {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) notification.read = true
  }

  function markAllRead() {
    notifications.value.forEach(n => { n.read = true })
  }

  function setShowPanel(show: boolean) {
    showPanel.value = show
  }

  function init() {
    notifications.value = [...SEED_NOTIFICATIONS]
  }

  return {
    notifications,
    showPanel,
    unreadCount,
    add,
    markRead,
    markAllRead,
    setShowPanel,
    init
  }
})

export function createNotification(
  type: Notification['type'],
  threadId: string,
  title: string,
  body: string,
  taskId?: string
): Notification {
  return {
    id: generateId('n'),
    type,
    threadId,
    taskId,
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false
  }
}
