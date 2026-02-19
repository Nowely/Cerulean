<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useMessageStore, useThreadStore } from '~/shared/model'
import { formatDate } from '~/shared/utils'
import SystemBubble from './components/SystemBubble.vue'
import TaskCardBubble from './components/TaskCardBubble.vue'
import MessageBubble from './components/MessageBubble.vue'
import InputBar from './components/InputBar.vue'

const messageStore = useMessageStore()
const threadStore = useThreadStore()

const threadMessages = computed(() =>
  threadStore.activeThreadId.value
    ? messageStore.threadMessages(threadStore.activeThreadId.value)
    : []
)

const firstMessageDateMap = computed(() => {
  const map = new Map<string, string>()
  let currentDate = ''

  for (const msg of threadMessages.value) {
    const date = formatDate(msg.timestamp)
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
    role: msg.senderId === 'system' ? 'assistant' : 'user',
    parts: [{ type: 'text' as const, text: msg.content }],
    _original: msg,
    _dateSeparator: firstMessageDateMap.value.get(msg.id)
  }))
)

function shouldShowAvatar(index: number): boolean {
  const msg = threadMessages.value[index]
  if (!msg) return true
  const prevMsg = index > 0 ? threadMessages.value[index - 1] : null

  return !prevMsg
    || prevMsg.senderId !== msg.senderId
    || prevMsg.type !== msg.type
    || new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 1000 * 60 * 5
}

function isSystemType(msg: Message): boolean {
  return msg.type === 'system' || msg.type === 'status-change' || msg.type === 'assignment'
}

function isTaskType(msg: Message): boolean {
  return msg.type === 'task-created' || msg.type === 'task-updated'
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UScrollArea class="flex-1">
      <template
        v-for="(msg, index) in formattedMessages"
        :key="msg.id"
      >
        <UBadge
          v-if="msg._dateSeparator"
          color="neutral"
          variant="soft"
          size="xs"
          class="mx-auto my-2 flex justify-center backdrop-blur-sm"
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
    </UScrollArea>

    <InputBar />
  </div>
</template>
