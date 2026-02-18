<script setup lang="ts">
import type { Thread } from '~/shared/types'
import { useMessageStore } from '~/entities/message/store'
import { useUserStore } from '~/entities/user/store'
import { relativeTime } from '~/shared/utils'

interface Props {
  thread: Thread
  isActive: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ click: [] }>()

const messageStore = useMessageStore()
const userStore = useUserStore()

const THREAD_ICONS: Record<Thread['type'], string> = {
  project: 'i-lucide-hash',
  group: 'i-lucide-users',
  direct: 'i-lucide-user'
}

const CATEGORY_COLORS: Record<string, string> = {
  Design: 'hsl(340 82% 52%)',
  Engineering: 'hsl(210 100% 52%)',
  Marketing: 'hsl(38 92% 50%)',
  Personal: 'hsl(142 71% 45%)'
}

const lastMessage = computed(() => {
  const messages = messageStore.messages
    .filter(m => m.threadId === props.thread.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return messages[0]
})

const previewText = computed(() =>
  lastMessage.value ? lastMessage.value.content : 'No messages yet'
)

const senderName = computed(() => {
  if (!lastMessage.value) return null
  const user = userStore.getUserById(lastMessage.value.senderId)
  return user?.name?.split(' ')[0]
})

const threadColor = computed(() => {
  if (props.thread.category) {
    return CATEGORY_COLORS[props.thread.category] ?? 'hsl(210 100% 52%)'
  }
  return 'hsl(210 10% 25%)'
})
</script>

<template>
  <button
    class="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
    :class="isActive ? 'bg-primary-500/10 dark:bg-primary-400/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"
    :data-testid="`thread-item-${thread.id}`"
    @click="emit('click')"
  >
    <div
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
      :style="{ backgroundColor: threadColor }"
    >
      <UIcon
        :name="THREAD_ICONS[thread.type]"
        class="h-5 w-5"
      />
    </div>
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center justify-between gap-2">
        <span class="flex items-center gap-1.5 truncate text-sm font-medium">
          <UIcon
            v-if="thread.pinned"
            name="i-lucide-pin"
            class="h-3 w-3 shrink-0 text-primary-500"
          />
          {{ thread.name }}
        </span>
        <span class="shrink-0 text-[11px] text-gray-500">
          {{ relativeTime(thread.lastActivity) }}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <p class="truncate text-[13px] text-gray-500">
          <span
            v-if="senderName"
            class="text-gray-700 dark:text-gray-300"
          >{{ senderName }}: </span>
          {{ previewText }}
        </p>
        <span
          v-if="thread.unreadCount > 0"
          class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] font-semibold text-white"
        >
          {{ thread.unreadCount }}
        </span>
      </div>
    </div>
  </button>
</template>
