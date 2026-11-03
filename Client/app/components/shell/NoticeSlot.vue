<script setup lang="ts">
// Where this screen or sheet shows the notice (useNotify): only the top slot on screen shows it. A screen's slot is
// right above its composer or docked card, in the flow, so it never covers the list; a sheet's is the sheet's foot,
// under its content. The notice is the width of the column, 48 high with or without its action, and wraps to two lines.
// A computer shows it only above Главная's field in the left column, the field's width, as on the phone, and it rises
// over a dialog's scrim (computer delta, items 11, 23).
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useUiStore } from '~/stores/ui'
import { useNoticeSlot } from '~/composables/useNotify'
import { useNoticeSwipe } from '~/composables/useNoticeSwipe'

const props = withDefaults(defineProps<{
  /** dock: above the composer; bare: the foot of a screen without one; sheet: the foot of an open sheet */
  place?: 'dock' | 'bare' | 'sheet'
  active?: boolean
}>(), { place: 'dock', active: true })

const ui = useUiStore()
const slot = useNoticeSlot(props.place === 'sheet' ? 1 : 0, () => props.active)
const notice = computed(() => slot.shows.value ? ui.notice : null)
const noticeBox = ref<HTMLElement>()
const swipe = useNoticeSwipe(noticeBox, () => notice.value?.id, (id) => {
  if (ui.notice?.id === id) ui.notice = null
})
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
function disableLeaving(el: Element) {
  if (el instanceof HTMLElement) el.inert = true
  el.querySelector('[data-notice]')?.removeAttribute('data-notice')
}
function enableEntering(el: Element) {
  if (el instanceof HTMLElement) el.inert = false
  el.querySelector('[data-body-keep]')?.setAttribute('data-notice', '')
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
      <Transition
        name="mf3-notice"
        @before-enter="enableEntering"
        @before-leave="disableLeaving"
      >
        <div
          v-if="notice"
          class="flex"
          :class="[pad[place], { 'fixed z-10': over }]"
          :style="over ? at : undefined"
        >
          <!-- A press on it keeps the caret and the text's session: the editing bar stays, so the notice does not move
             from under the finger and the keys stay up (a record has no composer to hold the dock's height) -->
          <div
            ref="noticeBox"
            data-notice
            data-body-keep
            data-vaul-no-drag
            class="pointer-events-auto relative flex min-h-12 min-w-0 flex-1 touch-pan-y items-center gap-0.5 overflow-hidden rounded-card bg-inverted py-0.5 text-sm text-canvas shadow-float"
            :class="[notice.action ? 'pr-1 pl-3.5' : 'px-3.5', { 'motion-safe:transition-[transform,opacity] motion-safe:duration-150': !swipe.dragging.value }]"
            :style="swipe.style.value"
            @pointerdown="swipe.down"
            @pointermove="swipe.move"
            @pointerup="swipe.up"
            @pointercancel="swipe.cancel"
            @click.capture="swipe.click"
            @touchmove.passive="swipe.touchMove"
            @mouseenter="slot.hold('hover', true)"
            @mouseleave="slot.hold('hover', false)"
            @focusin="slot.hold('focus', true)"
            @focusout="slot.hold('focus', false)"
            @touchstart.passive="slot.hold('touch', true); swipe.touchStart($event)"
            @touchend.passive="slot.hold('touch', false); swipe.touchEnd()"
            @touchcancel.passive="slot.hold('touch', false); swipe.touchEnd()"
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
      </Transition>
    </Teleport>
  </div>
</template>
