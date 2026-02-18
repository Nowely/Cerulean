export type ThreadId = string

export interface Thread {
  id: ThreadId
  name: string
  type: 'project' | 'direct' | 'group'
  members: string[]
  lastActivity: string
  unreadCount: number
  pinned: boolean
  category?: string
  icon?: string
}
