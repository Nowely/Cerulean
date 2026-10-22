<script setup lang="ts">
// «Что сюда класть» of every page in one place: the words Авто reads when it files a record (v23: never «описание»).
// A line opens the same editor as «Что сюда класть» in the page menu. Glyphs stay muted: a page listed here is not picked.
import { computed, ref } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { onlyCollects } from '~/domain/collect'
import PageTile from '../common/PageTile.vue'
import DescriptionDialog from '../page/DescriptionDialog.vue'

defineProps<{ variant: 'list' | 'table' }>()
const data = useDataStore()
// Not a page that only collects: nothing is filed there by words (v24 fixes, 16)
const pages = computed(() => data.livePages.filter(p => p.kind === 'page' && !onlyCollects(p)).sort((a, b) => a.title.localeCompare(b.title, 'ru')))
const editing = ref<Page | null>(null)
const open = computed({
  get: () => !!editing.value,
  set: (v) => {
    if (!v) editing.value = null
  }
})
</script>

<template>
  <div
    v-if="variant === 'table'"
    class="w-full overflow-hidden rounded-card border border-default bg-default"
    role="table"
    aria-label="Что класть на страницы"
  >
    <div
      class="grid grid-cols-[12.5rem_minmax(0,1fr)] gap-3 bg-canvas px-3.5 py-2 text-13 font-medium text-toned"
      role="row"
    >
      <span role="columnheader">Страница</span><span role="columnheader">Что сюда класть</span>
    </div>
    <div
      v-for="p in pages"
      :key="p.id"
      role="row"
    >
      <button
        type="button"
        class="grid w-full cursor-pointer grid-cols-[12.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-default px-3.5 py-2.5 text-left text-sm hover:bg-muted"
        :aria-label="`Изменить «Что сюда класть»: ${p.title || 'Без названия'}`"
        @click="editing = p"
      >
        <span
          role="cell"
          class="flex min-w-0 items-center gap-2.5 text-highlighted"
        ><PageTile :glyph="p.glyph" /><span class="truncate">{{ p.title || 'Без названия' }}</span></span>
        <span
          role="cell"
          :class="p.description ? 'text-toned' : 'text-dimmed'"
        >{{ p.description || 'Не задано: только по названию' }}</span>
        <UIcon
          name="i-lucide-pencil"
          class="size-4 text-dimmed"
        />
      </button>
    </div>
  </div>

  <ul
    v-else
    class="flex flex-col"
  >
    <li
      v-for="p in pages"
      :key="p.id"
    >
      <button
        type="button"
        class="flex min-h-15 w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left active:bg-pressed"
        @click="editing = p"
      >
        <PageTile :glyph="p.glyph" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-base text-highlighted">{{ p.title || 'Без названия' }}</span>
          <span
            class="mt-0.5 line-clamp-2 block text-sm leading-snug"
            :class="p.description ? 'text-toned' : 'text-dimmed'"
          >{{ p.description || 'Не задано: только по названию' }}</span>
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 shrink-0 text-dimmed"
        />
      </button>
    </li>
  </ul>

  <DescriptionDialog
    v-if="editing"
    v-model:open="open"
    :page="editing"
  />
</template>
