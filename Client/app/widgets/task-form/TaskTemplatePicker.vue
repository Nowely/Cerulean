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
        <p class="text-sm text-muted mb-4">
          Choose a template to quickly create a task
        </p>

        <div class="flex flex-col gap-2">
          <UCard
            v-for="template in taskStore.templates.value"
            :key="template.id"
            variant="soft"
            class="cursor-pointer hover:bg-accented dark:hover:bg-accented transition-colors"
            @click="handleSelect(template.id)"
          >
            <div class="flex items-center gap-3">
              <UAvatar
                :icon="TEMPLATE_ICONS[template.id] ?? 'i-lucide-zap'"
                size="lg"
                variant="soft"
              />
              <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                <span class="text-sm font-semibold">{{ template.name }}</span>
                <span class="text-[12px] text-muted">{{ template.description }}</span>
                <span
                  v-if="template.subtasks.length > 0"
                  class="mt-1 text-[11px] text-muted"
                >
                  {{ template.subtasks.length }} subtask{{ template.subtasks.length !== 1 ? 's' : '' }} included
                </span>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </USlideover>
</template>
