<script setup lang="ts">
// A line that looks like a question goes to search first; «Записать» turns it into a record
import { computed } from 'vue'
import type { Entry, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { usePeek } from '~/composables/usePeek'
import RecordLine from '../record/RecordLine.vue'

const props = defineProps<{ entry: Entry, float?: boolean }>()
const data = useDataStore()
const journal = useJournalStore()
const { peek } = usePeek()
const hits = computed(() => (props.entry.hits ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && !r.deletedAt))
</script>

<template>
  <div
    class="overflow-hidden rounded-card border border-default bg-default [--row-bg:var(--ui-bg)]"
    :class="{ 'shadow-float': float }"
  >
    <p class="flex items-start gap-2 px-3 pt-2.75 pb-2.25 text-meta leading-snug text-toned">
      <UIcon
        name="i-lucide-search"
        class="mt-0.5 size-4 shrink-0"
      />
      <span v-if="hits.length">Похоже на вопрос, поэтому пока ничего не записано. Вот что нашлось:</span>
      <span v-else>Похоже на вопрос, поэтому пока ничего не записано. Ничего похожего не нашлось.</span>
    </p>
    <ul>
      <li
        v-for="r in hits"
        :key="r.id"
        class="border-t border-default"
      >
        <RecordLine
          :rec="r"
          @open="peek({ kind: 'record', id: r.id })"
        />
      </li>
    </ul>
    <div class="flex items-center gap-2 border-t border-default py-2 pr-2.5 pl-3">
      <span class="min-w-0 flex-1 text-caption font-normal text-toned">Если это дело, запиши его</span>
      <UButton @click="journal.record(entry.id)">
        Записать
      </UButton>
    </div>
  </div>
</template>
