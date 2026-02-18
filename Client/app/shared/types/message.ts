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
