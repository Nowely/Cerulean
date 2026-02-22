import type { BlockId } from './block'

export type ThreadId = string

export type ThreadKind = 'tasks' | 'shopping' | 'checklist' | 'notes' | 'contacts' | 'chat'

export interface ThreadData {
  kind: ThreadKind
  icon?: string
  color?: string
  members: string[]
  lastActivity: string
  unreadCount: number
  pinned: boolean
  category?: string
}

/**
 * @deprecated Use Block<ThreadData> instead
 */
export interface Thread {
  id: ThreadId
  name: string
  kind: ThreadKind
  icon?: string
  color?: string
  members: string[]
  lastActivity: string
  unreadCount: number
  pinned: boolean
  category?: string
  itemCount?: number
}

export type MessageId = string

export type MessageType
  = | 'text'
    | 'task-created'
    | 'task-updated'
    | 'status-change'
    | 'assignment'
    | 'comment'
    | 'system'

export interface MessageData {
  type: MessageType
  content: string
  senderId: string
  taskId?: string
  replyToId?: MessageId
  metadata?: Record<string, string>
}

/**
 * @deprecated Use Block<MessageData> instead
 */
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

export interface ViewData {
  threadId: BlockId
  filters: Record<string, unknown>
  sortBy: string
  sortOrder: 'asc' | 'desc'
  groupBy?: string
  columns?: string[]
  isDefault: boolean
}
