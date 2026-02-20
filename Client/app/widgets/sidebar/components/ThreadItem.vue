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

const description = computed(() => {
  const prefix = senderName.value && (props.thread.kind === 'chat' || props.thread.kind === 'tasks')
    ? `${senderName.value}: `
    : ''
  return `${prefix}${previewText.value}`
})

const threadName = computed(() =>
  props.thread.pinned ? `📌 ${props.thread.name}` : props.thread.name
)
</script>

<template>
  <UUser
    :name="threadName"
    :description="description"
    :avatar="{
      icon: kindConfig.icon,
      size: 'lg',
      style: { backgroundColor: kindConfig.color },
      ui: { root: 'text-white' }
    }"
    :ui="{
      root: `w-full px-3 py-2.5 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-primary-500/10 dark:bg-primary-400/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`
    }"
    :data-testid="`thread-item-${thread.id}`"
    @click="emit('click')"
  >
    <template #description>
      <div class="flex items-center justify-between gap-2 w-full min-w-0">
        <p class="truncate text-[13px] text-gray-500">
          {{ description }}
        </p>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-xs text-gray-500">
            {{ relativeTime(thread.lastActivity) }}
          </span>
          <UBadge
            v-if="thread.unreadCount > 0"
            color="primary"
            size="xs"
          >
            {{ thread.unreadCount }}
          </UBadge>
        </div>
      </div>
    </template>
  </UUser>
</template>
