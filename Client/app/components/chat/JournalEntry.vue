<script setup lang="ts">
// One line of Журнал: what was written with its time at the end of the line, then its card at the full width
import type { Entry } from '~/domain/types'
import { clock } from '~/domain/dates'
import EntryCard from './EntryCard.vue'

defineProps<{ entry: Entry }>()
</script>

<template>
  <article
    class="flex flex-col gap-2 py-2.5"
    :aria-label="`${clock(entry.at)}: ${entry.text}`"
  >
    <div class="flex items-baseline gap-3 pr-0.5 lg:px-1">
      <p class="min-w-0 flex-1 text-body leading-snug text-highlighted">
        {{ entry.text }}
      </p>
      <time
        class="shrink-0 text-13 text-dimmed tabular-nums"
        :datetime="new Date(entry.at).toISOString()"
      >{{ clock(entry.at) }}</time>
    </div>
    <EntryCard :entry="entry" />
  </article>
</template>
