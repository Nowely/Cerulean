<script setup lang="ts">
// «Есть новая версия · Обновить» (update-banner.md, U1): a new version has waited 30 minutes with the app in front. It sits
// where the notice does, over the closed field, the notice's geometry but quiet: --elev, a --line2 edge, no shadow. It
// never goes on its own; a drag sideways past a third of its width, or a flick, hides it until the next launch.
// «Обновить» switches at once; the field keeps its words through the reload (FlowField)
import { useTemplateRef } from 'vue'
import { BANNER_SWIPE, bannerHidden } from '~/composables/useAppUpdate'
import { useNoticeSwipe } from '~/composables/useNoticeSwipe'

const emit = defineEmits<{ update: [] }>()

const box = useTemplateRef<HTMLElement>('box')
const swipe = useNoticeSwipe(box, () => BANNER_SWIPE && !bannerHidden.value, () => {
  bannerHidden.value = true
})
</script>

<template>
  <div class="pb-2">
    <div
      ref="box"
      role="status"
      data-update-banner
      data-vaul-no-drag
      class="flex min-h-12 touch-pan-y items-center gap-2 rounded-card border border-line2 bg-elev py-px pr-0.75 pl-3.25 text-sm text-default motion-safe:animate-rise"
      :class="{ 'motion-safe:transition-[transform,opacity] motion-safe:duration-150': !swipe.dragging.value }"
      :style="swipe.style.value"
      @pointerdown="BANNER_SWIPE && swipe.down($event)"
      @pointermove="swipe.move"
      @pointerup="swipe.up"
      @pointercancel="swipe.cancel"
      @click.capture="swipe.click"
      @touchstart.passive="swipe.touchStart"
      @touchmove.passive="swipe.touchMove"
      @touchend.passive="swipe.touchEnd"
      @touchcancel.passive="swipe.touchEnd"
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
