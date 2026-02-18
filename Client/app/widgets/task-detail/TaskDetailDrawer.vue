<script setup lang="ts">
import { useTaskStore, useUserStore, useUIStore } from '~/shared/model'
import { STATUS_CONFIG, PRIORITY_CONFIG, FORM_LABEL_CLASS, ICON_BUTTON_BASE_CLASS, useToastHelpers } from '~/shared/lib'
import type { TaskStatus, TaskPriority } from '~/shared/types'
import { useTaskManage } from '~/features/task-manage'
import { getStatusColor, isDueOverdue, isDueSoon, resolveByIds } from '~/shared/utils'
import StatusBadge from '~/shared/ui/StatusBadge.vue'
import PriorityBadge from '~/shared/ui/PriorityBadge.vue'
import UserAvatar from '~/shared/ui/UserAvatar.vue'

const taskStore = useTaskStore()
const userStore = useUserStore()
const uiStore = useUIStore()
const { remove: deleteTask, changeStatus: updateTaskStatus, changePriority: updateTaskPriority, addSubtask: createSubtask, toggleSubtask: toggleTaskSubtask } = useTaskManage()
const toast = useToastHelpers()

const newSubtask = ref('')
const iconButtonClass = `${ICON_BUTTON_BASE_CLASS} h-8 w-8`

const task = computed(() => taskStore.activeTask.value)
const open = computed(() => taskStore.activeTask.value !== null)

const creator = computed(() => task.value ? userStore.getUserById(task.value.createdBy) : null)
const assignees = computed(() =>
  task.value ? resolveByIds(task.value.assignees, id => userStore.getUserById(id)) : []
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
  task.value ? resolveByIds(task.value.dependencies, id => taskStore.getTaskById(id)) : []
)

const overdue = computed(() =>
  task.value && isDueOverdue(task.value.dueDate) && task.value.status !== 'done'
)
const dueSoon = computed(() =>
  task.value && isDueSoon(task.value.dueDate) && task.value.status !== 'done'
)

function changeStatus(newStatus: TaskStatus) {
  if (!task.value) return
  if (!updateTaskStatus(task.value.id, newStatus)) return
  toast.success({
    title: 'Task status updated',
    description: `${task.value.title} -> ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`,
    icon: 'i-lucide-check-circle'
  })
}

function changePriority(newPriority: TaskPriority) {
  if (!task.value) return
  if (!updateTaskPriority(task.value.id, newPriority)) return
  toast.success({
    title: 'Task priority updated',
    description: `${task.value.title} -> ${PRIORITY_CONFIG[newPriority]?.label ?? newPriority}`,
    icon: 'i-lucide-check-circle'
  })
}

function toggleSubtask(subtaskId: string) {
  const updated = toggleTaskSubtask(subtaskId)
  if (!updated) return
  toast.success({
    title: updated.status === 'done' ? 'Subtask completed' : 'Subtask reopened',
    description: updated.title,
    icon: 'i-lucide-check-circle'
  })
}

function addSubtask() {
  if (!task.value || !newSubtask.value.trim()) {
    toast.warning({
      title: 'Subtask title is required'
    })
    return
  }

  const subtask = createSubtask(task.value.id, newSubtask.value)
  if (!subtask) {
    toast.warning({
      title: 'Subtask title is required'
    })
    return
  }

  toast.success({
    title: 'Subtask created',
    description: subtask.title,
    icon: 'i-lucide-check-circle'
  })
  newSubtask.value = ''
}

function handleDelete() {
  if (!task.value) return
  const title = task.value.title
  deleteTask(task.value.id)
  taskStore.setActive(null)
  toast.warning({
    title: 'Task deleted',
    description: title,
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
                  :class="iconButtonClass"
                  aria-label="Edit task"
                  @click="taskStore.setEditing(task); uiStore.setShowTaskForm(true)"
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
                  <span :class="FORM_LABEL_CLASS">Status</span>
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
                  <span :class="FORM_LABEL_CLASS">Priority</span>
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
                  <span :class="FORM_LABEL_CLASS">Due Date</span>
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
                <span :class="FORM_LABEL_CLASS">Description</span>
                <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {{ task.description }}
                </p>
              </div>

              <div
                v-if="assignees.length > 0"
                class="flex flex-col gap-2"
              >
                <span :class="FORM_LABEL_CLASS">Assignees</span>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="user in assignees"
                    :key="user.id"
                    class="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 py-1 pl-1 pr-3"
                  >
                    <UserAvatar
                      :user="user"
                      size="sm"
                    />
                    <span class="text-sm">{{ user.name }}</span>
                  </div>
                </div>
              </div>

              <div
                v-if="task.tags.length > 0"
                class="flex flex-col gap-2"
              >
                <span :class="FORM_LABEL_CLASS">Tags</span>
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
                <span :class="FORM_LABEL_CLASS">Dependencies</span>
                <div class="flex flex-col gap-1.5">
                  <button
                    v-for="dep in dependencies"
                    :key="dep.id"
                    class="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                    @click="taskStore.setActive(dep.id)"
                  >
                    <UIcon
                      name="i-lucide-link-2"
                      class="h-3.5 w-3.5 text-gray-500"
                    />
                    <span
                      class="flex-1"
                      :class="dep.status === 'done' && 'line-through text-gray-500'"
                    >
                      {{ dep.title }}
                    </span>
                    <StatusBadge
                      :status="dep.status"
                      :show-label="false"
                    />
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <span :class="FORM_LABEL_CLASS">
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
