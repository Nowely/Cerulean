<script setup lang="ts">
// One overlay, two containers: a bottom sheet on a phone; on desktop a popover next to its button,
// or a dialog when nothing on screen anchors it (opened from a menu)
import { useScreen } from '~/composables/useScreen'

defineProps<{ title: string, width?: string, dialog?: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const { isDesktop } = useScreen()
</script>

<template>
  <UModal
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
  </UModal>
  <UPopover
    v-else-if="isDesktop"
    v-model:open="open"
    :content="{ align: 'end', sideOffset: 6, collisionPadding: 12 }"
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
  </UPopover>
  <template v-else>
    <span
      v-if="$slots.trigger"
      class="contents"
      @click="open = true"
    >
      <slot name="trigger" />
    </span>
    <UDrawer
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
    </UDrawer>
  </template>
</template>
