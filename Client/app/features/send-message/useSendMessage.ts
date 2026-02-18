import { useMessageStore, createMessage } from '~/entities/message/store'
import { useThreadStore } from '~/entities/thread/store'
import { useUserStore } from '~/entities/user/store'
import type { MessageType } from '~/shared/types'

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

  function execute(input: SendMessageInput) {
    const threadId = threadStore.activeThreadId
    const userId = userStore.currentUserId

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

    if (threadId !== threadStore.activeThreadId) {
      const thread = threadStore.threads.find(t => t.id === threadId)
      if (thread) thread.unreadCount++
    }

    threadStore.updateLastActivity(threadId, message.timestamp)

    return message
  }

  return {
    execute
  }
}
