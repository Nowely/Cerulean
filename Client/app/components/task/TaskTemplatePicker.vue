<script setup lang="ts">
import { useAppStore, createTask, createMessage } from '~/composables/useAppStore'
import { generateId } from '~/utils'
import type { Task, Message } from '~/types'

const { state, dispatch, activeThread } = useAppStore()
const toast = useToast()

const showTemplates = computed(() => state.value.showTemplates)
const templates = computed(() => state.value.templates)

const TEMPLATE_ICONS: Record<string, string> = {
  tmpl1: 'i-lucide-bug',
  tmpl2: 'i-lucide-lightbulb',
  tmpl3: 'i-lucide-zap',
  tmpl4: 'i-lucide-calendar-check'
}

function handleSelect(templateId: string) {
  const template = templates.value.find(t => t.id === templateId)
  if (!template || !activeThread.value) {
    toast.add({
      title: 'Select a thread first',
      description: 'Template tasks need an active thread.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  const threadId = activeThread.value.id
  const now = new Date().toISOString()
  const taskId = generateId('task')

  const task: Task = {
    id: taskId,
    threadId,
    title: template.name,
    description: template.description,
    status: 'todo',
    priority: template.defaultPriority,
    assignees: [state.value.currentUser.id],
    createdBy: state.value.currentUser.id,
    createdAt: now,
    updatedAt: now,
    tags: [...template.defaultTags],
    dependencies: [],
    templateId: template.id
  }

  if (template.id === 'tmpl4') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    task.dueDate = tomorrow.toISOString()
  }

  const message: Message = {
    id: generateId('m'),
    threadId,
    type: 'task-created',
    content: `Created task from template: ${template.name}`,
    senderId: state.value.currentUser.id,
    taskId,
    timestamp: now
  }

  dispatch({ type: 'ADD_TASK', task, message })

  template.subtasks.forEach((sub) => {
    const subTask: Task = {
      id: generateId('task'),
      threadId,
      title: sub.title,
      status: 'todo',
      priority: template.defaultPriority,
      assignees: [],
      createdBy: state.value.currentUser.id,
      createdAt: now,
      updatedAt: now,
      tags: [],
      parentTaskId: taskId,
      dependencies: []
    }
    const subMsg: Message = {
      id: generateId('m'),
      threadId,
      type: 'task-created',
      content: `Created subtask: ${sub.title}`,
      senderId: state.value.currentUser.id,
      taskId: subTask.id,
      timestamp: now
    }
    dispatch({ type: 'ADD_TASK', task: subTask, message: subMsg })
  })

  dispatch({ type: 'SHOW_TEMPLATES', show: false })
  toast.add({
    title: 'Template applied',
    description: `${template.name} task created`,
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}

function closeDrawer() {
  dispatch({ type: 'SHOW_TEMPLATES', show: false })
}
</script>

<template>
  <USlideover
    :open="showTemplates"
    side="bottom"
    @update:open="(o) => !o && closeDrawer()"
  >
    <template #content>
      <div class="p-4">
        <h3 class="text-lg font-semibold mb-1">
          Task Templates
        </h3>
        <p class="text-sm text-gray-500 mb-4">
          Choose a template to quickly create a task
        </p>

        <div class="flex flex-col gap-2">
          <button
            v-for="template in templates"
            :key="template.id"
            class="flex items-start gap-3 rounded-xl bg-gray-100 dark:bg-gray-800 p-3 text-left transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            @click="handleSelect(template.id)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
              <UIcon
                :name="TEMPLATE_ICONS[template.id] ?? 'i-lucide-zap'"
                class="h-5 w-5 text-primary-500"
              />
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold">{{ template.name }}</span>
              <span class="text-[12px] text-gray-500">{{ template.description }}</span>
              <span
                v-if="template.subtasks.length > 0"
                class="mt-1 text-[11px] text-gray-500"
              >
                {{ template.subtasks.length }} subtask{{ template.subtasks.length !== 1 ? 's' : '' }} included
              </span>
            </div>
          </button>
        </div>
      </div>
    </template>
  </USlideover>
</template>
