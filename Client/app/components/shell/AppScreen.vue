<script setup lang="ts">
// A screen: header, one scrolling area with soft fades (16px under the header, 20px above the composer), the dock.
// The notice slot is right above the dock's cards and composer, or the screen's foot when it has no dock.
// While a body on it has focus the edges are hard (v23, F6): no fade, the header and the bar's dock opaque.
import { computed, useTemplateRef } from 'vue'
import { useScroll } from '@vueuse/core'
import NoticeSlot from './NoticeSlot.vue'
import { useBodyEditing } from '~/composables/useBodyEditing'

/** The dock's column: Главная 720, Журнал 640, pages 680 */
const props = withDefaults(defineProps<{ wide?: boolean, chat?: boolean }>(), { wide: false, chat: false })
const scroller = useTemplateRef<HTMLElement>('scroller')
const { arrivedState } = useScroll(scroller)
const body = useBodyEditing()
const hard = computed(() => body.on('main'))
const fadeTop = computed(() => !arrivedState.top && !hard.value)
const fadeBottom = computed(() => !arrivedState.bottom && !hard.value)
const column = computed(() => props.wide ? 'lg:max-w-180' : props.chat ? 'lg:max-w-160' : 'lg:max-w-170')
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
    </div>
    <div
      v-if="$slots.dock"
      class="relative shrink-0 px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom),1.25rem)] lg:px-8 lg:pb-5"
    >
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
