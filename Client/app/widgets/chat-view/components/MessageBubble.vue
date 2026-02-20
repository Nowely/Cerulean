<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useUserStore } from '~/shared/model'

interface Props {
  message: Message
  showAvatar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true
})

const userStore = useUserStore()

const sender = computed(() => userStore.getUserById(props.message.senderId))
const isOwn = computed(() => props.message.senderId === userStore.currentUserId.value)

const avatarConfig = computed(() => {
  if (!props.showAvatar || isOwn.value) return undefined
  return {
    alt: sender.value?.name,
    style: { backgroundColor: sender.value?.color },
    ui: { fallback: 'bg-transparent' }
  }
})
</script>

<template>
  <UChatMessage
    :id="message.id"
    :role="isOwn ? 'user' : 'assistant'"
    :side="isOwn ? 'right' : 'left'"
    :variant="isOwn ? 'soft' : 'outline'"
    :avatar="avatarConfig"
    :content="message.content"
    :ui="{
      content: isOwn ? 'bg-primary-500 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-md'
    }"
  >
    <template v-if="showAvatar && !isOwn" #leading>
      <UAvatar
        :alt="sender?.name"
        size="xs"
        :style="{ backgroundColor: sender?.color }"
        class="font-semibold text-white"
        :ui="{ fallback: 'bg-transparent' }"
      >
        <template #fallback>
          {{ sender?.initials }}
        </template>
      </UAvatar>
    </template>
  </UChatMessage>
</template>
