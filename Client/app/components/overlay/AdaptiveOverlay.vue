<script setup lang="ts">
// One overlay, two containers: a bottom sheet on a phone; on desktop a popover next to its button,
// or a dialog when nothing on screen anchors it (opened from a menu). Until the overlay code is in
// (useLater) the trigger stands on its own; a tap opens the overlay once it is.
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'

withDefaults(defineProps<{ title: string, width?: string, dialog?: boolean, align?: 'start' | 'end' }>(), { align: 'end' })
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
  >
    <template #content>
      <div class="flex max-h-[70dvh] flex-col">
        <div class="flex shrink-0 items-center gap-2 pt-3 pr-2 pl-5">
          <h2 class="min-w-0 flex-1 truncate text-sheet text-highlighted">
            {{ title }}
          </h2>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            square
            aria-label="Закрыть"
            @click="open = false"
          />
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
    :content="{ align, sideOffset: 6, collisionPadding: 12 }"
  >
    <slot name="trigger" />
    <template #content>
      <div
        class="flex max-h-[min(36rem,var(--reka-popover-content-available-height))] flex-col overflow-hidden"
        :class="width ?? 'w-96'"
      >
        <div class="flex shrink-0 items-center gap-2 pt-2.5 pr-1.5 pl-4">
          <h2 class="min-w-0 flex-1 truncate text-15 font-semibold text-highlighted">
            {{ title }}
          </h2>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            square
            size="sm"
            aria-label="Закрыть"
            @click="open = false"
          />
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
    >
      <template #content>
        <div class="flex max-h-[85dvh] flex-col">
          <div class="flex shrink-0 items-center gap-2 pt-1 pr-2 pl-6">
            <h2 class="min-w-0 flex-1 truncate text-sheet text-highlighted">
              {{ title }}
            </h2>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              square
              aria-label="Закрыть"
              @click="open = false"
            />
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <slot />
          </div>
        </div>
      </template>
    </LazyUDrawer>
  </template>
</template>
