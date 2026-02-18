export type UserId = string

export interface User {
  id: UserId
  name: string
  avatar?: string
  initials: string
  color: string
}

export interface Notification {
  id: string
  type: 'assignment' | 'mention' | 'due-soon' | 'status-change' | 'comment'
  threadId: string
  taskId?: string
  messageId?: string
  title: string
  body: string
  timestamp: string
  read: boolean
}
