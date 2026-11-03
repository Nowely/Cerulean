<script setup lang="ts">
// A tap on the current tab opens its settings; a hold, right-click or menu key opens its menu.
// (instant, with «Отменить»; the last view cannot go). Tabs that do not fit scroll, and the strip fades over its
// last 32px, so the first tab is never cut and the icons beside the strip never move.
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { Id, Page, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import { LAYOUT_NAMES } from '~/domain/templates'
import { removePageView, undoPageView } from '~/domain/stock'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

const props = defineProps<{ page: Page, views: ViewDef[], current: ViewDef, readonly?: boolean }>()
const emit = defineEmits<{ select: [id: Id | null], settings: [], add: [anchor?: HTMLElement] }>()
const data = useDataStore()
const notify = useNotify()

const menuOpen = ref(false)
const items = computed<MenuItem[][]>(() => [
  [
    { label: 'Настроить вид', icon: 'i-lucide-sliders-horizontal', onSelect: () => emit('settings') },
    { label: 'Новый вид', icon: 'i-lucide-list-plus', onSelect: () => emit('add') }
  ],
  [
    props.views.length > 1
      ? { label: 'Удалить вид', icon: 'i-lucide-trash-2', danger: true, hint: 'Записи останутся на странице', onSelect: () => remove(props.current) }
      : { label: 'Удалить вид', icon: 'i-lucide-trash-2', disabled: true, hint: 'Это единственный вид страницы', onSelect: () => {} }
  ]
])

/** Instant, with «Отменить» that puts the views back as they were and selects the deleted one again */
function remove(view: ViewDef) {
  const pageId = props.page.id
  const page = data.pages[pageId]
  const result = page && removePageView(page, view.id)
  if (!result) return
  data.updatePage(pageId, { views: result.page.views, stocks: result.page.stocks })
  emit('select', null)
  notify(`Вид «${view.name}» удалён`, { label: 'Отменить', run: () => {
    const current = data.pages[pageId]
    const restored = current && undoPageView(current, result.removed)
    if (!restored) return
    data.updatePage(pageId, { views: restored.views, stocks: restored.stocks })
    if (props.page.id === pageId) emit('select', view.id)
  } })
}
defineExpose({ remove, currentTab: () => strip.value?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ?? null })

// ---------- opening the menu ----------

function tap(v: ViewDef) {
  if (pressed) {
    pressed = false
    return
  }
  if (v.id === props.current.id && !props.readonly) emit('settings')
  else emit('select', v.id)
}

async function menuFor(v: ViewDef) {
  if (props.readonly) return
  emit('select', v.id)
  await nextTick()
  menuOpen.value = true
}

// A long press on a phone: the menu of that tab; the click that follows must not toggle it again
let timer: ReturnType<typeof setTimeout> | undefined
let pressed = false
let start: { x: number, y: number } | null = null
function down(e: PointerEvent, v: ViewDef) {
  if (e.pointerType === 'mouse' || props.readonly) return
  pressed = false
  start = { x: e.clientX, y: e.clientY }
  timer = setTimeout(() => {
    pressed = true
    navigator.vibrate?.(10)
    void menuFor(v)
  }, 450)
}
function move(e: PointerEvent) {
  if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) clearTimeout(timer)
}
function up() {
  clearTimeout(timer)
  start = null
}
function key(e: KeyboardEvent, v: ViewDef) {
  if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
    e.preventDefault()
    void menuFor(v)
  }
}

// ---------- the fade at the end of a strip that scrolls ----------

const strip = useTemplateRef<HTMLElement>('strip')
const more = ref(false)
function measure() {
  const el = strip.value
  more.value = !!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}
onMounted(measure)
watch(() => props.views.map(v => v.name).join(), () => nextTick(measure))
</script>

<template>
  <div
    ref="strip"
    class="no-scrollbar flex min-w-0 flex-1 overflow-x-auto lg:gap-5.5"
    :class="{ 'fade-end': more }"
    role="tablist"
    aria-label="Виды"
    @scroll.passive="measure"
  >
    <template
      v-for="v in views"
      :key="v.id"
    >
      <div
        v-if="v.id === current.id && !readonly"
        class="relative shrink-0"
      >
        <ActionMenu
          v-model:open="menuOpen"
          :items="items"
          :title="v.name"
          :caption="LAYOUT_NAMES[v.layout].toLowerCase()"
          label="Меню вида"
          bare
          labelled
          divided
          align="start"
        >
          <button
            type="button"
            tabindex="-1"
            aria-hidden="true"
            class="pointer-events-none absolute inset-0"
          />
        </ActionMenu>
        <button
          type="button"
          role="tab"
          aria-selected="true"
          aria-haspopup="dialog"
          class="flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap border-b-2 border-accent px-3 text-15 font-medium text-highlighted lg:-mb-px lg:h-10 lg:px-0.5"
          @click="tap(v)"
          @pointerdown="down($event, v)"
          @pointermove="move"
          @pointerup="up"
          @pointercancel="up"
          @contextmenu.prevent="menuFor(v)"
          @keydown="key($event, v)"
        >
          {{ v.name }}
        </button>
      </div>
      <button
        v-else
        type="button"
        role="tab"
        :aria-selected="v.id === current.id"
        class="flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap border-b-2 px-3 text-15 lg:-mb-px lg:h-10 lg:px-0.5"
        :class="v.id === current.id ? 'border-accent font-medium text-highlighted' : 'border-transparent text-toned hover:text-highlighted'"
        @click="tap(v)"
        @pointerdown="down($event, v)"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @contextmenu.prevent="menuFor(v)"
        @keydown="key($event, v)"
      >
        {{ v.name }}
      </button>
    </template>
    <button
      v-if="!readonly"
      type="button"
      class="flex size-11 shrink-0 cursor-pointer items-center justify-center text-dimmed hover:text-highlighted"
      aria-label="Новый вид"
      aria-haspopup="dialog"
      @click="emit('add', $event.currentTarget as HTMLElement)"
    >
      <UIcon
        name="i-lucide-plus"
        class="size-5"
      />
    </button>
  </div>
</template>
