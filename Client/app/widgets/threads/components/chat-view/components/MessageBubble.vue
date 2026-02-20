<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useUserStore } from '~/shared/model'
import { formatTime } from '~/shared/utils'

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
const timeString = computed(() => formatTime(props.message.timestamp))
</script>

<template>
  <div
    class="flex items-end gap-1.5 mb-1"
    :class="isOwn ? 'justify-end' : 'justify-start'"
  >
    <UAvatar
      v-if="showAvatar && !isOwn"
      :alt="sender?.name"
      size="2xs"
      class="font-semibold shrink-0"
    >
      <template #fallback>
        {{ sender?.initials }}
      </template>
    </UAvatar>

    <div
      class="max-w-[70%] px-2.5 py-1.5 rounded-xl text-sm"
      :class="isOwn
        ? 'bg-primary-500 text-white rounded-br-sm'
        : 'bg-elevated dark:bg-muted rounded-bl-sm'"
    >
      <p class="whitespace-pre-wrap break-words leading-snug">{{ message.content }}</p>
      <span
        class="text-[10px] block text-right mt-0.5 -mb-0.5"
        :class="isOwn ? 'text-white/60' : 'text-muted'"
      >
        {{ timeString }}
      </span>
    </div>
  </div>
</template>
