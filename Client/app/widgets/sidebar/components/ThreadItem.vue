<script setup lang="ts">
import type { ThreadBlock } from '~/shared/types'
import { useBlockStore, useUserStore } from '~/shared/model'
import { THREAD_KINDS } from '~/shared/lib'
import { relativeTime } from '~/shared/utils'

interface Props {
  thread: ThreadBlock
  isActive: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ click: [] }>()

const blockStore = useBlockStore()
const userStore = useUserStore()

const kindConfig = computed(() => THREAD_KINDS[props.thread.data.kind])

const lastMessage = computed(() => {
  if (props.thread.data.kind !== 'chat' && props.thread.data.kind !== 'tasks') return null
  return blockStore.getLastMessageForThread(props.thread.id)
})

const previewText = computed(() => {
  const kind = props.thread.data.kind
  if (kind === 'shopping') {
    const items = blockStore.getThreadShoppingItems(props.thread.id)
    const checked = items.filter(i => i.data.checked).length
    const total = items.length
    return total > 0 ? `${checked}/${total} items` : 'No items'
  }
  if (kind === 'notes') {
    const count = blockStore.getThreadNotes(props.thread.id).length
    return count > 0 ? `${count} note${count !== 1 ? 's' : ''}` : 'No notes'
  }
  if (kind === 'contacts') {
    const count = blockStore.getThreadContacts(props.thread.id).length
    return count > 0 ? `${count} contact${count !== 1 ? 's' : ''}` : 'No contacts'
  }
  if (kind === 'tasks') {
    const tasks = blockStore.getThreadTasks(props.thread.id)
    if (tasks.length === 0) return 'No tasks'
    const done = tasks.filter(t => t.data.status === 'done').length
    return `${done}/${tasks.length} done`
  }
  return lastMessage.value?.data.content ?? 'No messages'
})

const senderName = computed(() => {
  if (!lastMessage.value) return null
  const user = userStore.getUserById(lastMessage.value.data.senderId)
  return user?.name?.split(' ')[0]
})

const description = computed(() => {
  const prefix = senderName.value && (props.thread.data.kind === 'chat' || props.thread.data.kind === 'tasks')
    ? `${senderName.value}: `
    : ''
  return `${prefix}${previewText.value}`
})
</script>

<template>
  <div
    class="flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors"
    :class="isActive ? 'bg-primary-500/10 dark:bg-primary-400/10' : 'hover:bg-elevated'"
    :data-testid="`thread-item-${thread.id}`"
    @click="emit('click')"
  >
    <UAvatar
      :icon="kindConfig.icon"
      size="sm"
    />

    <div class="flex-1 min-w-0 flex flex-col gap-0.5">
      <div class="flex items-center gap-1.5">
        <span
          class="font-medium text-sm truncate"
          :class="thread.data.unreadCount > 0 ? 'text-highlighted' : 'text-default'"
        >
          {{ thread.data.pinned ? `📌 ${thread.name}` : thread.name }}
        </span>
      </div>
      <span
        class="text-xs truncate"
        :class="thread.data.unreadCount > 0 ? 'text-default font-medium' : 'text-muted'"
      >
        {{ description }}
      </span>
    </div>

    <div class="flex flex-col items-end gap-0.5 shrink-0">
      <span class="text-[10px] text-muted leading-tight">
        {{ relativeTime(thread.data.lastActivity) }}
      </span>
      <UBadge
        v-if="thread.data.unreadCount > 0"
        size="xs"
        class="h-4 min-w-4 px-1 text-[10px]"
      >
        {{ thread.data.unreadCount }}
      </UBadge>
    </div>
  </div>
</template>
