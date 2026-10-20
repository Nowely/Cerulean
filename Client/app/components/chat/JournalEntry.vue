<script setup lang="ts">
// One line of Чат: the time, what was written, and its card
import type { Entry } from '~/domain/types'
import { clock } from '~/domain/dates'
import EntryCard from './EntryCard.vue'

defineProps<{ entry: Entry }>()
</script>

<template>
  <article
    class="flex gap-2.5 py-2.5"
    :aria-label="`${clock(entry.at)}: ${entry.text}`"
  >
    <time
      class="w-9.5 shrink-0 pt-0.5 text-13 text-dimmed tabular-nums"
      :datetime="new Date(entry.at).toISOString()"
    >{{ clock(entry.at) }}</time>
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <p class="text-body leading-snug text-highlighted">
        {{ entry.text }}
      </p>
      <EntryCard :entry="entry" />
    </div>
  </article>
</template>
