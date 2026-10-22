<script setup lang="ts">
// «Начать с» (main flow, item 16): over the keyboard of a page with no records and no kind, where the field would be,
// three chips that name kinds of page, not pages (Reminders' list types): «Список», «Список покупок» (the Покупки
// template: departments, «Купить / Куплено»), «Список дел» (the Задачи template). A chip gives the page that kind and
// glyph and opens the «+ Новая запись» line; the title stays as typed. The chips never take the focus, so the keyboard
// stays up while the line takes the caret.
import type { Page, TemplateKey } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { applyTemplate } from '~/domain/templates'

const props = defineProps<{ page: Page }>()
const emit = defineEmits<{ picked: [] }>()
const data = useDataStore()

const STARTERS: { name: string, icon: string, template?: TemplateKey }[] = [
  { name: 'Список', icon: 'i-lucide-list' },
  { name: 'Список покупок', icon: 'i-lucide-shopping-basket', template: 'shop' },
  { name: 'Список дел', icon: 'i-lucide-square-check', template: 'todo' }
]

function pick(s: typeof STARTERS[number]) {
  const p = props.page
  if (s.template) data.updatePage(p.id, { ...applyTemplate(p, s.template), title: p.title })
  else data.updatePage(p.id, { glyph: 'list' })
  emit('picked')
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-2 gap-y-2 px-1"
    role="group"
    aria-label="Начать с"
    data-starters
  >
    <span
      class="-mb-1 basis-full text-cap leading-6 text-toned"
      aria-hidden="true"
    >Начать с</span>
    <button
      v-for="s in STARTERS"
      :key="s.name"
      type="button"
      class="relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.75 rounded-item bg-chip pr-3 pl-2.25 text-sm whitespace-nowrap text-default inset-ring inset-ring-line after:absolute after:inset-x-0 after:-inset-y-1 active:bg-chip-pressed dark:bg-chip-elev dark:inset-ring-0 dark:active:bg-chip-elev-pressed"
      @pointerdown.prevent
      @mousedown.prevent
      @click="pick(s)"
    >
      <UIcon
        :name="s.icon"
        class="size-4 text-toned"
      />{{ s.name }}
    </button>
  </div>
</template>
