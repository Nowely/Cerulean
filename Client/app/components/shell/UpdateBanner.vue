<script setup lang="ts">
// «Есть новая версия · Обновить» (update-banner.md, U1): a new version has waited 30 minutes with the app in front. It sits
// where the notice does, over the closed field, the notice's geometry but quiet: --elev, a --line2 edge, no shadow. It
// never goes on its own; a drag sideways past a third of its width, or a flick, hides it until the next launch.
// «Обновить» switches at once; the field keeps its words through the reload (FlowField)
import { ref, useTemplateRef } from 'vue'
import { BANNER_SWIPE, bannerHidden } from '~/composables/useAppUpdate'

const emit = defineEmits<{ update: [] }>()

const box = useTemplateRef<HTMLElement>('box')
const dx = ref(0)
const dragging = ref(false)
let x0 = 0
let y0 = 0
let t0 = 0
let axis: 'x' | 'y' | null = null
let id: number | null = null

function down(e: PointerEvent) {
  if (!BANNER_SWIPE || (e.target as HTMLElement).closest('button')) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  id = e.pointerId
  x0 = e.clientX
  y0 = e.clientY
  t0 = performance.now()
  axis = null
}
function move(e: PointerEvent) {
  if (e.pointerId !== id) return
  const x = e.clientX - x0
  const y = e.clientY - y0
  if (!axis) {
    if (Math.abs(x) < 6 && Math.abs(y) < 6) return
    axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y'
    if (axis === 'y') return end()
    box.value?.setPointerCapture(e.pointerId)
    dragging.value = true
  }
  dx.value = x
}
function up(e: PointerEvent) {
  if (e.pointerId !== id) return
  const width = box.value?.offsetWidth ?? 1
  const speed = Math.abs(dx.value) / Math.max(1, performance.now() - t0)
  if (axis === 'x' && (Math.abs(dx.value) > width / 3 || speed > 0.6)) {
    dx.value = Math.sign(dx.value) * width * 1.2
    setTimeout(() => {
      bannerHidden.value = true
    }, 180)
  } else {
    dx.value = 0
  }
  end()
}
function end() {
  id = null
  axis = null
  dragging.value = false
}
</script>

<template>
  <div class="pb-2">
    <div
      ref="box"
      role="status"
      data-update-banner
      class="flex min-h-12 touch-pan-y items-center gap-2 rounded-card border border-line2 bg-elev py-px pr-0.75 pl-3.25 text-sm text-default motion-safe:animate-rise"
      :class="dragging ? '' : 'transition-transform duration-180'"
      :style="dx ? { transform: `translateX(${dx}px)`, opacity: String(1 - Math.min(0.6, Math.abs(dx) / ((box?.offsetWidth ?? 1) * 1.2))) } : undefined"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="dx = 0; end()"
    >
      <UIcon
        name="i-lucide-rotate-cw"
        class="size-4.5 shrink-0 text-toned"
      />
      <span class="min-w-0 flex-1 py-1.5 leading-snug">Есть новая версия</span>
      <button
        type="button"
        class="h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-item px-2.5 font-medium text-accent-ink lg:hover:bg-pressed"
        @mousedown.prevent
        @click="emit('update')"
      >
        Обновить
      </button>
    </div>
  </div>
</template>
