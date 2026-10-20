<script setup lang="ts">
// Three kinds only: warn words («1 просрочено»), accent-soft («2 уточнить», «1 новая»), a neutral counter
import type { Badge } from '~/domain/summary'

defineProps<{ badge: Badge }>()
</script>

<template>
  <span
    class="inline-flex h-5.5 shrink-0 items-center whitespace-nowrap text-caption tabular-nums lg:h-5"
    :class="{
      'text-warn-ink': badge.tone === 'warn',
      'rounded-badge bg-accent-soft px-1.75 text-accent-ink': badge.tone === 'accent',
      'min-w-5 justify-center rounded-full bg-elevated px-1.5 text-xs text-highlighted': badge.tone === 'neutral'
    }"
  >{{ badge.text }}</span>
</template>
