import type { Task, CreateTaskInput } from '../types/task'
import { generateId } from '~/shared/utils'

export function createTask(
  threadId: string,
  title: string,
  userId: string,
  options: Partial<Task> = {}
): Task {
  const now = new Date().toISOString()
  return {
    id: generateId('task'),
    threadId,
    title,
    status: 'todo',
    priority: 'medium',
    assignees: [],
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    tags: [],
    dependencies: [],
    ...options
  }
}

export function createTaskFromInput(
  threadId: string,
  userId: string,
  input: CreateTaskInput
): Task {
  return createTask(threadId, input.title, userId, {
    description: input.description,
    priority: input.priority ?? 'medium',
    assignees: input.assignees ?? [],
    dueDate: input.dueDate,
    tags: input.tags ?? [],
    parentTaskId: input.parentTaskId,
    templateId: input.templateId
  })
}
