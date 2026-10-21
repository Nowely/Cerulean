<script setup lang="ts">
// While Авто decides: «Разбирается…» and the words as sent with a small spinner, never grey bars (v22, N6).
// The words read as the row will: first letter capitalised (MobilePending)
import { capitalize } from '~/domain/text'

defineProps<{ text: string, float?: boolean }>()
</script>

<template>
  <div
    class="overflow-hidden rounded-card"
    :class="float ? 'raised bg-default shadow-float dark:ring dark:ring-inset dark:ring-line2' : 'bg-card'"
    role="status"
  >
    <div class="flex min-h-11 items-center gap-3 px-3 text-sm text-toned">
      <UIcon
        name="cer:auto"
        class="size-4.5 shrink-0"
      />Разбирается…
    </div>
    <div class="flex min-h-11 items-center gap-3 px-3 pb-1">
      <UIcon
        name="i-lucide-loader-circle"
        class="size-4.5 shrink-0 text-dimmed motion-safe:animate-spin"
      />
      <span class="min-w-0 flex-1 truncate text-15 text-highlighted">{{ capitalize(text) }}</span>
    </div>
  </div>
</template>
