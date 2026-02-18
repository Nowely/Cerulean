import { useTaskStore, createTask } from '~/entities/task/store'
import { useMessageStore, createMessage } from '~/entities/message/store'
import { useThreadStore } from '~/entities/thread/store'
import { useUIStore } from '~/entities/ui/store'
import type { Task, TaskPriority } from '~/shared/types'

interface CreateTaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  assignees?: string[]
  dueDate?: string
  tags?: string[]
  parentTaskId?: string
  templateId?: string
}

export function useCreateTask() {
  const taskStore = useTaskStore()
  const messageStore = useMessageStore()
  const threadStore = useThreadStore()
  const uiStore = useUIStore()

  function execute(input: CreateTaskInput): Task | null {
    const threadId = threadStore.activeThreadId
    const userId = taskStore.editingTask?.createdBy ?? ''

    if (!threadId) return null

    const task = createTask(threadId, input.title, userId, {
      description: input.description,
      priority: input.priority ?? 'medium',
      assignees: input.assignees ?? [],
      dueDate: input.dueDate,
      tags: input.tags ?? [],
      parentTaskId: input.parentTaskId,
      templateId: input.templateId
    })

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

  return {
    execute
  }
}
