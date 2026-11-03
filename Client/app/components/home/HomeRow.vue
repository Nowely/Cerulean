<script setup lang="ts">
// A page on Главная (main flow, items 17, 18). «Со сводкой»: a card, like a letter in Mail or a chat in Telegram: the
// glyph on a 36px plate, the name with how many are open right after it (Josh 28 Oct, 7), and under it what is in the
// page, cut where the line ends. An empty page is its name alone. No dot for what is new (Josh 28 Oct, 2): the tint after
// a send says where it went. «Компактный»: a plain 44px list, glyph and name.
// The row's right end belongs to the page «⋯» (hover and keyboard focus on desktop); on a phone a long press opens it.
// On a computer the open card and hovered card use different surfaces; a fresh record accents the glyph without a plate.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from '#imports'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { useSide } from '~/composables/useSide'
import { useOpenCard } from '~/composables/useRightPage'
import { cardLine, type CardLine } from '~/domain/summary'
import { lowerFirst } from '~/domain/text'
import DotsButton from '../common/DotsButton.vue'
import PageMenu from '../page/PageMenu.vue'
import SectionSheet from '../page/SectionSheet.vue'
import HomeRowContent from './HomeRowContent.vue'
import HomeHoldMenu from './HomeHoldMenu.vue'

const props = defineProps<{
  page?: Page
  rec?: Rec
  compact?: boolean
  dragShift?: number
  dragging?: boolean
}>()
const emit = defineEmits<{
  dragStart: [page: Page, x: number, y: number, height: number]
  dragMove: [x: number, y: number]
  dragEnd: []
  dragCancel: []
}>()
const data = useDataStore()
const ui = useUiStore()
const now = useNow()
const router = useRouter()
const { isDesktop } = useScreen()
const side = useSide()
const openCard = useOpenCard()
/** The page or favourite record open on the right is marked, and stays so under the pointer */
const selected = computed(() => side && openCard.value === (props.page?.id ?? props.rec?.id))

const to = computed(() => props.page ? `/p/${props.page.id}` : `/r/${props.rec!.id}`)
const name = computed(() => props.page ? props.page.title || 'Без названия' : props.rec!.text)
const glyph = computed(() => props.page ? props.page.glyph : props.rec!.glyph ?? 'doc')
const card = computed<CardLine>(() => {
  if (props.page) return cardLine(props.page, data.recordsOf(props.page.id), now.value, data.liveRecords)
  // A starred record: its open subitems, as a page's records
  const open = data.subitemsOf(props.rec!.id).filter(r => !r.done)
  return { line: open.map(r => lowerFirst(r.text)).join(', '), open: open.length || null, isNew: false, late: 0 }
})
/** Сегодня keeps today's warn signal for overdue, in the number's place (item 17); compact keeps the corner dot */
const late = computed(() => card.value.late ? { text: `${card.value.late} просрочено`, tone: 'warn' as const } : null)

// ---------- the fresh tint after a send from Главная's field (item 9): 4 s, then a 1 s fade ----------

const lit = ref(false)
const freshGlyph = ref(false)
let timers: ReturnType<typeof setTimeout>[] = []
function clear() {
  timers.forEach(clearTimeout)
  timers = []
}
watch(() => props.page ? ui.freshPages[props.page.id] : undefined, (at) => {
  clear()
  const gone = at ? Date.now() - at : Infinity
  lit.value = gone < 5000
  freshGlyph.value = gone < 4000
  if (lit.value) timers.push(setTimeout(() => lit.value = false, 5000 - gone))
  if (freshGlyph.value) timers.push(setTimeout(() => freshGlyph.value = false, 4000 - gone))
}, { immediate: true })
onBeforeUnmount(clear)
/** In the left column the glyph fades over the second after its fresh state (4 s + 1 s). */
const fading = computed(() => lit.value && !freshGlyph.value)

const menuOpen = ref(false)
const holdOpen = ref(false)
const moving = ref(false)
const sectionSheetUsed = ref(false)
const holdRect = ref<DOMRect | null>(null)
function moveSection() {
  holdOpen.value = false
  sectionSheetUsed.value = true
  moving.value = true
}
let timer: ReturnType<typeof setTimeout> | undefined
let pressed = false
let start: { x: number, y: number } | null = null
const offset = ref<{ x: number, y: number } | null>(null)
function down(e: PointerEvent) {
  pressed = false
  if (isDesktop.value || !props.page || e.pointerType === 'mouse') return
  start = { x: e.clientX, y: e.clientY }
  const row = (e.currentTarget as HTMLElement).parentElement
  timer = setTimeout(() => {
    if (!row) return
    pressed = true
    holdRect.value = row.getBoundingClientRect()
    holdOpen.value = true
    navigator.vibrate?.(10)
  }, 400)
}
function move(e: PointerEvent) {
  if (!start) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  const distance = Math.hypot(dx, dy)
  if (!pressed && distance > 8) clearTimeout(timer)
  if (!pressed || props.page?.kind !== 'page' || (distance <= 6 && !offset.value)) return
  if (!offset.value) emit('dragStart', props.page, e.clientX, e.clientY, holdRect.value?.height ?? 0)
  offset.value = { x: dx, y: dy }
  emit('dragMove', e.clientX, e.clientY)
}
function up() {
  clearTimeout(timer)
  start = null
  if (offset.value) {
    emit('dragEnd')
    offset.value = null
    holdOpen.value = false
  }
}
function cancel() {
  clearTimeout(timer)
  start = null
  if (offset.value) {
    emit('dragCancel')
    offset.value = null
    holdOpen.value = false
  }
}
function click(e: MouseEvent) {
  e.preventDefault()
  if (pressed) {
    pressed = false
    return
  }
  void router.push(to.value)
}
onBeforeUnmount(() => {
  clearTimeout(timer)
})
</script>

<template>
  <!-- Lit by hover and keyboard focus only: focus given back by a closed sheet leaves it plain (v23, F18) -->
  <div
    role="listitem"
    class="group/row relative flex items-center rounded-card motion-safe:transition-transform motion-safe:duration-180"
    :class="[
      compact ? '' : 'not-first:mt-0.5',
      !side ? 'hover:bg-muted has-focus-visible:bg-muted' : selected ? 'bg-side-sel' : 'hover:bg-side-hover has-focus-visible:bg-side-hover',
      { 'fresh-tint': lit && !side, 'opacity-0': dragging }
    ]"
    :data-fresh="lit || undefined"
    :data-home-page="page?.id"
    :style="dragShift ? { transform: `translateY(${dragShift}px)` } : undefined"
    :aria-current="selected ? 'page' : undefined"
  >
    <a
      :href="to"
      class="flex min-w-0 flex-1 select-none items-center gap-3 rounded-card px-2 text-left [-webkit-touch-callout:none] active:bg-pressed"
      :class="compact ? 'min-h-11' : 'min-h-15 py-2'"
      @click="click"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="cancel"
      @contextmenu="page && !isDesktop && $event.preventDefault()"
    >
      <HomeRowContent
        :page="page"
        :glyph="glyph"
        :name="name"
        :card="card"
        :compact="compact"
        :late="late"
        :side="side"
        :fresh-glyph="freshGlyph"
        :fading="fading"
      />
    </a>
    <PageMenu
      v-if="page && page.kind !== 'today'"
      v-model:open="menuOpen"
      :page="page"
      home
      :bare="!isDesktop"
    >
      <!-- Desktop: over the row's right end on hover or keyboard focus, so the number keeps its place at rest; a click on a
           card leaves its link focused, and the open page's card shows no «⋯» for it (computer delta, ДГ1) -->
      <DotsButton
        label="Действия со страницей"
        class="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 group-has-focus-visible/row:opacity-100 aria-expanded:opacity-100"
        :class="!side ? 'bg-muted' : selected ? 'bg-side-sel' : 'bg-side-hover'"
      />
    </PageMenu>
    <HomeHoldMenu
      v-if="page && holdOpen && holdRect"
      :page="page"
      :rect="holdRect"
      :to="to"
      :compact="compact"
      :offset="offset"
      @close="holdOpen = false"
      @move="moveSection"
    >
      <HomeRowContent
        :page="page"
        :glyph="glyph"
        :name="name"
        :card="card"
        :compact="compact"
        :late="late"
        :side="side"
        :fresh-glyph="freshGlyph"
        :fading="fading"
      />
    </HomeHoldMenu>
    <SectionSheet
      v-if="page && sectionSheetUsed"
      v-model:open="moving"
      :page="page"
    />
  </div>
</template>
