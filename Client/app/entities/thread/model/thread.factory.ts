import type { Thread } from './thread.types'
import { generateId } from '~/shared/utils'

export function createThread(name: string, type: Thread['type'], currentUser: { id: string }): Thread {
  return {
    id: generateId('t'),
    name,
    type,
    members: [currentUser.id],
    lastActivity: new Date().toISOString(),
    unreadCount: 0,
    pinned: false
  }
}
