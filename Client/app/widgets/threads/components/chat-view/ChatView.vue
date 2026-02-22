<script setup lang="ts">
import type { MessageBlock } from '~/shared/types'
import { useBlockStore } from '~/shared/model'
import { formatDate } from '~/shared/utils'
import SystemBubble from './components/SystemBubble.vue'
import TaskCardBubble from './components/TaskCardBubble.vue'
import MessageBubble from './components/MessageBubble.vue'
import InputBar from './components/InputBar.vue'

const blockStore = useBlockStore()

const threadMessages = computed(() => {
  const threadId = blockStore.activeThreadId.value
  if (!threadId) return []
  return blockStore.getThreadMessages(threadId)
})

const firstMessageDateMap = computed(() => {
  const map = new Map<string, string>()
  let currentDate = ''

  for (const msg of threadMessages.value) {
    const date = formatDate(msg.updated)
    if (date !== currentDate) {
      currentDate = date
      map.set(msg.id, date)
    }
  }

  return map
})

const formattedMessages = computed(() =>
  threadMessages.value.map(msg => ({
    id: msg.id,
    role: msg.data.senderId === 'system' ? 'assistant' : 'user',
    parts: [{ type: 'text' as const, text: msg.data.content }],
    _original: msg,
    _dateSeparator: firstMessageDateMap.value.get(msg.id)
  }))
)

function shouldShowAvatar(index: number): boolean {
  const msg = threadMessages.value[index]
  if (!msg) return true
  const prevMsg = index > 0 ? threadMessages.value[index - 1] : null

  return !prevMsg
    || prevMsg.data.senderId !== msg.data.senderId
    || prevMsg.data.type !== msg.data.type
    || new Date(msg.updated).getTime() - new Date(prevMsg.updated).getTime() > 1000 * 60 * 5
}

function isSystemType(msg: MessageBlock): boolean {
  return msg.data.type === 'system' || msg.data.type === 'status-change' || msg.data.type === 'assignment'
}

function isTaskType(msg: MessageBlock): boolean {
  return msg.data.type === 'task-created' || msg.data.type === 'task-updated'
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UScrollArea class="flex-1">
      <div class="px-3 py-2">
        <template
          v-for="(msg, index) in formattedMessages"
          :key="msg.id"
        >
          <UBadge
            v-if="msg._dateSeparator"
            color="neutral"
            variant="soft"
            size="xs"
            class="mx-auto my-3 flex justify-center backdrop-blur-sm"
          >
            {{ msg._dateSeparator }}
          </UBadge>

          <SystemBubble
            v-if="isSystemType(msg._original)"
            :message="msg._original"
          />
          <TaskCardBubble
            v-else-if="isTaskType(msg._original)"
            :message="msg._original"
            :show-avatar="shouldShowAvatar(index)"
          />
          <MessageBubble
            v-else
            :message="msg._original"
            :show-avatar="shouldShowAvatar(index)"
          />
        </template>
      </div>
    </UScrollArea>

    <InputBar />
  </div>
</template>
