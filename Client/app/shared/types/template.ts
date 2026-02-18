import type { TaskPriority } from './task'

export interface TaskTemplate {
  id: string
  name: string
  description: string
  defaultPriority: TaskPriority
  defaultTags: string[]
  subtasks: { title: string }[]
}
