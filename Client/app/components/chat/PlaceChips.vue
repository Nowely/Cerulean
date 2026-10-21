<script setup lang="ts">
// Where a line can go instead: the same chips in an Уточнение and under «Не туда». Three guesses, «Ещё…» (the page
// picker with the guesses on top), then «Новая страница «…»». Before any page fits there is nothing to guess: the
// starters not made yet are the choices, each makes its page in «Мои страницы». «Новая страница «X»» is never
// offered while a page X exists: that page is offered instead (v22, N23). Docked over Главная or a page the chips
// are one row that scrolls sideways and fades at its edge (v22, D5).
import { computed } from 'vue'
import type { Entry, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore, type Choice } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { placeOptions, rank } from '~/domain/rules'
import { TEMPLATES } from '~/domain/templates'
import ChipButton from '../common/ChipButton.vue'

const props = defineProps<{
  entry: Entry
  /** The text in the picker's subtitle; a series names all its lines */
  subject?: string
  /** One row that scrolls sideways (the docked Уточнение) */
  row?: boolean
}>()
const emit = defineEmits<{ choose: [choice: Choice] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()

const rec = computed<Rec | undefined>(() => props.entry.recordIds?.[0] ? data.records[props.entry.recordIds[0]] : undefined)

/** An Уточнение asks about its record in Входящие; a receipt offers the pages Авто would pick next */
const guessed = computed<Page[]>(() => {
  const ids = props.entry.kind === 'ask' && rec.value
    ? journal.guessesFor(rec.value)
    : [...rank(props.entry.text, data.livePages, data.learned).map(r => r.pageId), ...data.recent]
        .filter((id, i, a) => a.indexOf(id) === i && id !== props.entry.pageId)
  return ids.map(id => data.pages[id]).filter((p): p is Page => !!p && !p.deletedAt && p.kind === 'page').slice(0, 3)
})
/** The guesses, and the page Авто's new-page name already names */
const offer = computed(() => placeOptions(guessed.value.map(p => p.id), props.entry.newName, data.livePages))
const guesses = computed(() => offer.value.pageIds.map(id => data.pages[id]).filter((p): p is Page => !!p && p.id !== props.entry.pageId))
const starters = computed(() => guesses.value.length ? [] : TEMPLATES.filter(t => !data.livePages.some(p => p.template === t.key)))
const newName = computed(() => offer.value.newName)

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
  <div
    class="flex gap-1.5"
    :class="row ? 'no-scrollbar fade-end -mx-3 overflow-x-auto px-3 *:shrink-0' : 'flex-wrap'"
  >
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
      icon="i-lucide-ellipsis"
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
