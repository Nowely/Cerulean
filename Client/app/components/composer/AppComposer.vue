<script setup lang="ts">
// The one place to write, the same on every screen: a 44px pill with the destination chip · a field that grows
// with the text · mic → send. The chip is text only and opens the page picker. It never changes while typing,
// so the text never moves: in Авто the guess is a line above the pill («→ Продукты»).
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { refDebounced, useOnline } from '@vueuse/core'
import type { Entry, Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { useSpeech } from '~/composables/useSpeech'
import { useNotify } from '~/composables/useNotify'
import { useFind } from '~/composables/useFind'
import { draftsFor } from '~/domain/auto'
import { capitalize, count, RECORD_FORMS } from '~/domain/text'
import { useLater } from '~/composables/useLater'
import DestChip from './DestChip.vue'

const props = withDefaults(defineProps<{
  /** auto: Главная and Чат · page: a page's own composer · record: adds Подпункты · today: Авто with today's date */
  mode: 'auto' | 'page' | 'record' | 'today'
  pageId?: Id
  recordId?: Id
  placeholder?: string
}>(), { pageId: undefined, recordId: undefined, placeholder: undefined })

const emit = defineEmits<{ sent: [entry: Entry | null], focus: [boolean] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const notify = useNotify()
const find = useFind()
const online = useOnline()
const later = useLater()

const text = ref('')
const field = useTemplateRef<HTMLTextAreaElement>('field')
const dest = ref<'auto' | Id>(props.mode === 'page' && props.pageId ? props.pageId : 'auto')
watch(() => props.pageId, (id) => {
  dest.value = props.mode === 'page' && id ? id : 'auto'
})

const speech = useSpeech((t) => {
  text.value = t
})
function dictate() {
  if (speech.listening.value) return speech.stop()
  speech.start(text.value.trim())
  field.value?.focus()
}
watch(speech.error, (e) => {
  if (e) notify(e)
})

const page = computed(() => props.pageId ? data.pages[props.pageId] : undefined)
const destPage = computed(() => dest.value === 'auto' ? undefined : data.pages[dest.value])
const untitled = computed(() => props.mode === 'page' && page.value && !page.value.title.trim() && dest.value === page.value.id)

// The live decision of Авто, a beat behind the typing so nothing flickers
const typed = refDebounced(text, 180)
const decision = computed(() => dest.value === 'auto' ? journal.previewFor(typed.value) : { kind: 'idle' as const })
/** Where the text would go: «Продукты», «Входящие», «Поиск», or nothing yet */
const guess = computed(() => {
  const d = decision.value
  if (d.kind === 'search') return 'Поиск'
  if (d.kind === 'inbox') return 'Входящие'
  if (d.kind === 'page') return data.pages[d.pageId]?.title || 'Без названия'
  return ''
})

const chip = computed(() => {
  if (destPage.value) {
    return { label: untitled.value ? 'Эта страница' : destPage.value.title || 'Без названия', auto: false }
  }
  return { label: 'Авто', auto: true }
})
const chipLabel = computed(() => `Куда: ${chip.value.label}${guess.value ? `, похоже → ${guess.value}` : ''}`)

function openPicker() {
  void later.load()
  ui.pick({
    title: 'Куда записать',
    subtitle: text.value.trim() || undefined,
    auto: props.mode === 'record' ? undefined : { picks: guess.value || undefined, chosen: dest.value === 'auto', run: () => choose('auto') },
    thisPage: props.mode === 'page' ? props.pageId : undefined,
    chosen: dest.value === 'auto' ? undefined : dest.value,
    newName: text.value.trim() ? null : undefined,
    run: (c) => {
      if ('pageId' in c) return choose(c.pageId)
      const created = data.createPage({ title: c.newPage })
      choose(created.id)
    }
  })
}

function choose(d: 'auto' | Id) {
  dest.value = d
  void nextTick(() => field.value?.focus())
}

const hint = computed(() => props.placeholder ?? (
  props.mode === 'record'
    ? 'Подпункт'
    : props.mode === 'today'
      ? 'Записать на сегодня…'
      : props.mode === 'page'
        ? (untitled.value && !data.recordsOf(props.pageId!).length ? 'Первая запись' : 'Новая запись')
        : 'Хлеб, позвонить в 10…'
))

// The field grows with the text: a hidden copy in the same grid cell gives the height (up to five lines).
// The placeholder never wraps the field: only typed text counts.
const multi = ref(false)
const mirror = useTemplateRef<HTMLElement>('mirror')
watch(text, () => nextTick(() => {
  const el = mirror.value
  if (!el) return
  const css = getComputedStyle(el)
  const line = parseFloat(css.lineHeight) || 22
  multi.value = el.scrollHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom) > line * 1.5
}))

const canSend = computed(() => text.value.trim().length > 0)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    void submit()
  }
}

async function submit() {
  const t = text.value.trim()
  if (!t) return
  speech.stop()
  text.value = ''
  if (props.mode === 'record' && props.recordId) {
    const parent = data.records[props.recordId]
    if (parent) data.addRecord({ pageId: parent.pageId, parentId: parent.id, text: capitalize(t) })
    emit('sent', null)
    return
  }
  // Writing on a page into the page itself: plain records, no journal line
  if (props.mode === 'page' && destPage.value && destPage.value.id === props.pageId) {
    const p = destPage.value
    const drafts = p.kind === 'inbox' ? [{ text: capitalize(t), due: null, values: {} }] : draftsFor(t, p, Date.now())
    for (const d of [...drafts].reverse()) data.addRecord({ pageId: p.id, text: d.text, due: d.due, values: d.values, via: 'manual' })
    emit('sent', null)
    return
  }
  const aimed = dest.value
  const entry = await journal.send(t, aimed, {
    today: props.mode === 'today' && aimed === 'auto',
    onStart: e => emit('sent', e)
  })
  // From a page to somewhere else: say where it went, the receipt lives in Чат
  if (props.mode !== 'auto' && entry.kind === 'routed' && entry.pageId !== props.pageId) {
    const to = data.pages[entry.pageId!]
    notify(`${count(entry.recordIds?.length ?? 1, RECORD_FORMS)} → ${to?.title ?? ''}`, { label: 'Не туда', run: () => journal.choose(entry.id, { pageId: props.pageId! }) })
  }
  if (props.mode !== 'auto' && entry.kind === 'ask') notify('Не удалось разложить, запись во Входящих', undefined, 5000)
  if (props.mode !== 'auto' && entry.kind === 'found') {
    notify('Похоже на вопрос, ничего не записано', { label: 'Найти', run: () => find.open(t) }, 5000)
  }
}

defineExpose({
  focus: () => field.value?.focus(),
  blur: () => field.value?.blur(),
  /** «Отменить» puts the text back, aimed at the same page, with the keyboard open */
  setText: (t: string, aim?: 'auto' | Id) => {
    text.value = t
    if (aim) dest.value = aim
    void nextTick(() => field.value?.focus())
  }
})
</script>

<template>
  <div class="flex flex-col">
    <p
      v-if="guess && text.trim()"
      class="truncate pb-1.5 pl-8.5 text-13 text-toned"
      aria-hidden="true"
    >
      → {{ guess }}
    </p>
    <form
      class="relative flex items-end gap-1 border border-default bg-default p-0.75 transition-[border-color] focus-within:border-line2 dark:border-line2"
      :class="multi ? 'rounded-pill-grown' : 'rounded-pill'"
      @submit.prevent="submit"
    >
      <DestChip
        v-if="mode !== 'record'"
        v-bind="chip"
        :aria-label="chipLabel"
        @click="openPicker"
      />
      <span
        v-if="!online && mode !== 'record'"
        class="flex size-9 shrink-0 items-center justify-center text-dimmed"
        role="img"
        aria-label="Нет сети"
      >
        <UIcon
          name="i-lucide-wifi-off"
          class="size-4"
        />
      </span>

      <div class="grid min-w-0 flex-1">
        <span
          ref="mirror"
          class="invisible col-start-1 row-start-1 max-h-32 overflow-hidden whitespace-pre-wrap break-words text-input leading-5.5"
          :class="mode === 'record' ? 'py-2.25 pr-1 pl-3' : 'py-2.25 pr-1 pl-1'"
          aria-hidden="true"
        >{{ text }}&#8203;</span>
        <textarea
          ref="field"
          v-model="text"
          rows="1"
          enterkeyhint="send"
          autocomplete="off"
          autocapitalize="sentences"
          :placeholder="speech.listening.value ? 'Говори…' : hint"
          :aria-label="mode === 'record' ? 'Новый подпункт' : 'Новая запись'"
          class="no-scrollbar col-start-1 row-start-1 max-h-32 min-w-0 resize-none overflow-y-auto bg-transparent text-input leading-5.5 text-highlighted outline-none placeholder:truncate placeholder:text-dimmed"
          :class="mode === 'record' ? 'py-2.25 pr-1 pl-3' : 'py-2.25 pr-1 pl-1'"
          @keydown="onKey"
          @focus="emit('focus', true)"
          @blur="emit('focus', false)"
        />
      </div>

      <button
        v-if="canSend || !speech.supported"
        type="submit"
        :disabled="!canSend"
        class="hit-44 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-on-accent transition-opacity hover:bg-accent/90 disabled:cursor-default disabled:opacity-40"
        aria-label="Отправить"
        @pointerdown.prevent
      >
        <UIcon
          name="i-lucide-arrow-up"
          class="size-5"
        />
      </button>
      <button
        v-else
        type="button"
        class="hit-44 relative flex shrink-0 cursor-pointer items-center justify-center"
        :class="[
          'size-9 rounded-full',
          speech.listening.value ? 'bg-accent-soft text-accent-ink' : 'text-toned hover:bg-muted hover:text-highlighted active:bg-pressed'
        ]"
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
  </div>
</template>
