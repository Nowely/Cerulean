<script setup lang="ts">
import type { Thread } from '~/shared/types'
import { useMessageStore, useUserStore, useShoppingStore, useNoteStore, useContactStore, useTaskStore } from '~/shared/model'
import { THREAD_KINDS } from '~/shared/lib'
import { relativeTime } from '~/shared/utils'

interface Props {
  thread: Thread
  isActive: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ click: [] }>()

const messageStore = useMessageStore()
const userStore = useUserStore()
const shoppingStore = useShoppingStore()
const noteStore = useNoteStore()
const contactStore = useContactStore()
const taskStore = useTaskStore()

const kindConfig = computed(() => THREAD_KINDS[props.thread.kind])

const lastMessage = computed(() => {
  if (props.thread.kind !== 'chat' && props.thread.kind !== 'tasks') return null
  return messageStore.getLastMessageForThread(props.thread.id)
})

const previewText = computed(() => {
  const kind = props.thread.kind
  if (kind === 'shopping') {
    const checked = shoppingStore.checkedCount(props.thread.id)
    const total = shoppingStore.totalCount(props.thread.id)
    return total > 0 ? `${checked}/${total} items checked` : 'No items yet'
  }
  if (kind === 'notes') {
    const count = noteStore.totalCount(props.thread.id)
    return count > 0 ? `${count} note${count !== 1 ? 's' : ''}` : 'No notes yet'
  }
  if (kind === 'contacts') {
    const count = contactStore.totalCount(props.thread.id)
    return count > 0 ? `${count} contact${count !== 1 ? 's' : ''}` : 'No contacts yet'
  }
  if (kind === 'tasks') {
    const tasks = taskStore.threadTasks(props.thread.id)
    if (tasks.length === 0) return 'No tasks yet'
    const done = tasks.filter(t => t.status === 'done').length
    return `${done}/${tasks.length} tasks done`
  }
  return lastMessage.value?.content ?? 'No messages yet'
})

const senderName = computed(() => {
  if (!lastMessage.value) return null
  const user = userStore.getUserById(lastMessage.value.senderId)
  return user?.name?.split(' ')[0]
})
</script>

<template>
  <button
    class="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
    :class="isActive ? 'bg-primary-500/10 dark:bg-primary-400/10' : 'hover:bg-[hsl(var(--sidebar-accent))]'"
    :data-testid="`thread-item-${thread.id}`"
    @click="emit('click')"
  >
    <UAvatar
      :icon="kindConfig.icon"
      size="xl"
      :style="{ backgroundColor: kindConfig.color }"
      class="text-white"
    />
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
            v-if="senderName && (thread.kind === 'chat' || thread.kind === 'tasks')"
            class="text-[hsl(var(--sidebar-foreground))]"
          >{{ senderName }}: </span>
          {{ previewText }}
        </p>
        <UBadge
          v-if="thread.unreadCount > 0"
          color="primary"
          size="xs"
        >
          {{ thread.unreadCount }}
        </UBadge>
      </div>
    </div>
  </button>
</template>
