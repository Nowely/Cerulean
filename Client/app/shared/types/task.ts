export type TaskId = string

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskData {
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignees: string[]
  createdBy: string
  dueDate?: string
  tags: string[]
  dependencies: TaskId[]
  templateId?: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignees?: string[]
  dueDate?: string
  tags?: string[]
  parentTaskId?: string
  templateId?: string
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  defaultPriority: TaskPriority
  defaultTags: string[]
  defaultDueOffsetDays?: number
  subtasks: { title: string }[]
}
