<script setup lang="ts">
// A new page explains itself: its section (the one it was made from: «Секция · Дом ⌄» from Дом's «⋯»), the manual of
// an empty page (the default slot), the starters and «Что сюда класть?» (the words Авто files by). All of it goes away
// after the first record.
import { computed, ref } from 'vue'
import type { Page, TemplateKey } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { applyTemplate, STARTERS } from '~/domain/templates'
import { glyphFor } from '~/domain/look'
import { onlyCollects } from '~/domain/collect'
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

/**
 * «Начать с шаблона»: the starters in the first-run order, «На неделе» fifth (v24 item 11). Each wears its family's
 * next glyph when the first is taken (`glyphFor`: Сегодня wears the calendar), on the chip and on the page
 */
const starters = computed(() => STARTERS.map(t => ({ key: t.key, name: t.name, glyph: glyphFor(t.glyph, data.livePages, props.page.id) })))
function pick(s: { key: TemplateKey, glyph: Page['glyph'] }) {
  data.updatePage(props.page.id, { ...applyTemplate(props.page, s.key), glyph: s.glyph })
}
</script>

<template>
  <div class="px-4 lg:px-0">
    <!-- «Секция»: a sheet on a phone, a menu at this row on desktop -->
    <SectionSheet
      v-model:open="choosing"
      :page="page"
      menu
    >
      <button
        type="button"
        class="-mx-2 mt-0.5 flex min-h-10 w-fit max-w-full cursor-pointer items-center gap-1.5 rounded-item px-2 text-15 text-highlighted hover:bg-hover active:bg-pressed aria-expanded:bg-hover lg:mt-4.25"
        :aria-label="`Секция: ${sectionName}. Выбрать другую`"
        :aria-expanded="choosing"
      >
        <span class="w-26 shrink-0 text-left text-toned lg:w-24">Секция</span>
        <span class="truncate">{{ sectionName }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-3.25 shrink-0 text-faint"
        />
      </button>
    </SectionSheet>

    <slot />

    <p class="pt-3.5 text-cap leading-6 text-toned lg:pt-4 lg:pb-1.5 lg:leading-5">
      Начать с шаблона
    </p>
    <!-- Raised in dark (chip-elev), not recessed; on desktop in light the filter chip's 1px line edge -->
    <div
      class="flex flex-wrap gap-1.5 dark:raised lg:gap-2"
      role="group"
      aria-label="Начать с шаблона"
    >
      <ChipButton
        v-for="s in starters"
        :key="s.key"
        :label="s.name"
        :glyph="s.glyph"
        :selected="page.template === s.key"
        :class="page.template === s.key ? '' : 'lg:ring lg:ring-inset lg:ring-default lg:dark:ring-0'"
        :aria-pressed="page.template === s.key"
        @click="pick(s)"
      />
    </div>

    <!-- A page that only collects files nothing by words: no «Что сюда класть?» (v24, item 11) -->
    <template v-if="!onlyCollects(page)">
      <label class="mt-4.5 block lg:mt-5">
        <span class="mb-1.5 block text-sm font-medium text-highlighted">Что сюда класть?</span>
        <UInput
          v-model="description"
          placeholder="Слова через запятую"
          class="w-full"
          size="lg"
          @focus="emit('focus', true)"
          @blur="emit('focus', false)"
        />
      </label>
      <p class="mt-1.5 text-13 leading-snug text-toned">
        Записи с этими словами Авто положит сюда.
      </p>
    </template>
  </div>
</template>
