<script setup lang="ts">
// A new page explains itself: templates, «Что сюда класть?» (Описание для Авто) and «Как показывать».
// All of it goes away after the first record.
import { computed } from 'vue'
import type { Layout, Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { applyTemplate, TEMPLATES } from '~/domain/templates'
import ChipButton from '../common/ChipButton.vue'
import SegmentedControl from '../common/SegmentedControl.vue'

const props = defineProps<{ page: Page }>()
const emit = defineEmits<{ focus: [boolean] }>()
const data = useDataStore()

const LAYOUTS: { value: Layout, label: string }[] = [
  { value: 'list', label: 'Список' },
  { value: 'board', label: 'Доска' },
  { value: 'table', label: 'Таблица' },
  { value: 'calendar', label: 'Календарь' }
]
const layout = computed({
  get: () => props.page.views[0]?.layout ?? 'list',
  set: (v: Layout) => data.updatePage(props.page.id, { views: props.page.views.map((x, i) => i === 0 ? { ...x, layout: v } : x) })
})
const description = computed({
  get: () => props.page.description,
  set: v => data.updatePage(props.page.id, { description: v })
})
</script>

<template>
  <div class="px-5 lg:px-0">
    <p class="mt-5 text-sm font-medium text-highlighted">
      Начать с шаблона
    </p>
    <div class="mt-2 flex flex-wrap gap-1.5">
      <ChipButton
        v-for="t in TEMPLATES"
        :key="t.key"
        :label="t.name"
        :glyph="t.glyph"
        :color="t.color"
        :selected="page.template === t.key"
        @click="data.updatePage(page.id, applyTemplate(page, t.key))"
      />
    </div>
    <p class="mt-2 text-13 leading-snug text-toned">
      Шаблон задаёт значок, описание, виды и «Готово». Всё меняется потом.
    </p>

    <label class="mt-5 block">
      <span class="mb-1.5 block text-sm font-medium text-highlighted">Что сюда класть?</span>
      <UInput
        v-model="description"
        placeholder="Например: подарки и идеи подарков"
        class="w-full"
        @focus="emit('focus', true)"
        @blur="emit('focus', false)"
      />
    </label>
    <p class="mt-1.5 text-13 leading-snug text-toned">
      Описание для Авто: по нему сюда попадут подходящие записи.
    </p>

    <p class="mt-5 mb-1.5 text-sm font-medium text-highlighted">
      Как показывать
    </p>
    <SegmentedControl
      v-model="layout"
      :options="LAYOUTS"
      label="Как показывать"
    />
    <p class="mt-1.5 text-13 text-toned">
      Можно поменять потом в «⋯».
    </p>
  </div>
</template>
