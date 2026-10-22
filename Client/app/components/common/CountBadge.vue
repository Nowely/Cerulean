<script setup lang="ts">
// A status is plain 13px text on the title line, «число + слово», no fill: «просрочено» in warn and
// «уточнить» in accent-ink (both 500). «новых» is a 6px muted dot after the name; screen readers still hear it.
import type { Badge } from '~/domain/summary'

defineProps<{ badge: Badge }>()
</script>

<template>
  <span
    v-if="badge.tone === 'new'"
    class="flex shrink-0 items-center"
  >
    <span
      class="size-1.5 rounded-full bg-toned"
      aria-hidden="true"
    /><span class="sr-only">, {{ badge.text }}</span>
  </span>
  <span
    v-else
    class="shrink-0 whitespace-nowrap text-13 font-medium tabular-nums"
    :class="badge.tone === 'warn' ? 'text-warn' : 'text-accent-ink'"
  >{{ badge.text }}</span>
</template>
