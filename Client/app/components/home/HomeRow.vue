<script setup lang="ts">
// A page on Главная (main flow, items 17, 18). «Со сводкой»: a card, like a letter in Mail or a chat in Telegram: the
// glyph on a 36px plate, the name with how many are open at its right (Reminders, Things), and under it what is in the
// page, cut where the line ends. An empty page is its name alone. A dot means records written from elsewhere since the
// page was opened. «Компактный»: a plain 44px list, glyph and name, the dot at the right edge.
// The row's right end belongs to the page «⋯» (hover and keyboard focus on desktop); on a phone a long press opens it.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from '#imports'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { cardLine, type CardLine } from '~/domain/summary'
import { lowerFirst } from '~/domain/text'
import { pageColor } from '~/domain/look'
import PageTile from '../common/PageTile.vue'
import CountBadge from '../common/CountBadge.vue'
import DotsButton from '../common/DotsButton.vue'
import PageMenu from '../page/PageMenu.vue'

const props = defineProps<{
  page?: Page
  rec?: Rec
  compact?: boolean
}>()
const data = useDataStore()
const ui = useUiStore()
const now = useNow()
const router = useRouter()
const { isDesktop } = useScreen()

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
const plate = ref(false)
let timers: ReturnType<typeof setTimeout>[] = []
function clear() {
  timers.forEach(clearTimeout)
  timers = []
}
watch(() => props.page ? ui.freshPages[props.page.id] : undefined, (at) => {
  clear()
  const gone = at ? Date.now() - at : Infinity
  lit.value = gone < 5000
  plate.value = gone < 4000
  if (lit.value) timers.push(setTimeout(() => lit.value = false, 5000 - gone))
  if (plate.value) timers.push(setTimeout(() => plate.value = false, 4000 - gone))
}, { immediate: true })
onBeforeUnmount(clear)

// A long press on a phone opens the page menu; the click that follows it must not open the page
const menuOpen = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let pressed = false
function down(e: PointerEvent) {
  // A long press is followed by no click on most phones: any next press starts afresh
  pressed = false
  if (isDesktop.value || !props.page || e.pointerType === 'mouse') return
  timer = setTimeout(() => {
    pressed = true
    menuOpen.value = true
    navigator.vibrate?.(10)
  }, 500)
}
function up() {
  clearTimeout(timer)
}
function click(e: MouseEvent) {
  e.preventDefault()
  if (pressed) {
    pressed = false
    return
  }
  void router.push(to.value)
}
</script>

<template>
  <!-- Lit by hover and keyboard focus only: focus given back by a closed sheet leaves it plain (v23, F18) -->
  <div
    role="listitem"
    class="group/row relative flex items-center rounded-card hover:bg-muted has-focus-visible:bg-muted"
    :class="[compact ? '' : 'not-first:mt-0.5', { 'fresh-tint': lit }]"
    :data-fresh="lit || undefined"
  >
    <a
      :href="to"
      class="flex min-w-0 flex-1 select-none items-center gap-3 rounded-card px-2 text-left [-webkit-touch-callout:none] active:bg-pressed"
      :class="compact ? 'min-h-11' : 'min-h-15 py-2'"
      @click="click"
      @pointerdown="down"
      @pointerup="up"
      @pointercancel="up"
      @pointerleave="up"
      @contextmenu="page && !isDesktop && $event.preventDefault()"
    >
      <span
        v-if="!compact"
        class="flex size-9 shrink-0 items-center justify-center rounded-tile-lg transition-colors duration-1000"
        :class="plate ? 'bg-elev dark:bg-card' : 'bg-card dark:bg-chip'"
        data-plate
      >
        <PageTile
          :glyph="glyph"
          :color="pageColor(page)"
          :size="20"
          tint
        />
      </span>
      <span
        v-else
        class="relative flex size-4.5 shrink-0 items-center justify-center"
      >
        <PageTile
          :glyph="glyph"
          :color="pageColor(page)"
          tint
        />
        <span
          v-if="late"
          class="absolute -top-0.5 -right-0.75 size-2 rounded-full bg-warn ring-2 ring-canvas"
          role="img"
          :aria-label="late.text"
        />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-px">
        <span class="flex min-w-0 items-center gap-2">
          <span
            class="min-w-0 truncate text-base leading-5.5 font-medium text-highlighted"
            :class="{ 'text-dimmed': page && !page.title }"
            data-name
          >{{ name }}</span>
          <template v-if="card.isNew && (compact || !card.line)">
            <span
              class="ml-auto shrink-0 rounded-full bg-toned"
              :class="compact ? 'size-1.5' : 'size-2'"
              aria-hidden="true"
              data-new-dot
            />
            <span class="sr-only">есть новое</span>
          </template>
          <template v-if="!compact">
            <CountBadge
              v-if="late"
              :badge="late"
              class="ml-auto"
            />
            <span
              v-else-if="card.open"
              class="ml-auto shrink-0 text-15 leading-5 text-dimmed tabular-nums"
              data-open
            ><span class="sr-only">открытых: </span>{{ card.open }}</span>
          </template>
        </span>
        <span
          v-if="!compact && card.line"
          class="flex min-w-0 items-center gap-2.5"
        >
          <span
            class="min-w-0 flex-1 truncate text-sm leading-4.75 text-toned"
            data-line
          >{{ card.line }}</span>
          <template v-if="card.isNew">
            <span
              class="size-2 shrink-0 rounded-full bg-toned"
              aria-hidden="true"
              data-new-dot
            />
            <span class="sr-only">есть новое</span>
          </template>
        </span>
      </span>
    </a>
    <PageMenu
      v-if="page && page.kind !== 'today'"
      v-model:open="menuOpen"
      :page="page"
      home
      :bare="!isDesktop"
    >
      <!-- Desktop: over the row's right end on hover, so the number keeps its place at rest -->
      <DotsButton
        label="Действия со страницей"
        class="absolute top-1/2 right-1 -translate-y-1/2 bg-muted opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 aria-expanded:opacity-100"
      />
    </PageMenu>
  </div>
</template>
