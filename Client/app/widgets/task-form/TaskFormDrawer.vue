<script setup lang="ts">
import { useTaskStore, useThreadStore, useUserStore, useUIStore } from '~/shared/model'
import { PRIORITY_CONFIG, STATUS_CONFIG, useToastHelpers } from '~/shared/lib'
import type { TaskPriority, TaskStatus } from '~/shared/types'
import { useTaskManage } from '~/features/task-manage'
import { getPriorityColor, getStatusColor, resolveByIds } from '~/shared/utils'
import UserAvatar from '~/shared/ui/UserAvatar.vue'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'

const taskStore = useTaskStore()
const threadStore = useThreadStore()
const userStore = useUserStore()
const uiStore = useUIStore()
const { create: createTaskAction, edit: editTaskAction } = useTaskManage()
const toast = useToastHelpers()

const isEditing = computed(() => taskStore.editingTask.value !== null)
const open = computed(() => uiStore.showTaskForm.value)

const title = ref('')
const description = ref('')
const status = ref<TaskStatus>('todo')
const priority = ref<TaskPriority>('medium')
const assignees = ref<string[]>([])
const dueDate = ref('')
const tags = ref('')

watch([() => taskStore.editingTask.value, open], ([editingTask, isOpen]) => {
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
    toast.warning({
      title: 'Task title is required'
    })
    return
  }

  if (!isEditing.value && !threadStore.activeThread.value) {
    toast.error({
      title: 'Select a thread first',
      description: 'You need an active thread before creating a task.'
    })
    return
  }

  const parsedTags = tags.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  if (isEditing.value && taskStore.editingTask.value) {
    const updated = editTaskAction({
      id: taskStore.editingTask.value.id,
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      status: status.value,
      priority: priority.value,
      assignees: assignees.value,
      dueDate: dueDate.value ? new Date(dueDate.value).toISOString() : undefined,
      tags: parsedTags
    })

    if (!updated) {
      toast.error({
        title: 'Could not update task'
      })
      return
    }

    toast.success({
      title: 'Task updated',
      description: updated.title
    })
  } else {
    const created = createTaskAction({
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      status: status.value,
      priority: priority.value,
      assignees: assignees.value,
      dueDate: dueDate.value ? new Date(dueDate.value).toISOString() : undefined,
      tags: parsedTags
    })

    if (!created) {
      toast.error({
        title: 'Could not create task'
      })
      return
    }

    toast.success({
      title: 'Task created',
      description: created.title
    })
  }

  resetForm()
}

const members = computed(() => {
  if (!threadStore.activeThread.value) return []
  return resolveByIds(threadStore.activeThread.value.members, id => userStore.getUserById(id))
})

function closeDrawer() {
  uiStore.setShowTaskForm(false)
  taskStore.setEditing(null)
}

function selectableChipClass(selected: boolean): string {
  return selected
    ? 'bg-primary-500/15 ring-1 ring-primary-500/30'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
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
        <ContentPanelHeader variant="header">
          <div>
            <h3 class="text-lg font-semibold">
              {{ isEditing ? 'Edit Task' : 'New Task' }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ isEditing ? 'Update the task details below' : 'Create a new task in this thread' }}
            </p>
          </div>
        </ContentPanelHeader>

        <div class="flex-1 overflow-y-auto px-4 pb-6">
          <div class="flex flex-col gap-4 pt-2">
            <UFormField label="Title" required>
              <UInput
                v-model="title"
                placeholder="Task title..."
                autofocus
                data-testid="task-title-input"
              />
            </UFormField>

            <UFormField label="Description">
              <UTextarea
                v-model="description"
                placeholder="Add a description..."
                :rows="3"
                data-testid="task-description-input"
              />
            </UFormField>

            <UFormField label="Status">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="(config, s) in STATUS_CONFIG"
                  :key="s"
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                  :class="selectableChipClass(status === s)"
                  @click="status = s"
                >
                  <span
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: getStatusColor(s) }"
                  />
                  {{ config.label }}
                </button>
              </div>
            </UFormField>

            <UFormField label="Priority">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="(config, p) in PRIORITY_CONFIG"
                  :key="p"
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                  :class="selectableChipClass(priority === p)"
                  @click="priority = p"
                >
                  <span
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: getPriorityColor(p) }"
                  />
                  {{ config.label }}
                </button>
              </div>
            </UFormField>

            <UFormField label="Assignees">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="user in members"
                  :key="user.id"
                  class="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors"
                  :class="selectableChipClass(assignees.includes(user.id))"
                  @click="toggleAssignee(user.id)"
                >
                  <UserAvatar
                    :user="user"
                    size="sm"
                  />
                  <span>{{ user.name }}</span>
                  <UIcon
                    v-if="assignees.includes(user.id)"
                    name="i-lucide-x"
                    class="h-3 w-3 text-gray-400"
                  />
                </button>
              </div>
            </UFormField>

            <UFormField label="Due Date">
              <UInput
                v-model="dueDate"
                type="date"
              />
            </UFormField>

            <UFormField label="Tags (comma separated)">
              <UInput
                v-model="tags"
                placeholder="e.g., design, frontend, bug"
              />
            </UFormField>

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
