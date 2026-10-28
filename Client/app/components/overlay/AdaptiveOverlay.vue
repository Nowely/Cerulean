<script setup lang="ts">
// One overlay, two containers: a bottom sheet on a phone; on desktop a popover next to its button,
// or a dialog when nothing on screen anchors it (opened from a menu). Until the overlay code is in
// (useLater) the trigger stands on its own; a tap opens the overlay once it is.
// A notice raised while it is open shows at the sheet's foot; over a desktop dialog it stays above the composer and
// rises over the scrim, and a click on it leaves the dialog open.
// One sheet pattern (v23, F18): no ×. A sheet has its grabber and closes by a tap outside, a swipe down or Esc; a
// popover or dialog by a click outside or Esc. `#close` is for the rare header button that does something else
// («Готово» of the property editor). A popover that opens downwards stops short of the notice's room over the composer,
// so a notice its choice raises shows whole there, never under it (v24 D8).
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'
import { useNoticeLift } from '~/composables/useNotify'
import { useUiStore } from '~/stores/ui'
import NoticeSlot from '../shell/NoticeSlot.vue'

const props = withDefaults(defineProps<{
  title: string
  /** What the overlay is about, under the title («Срок» of «Позвонить стоматологу») */
  subtitle?: string
  width?: string
  dialog?: boolean
  align?: 'start' | 'end'
  /** Desktop: the popover's side of its button; a composer's chip opens it above (v24) */
  side?: 'top' | 'bottom'
  /** The subtitle is a line under the title on a phone too («Свойство» / «Покупки»), not on its right */
  stacked?: boolean
  /** A question that waits for a choice («Загрузить копию»): an `alertdialog` */
  alert?: boolean
  /** Desktop: the element the popover stands at instead of its trigger (the page «⋯» it was opened from) */
  anchor?: HTMLElement | null
  /**
   * Desktop: a second level of the same popover («Фильтр» in «Настроить вид», v24 D5): ‹ before the title, and Esc
   * goes back here instead of closing; a click outside still closes both levels
   */
  back?: () => void
  /**
   * Desktop: the dialog is a window (computer delta, item 22; macOS sheets): 440 wide, centred, its top fixed 160 from the
   * window's top so it grows down and nothing moves when an error line comes; radius 16, padding 20/24/24, a 1px line2
   * edge in dark
   */
  windowed?: boolean
}>(), { subtitle: undefined, width: undefined, align: 'end', side: undefined, anchor: undefined, back: undefined, windowed: false })
// `closed`: the overlay is gone and focus is back, so the next one can open (a sheet that leads to another)
const emit = defineEmits<{ closed: [] }>()
const open = defineModel<boolean>('open', { default: false })
const { isDesktop } = useScreen()
const later = useLater()
const ui = useUiStore()
const notice = useNoticeLift(() => open.value && isDesktop.value && props.dialog)
// Set only when asked: an `undefined` role would take Reka's `dialog` away
const role = computed(() => props.alert ? { role: 'alertdialog' } : {})

function openNow() {
  open.value = true
  void later.load()
}

const reference = computed(() => props.anchor?.isConnected ? props.anchor : undefined)

/** A notice over the composer: 44 high, its 10 under it and 6 between it and the popover */
const NOTICE_ROOM = 60
const padding = ref<number | { top: number, right: number, bottom: number, left: number }>(12)
watch(open, (on) => {
  if (!on || !isDesktop.value || props.side === 'top') return
  let room = 0
  document.querySelectorAll('[data-notice-slot="dock"]').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width) room = Math.max(room, window.innerHeight - r.bottom + NOTICE_ROOM)
  })
  padding.value = room > 12 ? { top: 12, right: 12, bottom: room, left: 12 } : 12
}, { immediate: true })
function onEscape(e: KeyboardEvent) {
  if (!props.back) return
  e.preventDefault()
  props.back()
}
/** While a notice shows at a sheet's foot, the scroll area ends above it with a 24pt fade (v24 fixes, 17) */
const sheetNotice = useTemplateRef<{ showing: boolean }>('sheetNotice')
</script>

<template>
  <LazyUModal
    v-if="isDesktop && dialog"
    v-model:open="open"
    :title="title"
    :ui="{ content: windowed ? 'max-w-110 sm:max-w-110 top-40 translate-y-0 rounded-[16px] dark:ring-line2' : 'max-w-md' }"
    :content="{ ...role, onCloseAutoFocus: () => emit('closed'), onPointerDownOutside: notice.keep, onFocusOutside: notice.keep }"
  >
    <template #content>
      <!-- The notice above the composer is hidden from screen readers while the dialog is open: say it here too -->
      <p
        class="sr-only"
        role="status"
      >
        {{ ui.notice?.title }}
      </p>
      <div
        class="flex flex-col"
        :class="windowed ? 'max-h-[calc(100dvh-208px)]' : 'max-h-[70dvh]'"
        :data-phone-type="windowed || undefined"
      >
        <div
          class="flex min-h-11 shrink-0 items-center gap-2"
          :class="windowed ? 'px-6 pt-5 pb-2' : ['pt-3 pl-5', $slots.close ? 'pr-2' : 'pr-5']"
        >
          <div class="min-w-0 flex-1">
            <h2
              class="truncate text-highlighted"
              :class="windowed ? 'text-xl font-semibold tracking-[-.015em]' : 'text-sheet'"
            >
              {{ title }}
            </h2>
            <p
              v-if="subtitle && stacked"
              class="truncate text-sm text-toned"
            >
              {{ subtitle }}
            </p>
          </div>
          <slot name="close" />
        </div>
        <div
          class="min-h-0 flex-1 overflow-y-auto"
          :class="windowed ? 'px-4 pb-4' : ['px-3', $slots.footer ? 'pb-1' : 'pb-3']"
        >
          <slot />
        </div>
        <!-- Desktop only: what ends the dialog stays in view however long its content is (ListPropEdit) -->
        <div
          v-if="$slots.footer"
          class="flex shrink-0 items-center justify-between gap-2 px-5 pt-2 pb-4"
        >
          <slot name="footer" />
        </div>
      </div>
    </template>
  </LazyUModal>
  <LazyUPopover
    v-else-if="isDesktop && later.ready.value"
    v-model:open="open"
    :reference="reference"
    :content="{ side, align, sideOffset: 6, collisionPadding: padding, onCloseAutoFocus: () => emit('closed'), onEscapeKeyDown: onEscape }"
  >
    <slot name="trigger" />
    <template #content>
      <div
        class="flex max-h-[min(42rem,var(--reka-popover-content-available-height))] flex-col overflow-hidden"
        :class="width ?? 'w-96'"
      >
        <div
          class="flex shrink-0 items-start gap-2 pt-2.5 pr-4"
          :class="back ? 'pl-2' : 'pl-4'"
        >
          <UButton
            v-if="back"
            icon="i-lucide-chevron-left"
            variant="ghost"
            square
            aria-label="Назад"
            class="mt-1.5 shrink-0 text-toned"
            @click="back"
          />
          <div class="min-w-0 flex-1 py-1">
            <h2 class="truncate text-15 font-semibold text-highlighted">
              {{ title }}
            </h2>
            <p
              v-if="subtitle"
              class="truncate text-sm text-toned"
            >
              {{ subtitle }}
            </p>
          </div>
          <slot name="close" />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <slot />
        </div>
      </div>
    </template>
  </LazyUPopover>
  <template v-else>
    <span
      v-if="$slots.trigger"
      class="contents"
      @click="openNow"
    >
      <slot name="trigger" />
    </span>
    <LazyUDrawer
      v-if="!isDesktop && (later.ready.value || open)"
      v-model:open="open"
      :title="title"
      :content="{ ...role, onCloseAutoFocus: () => emit('closed') }"
    >
      <template #content>
        <div class="flex max-h-[85dvh] flex-col">
          <div
            class="flex min-h-11 shrink-0 items-center gap-2 pt-1 pl-6"
            :class="$slots.close ? 'pr-2' : 'pr-6'"
          >
            <div
              v-if="stacked"
              class="min-w-0 flex-1"
            >
              <h2 class="truncate text-sheet text-highlighted">
                {{ title }}
              </h2>
              <p
                v-if="subtitle"
                class="truncate text-sm text-toned"
              >
                {{ subtitle }}
              </p>
            </div>
            <template v-else>
              <h2 class="min-w-0 shrink-0 truncate text-sheet text-highlighted">
                {{ title }}
              </h2>
              <p
                class="min-w-0 flex-1 truncate text-right text-sm text-toned"
                :class="{ invisible: !subtitle }"
              >
                {{ subtitle }}
              </p>
            </template>
            <slot name="close" />
          </div>
          <div
            class="min-h-0 flex-1 overflow-y-auto px-2"
            :class="sheetNotice?.showing ? 'fade-foot pb-6' : 'pb-[max(env(safe-area-inset-bottom),1rem)]'"
          >
            <slot />
          </div>
          <NoticeSlot
            ref="sheetNotice"
            place="sheet"
            :active="open"
            class="shrink-0"
          />
        </div>
      </template>
    </LazyUDrawer>
  </template>
</template>
