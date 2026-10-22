<script setup lang="ts">
// A screen: header, one scrolling area with soft fades (16px under the header, 20px above the composer), the dock.
// The notice slot is right above the dock's cards and composer, or the screen's foot when it has no dock.
// While a body on it has focus the edges are hard (v23, F6): no fade, the header and the bar's dock opaque.
// While the dock shows the guess line or the «@» row (v24, item 14) the list ends at a hard edge above it: the dock's top
// padding is open, so the list runs on under it to the guess line, and the dock's surface covers whatever that edge would cut.
// With the keys up the dock sits 8 above them, as the composer is drawn there; the editing bar keeps v23's place, where the
// body's edges were set to settle on whole rows.
import { computed, nextTick, onBeforeUnmount, provide, ref, useTemplateRef, watch } from 'vue'
import { useScroll } from '@vueuse/core'
import NoticeSlot from './NoticeSlot.vue'
import { useBodyEditing } from '~/composables/useBodyEditing'
import { coverHeight, DOCK_LINE } from '~/composables/useDockEdge'

/** The dock's column: Главная 720, Журнал 640, pages 680 */
const props = withDefaults(defineProps<{ wide?: boolean, chat?: boolean }>(), { wide: false, chat: false })
const scroller = useTemplateRef<HTMLElement>('scroller')
const { arrivedState, measure: measureEnds } = useScroll(scroller)
// The ends move without a scroll too: the dock grows (a receipt docks, the keys come up) or rows come and go. useScroll
// only looks again on a scroll, so a list that fitted kept «at the bottom» and lost its fade
let resized: ResizeObserver | null = null
watch(scroller, (el) => {
  resized?.disconnect()
  if (!el) return
  resized = new ResizeObserver(() => measureEnds())
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
const fadeBottom = computed(() => !arrivedState.bottom && !hard.value && !dockLine.value)
/** How far the dock's surface reaches up over the list */
const cover = ref(0)
let frame = 0
function measure() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const el = scroller.value
    cover.value = el && dockLine.value ? coverHeight(el) : 0
  })
}
let sized: ResizeObserver | null = null
watch([dockLine, scroller], ([on, el]) => {
  sized?.disconnect()
  sized = null
  el?.removeEventListener('scroll', measure)
  if (!on || !el) {
    cover.value = 0
    return
  }
  el.addEventListener('scroll', measure, { passive: true })
  sized = new ResizeObserver(measure)
  sized.observe(el)
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
      class="scroll-fade min-h-0 flex-1 overflow-y-auto overscroll-contain"
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
      class="relative shrink-0 px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom),1.25rem)] lg:px-8 lg:pb-5"
      :class="{ 'z-3 -mt-1.5': dockLine, 'max-lg:[[data-keyboard]_&]:pb-2': !hard }"
    >
      <div
        v-if="dockLine && cover"
        class="pointer-events-none absolute inset-x-0 bottom-[calc(100%-6px)] bg-canvas"
        :style="{ height: `${cover}px` }"
        aria-hidden="true"
        data-dock-cover
      />
      <div
        class="mx-auto w-full"
        :class="column"
      >
        <NoticeSlot />
        <div class="flex flex-col gap-2">
          <slot name="dock" />
        </div>
      </div>
    </div>
    <div
      v-else
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
