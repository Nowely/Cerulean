<script setup lang="ts">
// A new page explains itself: its section, templates and «Что сюда класть?» (the words Авто files by). How to show it
// lives in «Настроить вид». All of it goes away after the first record.
import { computed, ref } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { applyTemplate, TEMPLATES } from '~/domain/templates'
import ChipButton from '../common/ChipButton.vue'
import SectionSheet from './SectionSheet.vue'

const props = defineProps<{ page: Page }>()
const emit = defineEmits<{ focus: [boolean] }>()
const data = useDataStore()

const sectionName = computed(() => props.page.sectionId ? data.sections[props.page.sectionId]?.name ?? 'Мои страницы' : 'Мои страницы')
const choosing = ref(false)
const description = computed({
  get: () => props.page.description,
  set: v => data.updatePage(props.page.id, { description: v })
})
</script>

<template>
  <div class="px-5 lg:px-0">
    <div class="mt-2 flex min-h-11 items-center text-base lg:min-h-9 lg:text-sm">
      <span class="w-27 shrink-0 text-toned lg:w-36">Секция</span>
      <button
        type="button"
        class="flex h-9 min-w-0 cursor-pointer items-center gap-1.5 rounded-item px-2 text-highlighted -mx-2 hover:bg-muted active:bg-pressed"
        aria-haspopup="dialog"
        @click="choosing = true"
      >
        <span class="truncate">{{ sectionName }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 shrink-0 text-toned"
        />
      </button>
    </div>
    <SectionSheet
      v-model:open="choosing"
      :page="page"
    />
    <p class="mt-4 text-cap text-toned">
      Начать с шаблона
    </p>
    <div class="mt-2 flex flex-wrap gap-1.5">
      <ChipButton
        v-for="t in TEMPLATES"
        :key="t.key"
        :label="t.name"
        :glyph="t.glyph"
        :selected="page.template === t.key"
        @click="data.updatePage(page.id, applyTemplate(page, t.key))"
      />
    </div>

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
      По этим словам сюда попадут подходящие записи.
    </p>
  </div>
</template>
