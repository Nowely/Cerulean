<script setup lang="ts">
import { useTaskStore, createTask } from '~/entities/task/store'
import { useMessageStore, createMessage } from '~/entities/message/store'
import { useThreadStore } from '~/entities/thread/store'
import { useUserStore } from '~/entities/user/store'
import { useDeleteTask } from '~/features/delete-task/useDeleteTask'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '~/shared/config/task'
import { isDueOverdue, isDueSoon } from '~/shared/utils'
import type { Task, TaskStatus, TaskPriority } from '~/shared/types'
import StatusBadge from '~/shared/ui/StatusBadge.vue'
import PriorityBadge from '~/shared/ui/PriorityBadge.vue'
import UserAvatar from '~/shared/ui/UserAvatar.vue'

const taskStore = useTaskStore()
const messageStore = useMessageStore()
const threadStore = useThreadStore()
const userStore = useUserStore()
const { execute: deleteTask } = useDeleteTask()
const toast = useToast()

const newSubtask = ref('')

const task = computed(() => taskStore.activeTask)
const open = computed(() => taskStore.activeTask !== null)

const creator = computed(() => task.value ? userStore.getUserById(task.value.createdBy) : null)
const assignees = computed(() =>
  task.value?.assignees.map(id => userStore.getUserById(id)).filter(Boolean) ?? []
)
const subtasks = computed(() =>
  task.value ? taskStore.getSubtasks(task.value.id) : []
)
const completedSubtasks = computed(() =>
  subtasks.value.filter(s => s.status === 'done').length
)
const progress = computed(() =>
  subtasks.value.length > 0 ? (completedSubtasks.value / subtasks.value.length) * 100 : 0
)
const dependencies = computed(() =>
  task.value?.dependencies.map(id => taskStore.getTaskById(id)).filter(Boolean) ?? []
)

const overdue = computed(() =>
  task.value && isDueOverdue(task.value.dueDate) && task.value.status !== 'done'
)
const dueSoon = computed(() =>
  task.value && isDueSoon(task.value.dueDate) && task.value.status !== 'done'
)

function getStatusColor(status: string): string {
  return `var(--status-${status})`
}

function changeStatus(newStatus: TaskStatus) {
  if (!task.value) return
  const previousStatus = task.value.status
  const updated = { ...task.value, status: newStatus, updatedAt: new Date().toISOString() }
  taskStore.update(updated)

  const message = createMessage(
    task.value.threadId,
    `marked ${task.value.title} as ${STATUS_CONFIG[newStatus].label.toLowerCase()}`,
    task.value.createdBy,
    'status-change',
    task.value.id,
    { from: previousStatus, to: newStatus }
  )
  messageStore.add(message)
  threadStore.updateLastActivity(task.value.threadId, message.timestamp)

  toast.add({
    title: 'Task status updated',
    description: `${task.value.title} -> ${STATUS_CONFIG[newStatus].label}`,
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}

function changePriority(newPriority: TaskPriority) {
  if (!task.value) return
  const updated = { ...task.value, priority: newPriority, updatedAt: new Date().toISOString() }
  taskStore.update(updated)

  const message = createMessage(
    task.value.threadId,
    `Changed priority of ${task.value.title} to ${PRIORITY_CONFIG[newPriority].label}`,
    task.value.createdBy,
    'task-updated',
    task.value.id
  )
  messageStore.add(message)
  threadStore.updateLastActivity(task.value.threadId, message.timestamp)

  toast.add({
    title: 'Task priority updated',
    description: `${task.value.title} -> ${PRIORITY_CONFIG[newPriority].label}`,
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}

function toggleSubtask(subtaskId: string) {
  const subtask = taskStore.getTaskById(subtaskId)
  if (!subtask) return
  const newStatus: TaskStatus = subtask.status === 'done' ? 'todo' : 'done'
  taskStore.update({ ...subtask, status: newStatus, updatedAt: new Date().toISOString() })

  toast.add({
    title: newStatus === 'done' ? 'Subtask completed' : 'Subtask reopened',
    description: subtask.title,
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}

function addSubtask() {
  if (!newSubtask.value.trim() || !task.value || !userStore.currentUserId) {
    toast.add({
      title: 'Subtask title is required',
      color: 'warning',
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  const subtaskObj = createTask(
    task.value.threadId,
    newSubtask.value.trim(),
    userStore.currentUserId,
    {
      priority: task.value.priority,
      parentTaskId: task.value.id
    }
  )
  taskStore.add(subtaskObj)

  const message = createMessage(
    task.value.threadId,
    `Created subtask: ${newSubtask.value.trim()}`,
    userStore.currentUserId,
    'task-created',
    subtaskObj.id
  )
  messageStore.add(message)
  threadStore.updateLastActivity(task.value.threadId, message.timestamp)

  toast.add({
    title: 'Subtask created',
    description: subtaskObj.title,
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
  newSubtask.value = ''
}

function handleDelete() {
  if (!task.value) return
  const title = task.value.title
  deleteTask(task.value.id)
  taskStore.setActive(null)
  toast.add({
    title: 'Task deleted',
    description: title,
    color: 'warning',
    icon: 'i-lucide-trash-2'
  })
}

function closeDrawer() {
  taskStore.setActive(null)
}
</script>

<template>
  <USlideover
    :open="open"
    side="bottom"
    :ui="{ content: 'max-h-[85dvh]' }"
    @update:open="(o) => !o && closeDrawer()"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <div
          v-if="task"
          class="flex-1 overflow-y-auto"
        >
          <div class="p-4 pb-0">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <h3 class="text-base font-semibold leading-snug">
                  {{ task.title }}
                </h3>
                <p class="mt-1 text-[12px] text-gray-500">
                  Created by {{ creator?.name }} on
                  {{ new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  aria-label="Edit task"
                  @click="taskStore.setEditing(task); $emit('edit')"
                >
                  <UIcon
                    name="i-lucide-edit-3"
                    class="h-4 w-4"
                  />
                </button>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  aria-label="Delete task"
                  @click="handleDelete"
                >
                  <UIcon
                    name="i-lucide-trash-2"
                    class="h-4 w-4"
                  />
                </button>
              </div>
            </div>
          </div>

          <div class="px-4 pb-6">
            <div class="flex flex-col gap-5 pt-2">
              <div class="flex flex-wrap gap-3">
                <div class="flex flex-col gap-1.5">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</span>
                  <UDropdownMenu
                    :items="Object.entries(STATUS_CONFIG).map(([key, config]) => ({
                      label: config.label,
                      click: () => changeStatus(key as TaskStatus)
                    }))"
                  >
                    <UButton
                      color="neutral"
                      variant="ghost"
                      class="bg-gray-100 dark:bg-gray-800"
                    >
                      <StatusBadge :status="task.status" />
                    </UButton>
                  </UDropdownMenu>
                </div>

                <div class="flex flex-col gap-1.5">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Priority</span>
                  <UDropdownMenu
                    :items="Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
                      label: config.label,
                      click: () => changePriority(key as TaskPriority)
                    }))"
                  >
                    <UButton
                      color="neutral"
                      variant="ghost"
                      class="bg-gray-100 dark:bg-gray-800"
                    >
                      <PriorityBadge :priority="task.priority" />
                    </UButton>
                  </UDropdownMenu>
                </div>

                <div
                  v-if="task.dueDate"
                  class="flex flex-col gap-1.5"
                >
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due Date</span>
                  <span
                    class="flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm"
                    :class="overdue ? 'text-red-500' : dueSoon ? 'text-amber-500' : ''"
                  >
                    <UIcon
                      name="i-lucide-calendar"
                      class="h-3.5 w-3.5"
                    />
                    {{ new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                  </span>
                </div>
              </div>

              <div
                v-if="task.description"
                class="flex flex-col gap-1.5"
              >
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</span>
                <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {{ task.description }}
                </p>
              </div>

              <div
                v-if="assignees.length > 0"
                class="flex flex-col gap-2"
              >
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Assignees</span>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="user in assignees"
                    :key="user!.id"
                    class="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 py-1 pl-1 pr-3"
                  >
                    <UserAvatar
                      :user="user"
                      size="sm"
                    />
                    <span class="text-sm">{{ user!.name }}</span>
                  </div>
                </div>
              </div>

              <div
                v-if="task.tags.length > 0"
                class="flex flex-col gap-2"
              >
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tags</span>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in task.tags"
                    :key="tag"
                    class="rounded-md bg-primary-500/10 px-2 py-0.5 text-[12px] font-medium text-primary-500"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div
                v-if="dependencies.length > 0"
                class="flex flex-col gap-2"
              >
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Dependencies</span>
                <div class="flex flex-col gap-1.5">
                  <button
                    v-for="dep in dependencies"
                    :key="dep!.id"
                    class="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                    @click="taskStore.setActive(dep!.id)"
                  >
                    <UIcon
                      name="i-lucide-link-2"
                      class="h-3.5 w-3.5 text-gray-500"
                    />
                    <span
                      class="flex-1"
                      :class="dep!.status === 'done' && 'line-through text-gray-500'"
                    >
                      {{ dep!.title }}
                    </span>
                    <StatusBadge
                      :status="dep!.status"
                      :show-label="false"
                    />
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Subtasks{{ subtasks.length > 0 ? ` (${completedSubtasks}/${subtasks.length})` : '' }}
                </span>

                <template v-if="subtasks.length > 0">
                  <UProgress
                    :value="progress"
                    class="h-1.5"
                  />
                  <div class="flex flex-col gap-1">
                    <button
                      v-for="sub in subtasks"
                      :key="sub.id"
                      class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      @click="toggleSubtask(sub.id)"
                    >
                      <UIcon
                        v-if="sub.status === 'done'"
                        name="i-lucide-check-circle-2"
                        class="h-4 w-4 shrink-0"
                        :style="{ color: getStatusColor('done') }"
                      />
                      <UIcon
                        v-else
                        name="i-lucide-circle"
                        class="h-4 w-4 shrink-0 text-gray-400"
                      />
                      <span
                        class="text-sm"
                        :class="sub.status === 'done' && 'line-through text-gray-500'"
                      >
                        {{ sub.title }}
                      </span>
                    </button>
                  </div>
                </template>

                <div class="flex gap-2">
                  <input
                    v-model="newSubtask"
                    type="text"
                    placeholder="Add subtask..."
                    data-testid="new-subtask-input"
                    class="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-primary-500"
                    @keydown.enter="addSubtask"
                  >
                  <UButton
                    icon="i-lucide-plus"
                    :disabled="!newSubtask.trim()"
                    @click="addSubtask"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
