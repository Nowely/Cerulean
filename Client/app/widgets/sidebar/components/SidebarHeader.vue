<script setup lang="ts">
import { useUserStore } from '~/shared/model'
import UserAvatar from '~/shared/ui/UserAvatar.vue'

const emit = defineEmits<{
  newThread: []
}>()

const userStore = useUserStore()

const currentUser = computed(() => userStore.currentUser.value)
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
</template>
