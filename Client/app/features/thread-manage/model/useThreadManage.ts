import { useThreadStore, useUserStore } from '~/shared/model'
import { createThread } from '~/shared/lib'
import type { Thread } from '~/shared/types'

interface CreateThreadInput {
  name: string
  kind: Thread['kind']
}

export function useThreadManage() {
  const threadStore = useThreadStore()
  const userStore = useUserStore()

  function create(input: CreateThreadInput): Thread | null {
    const currentUser = userStore.currentUser.value
    if (!currentUser) return null

    const thread = createThread(input.name, input.kind, currentUser)
    threadStore.add(thread)
    threadStore.setActive(thread.id)

    return thread
  }

  return {
    create
  }
}
