import { defineStore } from 'pinia'
import type { Task, TaskId, TaskStatus } from '~/shared/types'
import { SEED_TASKS } from '~/shared/api/seed'
import { generateId } from '~/shared/utils'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const activeTaskId = ref<TaskId | null>(null)
  const editingTask = ref<Task | null>(null)

  const activeTask = computed(() =>
    tasks.value.find(t => t.id === activeTaskId.value) ?? null
  )

  const threadTasks = computed(() => (threadId: string) =>
    tasks.value.filter(t => t.threadId === threadId)
  )

  function getTaskById(id: TaskId): Task | undefined {
    return tasks.value.find(t => t.id === id)
  }

  function getSubtasks(parentId: TaskId): Task[] {
    return tasks.value.filter(t => t.parentTaskId === parentId)
  }

  function setActive(id: TaskId | null) {
    activeTaskId.value = id
  }

  function setEditing(task: Task | null) {
    editingTask.value = task
  }

  function add(task: Task) {
    tasks.value.push(task)
  }

  function update(task: Task) {
    const index = tasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      tasks.value[index] = { ...task, updatedAt: new Date().toISOString() }
    }
  }

  function remove(id: TaskId) {
    tasks.value = tasks.value.filter(t => t.id !== id && t.parentTaskId !== id)
    if (activeTaskId.value === id) {
      activeTaskId.value = null
    }
  }

  function init() {
    tasks.value = SEED_TASKS.map(t => ({
      ...t,
      assignees: [...t.assignees],
      tags: [...t.tags],
      dependencies: [...t.dependencies]
    }))
  }

  return {
    tasks,
    activeTaskId,
    editingTask,
    activeTask,
    threadTasks,
    getTaskById,
    getSubtasks,
    setActive,
    setEditing,
    add,
    update,
    remove,
    init
  }
})

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
