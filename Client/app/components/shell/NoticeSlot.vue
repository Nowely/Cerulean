<script setup lang="ts">
// Where this screen or sheet shows the notice (useNotify): only the top slot on screen shows it. A screen's slot is
// right above its composer or docked card, in the flow, so it never covers the list; a sheet's is the sheet's foot,
// under its content. The notice is the width of the column, 48 high with or without its action, and wraps to two lines.
// A computer shows it only above Главная's field in the left column, the field's width, as on the phone, and it rises
// over a dialog's scrim (computer delta, items 11, 23).
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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
// The notice left this slot or was replaced: what held it here lets go
watch(() => notice.value?.id, (now, before) => {
  if (before) slot.release()
})
onBeforeUnmount(() => {
  if (notice.value) slot.release()
})

/** «Яйца → Молочное»: a long record name is cut, never where it went */
const moved = computed(() => {
  const at = notice.value?.title.lastIndexOf(' → ') ?? -1
  return notice.value && at > 0 ? { what: notice.value.title.slice(0, at), where: notice.value.title.slice(at + 3) } : null
})

// Over a desktop dialog the notice goes to the body, fixed where the slot is: the dialog's layer covers and hides
// everything inside the app, whatever its z-index
const box = ref<HTMLElement>()
const over = computed(() => !!notice.value && slot.lifted.value && props.place !== 'sheet')
const at = ref<Record<string, string>>({})
function measure() {
  const r = box.value?.getBoundingClientRect()
  if (r) at.value = { left: `${r.left}px`, width: `${r.width}px`, bottom: `${window.innerHeight - r.bottom}px` }
}
// Measured before the notice leaves: the slot's bottom is the composer's top either way
watch(over, (on) => {
  if (!on) return window.removeEventListener('resize', measure)
  measure()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))

const pad = {
  dock: 'pb-2',
  bare: 'pt-1.5 pb-[max(env(safe-area-inset-bottom),1.25rem)]',
  // A sheet's notice sits on its 22pt bottom, never over a row (v24 fixes, 17)
  sheet: 'px-3 pt-2 pb-[max(env(safe-area-inset-bottom),1.375rem)]'
}
/** The sheet fades its scroll area above the notice while it shows */
defineExpose({ showing: computed(() => !!notice.value) })
</script>

<template>
  <div
    ref="box"
    role="status"
    :data-notice-slot="place"
  >
    <Teleport
      to="body"
      :disabled="!over"
    >
      <div
        v-if="notice"
        :key="notice.id"
        class="flex"
        :class="[pad[place], { 'fixed z-10': over }]"
        :style="over ? at : undefined"
      >
        <!-- A press on it keeps the caret and the text's session: the editing bar stays, so the notice does not move
             from under the finger and the keys stay up (a record has no composer to hold the dock's height) -->
        <div
          data-notice
          data-body-keep
          class="pointer-events-auto relative flex min-h-12 min-w-0 flex-1 items-center gap-0.5 overflow-hidden rounded-card bg-inverted py-0.5 text-sm text-canvas shadow-float motion-safe:animate-rise"
          :class="notice.action ? 'pr-1 pl-3.5' : 'px-3.5'"
          @mouseenter="slot.hold('hover', true)"
          @mouseleave="slot.hold('hover', false)"
          @focusin="slot.hold('focus', true)"
          @focusout="slot.hold('focus', false)"
          @touchstart.passive="slot.hold('touch', true)"
          @touchend.passive="slot.hold('touch', false)"
          @touchcancel.passive="slot.hold('touch', false)"
        >
          <!-- The padding sits outside the clamp, or the clipped third line peeks through it -->
          <span class="min-w-0 flex-1 py-1.5 leading-snug">
            <span
              v-if="moved"
              class="flex min-w-0 items-baseline gap-1"
            >
              <!-- The space keeps «Яйца → Овощи» one phrase for screen readers and search; the gap draws it -->
              <span class="truncate">{{ moved.what }}</span>{{ ' ' }}<span class="shrink-0 whitespace-nowrap">→ {{ moved.where }}</span>
            </span>
            <span
              v-else
              class="line-clamp-2"
            >{{ notice.title }}</span>
          </span>
          <button
            v-if="notice.action"
            type="button"
            class="h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-item px-2.5 font-medium lg:hover:bg-canvas/10"
            @mousedown.prevent
            @click="notice.action.run()"
          >
            {{ notice.action.label }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
