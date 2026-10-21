<script setup lang="ts">
// The one place to write, the same on every screen: a 44px pill with the destination chip · a field that grows
// with the text · mic → send. The chip is text only and opens the page picker. It never changes while typing,
// so the text never moves: in Авто the guess is a line right on the pill, at the chip's text («→ Покупки»).
// «Отменить» on a receipt gives the text back aimed at its page for that one send («→ Покупки, только эта запись»).
// «@» (v24, items 12 and 13): a name picked in the «@» row is a chip in the field; the send links each record to the names
// its own text holds, and the title keeps them as «@Name».
import { computed, inject, nextTick, onBeforeUnmount, ref, useTemplateRef, watch, watchEffect } from 'vue'
import { refDebounced, useOnline } from '@vueuse/core'
import { GLYPHS, type Entry, type Id } from '~/domain/types'
import { pageColor } from '~/domain/look'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { useSpeech } from '~/composables/useSpeech'
import { useNotify } from '~/composables/useNotify'
import { draftsFor } from '~/domain/auto'
import { onDay } from '~/domain/views'
import { dayAim } from '~/domain/dates'
import { useCalendarDay } from '~/composables/useCalendarDay'
import { useNow } from '~/composables/useNow'
import { capitalize, count, RECORD_FORMS } from '~/domain/text'
import { useLater } from '~/composables/useLater'
import { DOCK_LINE } from '~/composables/useDockEdge'
import DestChip from './DestChip.vue'
import ComposerField from './ComposerField.vue'
import MentionRow from './MentionRow.vue'

const props = withDefaults(defineProps<{
  /** auto: Главная and Журнал · page: a page's own composer · record: adds Подпункты · today: Авто with today's date */
  mode: 'auto' | 'page' | 'record' | 'today'
  pageId?: Id
  recordId?: Id
  placeholder?: string
  /** Day one on Главная: the guess line says what the composer is for until the first record */
  intro?: boolean
}>(), { pageId: undefined, recordId: undefined, placeholder: undefined, intro: false })

const emit = defineEmits<{ sent: [entry: Entry | null], focus: [boolean], failed: [reason: 'quota' | 'error'] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const notify = useNotify()
const online = useOnline()
const later = useLater()

const text = ref('')
/** What the field's chips point at («@» picks), in the order they stand */
const links = ref<Id[]>([])
const field = useTemplateRef<InstanceType<typeof ComposerField>>('field')
const home = () => props.mode === 'page' && props.pageId ? props.pageId : 'auto'
const dest = ref<'auto' | Id>(home())
/** The aim «Отменить» gave back: it holds for one send, or until the text is cleared */
const once = ref(false)
watch(() => props.pageId, () => {
  dest.value = home()
  once.value = false
})
watch(text, (t) => {
  if (once.value && !t.trim()) {
    dest.value = home()
    once.value = false
  }
})

// Dictation: the field becomes a listening line (a small wave, «Слушаю…», then the words); stop leaves the words
// as a draft with the keyboard up. Recognition needs the network.
const speech = useSpeech((t) => {
  text.value = t
})
const heard = ref(false)
/** Five bars of the listening wave: heights and offsets, still under reduced motion */
const WAVE = [
  { h: 'h-1.5', delay: '-0.3s' },
  { h: 'h-3', delay: '-0.7s' },
  { h: 'h-2.25', delay: '-0.1s' },
  { h: 'h-4', delay: '-0.5s' },
  { h: 'h-1.75', delay: '-0.9s' }
]
function dictate() {
  if (!online.value) {
    notify('Диктовка без сети не работает')
    return
  }
  heard.value = false
  speech.start(text.value.trim())
}
watch(text, () => {
  if (speech.listening.value) heard.value = true
})
watch(speech.listening, (on) => {
  if (!on) void nextTick(() => field.value?.focus())
})
watch(speech.error, (e) => {
  if (e) notify(e)
})

const page = computed(() => props.pageId ? data.pages[props.pageId] : undefined)
const destPage = computed(() => dest.value === 'auto' ? undefined : data.pages[dest.value])
const untitled = computed(() => props.mode === 'page' && page.value && !page.value.title.trim() && dest.value === page.value.id)

// The live decision of Авто, a beat behind the typing so nothing flickers
const typed = refDebounced(text, 180)
const decision = computed(() => dest.value === 'auto' ? journal.previewFor(typed.value) : { kind: 'idle' as const })
/**
 * Where the text would go, counted before the send (v22): «Покупки», «Покупки · 2 записи», «Покупки 2, Задачи 1»,
 * «Входящие», «Поиск», or nothing yet
 */
const guess = computed(() => {
  if (once.value) return `${destPage.value?.title || 'Без названия'}, только эта запись`
  const d = decision.value
  const name = (id: Id | 'inbox') => id === 'inbox' ? 'Входящие' : data.pages[id]?.title || 'Без названия'
  if (d.kind === 'search') return 'Поиск'
  if (d.kind === 'inbox') return 'Входящие'
  if (d.kind === 'page') return d.count > 1 ? `${name(d.pageId)} · ${count(d.count, RECORD_FORMS)}` : name(d.pageId)
  if (d.kind === 'split') return d.parts.map(p => `${name(p.to)} ${p.count}`).join(', ')
  if (d.kind === 'starter') return d.count > 1 ? `${d.name} · ${count(d.count, RECORD_FORMS)}` : d.name
  return ''
})
// ---------- «@» (v24, item 12) ----------

/** «@» files links: everywhere but a record's «Подпункт», a subitem being one line with no links */
const mentionsOn = computed(() => props.mode !== 'record')
/** The «@» row while it is open, in the guess line's place */
const mention = computed(() => mentionsOn.value ? field.value?.mention ?? null : null)
/** «· связь: @Стоматолог» (v24 fixes, 1): the link with its marker, never «связано со «…»» */
const linkLine = computed(() => {
  const names = links.value.map(id => data.nameOf(id)).filter(Boolean)
  return names.length ? ` · связь: ${names.map(n => `@${n}`).join(', ')}` : ''
})

/** The line on the pill: the guess while there is text, the day-one hint before the first record */
const guessLine = computed(() => {
  if (props.mode === 'record') return null
  if (linkLine.value && text.value.trim()) {
    const to = guess.value || (destPage.value ? destPage.value.title || 'Без названия' : '')
    if (to) return { text: `→ ${to}${linkLine.value}`, hint: false }
  }
  if (guess.value && (text.value.trim() || once.value)) return { text: `→ ${guess.value}`, hint: false }
  if (props.intro && !text.value && dest.value === 'auto' && !speech.listening.value) return { text: 'Пиши что угодно: разложится по страницам', hint: true }
  return null
})

const chip = computed(() => {
  if (destPage.value) {
    return { label: untitled.value ? 'Эта страница' : destPage.value.title || 'Без названия', icon: GLYPHS[destPage.value.glyph ?? 'doc'], page: true, color: pageColor(destPage.value) }
  }
  return { label: 'Авто', icon: 'cer:auto' }
})
const chipLabel = computed(() => once.value
  ? `Куда записать: «${chip.value.label}», только эта запись. Выбрать другое`
  : `Куда: ${chip.value.label}${guess.value ? `, похоже → ${guess.value}` : ''}`)

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
  once.value = false
  void nextTick(() => field.value?.focus())
}

/** The day this page's calendar has selected, while the composer writes into the page itself (v22, G6) */
const calendar = useCalendarDay()
const now = useNow()
const onCalendar = computed(() => {
  const day = calendar.value
  return props.mode === 'page' && day && day.pageId === props.pageId && dest.value === props.pageId ? day.date : null
})

const hint = computed(() => props.placeholder ?? (
  props.mode === 'record'
    ? 'Подпункт'
    : props.mode === 'today'
      ? 'Запись на сегодня'
      : onCalendar.value
        ? `Запись на ${dayAim(onCalendar.value, now.value)}`
        : props.mode === 'page'
          ? (untitled.value && !data.recordsOf(props.pageId!).length ? 'Первая запись' : 'Новая запись')
          : 'Хлеб, позвонить в 10…'
))

/** The field grows with the text up to five lines; past one line the pill's corners follow */
const multi = ref(false)

const canSend = computed(() => text.value.trim().length > 0)

/** The screen's dock ends the list at a hard edge while the guess line or the «@» row shows (v24, item 14) */
const dockLine = inject(DOCK_LINE, null)
watchEffect(() => {
  if (dockLine) dockLine.value = !!guessLine.value || !!mention.value
})
onBeforeUnmount(() => {
  if (dockLine) dockLine.value = false
})

/**
 * The last send from here, until the browser has kept it: when it refuses (out of space), the send is taken
 * back, its text returns to the field aimed the same way and the screen docks «Не сохранилось…» (v22, G2)
 */
let lastSend: { text: string, aim: 'auto' | Id, links: Id[], ids: () => Id[], entryId?: Id } | null = null
watch(() => data.writeFailed, (f) => {
  const s = lastSend
  if (!f || !s || !s.ids().some(id => f.ids.includes(id))) return
  lastSend = null
  if (s.entryId) journal.undo(s.entryId)
  else data.purgeRecords(s.ids())
  setText(s.text, s.aim, s.links)
  emit('failed', f.reason)
})

/** `record`: write it down even when it reads as a search («Записать «…»» in Поиск) */
async function submit(opts: { record?: boolean } = {}) {
  const t = text.value.trim()
  if (!t) return
  data.clearWriteFailed()
  const aimed = dest.value
  const linked = links.value
  speech.stop()
  text.value = ''
  links.value = []
  if (once.value) {
    dest.value = home()
    once.value = false
  }
  if (props.mode === 'record' && props.recordId) {
    const parent = data.records[props.recordId]
    if (parent) data.addRecord({ pageId: parent.pageId, parentId: parent.id, text: capitalize(t) })
    emit('sent', null)
    return
  }
  // Writing on a page into the page itself: plain records, no journal line
  const target = aimed === 'auto' ? undefined : data.pages[aimed]
  if (props.mode === 'page' && target && target.id === props.pageId) {
    const p = target
    const drafts = p.kind === 'inbox' ? [{ text: capitalize(t), due: null, values: {} }] : onDay(draftsFor(t, p, Date.now()), onCalendar.value)
    const ids = [...drafts].reverse().map(d => data.addRecord({ pageId: p.id, text: d.text, due: d.due, values: d.values, via: 'manual' }).id)
    journal.linkWords(ids, linked)
    lastSend = { text: t, aim: aimed, links: linked, ids: () => ids }
    emit('sent', null)
    return
  }
  // Anywhere else: the screen docks the receipt, Уточнение or found card above this composer
  await journal.send(t, aimed, {
    today: props.mode === 'today' && aimed === 'auto',
    record: opts.record,
    links: linked,
    onStart: (e) => {
      lastSend = { text: t, aim: aimed, links: linked, entryId: e.id, ids: () => data.entries.find(x => x.id === e.id)?.recordIds ?? [] }
      emit('sent', e)
    }
  })
}

/**
 * Puts text in the field with the keyboard open; an aim other than this composer's own lasts one send. Each «@Name» of
 * `linked` is its chip again («Отменить» gives back the chip and the text)
 */
function setText(t: string, aim?: 'auto' | Id, linked: Id[] = []) {
  links.value = linked
  text.value = t
  if (aim && aim !== home()) {
    dest.value = aim
    once.value = true
  }
  void nextTick(() => field.value?.focus())
}

// «Отменить» on a receipt: the text comes back here
watch(() => ui.refill, (r) => {
  if (!r || props.mode === 'record') return
  setText(r.text, r.aim, r.links)
  ui.refill = null
})

defineExpose({
  focus: () => field.value?.focus(),
  blur: () => field.value?.blur(),
  setText,
  submit: () => submit(),
  /** Sends words from elsewhere as typed, like a send from here, without raising the keyboard */
  write: (t: string) => {
    text.value = t
    links.value = []
    return submit({ record: true })
  }
})
</script>

<template>
  <div class="flex flex-col">
    <MentionRow
      v-if="mention"
      :mention="mention"
      :owner-id="recordId"
      @pick="t => field?.pick(t)"
      @closed="field?.focus()"
    />
    <p
      v-else-if="guessLine"
      class="mb-1 h-5 truncate pl-4 text-13 leading-5 text-toned"
      aria-hidden="true"
    >
      {{ guessLine.text }}
    </p>
    <form
      class="relative flex items-end gap-1 border border-default bg-default p-0.75 transition-[border-color] focus-within:border-line2 dark:border-line2"
      :class="multi ? 'rounded-pill-grown' : 'rounded-pill'"
      @submit.prevent="submit()"
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

      <span
        v-if="speech.listening.value"
        class="flex h-9 min-w-0 flex-1 items-center gap-2.5 pr-1 pl-2"
        role="status"
        aria-live="polite"
      >
        <span
          class="flex h-4 shrink-0 items-center gap-0.5 text-accent-ink"
          aria-hidden="true"
        >
          <i
            v-for="(bar, n) in WAVE"
            :key="n"
            class="block w-0.75 rounded-full bg-current motion-safe:animate-wave"
            :class="bar.h"
            :style="{ animationDelay: bar.delay }"
          />
        </span>
        <span
          class="min-w-0 flex-1 truncate text-input"
          :class="heard && text ? 'text-highlighted' : 'text-toned'"
        >{{ heard && text ? text : 'Слушаю…' }}</span>
      </span>
      <ComposerField
        v-show="!speech.listening.value"
        ref="field"
        v-model="text"
        v-model:links="links"
        :label="mode === 'record' ? 'Новый подпункт' : 'Новая запись'"
        :placeholder="hint"
        :mentions="mentionsOn"
        :owner-id="recordId"
        :field-class="mode === 'record' ? 'py-1.75 pr-1 pl-3' : 'py-1.75 pr-1 pl-1'"
        @enter="submit()"
        @focus="v => emit('focus', v)"
        @multi="v => multi = v"
      />

      <button
        v-if="speech.listening.value"
        type="button"
        class="hit-44 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-on-accent hover:bg-accent/90"
        aria-label="Остановить"
        @click="speech.stop()"
      >
        <span class="size-3.5 rounded-xs bg-current" />
      </button>
      <button
        v-else-if="canSend || !speech.supported"
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
        class="hit-44 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full"
        :class="online ? 'text-toned hover:bg-muted hover:text-highlighted active:bg-pressed' : 'text-dimmed'"
        :aria-label="online ? 'Надиктовать' : 'Надиктовать: без сети не работает'"
        :aria-disabled="!online"
        @click="dictate"
      >
        <UIcon
          name="i-lucide-mic"
          class="size-5"
        />
      </button>
    </form>
  </div>
</template>
