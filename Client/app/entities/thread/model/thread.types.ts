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

export type MessageId = string

export type MessageType =
  | 'text'
  | 'task-created'
  | 'task-updated'
  | 'status-change'
  | 'assignment'
  | 'comment'
  | 'system'

export interface Message {
  id: MessageId
  threadId: string
  type: MessageType
  content: string
  senderId: string
  taskId?: string
  timestamp: string
  replyToId?: MessageId
  metadata?: Record<string, string>
}

export interface User {
  id: string
  name: string
}
