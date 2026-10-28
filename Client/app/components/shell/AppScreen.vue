<script setup lang="ts">
// A screen: header, one scrolling area with soft fades (16px under the header, 20px above the composer), the dock.
// The notice slot is right above the dock's cards and composer, or the screen's foot when it has no dock.
// While a body on it has focus the edges are hard (v23, F6): no fade, the header and the bar's dock opaque.
// While the dock shows the guess line or the «@» row (v24, item 14) the list ends at a hard edge above it: the dock's top
// padding is open, so the list runs on under it to the guess line, and the dock's surface covers whatever that edge would cut.
// With the keys up the dock sits 8 above them, as drawn. While a body is edited on a phone the dock's surface also covers a
// line its edge would cut when the body could not settle on whole lines (a long note with the caret near its top).
import { computed, nextTick, onBeforeUnmount, provide, ref, useTemplateRef, watch } from 'vue'
import { useScroll } from '@vueuse/core'
import NoticeSlot from './NoticeSlot.vue'
import { useBodyEditing } from '~/composables/useBodyEditing'
import { coverHeight, DOCK_LINE } from '~/composables/useDockEdge'
import { useScreen } from '~/composables/useScreen'
import { useSide } from '~/composables/useSide'

/** The dock's column: Главная 720, Журнал 640, pages 680 */
const props = withDefaults(defineProps<{ wide?: boolean, chat?: boolean }>(), { wide: false, chat: false })
const scroller = useTemplateRef<HTMLElement>('scroller')
const { arrivedState, measure: measureEnds } = useScroll(scroller)
// The ends move without a scroll too: the dock grows (a receipt docks, the keys come up) or rows come and go. useScroll
// only looks again on a scroll, so a list that fitted kept «at the bottom» and lost its fade
// A chat (Журнал) read at its end stays at its end while the dock grows (the «@» row, a docked card), as a feed does
let atEnd = true
const endOf = (el: HTMLElement) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2
let resized: ResizeObserver | null = null
watch(scroller, (el) => {
  resized?.disconnect()
  if (!el) return
  atEnd = endOf(el)
  el.addEventListener('scroll', () => {
    atEnd = endOf(el)
  }, { passive: true })
  resized = new ResizeObserver(() => {
    if (props.chat && atEnd) el.scrollTop = el.scrollHeight
    measureEnds()
  })
  resized.observe(el)
  for (const child of el.children) resized.observe(child)
}, { immediate: true, flush: 'post' })
const body = useBodyEditing()
const hard = computed(() => body.on('main'))
const fadeTop = computed(() => !arrivedState.top && !hard.value)
const column = computed(() => props.wide ? 'lg:max-w-180' : props.chat ? 'lg:max-w-160' : 'lg:max-w-170')

// ---------- the dock's hard edge (v24, item 14) ----------

const dockLine = ref(false)
provide(DOCK_LINE, dockLine)
const { isDesktop } = useScreen()
/** The computer's left column: the phone's dock on the column's surface, and the one notice slot (computer delta, item 11) */
const side = useSide()
/** On a computer the notice shows above Главная's field only; the open page on the right has no slot of its own */
const notices = computed(() => side || !isDesktop.value)
/** The dock's surface reaches up: over the guess line's edge, or over the editing bar's on a phone */
const covering = computed(() => dockLine.value || (hard.value && !isDesktop.value))
const fadeBottom = computed(() => !arrivedState.bottom && !hard.value && !dockLine.value)
/** How far the dock's surface reaches up over the list */
const cover = ref(0)
let frame = 0
function measure() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const el = scroller.value
    cover.value = el && covering.value ? coverHeight(el) : 0
  })
}
let sized: ResizeObserver | null = null
watch([covering, scroller], ([on, el]) => {
  sized?.disconnect()
  sized = null
  el?.removeEventListener('scroll', measure)
  if (!on || !el) {
    cover.value = 0
    return
  }
  el.addEventListener('scroll', measure, { passive: true })
  // The body grows and shrinks as it is typed in, the scroll area with the keys
  sized = new ResizeObserver(measure)
  sized.observe(el)
  for (const child of el.children) sized.observe(child)
  void nextTick(measure)
})
onBeforeUnmount(() => {
  resized?.disconnect()
  cancelAnimationFrame(frame)
  sized?.disconnect()
  scroller.value?.removeEventListener('scroll', measure)
})

defineExpose({ scroller })
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col">
    <slot name="header" />
    <div
      ref="scroller"
      class="scroll-fade min-h-0 flex-1 overflow-y-auto"
      :data-fade-top="fadeTop || undefined"
      :data-fade-bottom="($slots.dock && fadeBottom) || undefined"
    >
      <slot />
      <!-- Room under the last row while a body has focus, so the edges can settle on whole lines at the end too -->
      <div
        v-if="hard"
        class="h-10 lg:hidden"
        aria-hidden="true"
      />
    </div>
    <div
      v-if="$slots.dock"
      class="relative shrink-0 pt-1.5"
      :class="[
        side ? 'px-3 pb-4' : 'px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] max-lg:[[data-keyboard]_&]:pb-2 lg:px-8 lg:pb-5',
        dockLine ? 'z-3 -mt-1.5' : covering ? 'z-3' : ''
      ]"
    >
      <div
        v-if="covering && cover"
        class="pointer-events-none absolute inset-x-0"
        :class="[side ? 'bg-side' : 'bg-canvas', dockLine ? 'bottom-[calc(100%-6px)]' : 'bottom-full']"
        :style="{ height: `${cover}px` }"
        aria-hidden="true"
        data-dock-cover
      />
      <div
        class="mx-auto w-full"
        :class="side ? '' : column"
      >
        <NoticeSlot v-if="notices" />
        <div class="flex flex-col gap-2">
          <slot name="dock" />
        </div>
      </div>
    </div>
    <div
      v-else-if="notices"
      class="shrink-0 px-4 lg:px-8"
    >
      <NoticeSlot
        place="bare"
        class="mx-auto w-full"
        :class="column"
      />
    </div>
  </div>
</template>
