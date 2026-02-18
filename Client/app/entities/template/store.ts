import { defineStore } from 'pinia'
import type { TaskTemplate } from '~/shared/types'
import { SEED_TEMPLATES } from '~/shared/api/seed'

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<TaskTemplate[]>([])

  function getTemplateById(id: string): TaskTemplate | undefined {
    return templates.value.find(t => t.id === id)
  }

  function init() {
    templates.value = SEED_TEMPLATES.map(t => ({
      ...t,
      defaultTags: [...t.defaultTags],
      subtasks: [...t.subtasks]
    }))
  }

  return {
    templates,
    getTemplateById,
    init
  }
})
