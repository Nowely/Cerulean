import { beforeEach, describe, expect, it } from 'vitest'
import { createMessage, createNotification, createTask, createThread, useAppStore } from '~/composables/useAppStore'

describe('useAppStore', () => {
  let store: ReturnType<typeof useAppStore>

  beforeEach(() => {
    store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
  })

  it('handles thread and sidebar actions', () => {
    store.dispatch({ type: 'SET_ACTIVE_TASK', taskId: 'task1' })
    store.dispatch({ type: 'SET_SIDEBAR', open: true })
    store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })

    expect(store.state.value.activeThreadId).toBe('t1')
    expect(store.state.value.activeTaskId).toBeNull()
    expect(store.state.value.sidebarOpen).toBe(false)

    store.dispatch({ type: 'TOGGLE_SIDEBAR' })
    expect(store.state.value.sidebarOpen).toBe(true)
    store.dispatch({ type: 'SET_SIDEBAR', open: false })
    expect(store.state.value.sidebarOpen).toBe(false)
  })

  it('handles UI flag actions', () => {
    store.dispatch({ type: 'SET_SEARCH', query: 'bug' })
    store.dispatch({ type: 'SHOW_NOTIFICATIONS', show: true })
    store.dispatch({ type: 'SHOW_TEMPLATES', show: true })

    expect(store.state.value.searchQuery).toBe('bug')
    expect(store.state.value.showNotifications).toBe(true)
    expect(store.state.value.showTemplates).toBe(true)

    const existingTask = store.state.value.tasks[0]!
    store.dispatch({ type: 'SET_EDITING_TASK', task: existingTask })
    expect(store.state.value.editingTask?.id).toBe(existingTask.id)
    expect(store.state.value.showTaskForm).toBe(true)

    store.dispatch({ type: 'SHOW_TASK_FORM', show: false })
    expect(store.state.value.showTaskForm).toBe(false)
    expect(store.state.value.editingTask).toBeNull()
  })

  it('adds threads, tasks and messages', () => {
    const now = new Date().toISOString()
    const taskCount = store.state.value.tasks.length
    const messageCount = store.state.value.messages.length

    store.dispatch({
      type: 'ADD_THREAD',
      thread: {
        id: 't-new',
        name: 'New Thread',
        type: 'project',
        members: ['u1'],
        lastActivity: now,
        unreadCount: 0,
        pinned: false
      }
    })
    expect(store.state.value.threads[0]?.id).toBe('t-new')

    store.dispatch({
      type: 'ADD_TASK',
      task: {
        id: 'task-new',
        threadId: 't1',
        title: 'New Task',
        status: 'todo',
        priority: 'medium',
        assignees: [],
        createdBy: 'u1',
        createdAt: now,
        updatedAt: now,
        tags: [],
        dependencies: []
      },
      message: {
        id: 'm-new',
        threadId: 't1',
        type: 'task-created',
        content: 'Created task: New Task',
        senderId: 'u1',
        taskId: 'task-new',
        timestamp: now
      }
    })

    expect(store.state.value.tasks.length).toBe(taskCount + 1)
    expect(store.state.value.messages.length).toBe(messageCount + 1)
    expect(store.state.value.showTaskForm).toBe(false)
  })

  it('updates and deletes tasks', () => {
    const task = store.state.value.tasks.find(t => t.id === 'task3')!
    store.dispatch({ type: 'SET_ACTIVE_TASK', taskId: task.id })

    store.dispatch({
      type: 'UPDATE_TASK',
      task: { ...task, status: 'done' },
      message: {
        id: 'm-update',
        threadId: task.threadId,
        type: 'status-change',
        content: 'marked as done',
        senderId: 'u1',
        taskId: task.id,
        timestamp: new Date().toISOString()
      }
    })

    expect(store.state.value.tasks.find(t => t.id === task.id)?.status).toBe('done')
    expect(store.state.value.messages.some(m => m.id === 'm-update')).toBe(true)

    store.dispatch({ type: 'DELETE_TASK', taskId: 'task3' })
    expect(store.state.value.tasks.some(t => t.id === 'task3')).toBe(false)
    expect(store.state.value.tasks.some(t => t.parentTaskId === 'task3')).toBe(false)
    expect(store.state.value.activeTaskId).toBeNull()
  })

  it('handles notification actions', () => {
    const unreadBefore = store.unreadNotificationCount.value

    store.dispatch({
      type: 'ADD_NOTIFICATION',
      notification: {
        id: 'n-new',
        type: 'comment',
        threadId: 't1',
        title: 'Comment',
        body: 'New comment',
        timestamp: new Date().toISOString(),
        read: false
      }
    })
    expect(store.unreadNotificationCount.value).toBe(unreadBefore + 1)

    store.dispatch({ type: 'MARK_NOTIFICATION_READ', id: 'n-new' })
    expect(store.state.value.notifications.find(n => n.id === 'n-new')?.read).toBe(true)

    store.dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })
    expect(store.state.value.notifications.every(n => n.read)).toBe(true)
  })

  it('handles unread count for messages and explicit clear', () => {
    const before = store.state.value.threads.find(t => t.id === 't2')!.unreadCount

    store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
    store.dispatch({
      type: 'ADD_MESSAGE',
      message: {
        id: 'm-unread',
        threadId: 't2',
        type: 'text',
        content: 'hello',
        senderId: 'u1',
        timestamp: new Date().toISOString()
      }
    })

    const afterInactive = store.state.value.threads.find(t => t.id === 't2')!.unreadCount
    expect(afterInactive).toBe(before + 1)

    store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't2' })
    store.dispatch({
      type: 'ADD_MESSAGE',
      message: {
        id: 'm-active',
        threadId: 't2',
        type: 'text',
        content: 'active thread message',
        senderId: 'u1',
        timestamp: new Date().toISOString()
      }
    })
    expect(store.state.value.threads.find(t => t.id === 't2')!.unreadCount).toBe(0)

    store.dispatch({ type: 'CLEAR_UNREAD', threadId: 't5' })
    expect(store.state.value.threads.find(t => t.id === 't5')!.unreadCount).toBe(0)
  })

  it('provides computed selectors and lookup helpers', () => {
    store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
    store.dispatch({ type: 'SET_ACTIVE_TASK', taskId: 'task1' })

    expect(store.activeThread.value?.id).toBe('t1')
    expect(store.activeTask.value?.id).toBe('task1')
    expect(store.threadMessages.value.every(m => m.threadId === 't1')).toBe(true)
    expect(store.threadTasks.value.every(t => t.threadId === 't1')).toBe(true)
    expect(store.getUserById('u1')?.name).toBe('You')
    expect(store.getTaskById('task1')?.id).toBe('task1')
    expect(store.getSubtasks('task3').every(t => t.parentTaskId === 'task3')).toBe(true)
  })

  it('resets state', () => {
    store.dispatch({ type: 'SET_SEARCH', query: 'changed' })
    store.dispatch({ type: 'RESET_STATE' })
    expect(store.state.value.searchQuery).toBe('')
    expect(store.state.value.activeThreadId).toBeNull()
  })
})

describe('store factory functions', () => {
  const store = useAppStore()

  it('creates thread objects', () => {
    const thread = createThread('Demo', 'project', store.state.value.currentUser)
    expect(thread.id.startsWith('t')).toBe(true)
    expect(thread.name).toBe('Demo')
  })

  it('creates task objects', () => {
    const task = createTask('t1', 'Ship feature', 'u1')
    expect(task.id.startsWith('task')).toBe(true)
    expect(task.threadId).toBe('t1')
    expect(task.title).toBe('Ship feature')
  })

  it('creates message objects', () => {
    const msg = createMessage('t1', 'Hi', 'u1', 'text')
    expect(msg.id.startsWith('m')).toBe(true)
    expect(msg.content).toBe('Hi')
  })

  it('creates notification objects', () => {
    const n = createNotification('comment', 't1', 'Title', 'Body', 'task1')
    expect(n.id.startsWith('n')).toBe(true)
    expect(n.taskId).toBe('task1')
    expect(n.read).toBe(false)
  })
})
