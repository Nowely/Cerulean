<script setup lang="ts">
// One overlay, two containers: a bottom sheet on a phone; on desktop a popover next to its button,
// or a dialog when nothing on screen anchors it (opened from a menu). Until the overlay code is in
// (useLater) the trigger stands on its own; a tap opens the overlay once it is.
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'

withDefaults(defineProps<{
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
    :content="{ onCloseAutoFocus: () => emit('closed') }"
  >
    <template #content>
      <div class="flex max-h-[70dvh] flex-col">
        <div class="flex shrink-0 items-center gap-2 pt-3 pr-2 pl-5">
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
          <slot name="close">
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              square
              aria-label="Закрыть"
              @click="open = false"
            />
          </slot>
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
        <div class="flex shrink-0 items-start gap-2 pt-2.5 pr-1.5 pl-4">
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
          <slot name="close">
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              square
              size="sm"
              aria-label="Закрыть"
              @click="open = false"
            />
          </slot>
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
          <div class="flex shrink-0 items-center gap-2 pt-1 pr-2 pl-6">
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
            <slot name="close">
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                square
                aria-label="Закрыть"
                @click="open = false"
              />
            </slot>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <slot />
          </div>
        </div>
      </template>
    </LazyUDrawer>
  </template>
</template>
