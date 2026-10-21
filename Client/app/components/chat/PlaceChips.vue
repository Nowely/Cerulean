<script setup lang="ts">
// Where a line can go instead: the same chips in an Уточнение and under «Не туда». Three guesses, «Ещё…» (the page
// picker with the guesses on top), then «Новая страница «…»». Before any page fits there is nothing to guess: the
// starters not made yet are the choices, each makes its page in «Мои страницы».
import { computed } from 'vue'
import type { Entry, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore, type Choice } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { rank } from '~/domain/rules'
import { TEMPLATES } from '~/domain/templates'
import ChipButton from '../common/ChipButton.vue'

const props = defineProps<{
  entry: Entry
  /** The text in the picker's subtitle; a series names all its lines */
  subject?: string
}>()
const emit = defineEmits<{ choose: [choice: Choice] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()

const rec = computed<Rec | undefined>(() => props.entry.recordIds?.[0] ? data.records[props.entry.recordIds[0]] : undefined)

/** An Уточнение asks about its record in Входящие; a receipt offers the pages Авто would pick next */
const guesses = computed<Page[]>(() => {
  const ids = props.entry.kind === 'ask' && rec.value
    ? journal.guessesFor(rec.value)
    : [...rank(props.entry.text, data.livePages, data.learned).map(r => r.pageId), ...data.recent]
        .filter((id, i, a) => a.indexOf(id) === i && id !== props.entry.pageId)
  return ids.map(id => data.pages[id]).filter((p): p is Page => !!p && !p.deletedAt && p.kind === 'page').slice(0, 3)
})
const starters = computed(() => guesses.value.length ? [] : TEMPLATES.filter(t => !data.livePages.some(p => p.template === t.key)))
const newName = computed(() => props.entry.newName && !data.livePages.some(p => p.title.trim().toLowerCase() === props.entry.newName!.toLowerCase()) ? props.entry.newName : null)

function more() {
  ui.pick({
    title: 'Куда положить',
    subtitle: props.subject ?? rec.value?.text ?? props.entry.text,
    current: props.entry.pageId,
    guesses: guesses.value.map(p => p.id),
    newName: newName.value,
    run: c => emit('choose', c)
  })
}
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <ChipButton
      v-for="p in guesses"
      :key="p.id"
      :label="p.title || 'Без названия'"
      :glyph="p.glyph"
      :color="p.color"
      @click="emit('choose', { pageId: p.id })"
    />
    <ChipButton
      label="Ещё…"
      @click="more"
    />
    <ChipButton
      v-for="t in starters"
      :key="t.key"
      icon="i-lucide-plus"
      :label="t.name"
      :aria-label="`Новая страница «${t.name}» по шаблону`"
      @click="emit('choose', { template: t.key })"
    />
    <ChipButton
      icon="i-lucide-plus"
      :label="newName ? `Новая страница «${newName}»` : 'Новая страница…'"
      @click="emit('choose', { newPage: newName ?? '' })"
    />
  </div>
</template>
