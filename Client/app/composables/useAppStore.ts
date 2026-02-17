import type { AppState, User, Task, Message, Thread, Notification, UserId, ThreadId, TaskId, TaskStatus, TaskPriority } from '~/types'
import { SEED_USERS, SEED_THREADS, SEED_TASKS, SEED_MESSAGES, SEED_TEMPLATES, SEED_NOTIFICATIONS } from '~/data/seed'
import { generateId } from '~/utils'

const STORAGE_KEY = 'taskchat-state'

function createInitialState(): AppState {
  return {
    currentUser: SEED_USERS[0]!,
    users: [...SEED_USERS],
    threads: SEED_THREADS.map(t => ({ ...t, members: [...t.members] })),
    tasks: SEED_TASKS.map(t => ({ ...t, assignees: [...t.assignees], tags: [...t.tags], dependencies: [...t.dependencies] })),
    messages: [...SEED_MESSAGES],
    templates: SEED_TEMPLATES.map(t => ({ ...t, defaultTags: [...t.defaultTags], subtasks: [...t.subtasks] })),
    notifications: [...SEED_NOTIFICATIONS],
    activeThreadId: null,
    activeTaskId: null,
    sidebarOpen: false,
    searchQuery: '',
    showNotifications: false,
    showTaskForm: false,
    showTemplates: false,
    editingTask: null
  }
}

type Action
  = | { type: 'SET_ACTIVE_THREAD', threadId: ThreadId | null }
    | { type: 'SET_ACTIVE_TASK', taskId: TaskId | null }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_SIDEBAR', open: boolean }
    | { type: 'SET_SEARCH', query: string }
    | { type: 'SHOW_NOTIFICATIONS', show: boolean }
    | { type: 'SHOW_TASK_FORM', show: boolean }
    | { type: 'SHOW_TEMPLATES', show: boolean }
    | { type: 'SET_EDITING_TASK', task: Task | null }
    | { type: 'ADD_THREAD', thread: Thread }
    | { type: 'ADD_TASK', task: Task, message: Message }
    | { type: 'UPDATE_TASK', task: Task, message?: Message }
    | { type: 'DELETE_TASK', taskId: TaskId }
    | { type: 'ADD_MESSAGE', message: Message }
    | { type: 'ADD_NOTIFICATION', notification: Notification }
    | { type: 'MARK_NOTIFICATION_READ', id: string }
    | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
    | { type: 'CLEAR_UNREAD', threadId: ThreadId }
    | { type: 'RESET_STATE' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_THREAD': {
      const newState = {
        ...state,
        activeThreadId: action.threadId,
        activeTaskId: null,
        sidebarOpen: false,
        editingTask: null
      }
      if (action.threadId) {
        newState.threads = state.threads.map(t =>
          t.id === action.threadId ? { ...t, unreadCount: 0 } : t
        )
      }
      return newState
    }
    case 'SET_ACTIVE_TASK':
      return { ...state, activeTaskId: action.taskId }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.open }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query }
    case 'SHOW_NOTIFICATIONS':
      return { ...state, showNotifications: action.show }
    case 'SHOW_TASK_FORM':
      return { ...state, showTaskForm: action.show, editingTask: action.show ? state.editingTask : null }
    case 'SHOW_TEMPLATES':
      return { ...state, showTemplates: action.show }
    case 'SET_EDITING_TASK':
      return { ...state, editingTask: action.task, showTaskForm: action.task !== null }
    case 'ADD_THREAD':
      return { ...state, threads: [action.thread, ...state.threads] }
    case 'ADD_TASK': {
      const threads = state.threads.map(t =>
        t.id === action.task.threadId
          ? { ...t, lastActivity: action.message.timestamp }
          : t
      )
      return {
        ...state,
        tasks: [...state.tasks, action.task],
        messages: [...state.messages, action.message],
        threads,
        showTaskForm: false,
        editingTask: null
      }
    }
    case 'UPDATE_TASK': {
      const tasks = state.tasks.map(t =>
        t.id === action.task.id ? action.task : t
      )
      const messages = action.message
        ? [...state.messages, action.message]
        : state.messages
      return { ...state, tasks, messages, editingTask: null, showTaskForm: false }
    }
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.taskId && t.parentTaskId !== action.taskId),
        activeTaskId: state.activeTaskId === action.taskId ? null : state.activeTaskId
      }
    case 'ADD_MESSAGE': {
      const threads = state.threads.map(t =>
        t.id === action.message.threadId
          ? {
              ...t,
              lastActivity: action.message.timestamp,
              unreadCount:
                t.id === state.activeThreadId ? 0 : t.unreadCount + 1
            }
          : t
      )
      return { ...state, messages: [...state.messages, action.message], threads }
    }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.notification, ...state.notifications]
      }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, read: true } : n
        )
      }
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      }
    case 'CLEAR_UNREAD':
      return {
        ...state,
        threads: state.threads.map(t =>
          t.id === action.threadId ? { ...t, unreadCount: 0 } : t
        )
      }
    case 'RESET_STATE':
      return createInitialState()
    default:
      return state
  }
}

function loadState(): AppState | null {
  if (import.meta.server) return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as AppState
  } catch {
    // ignore parse errors
  }
  return null
}

function saveState(state: AppState) {
  if (import.meta.server) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function useAppStore() {
  const initialized = useState('app-initialized', () => false)
  const state = useState<AppState>('app-state', () => createInitialState())

  if (import.meta.client && !initialized.value) {
    const loaded = loadState()
    if (loaded) {
      state.value = loaded
    }
    initialized.value = true
  }

  function dispatch(action: Action) {
    state.value = reducer(state.value, action)
    if (import.meta.client) {
      saveState(state.value)
    }
  }

  const activeThread = computed(() =>
    state.value.threads.find(t => t.id === state.value.activeThreadId) ?? null
  )

  const activeTask = computed(() =>
    state.value.tasks.find(t => t.id === state.value.activeTaskId) ?? null
  )

  const threadMessages = computed(() =>
    state.value.messages
      .filter(m => m.threadId === state.value.activeThreadId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  )

  const threadTasks = computed(() =>
    state.value.tasks.filter(t => t.threadId === state.value.activeThreadId)
  )

  const unreadNotificationCount = computed(() =>
    state.value.notifications.filter(n => !n.read).length
  )

  function getUserById(id: UserId) {
    return state.value.users.find(u => u.id === id)
  }

  function getTaskById(id: TaskId) {
    return state.value.tasks.find(t => t.id === id)
  }

  function getSubtasks(parentId: TaskId) {
    return state.value.tasks.filter(t => t.parentTaskId === parentId)
  }

  return {
    state,
    dispatch,
    activeThread,
    activeTask,
    threadMessages,
    threadTasks,
    unreadNotificationCount,
    getUserById,
    getTaskById,
    getSubtasks
  }
}

export function createThread(name: string, type: Thread['type'], currentUser: User): Thread {
  return {
    id: generateId('t'),
    name,
    type,
    members: [currentUser.id],
    lastActivity: new Date().toISOString(),
    unreadCount: 0,
    pinned: false
  }
}

export function createTask(
  threadId: ThreadId,
  title: string,
  userId: UserId,
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

export function createMessage(
  threadId: ThreadId,
  content: string,
  senderId: UserId,
  type: Message['type'] = 'text',
  taskId?: TaskId,
  metadata?: Record<string, string>
): Message {
  return {
    id: generateId('m'),
    threadId,
    type,
    content,
    senderId,
    taskId,
    timestamp: new Date().toISOString(),
    metadata
  }
}

export function createNotification(
  type: Notification['type'],
  threadId: ThreadId,
  title: string,
  body: string,
  taskId?: TaskId
): Notification {
  return {
    id: generateId('n'),
    type,
    threadId,
    taskId,
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false
  }
}
