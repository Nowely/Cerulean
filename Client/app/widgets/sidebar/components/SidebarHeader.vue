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
    >
      <template #avatar>
        <UserAvatar :user="currentUser ?? undefined" />
      </template>
    </UUser>
    <UButton
      icon="i-lucide-plus"
      data-testid="new-thread-btn"
      @click="emit('newThread')"
    />
  </div>
  <div class="px-4 pb-2">
    <UInput
      :model-value="searchQuery"
      placeholder="Search threads..."
      size="sm"
      data-testid="thread-search-input"
      @update:model-value="uiStore.setSearch($event)"
    >
      <template #leading>
        <UIcon
          name="i-lucide-search"
          class="h-4 w-4 text-dimmed"
        />
      </template>
    </UInput>
  </div>
</template>
