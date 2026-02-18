import type { User, UserId, Notification } from './user.types'
import { SEED_USERS, SEED_NOTIFICATIONS } from '~/shared/api/seed'
import { generateId } from '~/shared/utils'

const users = ref<User[]>([])
const currentUserId = ref<UserId | null>(null)

export function useUserStore() {
  const currentUser = computed(() =>
    users.value.find(u => u.id === currentUserId.value) ?? null
  )

  function getUserById(id: UserId): User | undefined {
    return users.value.find(u => u.id === id)
  }

  function getUsersByIds(ids: UserId[]): User[] {
    return ids.map(id => getUserById(id)).filter(Boolean) as User[]
  }

  function setCurrentUser(id: UserId) {
    currentUserId.value = id
  }

  function init() {
    users.value = [...SEED_USERS]
    currentUserId.value = SEED_USERS[0]?.id ?? null
  }

  return {
    users,
    currentUserId,
    currentUser,
    getUserById,
    getUsersByIds,
    setCurrentUser,
    init
  }
}

const notifications = ref<Notification[]>([])
const showPanel = ref(false)

export function useNotificationStore() {
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
}

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
