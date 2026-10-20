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
const { peek, target } = usePeek()
const hits = computed(() => (props.entry.hits ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && !r.deletedAt))
</script>

<template>
  <div
    class="overflow-hidden rounded-card"
    :class="float ? 'raised bg-default shadow-float dark:ring dark:ring-inset dark:ring-line2' : 'bg-card'"
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
        class="border-t border-canvas"
      >
        <RecordLine
          :rec="r"
          :selected="target?.kind === 'record' && target.id === r.id"
          @open="peek({ kind: 'record', id: r.id })"
        />
      </li>
    </ul>
    <div class="flex items-center gap-2 border-t border-canvas py-1 pr-1 pl-3">
      <span class="min-w-0 flex-1 text-caption font-normal text-toned">Если это дело, запиши его</span>
      <UButton
        variant="ghost"
        color="primary"
        size="lg"
        class="px-3"
        @click="journal.record(entry.id)"
      >
        Записать
      </UButton>
    </div>
  </div>
</template>
