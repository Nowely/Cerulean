<script setup lang="ts">
// A screen: header, one scrolling area with soft fades (16px under the header, 20px above the composer), the dock
import { computed, useTemplateRef } from 'vue'
import { useScroll } from '@vueuse/core'

withDefaults(defineProps<{ wide?: boolean }>(), { wide: false })
const scroller = useTemplateRef<HTMLElement>('scroller')
const { arrivedState } = useScroll(scroller)
const fadeTop = computed(() => !arrivedState.top)
const fadeBottom = computed(() => !arrivedState.bottom)
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
      class="relative shrink-0 px-3 pt-1.5 pb-[max(env(safe-area-inset-bottom),1.25rem)] lg:px-8 lg:pb-5"
    >
      <div
        class="mx-auto flex w-full flex-col gap-2"
        :class="wide ? 'lg:max-w-180' : 'lg:max-w-170'"
      >
        <slot name="dock" />
      </div>
    </div>
  </div>
</template>
