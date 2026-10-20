<script setup lang="ts">
// Описания для Авто of every page in one place: what Авто reads when it files a record.
// A line opens the same editor as «Описание для Авто» in the page menu.
import { computed, ref } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import PageTile from '../common/PageTile.vue'
import DescriptionDialog from '../page/DescriptionDialog.vue'

defineProps<{ variant: 'list' | 'table' }>()
const data = useDataStore()
const pages = computed(() => data.livePages.filter(p => p.kind === 'page').sort((a, b) => a.title.localeCompare(b.title, 'ru')))
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
    aria-label="Описания для Авто"
  >
    <div
      class="grid grid-cols-[12.5rem_minmax(0,1fr)] gap-3 bg-canvas px-3.5 py-2 text-13 font-medium text-toned"
      role="row"
    >
      <span role="columnheader">Страница</span><span role="columnheader">Описание для Авто</span>
    </div>
    <div
      v-for="p in pages"
      :key="p.id"
      role="row"
    >
      <button
        type="button"
        class="grid w-full cursor-pointer grid-cols-[12.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-default px-3.5 py-2.5 text-left text-sm hover:bg-muted"
        :aria-label="`Изменить описание: ${p.title || 'Без названия'}`"
        @click="editing = p"
      >
        <span
          role="cell"
          class="flex min-w-0 items-center gap-2.5 text-highlighted"
        ><PageTile
          :glyph="p.glyph"
          :color="p.color"
        /><span class="truncate">{{ p.title || 'Без названия' }}</span></span>
        <span
          role="cell"
          :class="p.description ? 'text-toned' : 'text-dimmed'"
        >{{ p.description || 'Нет описания: только по названию' }}</span>
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
        <PageTile
          :glyph="p.glyph"
          :color="p.color"
        />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-base text-highlighted">{{ p.title || 'Без названия' }}</span>
          <span
            class="mt-0.5 line-clamp-2 block text-sm leading-snug"
            :class="p.description ? 'text-toned' : 'text-dimmed'"
          >{{ p.description || 'Нет описания: только по названию' }}</span>
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
