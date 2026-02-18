import type { Message, MessageType } from '../types/thread'
import { SEED_MESSAGES } from '~/shared/api/seed'
import { generateId } from '~/shared/utils'

const messages = ref<Message[]>([])

export function useMessageStore() {
  const lastMessageByThread = computed(() => {
    const index: Record<string, Message> = {}
    for (const message of messages.value) {
      const current = index[message.threadId]
      if (!current || new Date(message.timestamp).getTime() > new Date(current.timestamp).getTime()) {
        index[message.threadId] = message
      }
    }
    return index
  })

  function threadMessages(threadId: string) {
    return messages.value
      .filter(m => m.threadId === threadId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  function getLastMessageForThread(threadId: string): Message | undefined {
    return lastMessageByThread.value[threadId]
  }

  function getMessagesByTask(taskId: string): Message[] {
    return messages.value.filter(m => m.taskId === taskId)
  }

  function add(message: Message) {
    messages.value.push(message)
  }

  function init() {
    messages.value = [...SEED_MESSAGES]
  }

  return {
    messages,
    lastMessageByThread,
    threadMessages,
    getLastMessageForThread,
    getMessagesByTask,
    add,
    init
  }
}

export function createMessage(
  threadId: string,
  content: string,
  senderId: string,
  type: MessageType = 'text',
  taskId?: string,
  metadata?: Record<string, string>
): Message {
  return {
    id: generateId('m'),
    threadId,
    type,
    content,
    senderId,
    taskId,
    timestamp: new Date().toISOString(),
    metadata
  }
}
