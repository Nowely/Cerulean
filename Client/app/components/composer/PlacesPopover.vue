<script setup lang="ts">
// The places (main flow, item 6): a popover over the field's chip, 232px, 44px rows with the glyph and the name, a tick on
// the current one. Входящие, then the person's pages in Главная's order; never Сегодня and no search. With a model the
// field's list starts with «Авто», which hands the choice back to the model (Josh 28 Oct, 3). The list ends with
// «Новая страница»: a tap makes the row a name field, Enter makes the page and picks it (Josh 28 Oct, 8). The rows never
// take the focus, so a pick closes the list and the caret is back where it was; only the name field takes it.
// Входящие's move list (Josh 28 Oct, 10) is the same list under a row's move button: the model's place first, tinted.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import type { Id, Page } from '~/domain/types'
import { pageColor } from '~/domain/look'
import PageTile from '../common/PageTile.vue'

const props = withDefaults(defineProps<{
  pages: Page[]
  /** The ticked place; none while Авто chooses */
  current?: Id | null
  /** A row of the list: the popover stands at the right edge, over that row's chip */
  end?: boolean
  /** The field's list with a model: «Авто» first, ticked while the model chooses */
  auto?: { on: boolean } | null
  /** Under a Входящие row: the list opens below the button (above it when there is no room), at the right */
  below?: boolean
  /** The model's place for a Входящие row: the first row, tinted like the field's chip */
  suggested?: Id | null
  label?: string
}>(), { current: null, end: false, auto: null, below: false, suggested: null, label: 'Куда записать' })
const emit = defineEmits<{ pick: [Id], auto: [], create: [name: string], back: [], close: [] }>()

const box = useTemplateRef<HTMLElement>('box')
/** Room above the field, so the list scrolls instead of running under the status bar (item 26) */
const room = ref<number | null>(null)
/** Under a row: below it, unless there is more room above */
const up = ref(!props.below)
function measure() {
  const el = box.value?.parentElement
  if (!el) return
  const r = el.getBoundingClientRect()
  // The tallest status bar and notch is 59px, and 16 more keep it clear of the header's edge
  const above = r.top - 8 - 75
  if (!props.below) {
    room.value = Math.max(176, above)
    return
  }
  // The field and its dock take the screen's last 96px
  const below = window.innerHeight - r.bottom - 8 - 96
  const needs = (box.value?.scrollHeight ?? 0)
  up.value = below < needs && above > below
  room.value = Math.max(176, up.value ? above : below)
}
/** A press outside closes it; the chip's own press toggles it, so it is left to the chip */
function outside(e: PointerEvent) {
  const t = e.target as Element | null
  if (box.value?.contains(t) || t?.closest('[data-places-chip]')) return
  emit('close')
}
function key(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  e.stopPropagation()
  // Esc in the name field gives the row back; the list stays
  if (naming.value) return back()
  emit('close')
}
onMounted(() => {
  measure()
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('keydown', key, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('keydown', key, true)
})

const rows = computed(() => {
  const first = props.suggested ? props.pages.filter(p => p.id === props.suggested) : []
  return [...first, ...props.pages.filter(p => p.id !== props.suggested)]
    .map(p => ({ page: p, on: p.id === props.current, sug: p.id === props.suggested }))
})

// ---------- «Новая страница» ----------

const nameEl = useTemplateRef<HTMLInputElement>('nameEl')
/** The row is a name field: it got the focus from a tap, so a phone's keyboard stays up */
const naming = ref(false)
const name = ref('')
function back() {
  naming.value = false
  name.value = ''
  nameEl.value?.blur()
  emit('back')
}
function nameKey(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.isComposing) return
  e.preventDefault()
  const n = name.value.trim()
  if (!n) return back()
  naming.value = false
  name.value = ''
  emit('create', n)
}
function startNaming() {
  naming.value = true
  void nextTick(measure)
}
</script>

<template>
  <div
    ref="box"
    class="absolute z-5 w-58 overflow-y-auto overscroll-contain rounded-[14px] border border-line bg-elev p-1.5 shadow-float dark:border-line2"
    :class="[
      below ? (up ? 'right-1 bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)] right-1') : 'bottom-[calc(100%+8px)] lg:bottom-[calc(100%+6px)]',
      below ? '' : end ? 'right-0.5' : 'left-0.5'
    ]"
    :style="room ? { maxHeight: `${room}px` } : undefined"
    role="dialog"
    :aria-label="label"
    data-places
  >
    <button
      v-if="auto"
      type="button"
      class="flex h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left text-base text-highlighted active:bg-pressed lg:hover:bg-hover"
      :class="{ 'bg-sel': auto.on }"
      :aria-current="auto.on || undefined"
      data-place-auto
      @pointerdown.prevent
      @mousedown.prevent
      @click="emit('auto')"
    >
      <UIcon
        name="i-lucide-sparkles"
        class="size-4.5 shrink-0 text-toned"
      />
      <span class="min-w-0 flex-1 truncate">Авто</span>
      <UIcon
        v-if="auto.on"
        name="i-lucide-check"
        class="size-4.5 shrink-0 text-accent-ink"
      />
    </button>
    <button
      v-for="r in rows"
      :key="r.page.id"
      type="button"
      class="flex h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left text-base active:bg-pressed lg:hover:bg-hover"
      :class="r.sug ? 'bg-accent-soft text-accent-ink' : r.on ? 'bg-sel text-highlighted' : 'text-highlighted'"
      :aria-current="r.on || undefined"
      @pointerdown.prevent
      @mousedown.prevent
      @click="emit('pick', r.page.id)"
    >
      <PageTile
        :glyph="r.page.glyph"
        :color="pageColor(r.page)"
        tint
      />
      <span class="min-w-0 flex-1 truncate">{{ r.page.title || 'Без названия' }}</span>
      <UIcon
        v-if="r.on"
        name="i-lucide-check"
        class="size-4.5 shrink-0 text-accent-ink"
      />
    </button>
    <!-- One element for the row and its name field: the tap focuses it natively, so the keyboard never drops -->
    <label
      class="flex h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-base text-toned"
      :class="naming ? 'cursor-text inset-ring inset-ring-line2' : 'active:bg-pressed lg:hover:bg-hover'"
      data-place-new
    >
      <UIcon
        name="i-lucide-plus"
        class="size-4.5 shrink-0"
      />
      <span class="sr-only">Название новой страницы</span>
      <input
        ref="nameEl"
        v-model="name"
        class="h-10 min-w-0 flex-1 cursor-[inherit] bg-transparent text-highlighted outline-none"
        :class="naming ? 'placeholder:text-dimmed' : 'placeholder:text-toned'"
        style="caret-color: var(--accent)"
        :placeholder="naming ? 'Название' : 'Новая страница'"
        autocomplete="off"
        autocapitalize="sentences"
        enterkeyhint="done"
        @focus="startNaming"
        @blur="!name.trim() && (naming = false)"
        @keydown="nameKey"
      >
    </label>
  </div>
</template>
