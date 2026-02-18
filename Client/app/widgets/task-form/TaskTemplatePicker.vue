<script setup lang="ts">
import { useTaskStore, useMessageStore, useThreadStore, useUserStore, useUIStore, createMessage } from '~/shared/model'
import { createTask } from '~/shared/lib'

const taskStore = useTaskStore()
const messageStore = useMessageStore()
const threadStore = useThreadStore()
const userStore = useUserStore()
const uiStore = useUIStore()
const toast = useToast()

const TEMPLATE_ICONS: Record<string, string> = {
  tmpl1: 'i-lucide-bug',
  tmpl2: 'i-lucide-lightbulb',
  tmpl3: 'i-lucide-zap',
  tmpl4: 'i-lucide-calendar-check'
}

function handleSelect(templateId: string) {
  const template = taskStore.getTemplateById(templateId)
  const activeThread = threadStore.activeThread.value
  const currentUser = userStore.currentUser.value

  if (!template || !activeThread || !currentUser) {
    toast.add({
      title: 'Select a thread first',
      description: 'Template tasks need an active thread.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  const threadId = activeThread.id

  const task = createTask(threadId, template.name, currentUser.id, {
    description: template.description,
    priority: template.defaultPriority,
    assignees: [currentUser.id],
    tags: [...template.defaultTags],
    templateId: template.id
  })

  if (template.id === 'tmpl4') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    task.dueDate = tomorrow.toISOString()
  }

  taskStore.add(task)

  const message = createMessage(
    threadId,
    `Created task from template: ${template.name}`,
    currentUser.id,
    'task-created',
    task.id
  )
  messageStore.add(message)
  threadStore.updateLastActivity(threadId, message.timestamp)

  template.subtasks.forEach((sub) => {
    const subTask = createTask(threadId, sub.title, currentUser.id, {
      priority: template.defaultPriority,
      parentTaskId: task.id
    })
    taskStore.add(subTask)

    const subMsg = createMessage(
      threadId,
      `Created subtask: ${sub.title}`,
      currentUser.id,
      'task-created',
      subTask.id
    )
    messageStore.add(subMsg)
  })

  uiStore.setShowTemplates(false)
  toast.add({
    title: 'Template applied',
    description: `${template.name} task created`,
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}

function closeDrawer() {
  uiStore.setShowTemplates(false)
}
</script>

<template>
  <USlideover
    :open="uiStore.showTemplates.value"
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
            v-for="template in taskStore.templates.value"
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
