<script setup lang="ts">
import { useAppStore } from '~/composables/useAppStore'
import UserAvatar from '~/components/shared/UserAvatar.vue'

const emit = defineEmits<{
  newThread: []
}>()

const { state, dispatch } = useAppStore()

const currentUser = computed(() => state.value.currentUser)
const searchQuery = computed(() => state.value.searchQuery)
</script>

<template>
  <header class="flex flex-col gap-3 p-4 pb-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UserAvatar
          :user="currentUser"
          size="md"
        />
        <div>
          <h1 class="text-sm font-semibold">
            TaskChat
          </h1>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">
            {{ currentUser.name }}
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="md"
        color="primary"
        data-testid="new-thread-btn"
        @click="emit('newThread')"
      />
    </div>
    <div class="relative">
      <UIcon
        name="i-lucide-search"
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        placeholder="Search threads..."
        :value="searchQuery"
        data-testid="thread-search-input"
        class="h-9 w-full rounded-lg bg-gray-100 dark:bg-gray-800 pl-9 pr-3 text-sm outline-none ring-0 focus:ring-1 focus:ring-primary-500"
        @input="dispatch({ type: 'SET_SEARCH', query: ($event.target as HTMLInputElement).value })"
      >
    </div>
  </header>
</template>
