<script setup lang="ts">
import { useNotificationStore, useThreadStore, useTaskStore } from '~/shared/model'
import { useToastHelpers } from '~/shared/lib'
import { relativeTime } from '~/shared/utils'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'

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
        <ContentPanelHeader>
          <h3 class="text-sm font-semibold">
            Notifications{{ notificationStore.unreadCount.value > 0 ? ` (${notificationStore.unreadCount.value})` : '' }}
          </h3>
          <template #end>
            <UButton
              v-if="notificationStore.unreadCount.value > 0"
              icon="i-lucide-check-check"
              color="primary"
              variant="link"
              size="xs"
              label="Mark all read"
              data-testid="mark-all-read-btn"
              @click="handleMarkAllRead"
            />
          </template>
        </ContentPanelHeader>

        <UScrollArea class="flex-1">
          <div class="flex flex-col">
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
              class="cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              :class="!notif.read && 'bg-primary-500/5'"
              :ui="{ root: 'rounded-none', body: 'px-4 py-3' }"
              @click="handleNotificationClick(notif)"
            >
              <div class="flex items-start gap-3">
                <UAvatar
                  :icon="NOTIF_ICONS[notif.type] ?? 'i-lucide-bell'"
                  size="sm"
                  :class="!notif.read ? 'bg-primary-500/15 text-primary-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'"
                />
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
              </div>
            </UCard>
          </div>
        </UScrollArea>
      </div>
    </template>
  </USlideover>
</template>
