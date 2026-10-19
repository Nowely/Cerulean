<script setup lang="ts">
import { useBlockStore, useUserStore, useNotificationStore } from '~/shared/model'
import { resolveByIds } from '~/shared/utils'
import AvatarStack from '~/shared/ui/AvatarStack.vue'

const blockStore = useBlockStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const members = computed(() => {
  if (!blockStore.activeThread.value) return []
  return resolveByIds(blockStore.activeThread.value.data.members, id => userStore.getUserById(id))
})

const taskCount = computed(() => {
  if (!blockStore.activeThread.value) return 0
  return blockStore.getThreadTasks(blockStore.activeThread.value.id).length
})
</script>

<template>
  <UDashboardNavbar
    v-if="blockStore.activeThread.value"
    :title="blockStore.activeThread.value.name"
  >
    <template #trailing>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <UBadge
            v-if="blockStore.activeThread.value.data.category"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ blockStore.activeThread.value.data.category }}
          </UBadge>
        </div>
        <p class="text-xs text-muted">
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
