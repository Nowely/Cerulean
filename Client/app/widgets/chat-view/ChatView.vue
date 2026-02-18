<script setup lang="ts">
import { useMessageStore } from '~/entities/message/store'
import { useThreadStore } from '~/entities/thread/store'
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
  threadStore.activeThreadId
    ? messageStore.threadMessages(threadStore.activeThreadId)
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
      class="flex-1 overflow-y-auto"
      @scroll="handleScroll"
    >
      <div class="flex flex-col gap-1 py-4">
        <div
          v-for="group in groupedMessages"
          :key="group.date"
          class="flex flex-col gap-1"
        >
          <div class="flex justify-center py-2 sticky top-0 z-10">
            <span class="rounded-full bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-gray-500">
              {{ group.date }}
            </span>
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
    </div>

    <button
      v-if="showScrollBtn"
      class="absolute bottom-20 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 shadow-lg transition-all hover:text-gray-900 dark:hover:text-gray-100"
      aria-label="Scroll to bottom"
      @click="scrollToBottom"
    >
      <UIcon
        name="i-lucide-arrow-down"
        class="h-5 w-5"
      />
    </button>

    <InputBar />
  </div>
</template>
