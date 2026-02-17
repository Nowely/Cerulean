export type UserId = string
export type ThreadId = string
export type TaskId = string
export type MessageId = string

export interface User {
  id: UserId
  name: string
  avatar?: string
  initials: string
  color: string
}

export interface Thread {
  id: ThreadId
  name: string
  type: 'project' | 'direct' | 'group'
  members: UserId[]
  lastActivity: string
  unreadCount: number
  pinned: boolean
  category?: string
  icon?: string
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: TaskId
  threadId: ThreadId
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignees: UserId[]
  createdBy: UserId
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: string[]
  parentTaskId?: TaskId
  dependencies: TaskId[]
  templateId?: string
}

export type MessageType
  = | 'text'
    | 'task-created'
    | 'task-updated'
    | 'status-change'
    | 'assignment'
    | 'comment'
    | 'system'

export interface Message {
  id: MessageId
  threadId: ThreadId
  type: MessageType
  content: string
  senderId: UserId
  taskId?: TaskId
  timestamp: string
  replyToId?: MessageId
  metadata?: Record<string, string>
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  defaultPriority: TaskPriority
  defaultTags: string[]
  subtasks: { title: string }[]
}

export interface Notification {
  id: string
  type: 'assignment' | 'mention' | 'due-soon' | 'status-change' | 'comment'
  threadId: ThreadId
  taskId?: TaskId
  messageId?: MessageId
  title: string
  body: string
  timestamp: string
  read: boolean
}

export interface AppState {
  currentUser: User
  users: User[]
  threads: Thread[]
  tasks: Task[]
  messages: Message[]
  templates: TaskTemplate[]
  notifications: Notification[]
  activeThreadId: ThreadId | null
  activeTaskId: TaskId | null
  sidebarOpen: boolean
  searchQuery: string
  showNotifications: boolean
  showTaskForm: boolean
  showTemplates: boolean
  editingTask: Task | null
}
