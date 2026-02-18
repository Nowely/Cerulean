import { useTaskStore, useMessageStore, useThreadStore, useUIStore, createMessage } from '~/shared/model'
import { createTaskFromInput } from '~/shared/lib'
import type { Task, TaskStatus, TaskPriority, TaskId, CreateTaskInput } from '~/shared/types'

interface EditTaskInput {
  id: string
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignees?: string[]
  dueDate?: string
  tags?: string[]
}

export function useTaskManage() {
  const taskStore = useTaskStore()
  const messageStore = useMessageStore()
  const threadStore = useThreadStore()
  const uiStore = useUIStore()

  function create(input: CreateTaskInput): Task | null {
    const threadId = threadStore.activeThreadId.value
    const userId = taskStore.editingTask.value?.createdBy ?? ''

    if (!threadId) return null

    const task = createTaskFromInput(threadId, userId, input)
    taskStore.add(task)

    const message = createMessage(
      threadId,
      `Created task: ${task.title}`,
      userId,
      'task-created',
      task.id
    )
    messageStore.add(message)
    threadStore.updateLastActivity(threadId, message.timestamp)

    uiStore.setShowTaskForm(false)
    uiStore.setShowTemplates(false)

    return task
  }

  function edit(input: EditTaskInput): Task | null {
    const existingTask = taskStore.getTaskById(input.id)
    if (!existingTask) return null

    const previousStatus = existingTask.status
    const updatedTask: Task = {
      ...existingTask,
      ...input,
      updatedAt: new Date().toISOString()
    }

    taskStore.update(updatedTask)

    if (input.status && input.status !== previousStatus) {
      const message = createMessage(
        existingTask.threadId,
        `marked ${existingTask.title} as ${input.status}`,
        existingTask.createdBy,
        'status-change',
        existingTask.id,
        { from: previousStatus, to: input.status }
      )
      messageStore.add(message)
      threadStore.updateLastActivity(existingTask.threadId, message.timestamp)
    }

    uiStore.setShowTaskForm(false)
    taskStore.setEditing(null)

    return updatedTask
  }

  function remove(taskId: TaskId): boolean {
    const task = taskStore.getTaskById(taskId)
    if (!task) return false

    taskStore.remove(taskId)
    return true
  }

  function startEditing(task: Task) {
    taskStore.setEditing(task)
    uiStore.setShowTaskForm(true)
  }

  function cancelEditing() {
    taskStore.setEditing(null)
    uiStore.setShowTaskForm(false)
  }

  return {
    create,
    edit,
    remove,
    startEditing,
    cancelEditing
  }
}
