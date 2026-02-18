import type { TaskStatus, TaskPriority } from '../model/task.types'

export const STATUS_CONFIG: Record<TaskStatus, { label: string, color: string }> = {
  'todo': { label: 'To Do', color: 'bg-status-todo' },
  'in-progress': { label: 'In Progress', color: 'bg-status-in-progress' },
  'review': { label: 'Review', color: 'bg-status-review' },
  'done': { label: 'Done', color: 'bg-status-done' },
  'blocked': { label: 'Blocked', color: 'bg-status-blocked' }
}

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string, color: string }> = {
  low: { label: 'Low', color: 'bg-priority-low' },
  medium: { label: 'Medium', color: 'bg-priority-medium' },
  high: { label: 'High', color: 'bg-priority-high' },
  urgent: { label: 'Urgent', color: 'bg-priority-urgent' }
}
