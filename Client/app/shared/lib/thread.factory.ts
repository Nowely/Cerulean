import type { Thread, ThreadKind } from '../types/thread'
import { generateId } from '~/shared/utils'

export function createThread(name: string, kind: ThreadKind, currentUser: { id: string }): Thread {
  return {
    id: generateId('t'),
    name,
    kind,
    members: [currentUser.id],
    lastActivity: new Date().toISOString(),
    unreadCount: 0,
    pinned: false
  }
}
