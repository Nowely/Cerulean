<script setup lang="ts">
import { useThreadStore, useTaskStore, useUserStore, useNotificationStore, useUIStore } from '~/shared/model'
import { ICON_BUTTON_BASE_CLASS, useIsMobile } from '~/shared/lib'
import { resolveByIds } from '~/shared/utils'
import AvatarStack from '~/shared/ui/AvatarStack.vue'

const threadStore = useThreadStore()
const taskStore = useTaskStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const uiStore = useUIStore()
const isMobile = useIsMobile()
const iconButtonClass = `${ICON_BUTTON_BASE_CLASS} h-9 w-9`

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
  <header
    v-if="threadStore.activeThread.value"
    class="flex h-14 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3"
  >
    <div class="flex items-center gap-3">
      <button
        v-if="isMobile"
        :class="iconButtonClass"
        aria-label="Toggle sidebar"
        data-testid="toggle-sidebar-btn"
        @click="uiStore.toggleSidebar()"
      >
        <UIcon
          name="i-lucide-menu"
          class="h-5 w-5"
        />
      </button>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-semibold">
            {{ threadStore.activeThread.value.name }}
          </h2>
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
    </div>
    <div class="flex items-center gap-1">
      <AvatarStack
        :users="members"
        :max-visible="3"
        size="sm"
      />
      <button
        :class="`relative ${iconButtonClass}`"
        aria-label="Notifications"
        @click="notificationStore.setShowPanel(true)"
      >
        <UIcon
          name="i-lucide-bell"
          class="h-4.5 w-4.5"
        />
        <span
          v-if="notificationStore.unreadCount.value > 0"
          class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
        >
          {{ notificationStore.unreadCount.value }}
        </span>
      </button>
    </div>
  </header>
</template>
