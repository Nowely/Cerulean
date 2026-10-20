<script setup lang="ts">
// A section on Главная is a quiet caption: 12/500 muted, a chevron that turns right when folded, «⋯» for
// user sections. Folded, it shows the count and the strongest status of its pages («Личное · 4 · 1 просрочено»;
// in compact a dot instead of the words).
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import type { Section } from '~/domain/types'
import type { Badge } from '~/domain/summary'
import { useDataStore } from '~/stores/data'
import SectionMenu from './SectionMenu.vue'

const props = defineProps<{
  id: string
  name: string
  folded: boolean
  count: number
  /** The strongest status of the folded pages */
  status?: Badge | null
  compact?: boolean
  /** A user section: «⋯», rename */
  section?: Section
  editing?: boolean
}>()
const emit = defineEmits<{ toggle: [], done: [] }>()
const data = useDataStore()
const renaming = ref(false)
const draft = ref(props.name)
const input = useTemplateRef<HTMLInputElement>('input')

async function rename() {
  draft.value = props.name
  renaming.value = true
  await nextTick()
  input.value?.select()
}
watch(() => props.editing, (v) => {
  if (v) void rename()
}, { immediate: true })

function save() {
  const n = draft.value.trim()
  if (n && props.section) data.updateSection(props.section.id, { name: n })
  renaming.value = false
  emit('done')
}
</script>

<template>
  <div class="mt-4 flex h-6 items-center">
    <input
      v-if="renaming"
      ref="input"
      v-model="draft"
      class="h-9 min-w-0 flex-1 rounded-item bg-default px-2 text-input text-highlighted ring ring-accent outline-none"
      aria-label="Название секции"
      @keydown.enter.prevent="save"
      @keydown.esc="renaming = false"
      @blur="save"
    >
    <h2
      v-else
      :id="`cap-${id}`"
      class="flex min-w-0 flex-1"
    >
      <button
        type="button"
        class="hit-44 relative flex h-6 min-w-0 cursor-pointer items-center gap-1 rounded-item px-2 text-left text-cap text-toned hover:text-highlighted"
        :aria-expanded="!folded"
        @click="emit('toggle')"
      >
        <span class="truncate">{{ name }}</span>
        <template v-if="folded">
          <span class="shrink-0 tabular-nums">· {{ count }}</span>
          <template v-if="status">
            <span
              v-if="compact && status.tone !== 'neutral'"
              class="mx-0.5 size-1.5 shrink-0 rounded-full"
              :class="status.tone === 'warn' ? 'bg-warn' : 'bg-accent'"
              role="img"
              :aria-label="status.text"
            />
            <span
              v-else-if="!compact"
              class="shrink-0 whitespace-nowrap tabular-nums"
              :class="{
                'text-warn': status.tone === 'warn',
                'text-accent-ink': status.tone === 'accent',
                'font-normal text-dimmed': status.tone === 'neutral'
              }"
            >· {{ status.text }}</span>
          </template>
        </template>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-3.5 shrink-0 text-dimmed transition-transform"
          :class="folded ? '-rotate-90' : ''"
        />
      </button>
    </h2>
    <span
      v-if="section && !renaming"
      class="mr-0.5 flex"
    >
      <SectionMenu
        :section="section"
        @rename="rename"
      />
    </span>
  </div>
</template>
