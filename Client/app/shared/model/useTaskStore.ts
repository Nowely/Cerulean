import type { Task, TaskId, TaskTemplate } from '../types/task'
import { SEED_TASKS, SEED_TEMPLATES } from '~/shared/api/seed'

const tasks = ref<Task[]>([])
const activeTaskId = ref<TaskId | null>(null)
const editingTask = ref<Task | null>(null)
const templates = ref<TaskTemplate[]>([])

export function useTaskStore() {
  const activeTask = computed(() =>
    tasks.value.find(t => t.id === activeTaskId.value) ?? null
  )

  function threadTasks(threadId: string) {
    return tasks.value.filter(t => t.threadId === threadId)
  }

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

  function getTemplateById(id: string): TaskTemplate | undefined {
    return templates.value.find(t => t.id === id)
  }

  function init() {
    tasks.value = SEED_TASKS.map(t => ({
      ...t,
      assignees: [...t.assignees],
      tags: [...t.tags],
      dependencies: [...t.dependencies]
    }))
    templates.value = SEED_TEMPLATES.map(t => ({
      ...t,
      defaultTags: [...t.defaultTags],
      subtasks: [...t.subtasks]
    }))
  }

  return {
    tasks,
    activeTaskId,
    editingTask,
    templates,
    activeTask,
    threadTasks,
    getTaskById,
    getSubtasks,
    setActive,
    setEditing,
    add,
    update,
    remove,
    getTemplateById,
    init
  }
}
