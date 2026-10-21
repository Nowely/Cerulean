<script setup lang="ts">
// One overlay, two containers: a bottom sheet on a phone; on desktop a popover next to its button,
// or a dialog when nothing on screen anchors it (opened from a menu). Until the overlay code is in
// (useLater) the trigger stands on its own; a tap opens the overlay once it is.
// A notice raised while it is open shows at the sheet's foot; over a desktop dialog it stays above the composer and
// rises over the scrim, and a click on it leaves the dialog open.
// One sheet pattern (v23, F18): no ×. A sheet has its grabber and closes by a tap outside, a swipe down or Esc; a
// popover or dialog by a click outside or Esc. `#close` is for the rare header button that does something else
// («Готово» of the property editor).
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
  /** The subtitle is a line under the title on a phone too («Свойство» / «Покупки»), not on its right */
  stacked?: boolean
}>(), { subtitle: undefined, width: undefined, align: 'end' })
// `closed`: the overlay is gone and focus is back, so the next one can open (a sheet that leads to another)
const emit = defineEmits<{ closed: [] }>()
const open = defineModel<boolean>('open', { default: false })
const { isDesktop } = useScreen()
const later = useLater()
const ui = useUiStore()
const notice = useNoticeLift(() => open.value && isDesktop.value && props.dialog)

function openNow() {
  open.value = true
  void later.load()
}
</script>

<template>
  <LazyUModal
    v-if="isDesktop && dialog"
    v-model:open="open"
    :title="title"
    :ui="{ content: 'max-w-md' }"
    :content="{ onCloseAutoFocus: () => emit('closed'), onPointerDownOutside: notice.keep, onFocusOutside: notice.keep }"
  >
    <template #content>
      <!-- The notice above the composer is hidden from screen readers while the dialog is open: say it here too -->
      <p
        class="sr-only"
        role="status"
      >
        {{ ui.notice?.title }}
      </p>
      <div class="flex max-h-[70dvh] flex-col">
        <div
          class="flex min-h-11 shrink-0 items-center gap-2 pt-3 pl-5"
          :class="$slots.close ? 'pr-2' : 'pr-5'"
        >
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-sheet text-highlighted">
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
        <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <slot />
        </div>
      </div>
    </template>
  </LazyUModal>
  <LazyUPopover
    v-else-if="isDesktop && later.ready.value"
    v-model:open="open"
    :content="{ align, sideOffset: 6, collisionPadding: 12, onCloseAutoFocus: () => emit('closed') }"
  >
    <slot name="trigger" />
    <template #content>
      <div
        class="flex max-h-[min(36rem,var(--reka-popover-content-available-height))] flex-col overflow-hidden"
        :class="width ?? 'w-96'"
      >
        <div class="flex shrink-0 items-start gap-2 pt-2.5 pr-4 pl-4">
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
      :content="{ onCloseAutoFocus: () => emit('closed') }"
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
          <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <slot />
          </div>
          <NoticeSlot
            place="sheet"
            :active="open"
            class="shrink-0"
          />
        </div>
      </template>
    </LazyUDrawer>
  </template>
</template>
