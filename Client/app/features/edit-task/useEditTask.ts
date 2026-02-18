import { useTaskStore } from '~/entities/task/store'
import { useMessageStore, createMessage } from '~/entities/message/store'
import { useThreadStore } from '~/entities/thread/store'
import { useUIStore } from '~/entities/ui/store'
import type { Task, TaskStatus, TaskPriority } from '~/shared/types'

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

export function useEditTask() {
  const taskStore = useTaskStore()
  const messageStore = useMessageStore()
  const threadStore = useThreadStore()
  const uiStore = useUIStore()

  function execute(input: EditTaskInput): Task | null {
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

  function startEditing(task: Task) {
    taskStore.setEditing(task)
    uiStore.setShowTaskForm(true)
  }

  function cancelEditing() {
    taskStore.setEditing(null)
    uiStore.setShowTaskForm(false)
  }

  return {
    execute,
    startEditing,
    cancelEditing
  }
}
