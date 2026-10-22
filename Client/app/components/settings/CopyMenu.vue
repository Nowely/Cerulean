<script setup lang="ts">
// The one format choice for «Сохранить копию» (v23, B6, M11, F16): JSON or Markdown, and a pick saves at once, so
// there is nothing to confirm. A sheet on a phone, a dropdown at its trigger on desktop. The status line of
// Настройки, its «Сохранить копию ›» row, the warning block and the reminder on Главная all open this one.
import { useCopy } from '~/composables/useCopy'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

defineProps<{
  /** Phone: opened through v-model:open from a line that is already a button (the row of Настройки) */
  bare?: boolean
  /** Desktop: the edge of the trigger the dropdown lines up with */
  align?: 'start' | 'end'
}>()
const open = defineModel<boolean>('open', { default: false })
const { saveCopy } = useCopy()

const items: MenuItem[][] = [[
  { label: 'JSON', icon: 'i-lucide-download', hint: 'Всё, чтобы потом загрузить обратно', onSelect: () => saveCopy('json') },
  { label: 'Markdown', icon: 'i-lucide-download', hint: 'Страницы и записи текстом, чтобы читать', onSelect: () => saveCopy('md') }
]]
</script>

<template>
  <ActionMenu
    v-model:open="open"
    :items="items"
    title="Сохранить копию"
    label="Сохранить копию"
    :bare="bare"
    :align="align"
  >
    <template #default="{ open: shown }">
      <slot :open="shown" />
    </template>
  </ActionMenu>
</template>
