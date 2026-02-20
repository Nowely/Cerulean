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
  <div class="flex items-center justify-between p-4 pb-2">
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
  <div class="px-4 pb-2">
    <UInput
      :model-value="searchQuery"
      placeholder="Search threads..."
      data-testid="thread-search-input"
      :ui="{ base: 'h-9' }"
      @update:model-value="uiStore.setSearch($event)"
    >
      <template #leading>
        <UIcon
          name="i-lucide-search"
          class="h-4 w-4 text-gray-400"
        />
      </template>
    </UInput>
  </div>
</template>
