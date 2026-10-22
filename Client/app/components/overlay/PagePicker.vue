<script setup lang="ts">
// One page picker for «Ещё…», «Переместить», «Не туда» and the composer chip: a sheet on a phone; on desktop a
// popover at the button that opened it (a dialog when nothing anchors it). Without a query: the top rows («Эта
// страница», Авто), the page's «Шаблоны» (v24), «Похоже на», «Открыто недавно», every section with its pages,
// «Системные», each page once (domain/picker.ts). With a query: the templates it finds, then «Найдено». It ends with
// «Новая страница «…»» unless that page exists.
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import { capitalize, fold } from '~/domain/text'
import { choosable as pickable, pickerGroups, type PickGroup } from '~/domain/picker'
import { pageColor } from '~/domain/look'
import PageTile from '../common/PageTile.vue'
import { UDrawer, UModal, UPopover } from '#components'

const data = useDataStore()
const ui = useUiStore()
const { isDesktop } = useScreen()
const q = ref('')
const field = useTemplateRef<{ inputRef?: HTMLInputElement | null }>('field')

const open = computed({
  get: () => !!ui.picker,
  set: (v) => {
    if (v) return
    const closed = ui.picker?.onClose
    ui.picker = null
    closed?.()
  }
})
watch(open, (v) => {
  if (v) q.value = ''
})

/** Desktop: a popover at its button, as in the mockup; the rest of the screen stays as it is (no scrim) */
const anchor = computed(() => isDesktop.value && ui.picker?.anchor?.isConnected ? ui.picker.anchor : null)
/** The button's box; when a re-render swaps the button (a row's lazy tooltips) the popover stays where it was */
const reference = computed(() => {
  const el = anchor.value
  if (!el) return null
  let last = el.getBoundingClientRect()
  return { getBoundingClientRect: () => el.isConnected ? (last = el.getBoundingClientRect()) : last }
})
/** A page's composer chip opens it 420px wide right above itself (v24 desktop, D1) */
const chipOfPage = computed(() => !!ui.picker?.auto && !!ui.picker.thisPage)
const width = computed(() => chipOfPage.value ? 420 : 380)
/** Under the button from its left edge when that fits in the column, else its right edge lines up with the button's (a row action) */
function alignAt(el: HTMLElement) {
  const box = (el.closest('main') ?? document.body).getBoundingClientRect()
  return el.getBoundingClientRect().left + width.value <= box.right - 16 ? 'start' as const : 'end' as const
}
const container = computed(() => {
  if (anchor.value && reference.value) {
    return {
      is: UPopover,
      props: {
        reference: reference.value,
        content: {
          'side': chipOfPage.value ? 'top' as const : 'bottom' as const,
          'align': alignAt(anchor.value),
          'sideOffset': 6,
          'collisionPadding': 16,
          'aria-label': [ui.picker?.title, ui.picker?.subtitle].filter(Boolean).join(': '),
          // Typing finds a page at once: focus goes to the search field, not to ×
          'onOpenAutoFocus': (e: Event) => {
            e.preventDefault()
            field.value?.inputRef?.focus()
          }
        },
        ui: { content: chipOfPage.value ? 'w-105' : 'w-95' }
      }
    }
  }
  if (isDesktop.value) return { is: UModal, props: { title: ui.picker?.title ?? 'Выбрать страницу', ui: { content: 'max-w-95' } } }
  return { is: UDrawer, props: { title: ui.picker?.title ?? 'Выбрать страницу' } }
})

const choosable = computed(() => pickable(data.livePages))
const sectionName = (p: Page) => p.kind === 'inbox' ? '' : p.sectionId ? data.sections[p.sectionId]?.name ?? '' : 'Мои страницы'

/** «Откуда записи» (v24): the pages picked so far, on top and checked, in the order they were picked */
const multi = computed(() => ui.picker?.multi)
const picked = computed(() => {
  const m = multi.value
  if (!m) return []
  const skip = new Set(m.skip ?? [])
  return m.picked().map(id => data.pages[id]).filter((p): p is Page => !!p && !skip.has(p.id) && choosable.value.includes(p))
})
/** Every page once: «Эта страница» on top stands for itself, the page the records are on keeps its section */
const groups = computed<PickGroup[]>(() => pickerGroups({
  pages: data.livePages,
  sections: data.sectionList,
  query: q.value,
  guesses: multi.value ? undefined : ui.picker?.guesses,
  skip: multi.value ? [...picked.value.map(p => p.id), ...(multi.value.skip ?? [])] : ui.picker?.thisPage ? [ui.picker.thisPage] : [],
  current: ui.picker?.current
}).map(g => multi.value && g.label === 'Найдено' ? { ...g, pages: g.pages.filter(p => !multi.value!.skip?.includes(p.id)) } : g))

/** The page's record templates (v24, item 6): under «Шаблоны» after the top rows; a query finds them by name */
const templates = computed(() => {
  const list = ui.picker?.templates?.list ?? []
  const query = fold(q.value.trim())
  return query ? list.filter(t => fold(t.name).includes(query)) : list
})
function pickTemplate(id: string) {
  const run = ui.picker?.templates?.run
  ui.picker = null
  run?.(id)
}

const nothing = computed(() => !!q.value.trim() && !groups.value.length && !templates.value.length)
const newName = computed(() => q.value.trim() ? capitalize(q.value) : ui.picker?.newName || '')
const exists = computed(() => !!newName.value && choosable.value.some(p => fold(p.title.trim()) === fold(newName.value)))
const thisPage = computed(() => ui.picker?.thisPage ? data.pages[ui.picker.thisPage] : undefined)

function pick(pageId: string) {
  // «Откуда записи»: a tap adds or removes the page, and the picker stays
  if (multi.value) return multi.value.toggle(pageId)
  const run = ui.picker?.run
  const here = pageId === ui.picker?.current
  ui.picker = null
  // The page the records are on: a tap only closes the picker
  if (!here) run?.({ pageId })
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

const row = 'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base hover:bg-muted active:bg-pressed lg:min-h-11 lg:gap-2.5 lg:px-2 lg:text-15'
</script>

<template>
  <component
    :is="container.is"
    v-bind="container.props"
    v-model:open="open"
  >
    <template #content>
      <div
        class="flex flex-col"
        :class="anchor ? 'max-h-[min(30rem,var(--reka-popover-content-available-height))] px-2 pt-3 pb-2' : 'max-h-[85dvh] max-lg:h-[85dvh] lg:max-h-[70dvh]'"
      >
        <!-- No × (v23, F18): a tap outside, a swipe down or Esc closes it -->
        <div
          class="flex shrink-0 items-start gap-2"
          :class="anchor ? 'pr-2 pb-2.5 pl-2' : 'min-h-11 pr-6 pl-6 lg:pt-3 lg:pr-5 lg:pl-5'"
        >
          <div
            class="min-w-0 flex-1"
            :class="anchor ? '' : 'lg:py-1.5'"
          >
            <h2
              class="leading-snug text-highlighted"
              :class="anchor ? 'text-15 font-semibold' : 'text-sheet'"
            >
              {{ ui.picker?.title }}
            </h2>
            <p
              v-if="ui.picker?.subtitle"
              class="truncate text-sm text-toned"
            >
              {{ ui.picker.subtitle }}
            </p>
          </div>
        </div>
        <div
          class="shrink-0"
          :class="anchor ? 'px-1 pb-1' : 'px-3 pt-2 pb-1 lg:pt-1'"
        >
          <UInput
            ref="field"
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
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          :class="anchor ? 'pb-1' : 'px-1 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:px-2'"
          data-vaul-no-drag
        >
          <ul
            v-if="!q.trim() && (ui.picker?.auto || thisPage)"
            class="pt-1"
          >
            <!-- «Эта страница · Задачи ✓» first, then Авто (v24, item 6) -->
            <li v-if="thisPage">
              <button
                type="button"
                :class="row"
                @click="pick(thisPage.id)"
              >
                <PageTile
                  :glyph="thisPage.glyph"
                  :color="pageColor(thisPage)"
                  tint
                />
                <span class="min-w-0 flex-1 truncate text-highlighted">Эта страница</span>
                <span class="max-w-40 shrink-0 truncate text-meta text-toned">{{ thisPage.title || 'Без названия' }}</span>
                <UIcon
                  v-if="ui.picker?.chosen === thisPage.id"
                  name="i-lucide-check"
                  class="size-4.5 shrink-0 text-accent"
                />
              </button>
            </li>
            <li v-if="ui.picker?.auto">
              <button
                type="button"
                :class="row"
                @click="auto"
              >
                <UIcon
                  name="cer:auto"
                  class="size-4.5 shrink-0 text-toned"
                />
                <span class="min-w-0 flex-1 truncate text-highlighted">Авто</span>
                <!-- What Авто does, in its own words (v23: «разложится по страницам», never «описание») -->
                <span class="max-w-48 shrink-0 truncate text-meta text-toned">{{ ui.picker.auto.picks ? `сейчас → ${ui.picker.auto.picks}` : 'разложится по страницам' }}</span>
                <UIcon
                  v-if="ui.picker.auto.chosen"
                  name="i-lucide-check"
                  class="size-4.5 text-accent"
                />
              </button>
            </li>
          </ul>
          <ul
            v-if="!q.trim() && picked.length"
            class="pt-1"
            aria-label="Выбраны"
          >
            <li
              v-for="p in picked"
              :key="p.id"
            >
              <button
                type="button"
                class="text-highlighted"
                :class="row"
                aria-pressed="true"
                @click="pick(p.id)"
              >
                <PageTile
                  :glyph="p.glyph"
                  :color="pageColor(p)"
                  tint
                />
                <span class="min-w-0 flex-1 truncate">{{ p.title || 'Без названия' }}</span>
                <UIcon
                  name="i-lucide-check"
                  class="size-4.5 text-accent"
                />
              </button>
            </li>
          </ul>
          <section
            v-if="templates.length"
            aria-label="Шаблоны"
          >
            <h3
              class="pb-1 text-cap text-toned"
              :class="anchor ? 'px-2 pt-2.5' : 'px-3 pt-4.5 lg:pt-3'"
            >
              Шаблоны
            </h3>
            <ul>
              <li
                v-for="t in templates"
                :key="t.id"
              >
                <button
                  type="button"
                  :class="row"
                  @click="pickTemplate(t.id)"
                >
                  <UIcon
                    name="cer:stamp"
                    class="size-4.5 shrink-0 text-toned"
                  />
                  <span class="min-w-0 flex-1 truncate text-highlighted">{{ t.name }}</span>
                  <span class="max-w-48 shrink-0 truncate text-meta text-toned">{{ t.brings }}</span>
                  <UIcon
                    v-if="ui.picker?.templates?.chosen === t.id"
                    name="i-lucide-check"
                    class="size-4.5 shrink-0 text-accent"
                  />
                </button>
              </li>
            </ul>
          </section>
          <section
            v-for="g in groups"
            :key="g.label"
            :aria-label="g.label"
          >
            <h3
              class="pb-1 text-cap text-toned"
              :class="anchor ? 'px-2 pt-2.5' : 'px-3 pt-4.5 lg:pt-3'"
            >
              {{ g.label }}
            </h3>
            <ul>
              <li
                v-for="p in g.pages"
                :key="p.id"
              >
                <button
                  type="button"
                  class="text-highlighted"
                  :class="row"
                  :aria-current="p.id === ui.picker?.current || undefined"
                  :aria-pressed="multi ? multi.picked().includes(p.id) : undefined"
                  @click="pick(p.id)"
                >
                  <PageTile
                    :glyph="p.glyph"
                    :color="pageColor(p)"
                    tint
                  />
                  <span class="min-w-0 flex-1 truncate">{{ p.title || 'Без названия' }}</span>
                  <UIcon
                    v-if="p.id === ui.picker?.current || p.id === ui.picker?.chosen || multi?.picked().includes(p.id)"
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
            class="pt-4 pb-2 text-meta text-toned"
            :class="anchor ? 'px-2' : 'px-3'"
          >
            Ничего не нашлось
          </p>
          <button
            v-if="!exists && !multi"
            type="button"
            class="mt-1 text-accent-ink"
            :class="row"
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
