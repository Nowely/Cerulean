<script setup lang="ts">
import { useTaskStore, useUserStore, useUIStore } from '~/shared/model'
import { STATUS_CONFIG, PRIORITY_CONFIG, useToastHelpers } from '~/shared/lib'
import type { TaskStatus, TaskPriority } from '~/shared/types'
import { useTaskManage } from '~/features/task-manage'
import { getStatusColor, isDueOverdue, isDueSoon, resolveByIds } from '~/shared/utils'
import PropertyBadge from '~/shared/ui/PropertyBadge.vue'

const taskStore = useTaskStore()
const userStore = useUserStore()
const uiStore = useUIStore()
const { remove: deleteTask, changeStatus: updateTaskStatus, changePriority: updateTaskPriority, addSubtask: createSubtask, toggleSubtask: toggleTaskSubtask } = useTaskManage()
const toast = useToastHelpers()

const newSubtask = ref('')

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
    @update:open="(o) => !o && closeDrawer()"
  >
    <template #content>
      <template v-if="task">
        <UDashboardNavbar :title="task.title">
          <template #leading>
            <p class="text-[12px] text-muted">
              Created by {{ creator?.name }} on
              {{ new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </p>
          </template>
          <template #right>
            <UButton
              icon="i-lucide-edit-3"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Edit task"
              @click="taskStore.setEditing(task); uiStore.setShowTaskForm(true)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              class="hover:bg-red-500/10 hover:text-red-500"
              aria-label="Delete task"
              @click="handleDelete"
            />
          </template>
        </UDashboardNavbar>

        <UScrollArea class="flex-1 px-4 pb-6">
          <div class="space-y-5 pt-2">
            <div class="flex flex-wrap gap-3">
              <UFormField label="Status">
                <UDropdownMenu
                  :items="Object.entries(STATUS_CONFIG).map(([key, config]) => ({
                    label: config.label,
                    click: () => changeStatus(key as TaskStatus)
                  }))"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    class="bg-elevated dark:bg-elevated"
                  >
                    <PropertyBadge
                      type="status"
                      :value="task.status"
                    />
                  </UButton>
                </UDropdownMenu>
              </UFormField>

              <UFormField label="Priority">
                <UDropdownMenu
                  :items="Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
                    label: config.label,
                    click: () => changePriority(key as TaskPriority)
                  }))"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    class="bg-elevated dark:bg-elevated"
                  >
                    <PropertyBadge
                      type="priority"
                      :value="task.priority"
                    />
                  </UButton>
                </UDropdownMenu>
              </UFormField>

              <UFormField
                v-if="task.dueDate"
                label="Due Date"
              >
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :class="overdue ? '!text-red-500 !bg-red-500/10' : dueSoon ? '!text-amber-500 !bg-amber-500/10' : ''"
                >
                  <template #leading>
                    <UIcon
                      name="i-lucide-calendar"
                      class="h-3.5 w-3.5"
                    />
                  </template>
                  {{ new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                </UBadge>
              </UFormField>
            </div>

            <UFormField
              v-if="task.description"
              label="Description"
            >
              <p class="text-sm leading-relaxed text-default dark:text-default">
                {{ task.description }}
              </p>
            </UFormField>

            <UFormField
              v-if="assignees.length > 0"
              label="Assignees"
            >
              <UAvatarGroup>
                <UAvatar
                  v-for="user in assignees"
                  :key="user.id"
                  :alt="user.name"
                  :style="{ backgroundColor: user.color }"
                  class="font-semibold text-white"
                >
                  <template #fallback>
                    {{ user.initials }}
                  </template>
                </UAvatar>
              </UAvatarGroup>
            </UFormField>

            <UFormField
              v-if="task.tags.length > 0"
              label="Tags"
            >
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="tag in task.tags"
                  :key="tag"
                  variant="soft"
                  size="xs"
                >
                  {{ tag }}
                </UBadge>
              </div>
            </UFormField>

            <UFormField
              v-if="dependencies.length > 0"
              label="Dependencies"
            >
              <div class="flex flex-col gap-1.5">
                <UButton
                  v-for="dep in dependencies"
                  :key="dep.id"
                  color="neutral"
                  variant="ghost"
                  class="justify-start bg-elevated dark:bg-elevated hover:bg-accented dark:hover:bg-accented"
                  @click="taskStore.setActive(dep.id)"
                >
                  <template #leading>
                    <UIcon
                      name="i-lucide-link-2"
                      class="h-3.5 w-3.5 text-muted"
                    />
                  </template>
                  <span
                    class="flex-1 text-left"
                    :class="dep.status === 'done' && 'line-through text-muted'"
                  >
                    {{ dep.title }}
                  </span>
                  <template #trailing>
                    <PropertyBadge
                      type="status"
                      :value="dep.status"
                      :show-label="false"
                    />
                  </template>
                </UButton>
              </div>
            </UFormField>

            <UFormField :label="`Subtasks${subtasks.length > 0 ? ` (${completedSubtasks}/${subtasks.length})` : ''}`">
              <template v-if="subtasks.length > 0">
                <UProgress
                  :value="progress"
                  class="h-1.5 mb-2"
                />
                <UButton
                  v-for="sub in subtasks"
                  :key="sub.id"
                  color="neutral"
                  variant="ghost"
                  class="justify-start"
                  @click="toggleSubtask(sub.id)"
                >
                  <template #leading>
                    <UIcon
                      :name="sub.status === 'done' ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                      class="h-4 w-4"
                      :style="sub.status === 'done' ? { color: getStatusColor('done') } : {}"
                      :class="sub.status !== 'done' && 'text-dimmed'"
                    />
                  </template>
                  <span
                    class="text-sm"
                    :class="sub.status === 'done' && 'line-through text-muted'"
                  >
                    {{ sub.title }}
                  </span>
                </UButton>
              </template>

              <div class="flex gap-2 mt-2">
                <UInput
                  v-model="newSubtask"
                  placeholder="Add subtask..."
                  data-testid="new-subtask-input"
                  class="flex-1"
                  @keydown.enter="addSubtask"
                />
                <UButton
                  icon="i-lucide-plus"
                  :disabled="!newSubtask.trim()"
                  @click="addSubtask"
                />
              </div>
            </UFormField>
          </div>
        </UScrollArea>
      </template>
    </template>
  </USlideover>
</template>
