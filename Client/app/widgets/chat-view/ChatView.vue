<script setup lang="ts">
import { useMessageStore, useThreadStore } from '~/shared/model'
import { formatDate } from '~/shared/utils'
import SystemBubble from './components/SystemBubble.vue'
import TaskCardBubble from './components/TaskCardBubble.vue'
import MessageBubble from './components/MessageBubble.vue'
import InputBar from './components/InputBar.vue'

const messageStore = useMessageStore()
const threadStore = useThreadStore()

const scrollRef = ref<HTMLDivElement>()
const bottomRef = ref<HTMLDivElement>()
const showScrollBtn = ref(false)
const prevMessageCount = ref(0)

const threadMessages = computed(() =>
  threadStore.activeThreadId.value
    ? messageStore.threadMessages(threadStore.activeThreadId.value)
    : []
)

const scrollToBottom = () => {
  bottomRef.value?.scrollIntoView({ behavior: 'smooth' })
}

watch(() => threadMessages.value.length, (newLen) => {
  if (newLen > prevMessageCount.value) {
    bottomRef.value?.scrollIntoView({ behavior: 'smooth' })
  } else {
    bottomRef.value?.scrollIntoView({ behavior: 'instant' })
  }
  prevMessageCount.value = newLen
})

function handleScroll() {
  if (!scrollRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.value
  showScrollBtn.value = scrollHeight - scrollTop - clientHeight > 100
}

const groupedMessages = computed(() => {
  const groups: { date: string, messages: typeof threadMessages.value }[] = []
  let currentDate = ''

  for (const msg of threadMessages.value) {
    const date = formatDate(msg.timestamp)
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date, messages: [] })
    }
    const lastGroup = groups[groups.length - 1]
    if (lastGroup) {
      lastGroup.messages.push(msg)
    }
  }

  return groups
})

function shouldShowAvatar(messages: typeof threadMessages.value, idx: number): boolean {
  const msg = messages[idx]
  if (!msg) return true
  const prevMsg = idx > 0 ? messages[idx - 1] : null

  return !prevMsg
    || prevMsg.senderId !== msg.senderId
    || prevMsg.type !== msg.type
    || new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 1000 * 60 * 5
}
</script>

<template>
  <div class="relative flex flex-1 flex-col overflow-hidden">
    <div
      ref="scrollRef"
      class="flex flex-1 flex-col gap-1 overflow-y-auto py-4"
      @scroll="handleScroll"
    >
      <div
        v-for="group in groupedMessages"
        :key="group.date"
        class="flex flex-col gap-1"
      >
        <div class="flex justify-center py-2 sticky top-0 z-10">
          <UBadge
            color="neutral"
            variant="soft"
            size="xs"
            class="backdrop-blur-sm"
          >
            {{ group.date }}
          </UBadge>
        </div>

        <template
          v-for="(msg, idx) in group.messages"
          :key="msg.id"
        >
          <SystemBubble
            v-if="msg.type === 'system' || msg.type === 'status-change' || msg.type === 'assignment'"
            :message="msg"
          />
          <TaskCardBubble
            v-else-if="msg.type === 'task-created' || msg.type === 'task-updated'"
            :message="msg"
            :show-avatar="shouldShowAvatar(group.messages, idx)"
          />
          <MessageBubble
            v-else
            :message="msg"
            :show-avatar="shouldShowAvatar(group.messages, idx)"
          />
        </template>
      </div>
      <div ref="bottomRef" />
    </div>

    <UButton
      v-if="showScrollBtn"
      icon="i-lucide-arrow-down"
      color="neutral"
      variant="solid"
      size="lg"
      class="absolute bottom-20 right-4 z-20 rounded-full shadow-lg"
      aria-label="Scroll to bottom"
      @click="scrollToBottom"
    />

    <InputBar />
  </div>
</template>
