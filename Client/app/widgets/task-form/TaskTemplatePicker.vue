<script setup lang="ts">
import { useTaskStore, useUIStore } from '~/shared/model'
import { useToastHelpers } from '~/shared/lib'
import { useTaskManage } from '~/features/task-manage'

const taskStore = useTaskStore()
const uiStore = useUIStore()
const toast = useToastHelpers()
const { applyTemplate } = useTaskManage()

const TEMPLATE_ICONS: Record<string, string> = {
  tmpl1: 'i-lucide-bug',
  tmpl2: 'i-lucide-lightbulb',
  tmpl3: 'i-lucide-zap',
  tmpl4: 'i-lucide-calendar-check'
}

function handleSelect(templateId: string) {
  const template = taskStore.getTemplateById(templateId)
  if (!template) return

  const created = applyTemplate(templateId)
  if (!created) {
    toast.warning({
      title: 'Select a thread first',
      description: 'Template tasks need an active thread.'
    })
    return
  }

  toast.success({
    title: 'Template applied',
    description: `${template.name} task created`,
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
          <UButton
            v-for="template in taskStore.templates.value"
            :key="template.id"
            color="neutral"
            variant="ghost"
            block
            class="justify-start h-auto p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            @click="handleSelect(template.id)"
          >
            <template #leading>
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
                <UIcon
                  :name="TEMPLATE_ICONS[template.id] ?? 'i-lucide-zap'"
                  class="h-5 w-5 text-primary-500"
                />
              </div>
            </template>
            <div class="flex flex-col items-start gap-0.5 text-left">
              <span class="text-sm font-semibold">{{ template.name }}</span>
              <span class="text-[12px] text-gray-500">{{ template.description }}</span>
              <span
                v-if="template.subtasks.length > 0"
                class="mt-1 text-[11px] text-gray-500"
              >
                {{ template.subtasks.length }} subtask{{ template.subtasks.length !== 1 ? 's' : '' }} included
              </span>
            </div>
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
