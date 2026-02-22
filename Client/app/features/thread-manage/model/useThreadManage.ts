import { useBlockStore, useUserStore } from '~/shared/model'
import { createBlock } from '~/shared/lib'
import type { ThreadBlock, ThreadKind } from '~/shared/types'

interface CreateThreadInput {
  name: string
  kind: ThreadKind
}

export function useThreadManage() {
  const blockStore = useBlockStore()
  const userStore = useUserStore()

  async function create(input: CreateThreadInput): Promise<ThreadBlock | null> {
    const currentUser = userStore.currentUser.value
    if (!currentUser) return null

    const thread = createBlock({
      name: input.name,
      type: 'thread',
      data: {
        kind: input.kind,
        members: [currentUser.id],
        lastActivity: new Date().toISOString(),
        unreadCount: 0,
        pinned: false
      }
    })
    await blockStore.add(thread)
    blockStore.setActiveThread(thread.id)

    return thread as ThreadBlock
  }

  return {
    create
  }
}
