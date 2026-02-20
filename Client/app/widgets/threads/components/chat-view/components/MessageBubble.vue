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
    alt: sender.value?.name
  }
})
</script>

<template>
  <UChatMessage
    :id="message.id"
    :role="isOwn ? 'user' : 'assistant'"
    :side="isOwn ? 'right' : 'left'"
    :variant="isOwn ? 'own' : 'other'"
    :avatar="avatarConfig"
    :content="message.content"
  >
    <template
      v-if="showAvatar && !isOwn"
      #leading
    >
      <UAvatar
        :alt="sender?.name"
        size="xs"
        class="font-semibold"
      >
        <template #fallback>
          {{ sender?.initials }}
        </template>
      </UAvatar>
    </template>
  </UChatMessage>
</template>
