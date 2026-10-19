<script setup lang="ts">
import { useBlockStore, useUserStore, useUIStore } from '~/shared/model'
import { STATUS_CONFIG, PRIORITY_CONFIG, useToastHelpers } from '~/shared/lib'
import type { TaskStatus, TaskPriority } from '~/shared/types'
import { useTaskManage } from '~/features/task-manage'
import { getStatusColor, isDueOverdue, isDueSoon, resolveByIds } from '~/shared/utils'
import PropertyBadge from '~/shared/ui/PropertyBadge.vue'

const blockStore = useBlockStore()
const userStore = useUserStore()
const uiStore = useUIStore()
const { remove: deleteTask, changeStatus: updateTaskStatus, changePriority: updateTaskPriority, addSubtask: createSubtask, toggleSubtask: toggleTaskSubtask } = useTaskManage()
const toast = useToastHelpers()

const newSubtask = ref('')

const task = computed(() => blockStore.activeTask.value)
const open = computed(() => blockStore.activeTask.value !== null)

const creator = computed(() => task.value ? userStore.getUserById(task.value.data.createdBy) : null)
const assignees = computed(() =>
  task.value ? resolveByIds(task.value.data.assignees, id => userStore.getUserById(id)) : []
)
const subtasks = computed(() => {
  if (!task.value) return []
  return blockStore.getChildren(task.value.id).filter(b => b.meta.type === 'task')
})
const completedSubtasks = computed(() =>
  subtasks.value.filter(s => (s.data as { status: TaskStatus }).status === 'done').length
)
const progress = computed(() =>
  subtasks.value.length > 0 ? (completedSubtasks.value / subtasks.value.length) * 100 : 0
)
const dependencies = computed(() => {
  if (!task.value) return []
  return task.value.data.dependencies
    .map(id => blockStore.getTask(id))
    .filter((b): b is NonNullable<typeof b> => b !== undefined)
})

const overdue = computed(() =>
  task.value && isDueOverdue(task.value.data.dueDate) && task.value.data.status !== 'done'
)
const dueSoon = computed(() =>
  task.value && isDueSoon(task.value.data.dueDate) && task.value.data.status !== 'done'
)

async function changeStatus(newStatus: TaskStatus) {
  if (!task.value) return
  const updated = await updateTaskStatus(task.value.id, newStatus)
  if (!updated) return
  toast.success({
    title: 'Task status updated',
    description: `${task.value.name} -> ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`,
    icon: 'i-lucide-check-circle'
  })
}

async function changePriority(newPriority: TaskPriority) {
  if (!task.value) return
  const updated = await updateTaskPriority(task.value.id, newPriority)
  if (!updated) return
  toast.success({
    title: 'Task priority updated',
    description: `${task.value.name} -> ${PRIORITY_CONFIG[newPriority]?.label ?? newPriority}`,
    icon: 'i-lucide-check-circle'
  })
}

async function toggleSubtask(subtaskId: string) {
  const updated = await toggleTaskSubtask(subtaskId)
  if (!updated) return
  toast.success({
    title: updated.data.status === 'done' ? 'Subtask completed' : 'Subtask reopened',
    description: updated.name,
    icon: 'i-lucide-check-circle'
  })
}

async function addSubtask() {
  if (!task.value || !newSubtask.value.trim()) {
    toast.warning({
      title: 'Subtask title is required'
    })
    return
  }

  const subtask = await createSubtask(task.value.id, newSubtask.value)
  if (!subtask) {
    toast.warning({
      title: 'Subtask title is required'
    })
    return
  }

  toast.success({
    title: 'Subtask created',
    description: subtask.name,
    icon: 'i-lucide-check-circle'
  })
  newSubtask.value = ''
}

async function handleDelete() {
  if (!task.value) return
  const title = task.value.name
  await deleteTask(task.value.id)
  blockStore.setActiveTask(null)
  toast.warning({
    title: 'Task deleted',
    description: title,
    icon: 'i-lucide-trash-2'
  })
}

function closeDrawer() {
  blockStore.setActiveTask(null)
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
        <UDashboardNavbar :title="task.name">
          <template #leading>
            <p class="text-xs text-muted">
              Created by {{ creator?.name }} on
              {{ new Date(task.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </p>
          </template>
          <template #right>
            <UButton
              icon="i-lucide-edit-3"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Edit task"
              @click="blockStore.setActiveTask(task.id); uiStore.setShowTaskForm(true)"
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
                    class="bg-elevated"
                  >
                    <PropertyBadge
                      type="status"
                      :value="task.data.status"
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
                    class="bg-elevated"
                  >
                    <PropertyBadge
                      type="priority"
                      :value="task.data.priority"
                    />
                  </UButton>
                </UDropdownMenu>
              </UFormField>

              <UFormField
                v-if="task.data.dueDate"
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
                  {{ new Date(task.data.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                </UBadge>
              </UFormField>
            </div>

            <UFormField
              v-if="task.data.description"
              label="Description"
            >
              <span class="text-sm leading-relaxed">{{ task.data.description }}</span>
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
              v-if="task.data.tags.length > 0"
              label="Tags"
            >
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="tag in task.data.tags"
                  :key="tag"
                  :label="tag"
                  variant="soft"
                  size="xs"
                />
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
                  icon="i-lucide-link-2"
                  color="neutral"
                  variant="ghost"
                  class="justify-start bg-elevated hover:bg-accented"
                  @click="blockStore.setActiveTask(dep.id)"
                >
                  <span
                    class="flex-1 text-left"
                    :class="dep.data.status === 'done' && 'line-through text-muted'"
                  >
                    {{ dep.name }}
                  </span>
                  <template #trailing>
                    <PropertyBadge
                      type="status"
                      :value="dep.data.status"
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
                      :name="(sub.data as { status: TaskStatus }).status === 'done' ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                      class="h-4 w-4"
                      :style="(sub.data as { status: TaskStatus }).status === 'done' ? { color: getStatusColor('done') } : {}"
                      :class="(sub.data as { status: TaskStatus }).status !== 'done' && 'text-dimmed'"
                    />
                  </template>
                  <span
                    class="text-sm"
                    :class="(sub.data as { status: TaskStatus }).status === 'done' && 'line-through text-muted'"
                  >
                    {{ sub.name }}
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
