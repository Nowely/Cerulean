import { useBlockStore, useUserStore } from '~/shared/model'
import { createBlock } from '~/shared/lib'
import type { MessageBlock, MessageType, BlockId } from '~/shared/types'

interface SendMessageInput {
  content: string
  type?: MessageType
  taskId?: BlockId
  metadata?: Record<string, string>
}

export function useSendMessage() {
  const blockStore = useBlockStore()
  const userStore = useUserStore()

  async function execute(input: SendMessageInput): Promise<MessageBlock | null> {
    const threadId = blockStore.activeThreadId.value
    const userId = userStore.currentUserId.value

    if (!threadId || !userId) return null

    const message = createBlock({
      name: '',
      type: 'message',
      data: {
        type: input.type ?? 'text',
        content: input.content,
        senderId: userId,
        taskId: input.taskId,
        metadata: input.metadata
      },
      parents: [threadId]
    })

    await blockStore.add(message)
    await blockStore.update(threadId, {
      data: {
        ...blockStore.getThread(threadId)!.data,
        lastActivity: message.updated
      }
    })

    return message as MessageBlock
  }

  return {
    execute
  }
}
