<script setup lang="ts">
// The one place to write: destination chip · field · mic → send.
// In Авто the chip shows the decision while typing: «⑂ Продукты», «⑂ Входящие» or «⑂ Поиск».
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Entry, Glyph, Id, PageColor } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useSpeech } from '~/composables/useSpeech'
import { useNotify } from '~/composables/useNotify'
import { draftsFor } from '~/domain/auto'
import { count, RECORD_FORMS } from '~/domain/text'
import PageTile from '../common/PageTile.vue'

const props = withDefaults(defineProps<{
  /** auto: Главная and Чат · page: a page's own composer · record: adds Подпункты · today: Авто with today's date */
  mode: 'auto' | 'page' | 'record' | 'today'
  pageId?: Id
  recordId?: Id
  placeholder?: string
  /** Docked over content (Главная): carries the float shadow */
  float?: boolean
}>(), { float: false })

const emit = defineEmits<{ sent: [entry: Entry | null], focus: [boolean] }>()

const data = useDataStore()
const journal = useJournalStore()
const notify = useNotify()

const text = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const dest = ref<'auto' | Id>(props.mode === 'page' && props.pageId ? props.pageId : 'auto')
watch(() => props.pageId, (id) => {
  dest.value = props.mode === 'page' && id ? id : 'auto'
})

const speech = useSpeech((t) => {
  text.value = t
})
let before = ''
function dictate() {
  if (speech.listening.value) return speech.stop()
  before = text.value.trim()
  speech.start(before)
  input.value?.focus()
}
watch(speech.error, (e) => {
  if (e) notify(e)
})

const page = computed(() => props.pageId ? data.pages[props.pageId] : undefined)
const destPage = computed(() => dest.value === 'auto' ? undefined : data.pages[dest.value])
const untitled = computed(() => props.mode === 'page' && page.value && !page.value.title.trim() && dest.value === page.value.id)

// The live decision of Авто, a beat behind the typing so the chip does not flicker
const typed = refDebounced(text, 180)
const decision = computed(() => dest.value === 'auto' ? journal.previewFor(typed.value) : { kind: 'idle' as const })

const chip = computed(() => {
  if (destPage.value) {
    return { label: untitled.value ? 'Эта страница' : destPage.value.title || 'Без названия', glyph: destPage.value.glyph, color: destPage.value.color, icon: undefined }
  }
  const d = decision.value
  if (d.kind === 'search') return { label: 'Поиск', icon: 'cer:auto' }
  if (d.kind === 'inbox') return { label: 'Входящие', icon: 'cer:auto' }
  if (d.kind === 'page') return { label: data.pages[d.pageId]?.title ?? 'Авто', icon: 'cer:auto' }
  return { label: 'Авто', icon: 'cer:auto' }
})

const hint = computed(() => props.placeholder ?? (
  props.mode === 'record'
    ? 'Подпункт'
    : props.mode === 'today'
      ? 'Записать на сегодня…'
      : props.mode === 'page'
        ? (untitled.value && !data.recordsOf(props.pageId!).length ? 'Первая запись' : 'Новая запись')
        : 'Хлеб, позвонить в 10…'
))

/** A destination in the «Куда» menu: pages carry their tile, the current one a check */
type DestItem = DropdownMenuItem & { glyph?: Glyph | null, tint?: PageColor, current?: boolean }

const menu = computed(() => {
  const pages = data.livePages.filter(p => p.kind !== 'today')
  const items: DestItem[][] = [
    [{ label: 'Авто', icon: 'cer:auto', current: dest.value === 'auto', onSelect: () => choose('auto') }],
    pages.map(p => ({
      label: p.id === props.pageId && !p.title.trim() ? 'Эта страница' : p.title || 'Без названия',
      glyph: p.glyph,
      tint: p.color,
      current: dest.value === p.id,
      onSelect: () => choose(p.id)
    }))
  ]
  return items
})

function choose(d: 'auto' | Id) {
  dest.value = d
  void nextTick(() => input.value?.focus())
}

const canSend = computed(() => text.value.trim().length > 0)

async function submit() {
  const t = text.value.trim()
  if (!t) return
  speech.stop()
  text.value = ''
  if (props.mode === 'record' && props.recordId) {
    const parent = data.records[props.recordId]
    if (parent) data.addRecord({ pageId: parent.pageId, parentId: parent.id, text: t.charAt(0).toUpperCase() + t.slice(1) })
    emit('sent', null)
    return
  }
  // Writing on a page into the page itself: plain records, no journal line
  if (props.mode === 'page' && destPage.value && destPage.value.id === props.pageId) {
    const p = destPage.value
    const drafts = p.kind === 'inbox' ? [{ text: t.charAt(0).toUpperCase() + t.slice(1), due: null, values: {} }] : draftsFor(t, p, Date.now())
    for (const d of [...drafts].reverse()) data.addRecord({ pageId: p.id, text: d.text, due: d.due, values: d.values, via: 'manual' })
    emit('sent', null)
    return
  }
  const entry = await journal.send(t, dest.value, {
    today: props.mode === 'today' && dest.value === 'auto',
    onStart: e => emit('sent', e)
  })
  // From a page to somewhere else: say where it went, the receipt lives in Чат
  if (props.mode !== 'auto' && entry.kind === 'routed' && entry.pageId !== props.pageId) {
    const to = data.pages[entry.pageId!]
    notify(`${count(entry.recordIds?.length ?? 1, RECORD_FORMS)} → ${to?.title ?? ''}`, { label: 'Не туда', run: () => journal.choose(entry.id, { pageId: props.pageId! }) })
  }
  if (props.mode !== 'auto' && entry.kind === 'ask') notify('Не удалось разложить, запись во Входящих', undefined, 5000)
}

defineExpose({
  focus: () => input.value?.focus(),
  setText: (t: string) => {
    text.value = t
    void nextTick(() => input.value?.focus())
  }
})
</script>

<template>
  <form
    class="relative flex min-h-13 items-center gap-0.5 rounded-card border border-default bg-default p-1 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_0.5px_var(--accent)]"
    :class="{ 'shadow-float': float }"
    @submit.prevent="submit"
  >
    <UDropdownMenu
      v-if="mode !== 'record'"
      :items="menu"
      :content="{ side: 'top', align: 'start', sideOffset: 8 }"
      :ui="{ content: 'w-64 max-h-80' }"
    >
      <button
        type="button"
        class="hit-44 relative flex h-9 max-w-44 shrink-0 cursor-pointer items-center gap-1.5 rounded-chip bg-elevated pr-1.5 pl-2 text-sm font-medium text-default hover:bg-accented aria-expanded:bg-accented lg:h-8"
        :aria-label="`Куда: ${chip.label}`"
      >
        <PageTile
          v-if="!chip.icon"
          :glyph="chip.glyph"
          :color="chip.color"
          :size="18"
        />
        <UIcon
          v-else
          :name="chip.icon"
          class="size-4.5 shrink-0"
          :class="decision.kind === 'idle' ? 'text-toned' : 'text-accent'"
        />
        <span class="truncate">{{ chip.label }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 shrink-0 text-toned"
        />
      </button>
      <template #item-leading="{ item }">
        <PageTile
          v-if="(item as DestItem).tint"
          :glyph="(item as DestItem).glyph"
          :color="(item as DestItem).tint"
          :size="18"
        />
        <UIcon
          v-else-if="item.icon"
          :name="item.icon"
          class="size-4.5 text-toned"
        />
      </template>
      <template #item-trailing="{ item }">
        <UIcon
          v-if="(item as DestItem).current"
          name="i-lucide-check"
          class="size-4 text-accent"
        />
      </template>
    </UDropdownMenu>

    <input
      ref="input"
      v-model="text"
      type="text"
      enterkeyhint="send"
      autocomplete="off"
      autocapitalize="sentences"
      :placeholder="speech.listening.value ? 'Говори…' : hint"
      :aria-label="mode === 'record' ? 'Новый подпункт' : 'Новая запись'"
      class="h-10 min-w-0 flex-1 bg-transparent py-2 pr-1 pl-2 text-input text-highlighted outline-none placeholder:text-dimmed"
      @focus="emit('focus', true)"
      @blur="emit('focus', false)"
    >

    <button
      v-if="canSend || !speech.supported"
      type="submit"
      :disabled="!canSend"
      class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-chip bg-accent text-on-accent transition-opacity hover:bg-accent/90 disabled:cursor-default disabled:opacity-40 lg:size-9"
      aria-label="Отправить"
    >
      <UIcon
        name="i-lucide-arrow-up"
        class="size-5"
      />
    </button>
    <button
      v-else
      type="button"
      class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-chip lg:size-9"
      :class="speech.listening.value ? 'bg-accent-soft text-accent-ink' : 'text-toned hover:bg-muted hover:text-highlighted active:bg-pressed'"
      :aria-label="speech.listening.value ? 'Остановить диктовку' : 'Диктовать'"
      :aria-pressed="speech.listening.value"
      @click="dictate"
    >
      <UIcon
        :name="speech.listening.value ? 'i-lucide-square' : 'i-lucide-mic'"
        class="size-5"
        :class="{ 'motion-safe:animate-pulse': speech.listening.value }"
      />
    </button>
  </form>
</template>
