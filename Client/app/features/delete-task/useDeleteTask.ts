import { useTaskStore } from '~/entities/task/store'
import type { TaskId } from '~/shared/types'

export function useDeleteTask() {
  const taskStore = useTaskStore()

  function execute(taskId: TaskId): boolean {
    const task = taskStore.getTaskById(taskId)
    if (!task) return false

    taskStore.remove(taskId)
    return true
  }

  return {
    execute
  }
}
