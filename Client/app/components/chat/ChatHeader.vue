<script setup lang="ts">
import { useAppStore } from '~/composables/useAppStore'
import { useIsMobile } from '~/composables/useIsMobile'
import AvatarStack from '~/components/shared/AvatarStack.vue'

const { state, dispatch, activeThread, unreadNotificationCount } = useAppStore()
const isMobile = useIsMobile()

const members = computed(() => {
  if (!activeThread.value) return []
  return activeThread.value.members
    .map(id => state.value.users.find(u => u.id === id))
    .filter(Boolean)
})

const taskCount = computed(() => {
  if (!activeThread.value) return 0
  return state.value.tasks.filter(t => t.threadId === activeThread.value!.id).length
})
</script>

<template>
  <header
    v-if="activeThread"
    class="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3"
  >
    <div class="flex items-center gap-3">
      <button
        v-if="isMobile"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        aria-label="Toggle sidebar"
        data-testid="toggle-sidebar-btn"
        @click="dispatch({ type: 'TOGGLE_SIDEBAR' })"
      >
        <UIcon
          name="i-lucide-menu"
          class="h-5 w-5"
        />
      </button>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-semibold">
            {{ activeThread.name }}
          </h2>
          <UBadge
            v-if="activeThread.category"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ activeThread.category }}
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
        class="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        aria-label="Notifications"
        @click="dispatch({ type: 'SHOW_NOTIFICATIONS', show: true })"
      >
        <UIcon
          name="i-lucide-bell"
          class="h-4.5 w-4.5"
        />
        <span
          v-if="unreadNotificationCount > 0"
          class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
        >
          {{ unreadNotificationCount }}
        </span>
      </button>
    </div>
  </header>
</template>
