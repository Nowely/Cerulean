<script setup lang="ts">
import { useAppStore, createTask, createMessage, createNotification } from '~/composables/useAppStore'
import { generateId, STATUS_CONFIG, PRIORITY_CONFIG } from '~/utils'
import type { Task, TaskStatus, TaskPriority, Message } from '~/types'
import UserAvatar from '~/components/shared/UserAvatar.vue'

const { state, dispatch, activeThread } = useAppStore()
const toast = useToast()

const isEditing = computed(() => state.value.editingTask !== null)
const open = computed(() => state.value.showTaskForm)

const title = ref('')
const description = ref('')
const status = ref<TaskStatus>('todo')
const priority = ref<TaskPriority>('medium')
const assignees = ref<string[]>([])
const dueDate = ref('')
const tags = ref('')

watch([() => state.value.editingTask, open], ([editingTask, isOpen]) => {
  if (editingTask && isOpen) {
    title.value = editingTask.title
    description.value = editingTask.description ?? ''
    status.value = editingTask.status
    priority.value = editingTask.priority
    assignees.value = [...editingTask.assignees]
    dueDate.value = editingTask.dueDate ? editingTask.dueDate.split('T')[0]! : ''
    tags.value = [...editingTask.tags].join(', ')
  } else if (!isOpen) {
    resetForm()
  }
})

function resetForm() {
  title.value = ''
  description.value = ''
  status.value = 'todo'
  priority.value = 'medium'
  assignees.value = []
  dueDate.value = ''
  tags.value = ''
}

function toggleAssignee(userId: string) {
  const idx = assignees.value.indexOf(userId)
  if (idx > -1) {
    assignees.value.splice(idx, 1)
  } else {
    assignees.value.push(userId)
  }
}

function handleSubmit() {
  if (!title.value.trim()) {
    toast.add({
      title: 'Task title is required',
      color: 'warning',
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  if (!activeThread.value) {
    toast.add({
      title: 'Select a thread first',
      description: 'You need an active thread before creating a task.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  const parsedTags = tags.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  const now = new Date().toISOString()

  if (isEditing.value && state.value.editingTask) {
    const editing = state.value.editingTask
    const updated: Task = {
      id: editing.id,
      threadId: editing.threadId,
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      status: status.value,
      priority: priority.value,
      assignees: assignees.value,
      createdBy: editing.createdBy,
      createdAt: editing.createdAt,
      updatedAt: now,
      dueDate: dueDate.value ? new Date(dueDate.value).toISOString() : undefined,
      tags: parsedTags,
      parentTaskId: editing.parentTaskId,
      dependencies: [...editing.dependencies],
      templateId: editing.templateId
    }
    const message: Message = {
      id: generateId('m'),
      threadId: activeThread.value!.id,
      type: 'task-updated',
      content: `Updated task: ${title.value.trim()}`,
      senderId: state.value.currentUser.id,
      taskId: editing.id,
      timestamp: now
    }
    dispatch({ type: 'UPDATE_TASK', task: updated, message })

    toast.add({
      title: 'Task updated',
      description: updated.title,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } else {
    const newTask: Task = {
      id: generateId('task'),
      threadId: activeThread.value.id,
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      status: status.value,
      priority: priority.value,
      assignees: assignees.value,
      createdBy: state.value.currentUser.id,
      createdAt: now,
      updatedAt: now,
      dueDate: dueDate.value ? new Date(dueDate.value).toISOString() : undefined,
      tags: parsedTags,
      dependencies: []
    }
    const message: Message = {
      id: generateId('m'),
      threadId: activeThread.value.id,
      type: 'task-created',
      content: `Created task: ${title.value.trim()}`,
      senderId: state.value.currentUser.id,
      taskId: newTask.id,
      timestamp: now
    }
    dispatch({ type: 'ADD_TASK', task: newTask, message })

    assignees.value.forEach((userId) => {
      if (userId !== state.value.currentUser.id) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          notification: createNotification(
            'assignment',
            activeThread.value!.id,
            'New Assignment',
            `${state.value.currentUser.name} assigned you to ${title.value.trim()}`,
            newTask.id
          )
        })
      }
    })

    toast.add({
      title: 'Task created',
      description: newTask.title,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  }

  resetForm()
}

const members = computed(() => {
  if (!activeThread.value) return []
  return activeThread.value.members
    .map(id => state.value.users.find(u => u.id === id))
    .filter(Boolean)
})

function getStatusColor(s: TaskStatus): string {
  return `var(--status-${s})`
}

function getPriorityColor(p: TaskPriority): string {
  return `var(--priority-${p})`
}

function closeDrawer() {
  dispatch({ type: 'SHOW_TASK_FORM', show: false })
  dispatch({ type: 'SET_EDITING_TASK', task: null })
}
</script>

<template>
  <USlideover
    :open="open"
    side="bottom"
    :ui="{ content: 'max-h-[90dvh]' }"
    @update:open="(o) => !o && closeDrawer()"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <div class="p-4 pb-0">
          <h3 class="text-lg font-semibold">
            {{ isEditing ? 'Edit Task' : 'New Task' }}
          </h3>
          <p class="text-sm text-gray-500">
            {{ isEditing ? 'Update the task details below' : 'Create a new task in this thread' }}
          </p>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-6">
          <div class="flex flex-col gap-4 pt-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Title <span class="text-red-500">*</span>
              </label>
              <input
                v-model="title"
                type="text"
                placeholder="Task title..."
                autofocus
                data-testid="task-title-input"
                class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 text-sm outline-none focus:ring-1 focus:ring-primary-500"
              >
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Description
              </label>
              <textarea
                v-model="description"
                placeholder="Add a description..."
                rows="3"
                data-testid="task-description-input"
                class="resize-none rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Status
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="(config, s) in STATUS_CONFIG"
                  :key="s"
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                  :class="status === s
                    ? 'bg-primary-500/15 ring-1 ring-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'"
                  @click="status = s"
                >
                  <span
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: getStatusColor(s) }"
                  />
                  {{ config.label }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Priority
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="(config, p) in PRIORITY_CONFIG"
                  :key="p"
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                  :class="priority === p
                    ? 'bg-primary-500/15 ring-1 ring-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'"
                  @click="priority = p"
                >
                  <span
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: getPriorityColor(p) }"
                  />
                  {{ config.label }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Assignees
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="user in members"
                  :key="user!.id"
                  class="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors"
                  :class="assignees.includes(user!.id)
                    ? 'bg-primary-500/15 ring-1 ring-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'"
                  @click="toggleAssignee(user!.id)"
                >
                  <UserAvatar
                    :user="user"
                    size="sm"
                  />
                  <span>{{ user!.name }}</span>
                  <UIcon
                    v-if="assignees.includes(user!.id)"
                    name="i-lucide-x"
                    class="h-3 w-3 text-gray-400"
                  />
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Due Date
              </label>
              <input
                v-model="dueDate"
                type="date"
                class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 text-sm outline-none focus:ring-1 focus:ring-primary-500"
              >
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Tags (comma separated)
              </label>
              <input
                v-model="tags"
                type="text"
                placeholder="e.g., design, frontend, bug"
                class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 text-sm placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-primary-500"
              >
            </div>

            <UButton
              block
              size="lg"
              :disabled="!title.trim()"
              class="mt-2"
              data-testid="task-submit-btn"
              @click="handleSubmit"
            >
              {{ isEditing ? 'Save Changes' : 'Create Task' }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
