<script setup lang="ts">
// «⋯» of a template's page (v24, И9, И7): «Переименовать» and «Удалить шаблон» (warn; the records made by it stay).
// Deleting is medium: it goes at once, its page opens, and the toast brings it back.
import { computed } from 'vue'
import type { Page, RecTemplate } from '~/domain/types'
import { useUiStore } from '~/stores/ui'
import { useTemplates } from '~/composables/useTemplates'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

const props = defineProps<{ tpl: RecTemplate, page: Page }>()
const ui = useUiStore()
const templates = useTemplates()

const items = computed<MenuItem[][]>(() => [
  [{ label: 'Переименовать', icon: 'i-lucide-pencil', onSelect: () => ui.focusTitle = props.tpl.id }],
  [{ label: 'Удалить шаблон', icon: 'i-lucide-trash-2', danger: true, hint: 'Записи по нему останутся', onSelect: () => templates.remove(props.tpl.id) }]
])
</script>

<template>
  <ActionMenu
    :items="items"
    :title="tpl.name"
    :caption="page.title || 'Без названия'"
    label="Действия с шаблоном"
  />
</template>
