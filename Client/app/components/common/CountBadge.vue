<script setup lang="ts">
// A status is plain 13px text on the title line, «число + слово», no fill: «просрочено» in warn and
// «уточнить» in accent-ink (both 500), neutral ones («1 новая», a repeated «просрочено») faint
import type { Badge } from '~/domain/summary'

defineProps<{ badge: Badge }>()
</script>

<template>
  <span
    class="shrink-0 whitespace-nowrap text-13 tabular-nums"
    :class="{
      'font-medium text-warn': badge.tone === 'warn',
      'font-medium text-accent-ink': badge.tone === 'accent',
      'text-dimmed': badge.tone === 'neutral'
    }"
  >{{ badge.text }}</span>
</template>
