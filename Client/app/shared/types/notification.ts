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
