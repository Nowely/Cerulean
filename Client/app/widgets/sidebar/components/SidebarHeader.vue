<script setup lang="ts">
import { useUserStore, useUIStore } from '~/shared/model'
import UserAvatar from '~/shared/ui/UserAvatar.vue'

const emit = defineEmits<{
  newThread: []
}>()

const userStore = useUserStore()
const uiStore = useUIStore()

const currentUser = computed(() => userStore.currentUser.value)
const searchQuery = computed(() => uiStore.searchQuery.value)
</script>

<template>
  <header class="flex flex-col gap-3 p-4 pb-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UserAvatar
          :user="currentUser ?? undefined"
          size="md"
        />
        <div>
          <h1 class="text-sm font-semibold">
            Cerulean
          </h1>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">
            {{ currentUser?.name }}
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
        class="h-9 w-full rounded-lg bg-[hsl(var(--muted))] pl-9 pr-3 text-sm outline-none ring-0 focus:ring-1 focus:ring-[hsl(var(--ring))]"
        @input="uiStore.setSearch(($event.target as HTMLInputElement).value)"
      >
    </div>
  </header>
</template>
