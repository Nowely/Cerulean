<script setup lang="ts">
// One page picker for «Ещё…», «Переместить», «Не туда» and the composer chip: a sheet on a phone, a dialog
// on desktop. Without a query: the top row (Авто or «Эта страница»), «Похоже на», «Открыто недавно», every
// section with its pages, «Системные». With a query: «Найдено». It ends with «Новая страница «…»».
import { computed, ref, watch } from 'vue'
import type { Id, Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import { fold } from '~/domain/text'
import PageTile from '../common/PageTile.vue'
import { UDrawer, UModal } from '#components'

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

const choosable = computed(() => data.livePages.filter(p => p.kind === 'page' || p.kind === 'inbox'))
const byId = (ids: Id[]) => ids.map(id => data.pages[id]).filter((p): p is Page => !!p && !p.deletedAt && p.kind !== 'today')
const sectionName = (p: Page) => p.kind === 'inbox' ? '' : p.sectionId ? data.sections[p.sectionId]?.name ?? '' : 'Недавнее'

interface Group { label: string, pages: Page[], where?: boolean }

const groups = computed<Group[]>(() => {
  const query = fold(q.value.trim())
  if (query) {
    const found = choosable.value.filter(p => fold(p.title).includes(query))
    return found.length ? [{ label: 'Найдено', pages: found, where: true }] : []
  }
  const guesses = byId(ui.picker?.guesses ?? []).slice(0, 3)
  const opened = choosable.value
    .filter(p => p.kind === 'page' && !guesses.includes(p))
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, 3)
  const out: Group[] = []
  if (guesses.length) out.push({ label: 'Похоже на', pages: guesses, where: true })
  out.push({ label: 'Открыто недавно', pages: opened, where: true })
  if (data.recentlyMade.length) out.push({ label: 'Недавнее', pages: data.recentlyMade })
  for (const s of data.sectionList) {
    const pages = data.livePages.filter(p => p.sectionId === s.id && p.kind === 'page')
    if (pages.length) out.push({ label: s.name, pages })
  }
  out.push({ label: 'Системные', pages: [data.inbox] })
  return out
})

const nothing = computed(() => !!q.value.trim() && !groups.value.length)
const newName = computed(() => q.value.trim() || ui.picker?.newName || '')
const exists = computed(() => !!newName.value && choosable.value.some(p => fold(p.title) === fold(newName.value)))
const thisPage = computed(() => ui.picker?.thisPage ? data.pages[ui.picker.thisPage] : undefined)

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
function auto() {
  const run = ui.picker?.auto?.run
  ui.picker = null
  run?.()
}
</script>

<template>
  <component
    :is="isDesktop ? UModal : UDrawer"
    v-model:open="open"
    :title="ui.picker?.title ?? 'Выбрать страницу'"
    :ui="isDesktop ? { content: 'max-w-md' } : undefined"
  >
    <template #content>
      <div class="flex max-h-[85dvh] flex-col lg:max-h-[70dvh]">
        <div class="flex shrink-0 items-start gap-2 pt-1 pr-2 pl-6 lg:pt-3 lg:pl-5">
          <div class="min-w-0 flex-1 py-1.5">
            <h2 class="text-sheet leading-snug text-highlighted">
              {{ ui.picker?.title }}
            </h2>
            <p
              v-if="ui.picker?.subtitle"
              class="truncate text-sm text-toned"
            >
              {{ ui.picker.subtitle }}
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            square
            aria-label="Закрыть"
            @click="open = false"
          />
        </div>
        <div class="shrink-0 px-3 pt-1 pb-1">
          <UInput
            v-model="q"
            icon="i-lucide-search"
            variant="soft"
            size="lg"
            placeholder="Найти страницу"
            class="w-full"
            aria-label="Найти страницу"
          />
        </div>
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          data-vaul-no-drag
        >
          <ul
            v-if="!q.trim() && (ui.picker?.auto || thisPage)"
            class="pt-1"
          >
            <li v-if="ui.picker?.auto">
              <button
                type="button"
                class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
                @click="auto"
              >
                <UIcon
                  name="cer:auto"
                  class="size-4.5 shrink-0 text-toned"
                />
                <span class="min-w-0 flex-1 truncate text-highlighted">Авто<span
                  v-if="ui.picker.auto.picks"
                  class="text-toned"
                > → {{ ui.picker.auto.picks }}</span></span>
                <UIcon
                  v-if="ui.picker.auto.chosen"
                  name="i-lucide-check"
                  class="size-4.5 text-accent"
                />
              </button>
            </li>
            <li v-if="thisPage">
              <button
                type="button"
                class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
                @click="pick(thisPage.id)"
              >
                <PageTile :glyph="thisPage.glyph" />
                <span class="min-w-0 flex-1 truncate text-highlighted">Эта страница</span>
                <UIcon
                  v-if="ui.picker?.chosen === thisPage.id"
                  name="i-lucide-check"
                  class="size-4.5 text-accent"
                />
              </button>
            </li>
          </ul>
          <section
            v-for="g in groups"
            :key="g.label"
            :aria-label="g.label"
          >
            <h3 class="px-3 pt-3 pb-1 text-cap text-toned">
              {{ g.label }}
            </h3>
            <ul>
              <li
                v-for="p in g.pages"
                :key="p.id"
              >
                <button
                  type="button"
                  class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed disabled:cursor-default disabled:opacity-60 lg:min-h-10 lg:text-15"
                  :disabled="p.id === ui.picker?.current"
                  @click="pick(p.id)"
                >
                  <PageTile :glyph="p.glyph" />
                  <span class="min-w-0 flex-1 truncate">{{ p.title || 'Без названия' }}</span>
                  <span
                    v-if="p.id === ui.picker?.current"
                    class="shrink-0 text-meta text-toned"
                  >сейчас здесь</span>
                  <UIcon
                    v-else-if="ui.picker?.chosen === p.id"
                    name="i-lucide-check"
                    class="size-4.5 text-accent"
                  />
                  <span
                    v-else-if="g.where && sectionName(p)"
                    class="max-w-32 shrink-0 truncate text-meta text-toned"
                  >{{ sectionName(p) }}</span>
                </button>
              </li>
            </ul>
          </section>
          <p
            v-if="nothing"
            class="px-3 pt-4 pb-2 text-meta text-toned"
          >
            Ничего не нашлось
          </p>
          <button
            v-if="!exists"
            type="button"
            class="mt-1 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-accent-ink hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
            @click="create"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4.5 shrink-0"
            />
            {{ newName ? `Новая страница «${newName}»` : 'Новая страница…' }}
          </button>
        </div>
      </div>
    </template>
  </component>
</template>
