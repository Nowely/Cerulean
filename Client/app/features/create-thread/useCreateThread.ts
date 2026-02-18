import { useThreadStore } from '~/entities/thread/store'
import { useUserStore } from '~/entities/user/store'
import { createThread } from '~/entities/thread/model'
import type { Thread } from '~/shared/types'

interface CreateThreadInput {
  name: string
  type: Thread['type']
}

export function useCreateThread() {
  const threadStore = useThreadStore()
  const userStore = useUserStore()

  function execute(input: CreateThreadInput): Thread | null {
    const currentUser = userStore.currentUser
    if (!currentUser) return null

    const thread = createThread(input.name, input.type, currentUser)
    threadStore.add(thread)
    threadStore.setActive(thread.id)

    return thread
  }

  return {
    execute
  }
}
