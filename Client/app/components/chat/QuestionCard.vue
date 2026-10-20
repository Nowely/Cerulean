<script setup lang="ts">
// Уточнение: «Куда положить «…»?» with three guesses, «Ещё…» and a new page. The record already waits in Входящие.
import { computed } from 'vue'
import type { Entry, Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { useRouter } from '#imports'
import ChipButton from '../common/ChipButton.vue'

const props = defineProps<{ entry: Entry, float?: boolean }>()
const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const router = useRouter()

const rec = computed(() => props.entry.recordIds?.[0] ? data.records[props.entry.recordIds[0]] : undefined)
const guesses = computed(() => (rec.value?.guesses ?? []).map(id => data.pages[id]).filter((p): p is Page => !!p && !p.deletedAt).slice(0, 3))
const subject = computed(() => rec.value?.text ? rec.value.text.charAt(0).toLowerCase() + rec.value.text.slice(1) : props.entry.text)

function newPage() {
  if (props.entry.newName) {
    journal.choose(props.entry.id, { newPage: props.entry.newName })
    return
  }
  // No name to guess: an empty page opens with its title in focus
  const page = journal.choose(props.entry.id, { newPage: '' })
  if (page) {
    ui.focusTitle = page.id
    void router.push(`/p/${page.id}`)
  }
}

function more() {
  ui.pick({
    title: 'Куда положить',
    subtitle: rec.value?.text ?? props.entry.text,
    current: data.inbox.id,
    guesses: rec.value?.guesses,
    newName: props.entry.newName,
    run: c => journal.choose(props.entry.id, c)
  })
}
</script>

<template>
  <div
    class="flex flex-col gap-2.5 rounded-card border-[1.5px] border-accent p-3"
    :class="float ? 'raised bg-default shadow-float' : 'bg-card'"
  >
    <p class="text-row font-semibold leading-snug text-highlighted lg:text-15">
      Куда положить «{{ subject }}»?
    </p>
    <div class="flex flex-wrap gap-1.5">
      <ChipButton
        v-for="p in guesses"
        :key="p.id"
        :label="p.title"
        :glyph="p.glyph"
        :color="p.color"
        @click="journal.choose(entry.id, { pageId: p.id })"
      />
      <ChipButton
        label="Ещё…"
        @click="more"
      />
      <ChipButton
        icon="i-lucide-plus"
        :label="entry.newName ? `Новая страница «${entry.newName}»` : 'Новая страница…'"
        @click="newPage"
      />
    </div>
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
