import { useTaskStore, useMessageStore, useThreadStore, useUIStore, useUserStore, useNotificationStore, createMessage, createNotification } from '~/shared/model'
import { createTask, createTaskFromInput, PRIORITY_CONFIG, STATUS_CONFIG } from '~/shared/lib'
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
  const userStore = useUserStore()
  const notificationStore = useNotificationStore()

  function addMessage(
    threadId: string,
    content: string,
    senderId: string,
    type: 'task-created' | 'task-updated' | 'status-change' = 'task-updated',
    taskId?: string,
    metadata?: Record<string, string>
  ) {
    const message = createMessage(threadId, content, senderId, type, taskId, metadata)
    messageStore.add(message)
    threadStore.updateLastActivity(threadId, message.timestamp)
  }

  function notifyAssignees(task: Task, actorId: string) {
    const actorName = userStore.getUserById(actorId)?.name ?? 'Someone'
    for (const assigneeId of task.assignees) {
      if (assigneeId === actorId) continue
      const notification = createNotification(
        'assignment',
        task.threadId,
        'New Assignment',
        `${actorName} assigned you to ${task.title}`,
        task.id
      )
      notificationStore.add(notification)
    }
  }

  function create(input: CreateTaskInput): Task | null {
    const threadId = threadStore.activeThreadId.value
    const userId = userStore.currentUserId.value

    if (!threadId || !userId) return null

    const task = createTaskFromInput(threadId, userId, input)
    taskStore.add(task)
    addMessage(threadId, `Created task: ${task.title}`, userId, 'task-created', task.id)
    notifyAssignees(task, userId)

    uiStore.setShowTaskForm(false)
    uiStore.setShowTemplates(false)

    return task
  }

  function edit(input: EditTaskInput): Task | null {
    const existingTask = taskStore.getTaskById(input.id)
    if (!existingTask) return null

    const actorId = userStore.currentUserId.value ?? existingTask.createdBy
    if (!actorId) return null

    const title = input.title?.trim()
    const description = input.description?.trim()
    const updatedTask: Task = {
      ...existingTask,
      ...input,
      title: title ?? existingTask.title,
      description: description || undefined,
      updatedAt: new Date().toISOString()
    }

    taskStore.update(updatedTask)

    if (input.status && input.status !== existingTask.status) {
      addMessage(
        existingTask.threadId,
        `marked ${updatedTask.title} as ${(STATUS_CONFIG[input.status]?.label ?? input.status).toLowerCase()}`,
        actorId,
        'status-change',
        existingTask.id,
        { from: existingTask.status, to: input.status }
      )
    } else {
      addMessage(
        existingTask.threadId,
        `Updated task: ${updatedTask.title}`,
        actorId,
        'task-updated',
        existingTask.id
      )
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

  function changeStatus(taskId: TaskId, status: TaskStatus): Task | null {
    const task = taskStore.getTaskById(taskId)
    if (!task || task.status === status) return task ?? null

    const actorId = userStore.currentUserId.value ?? task.createdBy
    if (!actorId) return null

    const updated: Task = {
      ...task,
      status,
      updatedAt: new Date().toISOString()
    }
    taskStore.update(updated)

    addMessage(
      task.threadId,
      `marked ${task.title} as ${(STATUS_CONFIG[status]?.label ?? status).toLowerCase()}`,
      actorId,
      'status-change',
      task.id,
      { from: task.status, to: status }
    )

    return updated
  }

  function changePriority(taskId: TaskId, priority: TaskPriority): Task | null {
    const task = taskStore.getTaskById(taskId)
    if (!task || task.priority === priority) return task ?? null

    const actorId = userStore.currentUserId.value ?? task.createdBy
    if (!actorId) return null

    const updated: Task = {
      ...task,
      priority,
      updatedAt: new Date().toISOString()
    }
    taskStore.update(updated)

    addMessage(
      task.threadId,
      `Changed priority of ${task.title} to ${PRIORITY_CONFIG[priority]?.label ?? priority}`,
      actorId,
      'task-updated',
      task.id
    )

    return updated
  }

  function addSubtask(parentTaskId: TaskId, title: string): Task | null {
    const task = taskStore.getTaskById(parentTaskId)
    const userId = userStore.currentUserId.value
    const trimmed = title.trim()
    if (!task || !userId || !trimmed) return null

    const subtask = createTask(task.threadId, trimmed, userId, {
      priority: task.priority,
      parentTaskId: task.id
    })
    taskStore.add(subtask)

    addMessage(
      task.threadId,
      `Created subtask: ${subtask.title}`,
      userId,
      'task-created',
      subtask.id
    )

    return subtask
  }

  function toggleSubtask(subtaskId: TaskId): Task | null {
    const subtask = taskStore.getTaskById(subtaskId)
    if (!subtask) return null

    const updated: Task = {
      ...subtask,
      status: subtask.status === 'done' ? 'todo' : 'done',
      updatedAt: new Date().toISOString()
    }
    taskStore.update(updated)
    return updated
  }

  function applyTemplate(templateId: string): { task: Task, subtasks: Task[] } | null {
    const template = taskStore.getTemplateById(templateId)
    const activeThread = threadStore.activeThread.value
    const currentUser = userStore.currentUser.value

    if (!template || !activeThread || !currentUser) return null

    const task = createTask(activeThread.id, template.name, currentUser.id, {
      description: template.description,
      priority: template.defaultPriority,
      assignees: [currentUser.id],
      tags: [...template.defaultTags],
      templateId: template.id,
      dueDate: typeof template.defaultDueOffsetDays === 'number'
        ? new Date(Date.now() + template.defaultDueOffsetDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined
    })
    taskStore.add(task)

    addMessage(
      activeThread.id,
      `Created task from template: ${template.name}`,
      currentUser.id,
      'task-created',
      task.id
    )

    const subtasks: Task[] = []
    for (const sub of template.subtasks) {
      const subTask = createTask(activeThread.id, sub.title, currentUser.id, {
        priority: template.defaultPriority,
        parentTaskId: task.id
      })
      taskStore.add(subTask)
      subtasks.push(subTask)
      addMessage(
        activeThread.id,
        `Created subtask: ${sub.title}`,
        currentUser.id,
        'task-created',
        subTask.id
      )
    }

    uiStore.setShowTemplates(false)
    return { task, subtasks }
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
    changeStatus,
    changePriority,
    addSubtask,
    toggleSubtask,
    applyTemplate,
    startEditing,
    cancelEditing
  }
}
