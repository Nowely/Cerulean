<script setup lang="ts">
// Section header: name + chevron folds it, «⋯» holds «Новая страница», rename and delete
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import type { Section } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import SectionMenu from './SectionMenu.vue'

const props = defineProps<{ section: Section, editing?: boolean }>()
const emit = defineEmits<{ done: [] }>()
const data = useDataStore()
const renaming = ref(false)
const name = ref(props.section.name)
const input = useTemplateRef<HTMLInputElement>('input')

async function rename() {
  name.value = props.section.name
  renaming.value = true
  await nextTick()
  input.value?.select()
}
watch(() => props.editing, (v) => {
  if (v) void rename()
}, { immediate: true })

function save() {
  const n = name.value.trim()
  if (n) data.updateSection(props.section.id, { name: n })
  renaming.value = false
  emit('done')
}
</script>

<template>
  <div class="mt-2 flex items-center pl-1 lg:mt-3">
    <input
      v-if="renaming"
      ref="input"
      v-model="name"
      class="h-11 min-w-0 flex-1 rounded-chip bg-default px-2 text-input font-semibold text-highlighted ring ring-accent outline-none lg:h-8"
      aria-label="Название секции"
      @keydown.enter.prevent="save"
      @keydown.esc="renaming = false"
      @blur="save"
    >
    <button
      v-else
      type="button"
      class="flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-chip px-2 text-left text-sm font-semibold text-toned hover:text-highlighted lg:h-8 lg:text-13 lg:font-medium lg:text-dimmed"
      :aria-expanded="!section.collapsed"
      @click="data.updateSection(section.id, { collapsed: !section.collapsed })"
    >
      <span class="truncate">{{ section.name }}</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 shrink-0 transition-transform"
        :class="section.collapsed ? '-rotate-90' : ''"
      />
    </button>
    <SectionMenu
      :section="section"
      @rename="rename"
    />
  </div>
</template>
