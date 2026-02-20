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
    <UUser
      name="Cerulean"
      :description="currentUser?.name"
      size="md"
    >
      <template #avatar>
        <UserAvatar
          :user="currentUser ?? undefined"
          size="md"
        />
      </template>
    </UUser>
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
