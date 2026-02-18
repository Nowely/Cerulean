import { useMessageStore, createMessage, useThreadStore } from '~/entities/thread'
import { useUserStore } from '~/entities/user'
import type { MessageType, Message } from '~/entities/thread'

interface SendMessageInput {
  content: string
  type?: MessageType
  taskId?: string
  metadata?: Record<string, string>
}

export function useSendMessage() {
  const messageStore = useMessageStore()
  const threadStore = useThreadStore()
  const userStore = useUserStore()

  function execute(input: SendMessageInput): Message | null {
    const threadId = threadStore.activeThreadId.value
    const userId = userStore.currentUserId.value

    if (!threadId || !userId) return null

    const message = createMessage(
      threadId,
      input.content,
      userId,
      input.type ?? 'text',
      input.taskId,
      input.metadata
    )

    messageStore.add(message)

    if (threadId !== threadStore.activeThreadId.value) {
      const thread = threadStore.threads.value.find(t => t.id === threadId)
      if (thread) thread.unreadCount++
    }

    threadStore.updateLastActivity(threadId, message.timestamp)

    return message
  }

  return {
    execute
  }
}
