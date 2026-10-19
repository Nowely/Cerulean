import { useBlockStore, useUserStore, useUIStore, useNotificationStore } from '~/shared/model'
import { createBlock, createChildBlock, PRIORITY_CONFIG, STATUS_CONFIG } from '~/shared/lib'
import type { BlockId, TaskStatus, TaskPriority, TaskData, CreateTaskInput, TaskBlock } from '~/shared/types'

interface EditTaskInput {
  id: string
  name?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignees?: string[]
  dueDate?: string
  tags?: string[]
}

function createNotification(
  type: 'assignment' | 'mention' | 'due-soon' | 'status-change' | 'comment',
  threadId: BlockId,
  title: string,
  body: string,
  taskId?: BlockId
) {
  return {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    threadId,
    taskId,
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false
  }
}

export function useTaskManage() {
  const blockStore = useBlockStore()
  const uiStore = useUIStore()
  const userStore = useUserStore()
  const notificationStore = useNotificationStore()

  async function addMessage(
    threadId: BlockId,
    content: string,
    senderId: string,
    type: 'task-created' | 'task-updated' | 'status-change' = 'task-updated',
    taskId?: BlockId,
    metadata?: Record<string, string>
  ) {
    const message = createChildBlock(threadId, {
      name: '',
      type: 'message',
      data: {
        type,
        content,
        senderId,
        taskId,
        metadata
      }
    })
    await blockStore.add(message)
    await blockStore.update(threadId, {
      data: {
        ...blockStore.getThread(threadId)!.data,
        lastActivity: message.updated
      }
    })
  }

  function notifyAssignees(task: TaskBlock, actorId: string) {
    const actorName = userStore.getUserById(actorId)?.name ?? 'Someone'
    for (const assigneeId of task.data.assignees) {
      if (assigneeId === actorId) continue
      const notification = createNotification(
        'assignment',
        task.parents[0] ?? '',
        'New Assignment',
        `${actorName} assigned you to ${task.name}`,
        task.id
      )
      notificationStore.add(notification)
    }
  }

  async function create(input: CreateTaskInput): Promise<TaskBlock | null> {
    const threadId = blockStore.activeThreadId.value
    const userId = userStore.currentUserId.value

    if (!threadId || !userId) return null

    const task = createChildBlock(threadId, {
      name: input.title,
      type: 'task',
      data: {
        description: input.description,
        status: input.status ?? 'todo',
        priority: input.priority ?? 'medium',
        assignees: input.assignees ?? [],
        createdBy: userId,
        dueDate: input.dueDate,
        tags: input.tags ?? [],
        dependencies: [],
        templateId: undefined
      }
    })
    await blockStore.add(task)
    await addMessage(threadId, `Created task: ${task.name}`, userId, 'task-created', task.id)
    notifyAssignees(task, userId)

    uiStore.setShowTaskForm(false)
    uiStore.setShowTemplates(false)

    return task
  }

  async function edit(input: EditTaskInput): Promise<TaskBlock | null> {
    const existingTask = blockStore.getTask(input.id)
    if (!existingTask) return null

    const actorId = userStore.currentUserId.value ?? existingTask.data.createdBy
    if (!actorId) return null

    const name = input.name?.trim()
    const newData: TaskData = {
      ...existingTask.data,
      description: input.description?.trim() ?? existingTask.data.description,
      status: input.status ?? existingTask.data.status,
      priority: input.priority ?? existingTask.data.priority,
      assignees: input.assignees ?? existingTask.data.assignees,
      dueDate: input.dueDate ?? existingTask.data.dueDate,
      tags: input.tags ?? existingTask.data.tags
    }

    await blockStore.update(input.id, {
      name: name ?? existingTask.name,
      data: newData
    })

    const threadId = existingTask.parents[0]
    if (!threadId) return blockStore.getTask(input.id) ?? null

    if (input.status && input.status !== existingTask.data.status) {
      await addMessage(
        threadId,
        `marked ${name ?? existingTask.name} as ${(STATUS_CONFIG[input.status]?.label ?? input.status).toLowerCase()}`,
        actorId,
        'status-change',
        existingTask.id,
        { from: existingTask.data.status, to: input.status }
      )
    } else {
      await addMessage(
        threadId,
        `Updated task: ${name ?? existingTask.name}`,
        actorId,
        'task-updated',
        existingTask.id
      )
    }

    uiStore.setShowTaskForm(false)
    blockStore.setActiveTask(null)

    return blockStore.getTask(input.id) ?? null
  }

  async function remove(taskId: BlockId): Promise<boolean> {
    const task = blockStore.getTask(taskId)
    if (!task) return false

    await blockStore.remove(taskId)
    return true
  }

  async function changeStatus(taskId: BlockId, status: TaskStatus): Promise<TaskBlock | null> {
    const task = blockStore.getTask(taskId)
    if (!task) return null
    if (task.data.status === status) return task

    const actorId = userStore.currentUserId.value ?? task.data.createdBy
    if (!actorId) return null

    const oldStatus = task.data.status
    await blockStore.update(taskId, {
      data: { ...task.data, status }
    })

    const threadId = task.parents[0]
    if (threadId) {
      await addMessage(
        threadId,
        `marked ${task.name} as ${(STATUS_CONFIG[status]?.label ?? status).toLowerCase()}`,
        actorId,
        'status-change',
        task.id,
        { from: oldStatus, to: status }
      )
    }

    const updated = blockStore.getTask(taskId)
    return updated ?? null
  }

  async function changePriority(taskId: BlockId, priority: TaskPriority): Promise<TaskBlock | null> {
    const task = blockStore.getTask(taskId)
    if (!task) return null
    if (task.data.priority === priority) return task

    const actorId = userStore.currentUserId.value ?? task.data.createdBy
    if (!actorId) return null

    await blockStore.update(taskId, {
      data: { ...task.data, priority }
    })

    const threadId = task.parents[0]
    if (threadId) {
      await addMessage(
        threadId,
        `Changed priority of ${task.name} to ${PRIORITY_CONFIG[priority]?.label ?? priority}`,
        actorId,
        'task-updated',
        task.id
      )
    }

    const updated = blockStore.getTask(taskId)
    return updated ?? null
  }

  async function addSubtask(parentTaskId: BlockId, name: string): Promise<TaskBlock | null> {
    const task = blockStore.getTask(parentTaskId)
    const userId = userStore.currentUserId.value
    const trimmed = name.trim()
    if (!task || !userId || !trimmed) return null

    const threadId = task.parents[0]
    if (!threadId) return null

    const subtask = createBlock({
      name: trimmed,
      type: 'task',
      data: {
        priority: task.data.priority,
        status: 'todo' as TaskStatus,
        assignees: [],
        createdBy: userId,
        tags: [],
        dependencies: []
      },
      parents: [threadId, parentTaskId]
    })
    await blockStore.add(subtask)

    await addMessage(
      threadId,
      `Created subtask: ${subtask.name}`,
      userId,
      'task-created',
      subtask.id
    )

    return subtask as TaskBlock
  }

  async function toggleSubtask(subtaskId: BlockId): Promise<TaskBlock | null> {
    const subtask = blockStore.getTask(subtaskId)
    if (!subtask) return null

    const newStatus: TaskStatus = subtask.data.status === 'done' ? 'todo' : 'done'
    await blockStore.update(subtaskId, {
      data: { ...subtask.data, status: newStatus }
    })

    const updated = blockStore.getTask(subtaskId)
    return updated ?? null
  }

  async function applyTemplate(templateId: string): Promise<{ task: TaskBlock, subtasks: TaskBlock[] } | null> {
    const template = blockStore.getTemplateById(templateId)
    const activeThread = blockStore.activeThread.value
    const currentUser = userStore.currentUser.value

    if (!template || !activeThread || !currentUser) return null

    const task = createChildBlock(activeThread.id, {
      name: template.name,
      type: 'task',
      data: {
        description: template.description,
        status: 'todo' as TaskStatus,
        priority: template.defaultPriority,
        assignees: [currentUser.id],
        createdBy: currentUser.id,
        tags: [...template.defaultTags],
        dependencies: [],
        templateId: template.id,
        dueDate: typeof template.defaultDueOffsetDays === 'number'
          ? new Date(Date.now() + template.defaultDueOffsetDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined
      }
    })
    await blockStore.add(task)

    await addMessage(
      activeThread.id,
      `Created task from template: ${template.name}`,
      currentUser.id,
      'task-created',
      task.id
    )

    const subtasks: TaskBlock[] = []
    for (const sub of template.subtasks) {
      const subTask = createBlock({
        name: sub.title,
        type: 'task',
        data: {
          status: 'todo' as TaskStatus,
          priority: template.defaultPriority,
          assignees: [],
          createdBy: currentUser.id,
          tags: [],
          dependencies: []
        },
        parents: [activeThread.id, task.id]
      })
      await blockStore.add(subTask)
      subtasks.push(subTask as TaskBlock)
      await addMessage(
        activeThread.id,
        `Created subtask: ${sub.title}`,
        currentUser.id,
        'task-created',
        subTask.id
      )
    }

    uiStore.setShowTemplates(false)
    return { task: task as TaskBlock, subtasks }
  }

  function startEditing(task: TaskBlock) {
    blockStore.setActiveTask(task.id)
    uiStore.setShowTaskForm(true)
  }

  function cancelEditing() {
    blockStore.setActiveTask(null)
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
