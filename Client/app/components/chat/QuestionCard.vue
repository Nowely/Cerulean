<script setup lang="ts">
// Уточнение: «Куда положить «…»?» with the place chips (three guesses, «Ещё…», a new page; on day one the starters).
// The record already waits in Входящие. Docked over Главная or a page it stays short, about 150px (v22, D5): the
// question, one row of chips that scrolls sideways and fades at its edge, the footnote; in Журнал the chips wrap.
import { computed } from 'vue'
import { useRouter } from '#imports'
import type { Entry } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore, type Choice } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import PlaceChips from './PlaceChips.vue'

const props = defineProps<{ entry: Entry, float?: boolean }>()
const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const router = useRouter()

const rec = computed(() => props.entry.recordIds?.[0] ? data.records[props.entry.recordIds[0]] : undefined)
const subject = computed(() => rec.value?.text ? rec.value.text.charAt(0).toLowerCase() + rec.value.text.slice(1) : props.entry.text)

function choose(c: Choice) {
  const page = journal.choose(props.entry.id, c)
  // No name to guess: an empty page opens with its title in focus
  if (page && 'newPage' in c && !c.newPage.trim()) {
    ui.focusTitle = page.id
    void router.push(`/p/${page.id}`)
  }
}
</script>

<template>
  <div
    class="flex flex-col rounded-card border-[1.5px] border-accent bg-card"
    :class="float ? 'gap-2 px-3 py-2.5 shadow-float' : 'gap-2.5 p-3'"
  >
    <p
      class="text-row font-semibold leading-snug text-highlighted lg:text-15"
      :class="{ 'pr-7': float }"
    >
      Куда положить «{{ subject }}»?
    </p>
    <PlaceChips
      :entry="entry"
      :row="float"
      @choose="choose"
    />
    <p class="text-caption font-normal leading-snug text-toned">
      Пока лежит во Входящих с меткой «уточнить». <button
        type="button"
        class="cursor-pointer text-accent-ink underline-offset-2 hover:underline"
        @click="journal.choose(entry.id, { keep: true })"
      >
        Оставить там
      </button>
    </p>
  </div>
</template>
