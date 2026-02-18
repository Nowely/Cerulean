<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useUserStore } from '~/entities/user/store'
import { formatTime } from '~/shared/utils'
import UserAvatar from '~/shared/ui/UserAvatar.vue'

interface Props {
  message: Message
  showAvatar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true
})

const userStore = useUserStore()

const sender = computed(() => userStore.getUserById(props.message.senderId))
const isOwn = computed(() => props.message.senderId === userStore.currentUserId)
</script>

<template>
  <div
    class="flex gap-2 px-3"
    :class="isOwn ? 'flex-row-reverse' : 'flex-row'"
  >
    <UserAvatar
      v-if="showAvatar && !isOwn"
      :user="sender"
      size="sm"
      class="mt-1"
    />
    <div
      v-else-if="!isOwn"
      class="w-7 shrink-0"
    />

    <div
      class="flex max-w-[80%] flex-col gap-0.5"
      :class="isOwn ? 'items-end' : 'items-start'"
    >
      <span
        v-if="showAvatar && !isOwn"
        class="px-1 text-[11px] font-medium text-primary-500"
      >
        {{ sender?.name }}
      </span>
      <div
        class="rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed"
        :class="isOwn
          ? 'rounded-br-md bg-primary-500 text-white'
          : 'rounded-bl-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'"
      >
        {{ message.content }}
      </div>
      <span class="px-1 text-[10px] text-gray-500">
        {{ formatTime(message.timestamp) }}
      </span>
    </div>
  </div>
</template>
