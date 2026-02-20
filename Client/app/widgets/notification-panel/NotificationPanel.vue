<script setup lang="ts">
import { useNotificationStore, useThreadStore, useTaskStore } from '~/shared/model'
import { useToastHelpers } from '~/shared/lib'
import { relativeTime } from '~/shared/utils'

const notificationStore = useNotificationStore()
const threadStore = useThreadStore()
const taskStore = useTaskStore()
const toast = useToastHelpers()

const NOTIF_ICONS: Record<string, string> = {
  'assignment': 'i-lucide-user-plus',
  'comment': 'i-lucide-message-square',
  'status-change': 'i-lucide-arrow-right',
  'due-soon': 'i-lucide-clock',
  'mention': 'i-lucide-bell'
}

function handleNotificationClick(notif: { id: string, threadId?: string, taskId?: string }) {
  notificationStore.markRead(notif.id)
  if (notif.threadId) {
    threadStore.setActive(notif.threadId)
  }
  if (notif.taskId) {
    taskStore.setActive(notif.taskId)
  }
  notificationStore.setShowPanel(false)

  toast.primary({
    title: 'Notification opened',
    icon: 'i-lucide-bell'
  })
}

function closePanel() {
  notificationStore.setShowPanel(false)
}

function handleMarkAllRead() {
  if (notificationStore.unreadCount.value === 0) return

  notificationStore.markAllRead()
  toast.success({
    title: 'All notifications marked read',
    icon: 'i-lucide-check-check'
  })
}
</script>

<template>
  <USlideover
    :open="notificationStore.showPanel.value"
    side="right"
    :ui="{ content: 'w-80 sm:w-96' }"
    @update:open="(o) => !o && closePanel()"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <UDashboardNavbar title="Notifications">
          <template #trailing>
            <UBadge
              v-if="notificationStore.unreadCount.value > 0"
              variant="subtle"
              size="xs"
            >
              {{ notificationStore.unreadCount.value }}
            </UBadge>
          </template>
          <template #right>
            <UButton
              v-if="notificationStore.unreadCount.value > 0"
              icon="i-lucide-check-check"
              variant="link"
              size="xs"
              label="Mark all read"
              data-testid="mark-all-read-btn"
              @click="handleMarkAllRead"
            />
          </template>
        </UDashboardNavbar>

        <UScrollArea class="flex-1">
          <UEmpty
            v-if="notificationStore.notifications.value.length === 0"
            icon="i-lucide-bell"
            title="No notifications yet"
            class="py-12"
          />

          <UCard
            v-for="notif in notificationStore.notifications.value"
            :key="notif.id"
            :data-testid="`notification-item-${notif.id}`"
            variant="soft"
            class="cursor-pointer border-b border-default last:border-b-0 transition-colors hover:bg-elevated"
            :class="!notif.read && 'bg-primary-500/5'"
            @click="handleNotificationClick(notif)"
          >
            <UUser
              :name="notif.title"
              :description="notif.body"
              :avatar="{
                icon: NOTIF_ICONS[notif.type] ?? 'i-lucide-bell',
                size: 'sm',
                ui: { root: !notif.read ? 'bg-primary-500/15 text-primary-500' : 'bg-elevated text-muted' }
              }"
              :chip="!notif.read"
              class="gap-3"
            >
              <template #description>
                <p class="text-xs text-muted line-clamp-2">
                  {{ notif.body }}
                </p>
                <span class="text-2xs text-dimmed">
                  {{ relativeTime(notif.timestamp) }}
                </span>
              </template>
            </UUser>
          </UCard>
        </UScrollArea>
      </div>
    </template>
  </USlideover>
</template>
