<script setup lang="ts">
import { computed, ref } from 'vue'
import { UPopover } from '#components'
import { useBackLayer } from '~/composables/useBackLayer'
import type { Section } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNotify } from '~/composables/useNotify'
import { clip, count, PAGE_FORMS } from '~/domain/text'
import SectionOrder from './SectionOrder.vue'

const props = defineProps<{ section?: Section, name: string }>()
const emit = defineEmits<{ rename: [] }>()
const data = useDataStore()
const ui = useUiStore()
const notify = useNotify()
const open = ref(false)
useBackLayer(() => open.value, () => {
  open.value = false
})
const ordering = ref(false)

const items = computed(() => {
  const section = props.section
  return [
    ...(section
      ? [
          { label: 'Переименовать', icon: 'i-lucide-pencil', run: () => emit('rename') },
          { label: 'Изменить порядок', icon: 'i-lucide-arrow-down-up', run: () => ordering.value = true }
        ]
      : []),
    { label: 'Новая секция', icon: 'i-lucide-list-plus', run: () => ui.renameSection = data.createSection('Новая секция', section?.id ?? null).id },
    ...(section ? [{ label: 'Удалить секцию', icon: 'i-lucide-trash-2', danger: true, run: remove }] : [])
  ]
})

function remove() {
  if (!props.section) return
  const name = clip(props.section.name)
  const { pages, undo } = data.removeSection(props.section.id)
  const where = pages.length ? `, ${count(pages.length, PAGE_FORMS)} в Моих страницах` : ''
  notify(`Секция ${name} удалена${where}`, { label: 'Отменить', run: undo }, 8000)
}

let pending: (() => void) | undefined
function select(run: () => void) {
  pending = run
  open.value = false
}
function closed(event: Event) {
  if (!pending) return
  event.preventDefault()
  const run = pending
  pending = undefined
  setTimeout(run)
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ side: 'bottom', align: 'end', alignOffset: 36, sideOffset: 2, collisionPadding: 8, onCloseAutoFocus: closed }"
    :ui="{ content: 'w-58 rounded-[14px] border border-line bg-elev shadow-float dark:border-line2' }"
  >
    <button
      type="button"
      class="relative flex h-8 w-9 shrink-0 cursor-pointer items-center justify-center rounded-item text-toned after:absolute after:-inset-x-1 after:-inset-y-1.5 hover:text-highlighted active:bg-pressed"
      :aria-label="`Действия с секцией «${name}»`"
      :title="`Действия с секцией «${name}»`"
    >
      <UIcon
        name="i-lucide-ellipsis"
        class="size-4.5"
      />
    </button>
    <template #content>
      <div class="p-1">
        <button
          v-for="item in items"
          :key="item.label"
          type="button"
          class="flex h-11 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-15 hover:bg-muted active:bg-pressed"
          :class="item.danger ? 'mt-1 text-warn-ink' : 'text-default'"
          @click="select(item.run)"
        >
          <UIcon
            :name="item.icon"
            class="size-4.5 shrink-0"
            :class="item.danger ? '' : 'text-toned'"
          />
          {{ item.label }}
        </button>
      </div>
    </template>
  </UPopover>
  <SectionOrder
    v-if="section"
    v-model:open="ordering"
    :current="section.id"
  />
</template>
