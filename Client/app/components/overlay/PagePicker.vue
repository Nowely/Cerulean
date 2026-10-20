<script setup lang="ts">
// «Ещё…», «Переместить», «Не туда»: every page to choose from, with a search and «Новая страница»
import { computed, ref, watch } from 'vue'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import { fold } from '~/domain/text'
import PageTile from '../common/PageTile.vue'

const data = useDataStore()
const ui = useUiStore()
const { isDesktop } = useScreen()
const q = ref('')

const open = computed({
  get: () => !!ui.picker,
  set: (v) => {
    if (!v) ui.picker = null
  }
})
watch(open, (v) => {
  if (v) q.value = ''
})

const pages = computed(() => data.livePages
  .filter(p => p.kind === 'page' || p.kind === 'inbox')
  .filter(p => !q.value.trim() || fold(p.title).includes(fold(q.value.trim()))))
const sectionName = (id: string | null) => id ? data.sections[id]?.name ?? '' : ''
const newName = computed(() => q.value.trim() || ui.picker?.newName || '')

function pick(pageId: string) {
  const run = ui.picker?.run
  ui.picker = null
  run?.({ pageId })
}
function create() {
  const run = ui.picker?.run
  ui.picker = null
  run?.({ newPage: newName.value })
}
</script>

<template>
  <UModal
    v-if="isDesktop"
    v-model:open="open"
    :title="ui.picker?.title ?? 'Выбрать страницу'"
    :ui="{ content: 'max-w-md' }"
  >
    <template #content>
      <div class="flex max-h-[80dvh] flex-col lg:max-h-[70dvh]">
        <div class="flex shrink-0 items-start gap-2 pt-1 pr-2 pl-5 lg:pt-3">
          <h2 class="min-w-0 flex-1 py-2 text-sheet leading-snug text-highlighted">
            {{ ui.picker?.title }}
          </h2>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            square
            aria-label="Закрыть"
            @click="open = false"
          />
        </div>
        <div class="shrink-0 px-3 pb-2">
          <UInput
            v-model="q"
            variant="soft"
            icon="i-lucide-search"
            placeholder="Найти страницу"
            class="w-full"
            aria-label="Найти страницу"
          />
        </div>
        <ul class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <li
            v-for="p in pages"
            :key="p.id"
          >
            <button
              type="button"
              class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed disabled:cursor-default disabled:opacity-60 lg:min-h-10 lg:text-15"
              :disabled="p.id === ui.picker?.current"
              @click="pick(p.id)"
            >
              <PageTile
                :glyph="p.glyph"
                :color="p.color"
              />
              <span class="min-w-0 flex-1 truncate">{{ p.title || 'Без названия' }}</span>
              <span
                v-if="p.id === ui.picker?.current"
                class="text-meta text-toned"
              >сейчас здесь</span>
              <span
                v-else-if="sectionName(p.sectionId)"
                class="text-meta text-toned"
              >{{ sectionName(p.sectionId) }}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-accent-ink hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
              @click="create"
            >
              <span class="flex size-6 items-center justify-center"><UIcon
                name="i-lucide-plus"
                class="size-4.5"
              /></span>
              {{ newName ? `Новая страница «${newName}»` : 'Новая страница…' }}
            </button>
          </li>
        </ul>
      </div>
    </template>
  </UModal>
  <UDrawer
    v-else
    v-model:open="open"
    :title="ui.picker?.title ?? 'Выбрать страницу'"
  >
    <template #content>
      <div class="flex max-h-[80dvh] flex-col lg:max-h-[70dvh]">
        <div class="flex shrink-0 items-start gap-2 pt-1 pr-2 pl-5 lg:pt-3">
          <h2 class="min-w-0 flex-1 py-2 text-sheet leading-snug text-highlighted">
            {{ ui.picker?.title }}
          </h2>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            square
            aria-label="Закрыть"
            @click="open = false"
          />
        </div>
        <div class="shrink-0 px-3 pb-2">
          <UInput
            v-model="q"
            variant="soft"
            icon="i-lucide-search"
            placeholder="Найти страницу"
            class="w-full"
            aria-label="Найти страницу"
          />
        </div>
        <ul class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <li
            v-for="p in pages"
            :key="p.id"
          >
            <button
              type="button"
              class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed disabled:cursor-default disabled:opacity-60 lg:min-h-10 lg:text-15"
              :disabled="p.id === ui.picker?.current"
              @click="pick(p.id)"
            >
              <PageTile
                :glyph="p.glyph"
                :color="p.color"
              />
              <span class="min-w-0 flex-1 truncate">{{ p.title || 'Без названия' }}</span>
              <span
                v-if="p.id === ui.picker?.current"
                class="text-meta text-toned"
              >сейчас здесь</span>
              <span
                v-else-if="sectionName(p.sectionId)"
                class="text-meta text-toned"
              >{{ sectionName(p.sectionId) }}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-accent-ink hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
              @click="create"
            >
              <span class="flex size-6 items-center justify-center"><UIcon
                name="i-lucide-plus"
                class="size-4.5"
              /></span>
              {{ newName ? `Новая страница «${newName}»` : 'Новая страница…' }}
            </button>
          </li>
        </ul>
      </div>
    </template>
  </UDrawer>
</template>
