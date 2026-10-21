<script setup lang="ts">
// Where this screen or sheet shows the notice (useNotify): only the top slot on screen shows it. A screen's slot is
// right above its composer or docked card, in the flow, so it never covers the list; a sheet's is the sheet's foot,
// under its content. On a phone the notice is the width of the column and wraps to two lines; on desktop it sits at
// the column's right with «·» before its action and a drain line along its bottom, and rises over a dialog's scrim.
import { computed, onBeforeUnmount, watch } from 'vue'
import { useUiStore } from '~/stores/ui'
import { useNoticeSlot } from '~/composables/useNotify'

const props = withDefaults(defineProps<{
  /** dock: above the composer; bare: the foot of a screen without one; sheet: the foot of an open sheet */
  place?: 'dock' | 'bare' | 'sheet'
  active?: boolean
}>(), { place: 'dock', active: true })

const ui = useUiStore()
const slot = useNoticeSlot(props.place === 'sheet' ? 1 : 0, () => props.active)
const notice = computed(() => slot.shows.value ? ui.notice : null)
/** The drain line starts where the clock is, read once when the notice comes here */
const drained = computed(() => notice.value ? slot.elapsed() : 0)
// The notice left this slot or was replaced: what held it here lets go
watch(() => notice.value?.id, (now, before) => {
  if (before) slot.release()
})
onBeforeUnmount(() => {
  if (notice.value) slot.release()
})

const pad = {
  dock: 'pb-2 lg:pb-2.5',
  bare: 'pt-1.5 pb-[max(env(safe-area-inset-bottom),1.25rem)] lg:pb-5',
  sheet: 'px-3 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]'
}
</script>

<template>
  <div
    role="status"
    :class="{ 'relative z-10': slot.lifted.value && place !== 'sheet' }"
  >
    <div
      v-if="notice"
      :key="notice.id"
      class="flex lg:justify-end"
      :class="pad[place]"
    >
      <div
        data-notice
        class="pointer-events-auto relative flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden rounded-card bg-inverted py-0.5 text-sm text-canvas shadow-float motion-safe:animate-rise lg:min-h-11 lg:max-w-full lg:flex-none lg:gap-1 lg:py-1.25 lg:pl-4"
        :class="notice.action ? 'pr-1 pl-3.5 lg:pr-1.25' : 'min-h-11 px-3.5 lg:pr-4'"
        @mouseenter="slot.hold('hover', true)"
        @mouseleave="slot.hold('hover', false)"
        @focusin="slot.hold('focus', true)"
        @focusout="slot.hold('focus', false)"
        @touchstart.passive="slot.hold('touch', true)"
        @touchend.passive="slot.hold('touch', false)"
        @touchcancel.passive="slot.hold('touch', false)"
      >
        <span class="line-clamp-2 min-w-0 flex-1 py-1.5 leading-snug lg:flex-initial lg:py-0.5">{{ notice.title }}</span>
        <template v-if="notice.action">
          <span
            class="hidden lg:inline"
            aria-hidden="true"
          >·</span>
          <button
            type="button"
            class="h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-item px-2.5 font-medium lg:h-8.5 lg:px-3 lg:underline lg:underline-offset-3 lg:hover:bg-canvas/10"
            @click="notice.action.run()"
          >
            {{ notice.action.label }}
          </button>
        </template>
        <span
          data-drain
          class="absolute inset-x-0 bottom-0 hidden h-0.5 origin-left bg-faint motion-safe:animate-drain lg:block lg:motion-reduce:hidden"
          :style="{ animationDuration: `${notice.duration}ms`, animationDelay: `-${drained}ms`, animationPlayState: slot.held.value ? 'paused' : 'running' }"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>
