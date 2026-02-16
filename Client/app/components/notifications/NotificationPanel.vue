<script setup lang="ts">
import { useAppStore } from '~/composables/useAppStore'
import { relativeTime } from '~/utils'

const { state, dispatch } = useAppStore()
const toast = useToast()

const showNotifications = computed(() => state.value.showNotifications)
const notifications = computed(() => state.value.notifications)

const unreadCount = computed(() =>
  notifications.value.filter(n => !n.read).length
)

const NOTIF_ICONS: Record<string, string> = {
  assignment: 'i-lucide-user-plus',
  comment: 'i-lucide-message-square',
  'status-change': 'i-lucide-arrow-right',
  'due-soon': 'i-lucide-clock',
  mention: 'i-lucide-bell'
}

function handleNotificationClick(notif: { id: string; threadId?: string; taskId?: string }) {
  dispatch({ type: 'MARK_NOTIFICATION_READ', id: notif.id })
  if (notif.threadId) {
    dispatch({ type: 'SET_ACTIVE_THREAD', threadId: notif.threadId })
  }
  if (notif.taskId) {
    dispatch({ type: 'SET_ACTIVE_TASK', taskId: notif.taskId })
  }
  dispatch({ type: 'SHOW_NOTIFICATIONS', show: false })

  toast.add({
    title: 'Notification opened',
    color: 'primary',
    icon: 'i-lucide-bell'
  })
}

function closePanel() {
  dispatch({ type: 'SHOW_NOTIFICATIONS', show: false })
}

function markAllRead() {
  if (unreadCount.value === 0) return

  dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })
  toast.add({
    title: 'All notifications marked read',
    color: 'success',
    icon: 'i-lucide-check-check'
  })
}
</script>

<template>
  <USlideover
    :open="showNotifications"
    side="right"
    :ui="{ content: 'w-80 sm:w-96' }"
    @update:open="(o) => !o && closePanel()"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <div class="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div>
            <h3 class="text-sm font-semibold">
              Notifications{{ unreadCount > 0 ? ` (${unreadCount})` : '' }}
            </h3>
          </div>
          <button
            v-if="unreadCount > 0"
            class="flex items-center gap-1 text-[12px] text-primary-500 hover:text-primary-600 transition-colors"
            data-testid="mark-all-read-btn"
            @click="markAllRead"
          >
            <UIcon name="i-lucide-check-check" class="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="flex flex-col">
            <div
              v-if="notifications.length === 0"
              class="flex flex-col items-center gap-2 px-4 py-16 text-center"
            >
              <UIcon name="i-lucide-bell" class="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p class="text-sm text-gray-500">No notifications yet</p>
            </div>

            <button
              v-for="notif in notifications"
              :key="notif.id"
              :data-testid="`notification-item-${notif.id}`"
              class="flex items-start gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              :class="!notif.read && 'bg-primary-500/5'"
              @click="handleNotificationClick(notif)"
            >
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                :class="!notif.read ? 'bg-primary-500/15 text-primary-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'"
              >
                <UIcon :name="NOTIF_ICONS[notif.type] ?? 'i-lucide-bell'" class="h-4 w-4" />
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="text-[12px] font-semibold"
                    :class="!notif.read ? '' : 'text-gray-500'"
                  >
                    {{ notif.title }}
                  </span>
                  <span
                    v-if="!notif.read"
                    class="h-2 w-2 shrink-0 rounded-full bg-primary-500"
                  />
                </div>
                <p class="text-[12px] text-gray-500 line-clamp-2">
                  {{ notif.body }}
                </p>
                <span class="text-[10px] text-gray-400">
                  {{ relativeTime(notif.timestamp) }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
