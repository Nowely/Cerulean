<script setup lang="ts">
import { useThreadStore, useTaskStore, useUserStore, useNotificationStore } from '~/shared/model'
import { resolveByIds } from '~/shared/utils'
import AvatarStack from '~/shared/ui/AvatarStack.vue'

const threadStore = useThreadStore()
const taskStore = useTaskStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const members = computed(() => {
  if (!threadStore.activeThread.value) return []
  return resolveByIds(threadStore.activeThread.value.members, id => userStore.getUserById(id))
})

const taskCount = computed(() => {
  if (!threadStore.activeThread.value) return 0
  return taskStore.threadTasks(threadStore.activeThread.value.id).length
})
</script>

<template>
  <UDashboardNavbar
    v-if="threadStore.activeThread.value"
    :title="threadStore.activeThread.value.name"
  >
    <template #trailing>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <UBadge
            v-if="threadStore.activeThread.value.category"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ threadStore.activeThread.value.category }}
          </UBadge>
        </div>
        <p class="text-[11px] text-gray-500">
          {{ members.length }} member{{ members.length !== 1 ? 's' : '' }}
          <template v-if="taskCount > 0">
            {{ ' / ' }}{{ taskCount }} task{{ taskCount !== 1 ? 's' : '' }}
          </template>
        </p>
      </div>
    </template>
    <template #right>
      <AvatarStack
        :users="members"
        :max-visible="3"
        size="sm"
      />
      <UChip
        :text="notificationStore.unreadCount.value || undefined"
        color="error"
        size="xs"
      >
        <UButton
          icon="i-lucide-bell"
          color="neutral"
          variant="ghost"
          size="lg"
          aria-label="Notifications"
          @click="notificationStore.setShowPanel(true)"
        />
      </UChip>
    </template>
  </UDashboardNavbar>
</template>
