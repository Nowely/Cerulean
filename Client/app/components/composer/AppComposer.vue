<script setup lang="ts">
// The one place to write, the same on every screen: a 44px pill with the destination chip · a field that grows
// with the text · mic → send. The chip is text only and opens the page picker. It never changes while typing,
// so the text never moves: in Авто the guess is a line right on the pill, at the chip's text («→ Покупки»).
// «Отменить» on a receipt gives the text back aimed at its page for that one send («→ Покупки, только эта запись»).
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
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
import { useTemplates } from '~/composables/useTemplates'
import { templateBrings } from '~/domain/recordTemplates'
import type { BodyOwner } from '~/domain/body'
import DestChip from './DestChip.vue'
import RecordDest, { type RecordDestKind } from './RecordDest.vue'

const props = withDefaults(defineProps<{
  /**
   * auto: Главная and Журнал · page: a page's own composer · record: a subitem or a paragraph «В заметку» of a record,
   * or of a template (`templateId`) · today: Авто with today's date
   */
  mode: 'auto' | 'page' | 'record' | 'today'
  pageId?: Id
  recordId?: Id
  /** A template's own page (v24): the record composer writes into the template */
  templateId?: Id
  placeholder?: string
  /** Day one on Главная: the guess line says what the composer is for until the first record */
  intro?: boolean
}>(), { pageId: undefined, recordId: undefined, templateId: undefined, placeholder: undefined, intro: false })

const emit = defineEmits<{ sent: [entry: Entry | null], focus: [boolean], failed: [reason: 'quota' | 'error'] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const notify = useNotify()
const online = useOnline()
const later = useLater()

const text = ref('')
const field = useTemplateRef<HTMLTextAreaElement>('field')
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
/** A page with no records yet, aimed at itself (v24): «Первая запись», named or not; its manual has no hint line */
const firstRecord = computed(() => props.mode === 'page' && page.value?.kind === 'page' && dest.value === page.value.id && !data.recordsOf(page.value.id).length)

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
/** The line on the pill: the guess while there is text, the day-one hint before the first record */
const guessLine = computed(() => {
  if (props.mode === 'record') return null
  if (template.value) return { text: `→ ${templateGuess.value}`, hint: false }
  if (guess.value && (text.value.trim() || once.value)) return { text: `→ ${guess.value}`, hint: false }
  if (props.intro && !text.value && dest.value === 'auto' && !speech.listening.value) return { text: 'Пиши что угодно: разложится по страницам', hint: true }
  return null
})

const chip = computed(() => {
  if (props.mode === 'record') return recordChip.value
  if (template.value) return { label: 'По шаблону', icon: 'cer:stamp', page: true, color: null }
  if (destPage.value) {
    return { label: untitled.value ? 'Эта страница' : destPage.value.title || 'Без названия', icon: GLYPHS[destPage.value.glyph ?? 'doc'], page: true, color: pageColor(destPage.value) }
  }
  return { label: 'Авто', icon: 'cer:auto' }
})
const chipLabel = computed(() => props.mode === 'record' || template.value
  ? chipAim.value
  : once.value
    ? `Куда записать: «${chip.value.label}», только эта запись. Выбрать другое`
    : `Куда: ${chip.value.label}${guess.value ? `, похоже → ${guess.value}` : ''}`)

function openPicker() {
  void later.load()
  ui.pick({
    title: 'Куда записать',
    subtitle: text.value.trim() || undefined,
    auto: props.mode === 'record' ? undefined : { picks: guess.value || undefined, chosen: dest.value === 'auto', run: () => choose('auto') },
    thisPage: props.mode === 'page' ? props.pageId : undefined,
    chosen: dest.value === 'auto' || template.value ? undefined : dest.value,
    templates: templateChoices(),
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
  byTemplate.value = null
  void nextTick(() => field.value?.focus())
}

// ---------- v24: a record by a page's template, and a record's two places ----------

const templates = useTemplates()
/** A template of this page picked in «Куда записать» or by «+» in «Шаблоны»: it holds for one record (v24, item 6) */
const byTemplate = ref<Id | null>(null)
const template = computed(() => props.mode === 'page' && byTemplate.value && dest.value === props.pageId
  ? page.value?.templates?.find(t => t.id === byTemplate.value) ?? null
  : null)
const templateGuess = computed(() => `${page.value?.title || 'Без названия'} · по шаблону «${template.value?.name}», только эта запись`)
watch(() => props.pageId, () => {
  byTemplate.value = null
})
// «+» on a «Шаблоны» row of this page: the chip takes the template and the caret goes to the field
watch(templates.aim, (a) => {
  if (!a || props.mode !== 'page' || a.pageId !== props.pageId) return
  templates.aim.value = null
  pickTemplate(a.id)
}, { immediate: true })

function pickTemplate(id: Id) {
  dest.value = home()
  once.value = false
  byTemplate.value = id
  void nextTick(() => field.value?.focus())
}

/** «Шаблоны» in the page's «Куда записать», after «Эта страница» and Авто; never on Сегодня or a page elsewhere */
function templateChoices() {
  const list = props.mode === 'page' ? page.value?.templates ?? [] : []
  if (!list.length) return undefined
  return {
    list: list.map(t => ({ id: t.id, name: t.name, brings: templateBrings(t) })),
    chosen: template.value?.id,
    run: pickTemplate
  }
}

/** On a record: a subitem, or with «В заметку» a paragraph at the end of its body; kept while the record is open */
const recordDest = ref<RecordDestKind>('sub')
watch(() => [props.recordId, props.templateId], () => {
  recordDest.value = 'sub'
})
const recordOwner = computed<BodyOwner | null>(() => props.templateId
  ? { kind: 'template', id: props.templateId }
  : props.recordId ? { kind: 'record', id: props.recordId } : null)
const recordName = computed(() => props.templateId ? data.templateOf(props.templateId)?.tpl.name ?? '' : data.records[props.recordId ?? '']?.text ?? '')
const recordChip = computed(() => recordDest.value === 'note'
  ? { label: 'В заметку', icon: 'cer:note', page: true, color: null }
  : { label: 'Подпункт', icon: 'cer:ring', page: true, color: null })
const chipAim = computed(() => props.mode === 'record'
  ? `Куда записать: «${recordChip.value.label}». Выбрать другое`
  : `Куда записать: «${page.value?.title || 'Без названия'}», по шаблону «${template.value?.name}». Выбрать другое`)

/** A subitem as a line of «Подпункты», or a paragraph «В заметку» tinted fresh, with the field ready for the next */
function writeOnRecord(t: string) {
  const owner = recordOwner.value
  if (!owner) return
  if (recordDest.value === 'note') {
    data.appendParagraph(owner, t)
    templates.noted(owner.id)
  } else if (owner.kind === 'template') {
    const tpl = data.templateOf(owner.id)?.tpl
    if (tpl) data.updateTemplate(owner.id, { subs: [...tpl.subs, capitalize(t)] })
  } else {
    const parent = data.records[owner.id]
    if (parent) data.addRecord({ pageId: parent.pageId, parentId: parent.id, text: capitalize(t) })
  }
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
    ? (recordDest.value === 'note' ? 'Новый абзац' : 'Новый подпункт')
    : props.mode === 'today'
      ? 'Запись на сегодня'
      : onCalendar.value
        ? `Запись на ${dayAim(onCalendar.value, now.value)}`
        : props.mode === 'page'
          ? (firstRecord.value ? 'Первая запись' : 'Новая запись')
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

/**
 * The last send from here, until the browser has kept it: when it refuses (out of space), the send is taken
 * back, its text returns to the field aimed the same way and the screen docks «Не сохранилось…» (v22, G2)
 */
let lastSend: { text: string, aim: 'auto' | Id, ids: () => Id[], entryId?: Id } | null = null
watch(() => data.writeFailed, (f) => {
  const s = lastSend
  if (!f || !s || !s.ids().some(id => f.ids.includes(id))) return
  lastSend = null
  if (s.entryId) journal.undo(s.entryId)
  else data.purgeRecords(s.ids())
  setText(s.text, s.aim)
  emit('failed', f.reason)
})

/** `record`: write it down even when it reads as a search («Записать «…»» in Поиск) */
async function submit(opts: { record?: boolean } = {}) {
  const t = text.value.trim()
  if (!t) return
  data.clearWriteFailed()
  const aimed = dest.value
  speech.stop()
  text.value = ''
  if (once.value) {
    dest.value = home()
    once.value = false
  }
  if (props.mode === 'record') {
    writeOnRecord(t)
    emit('sent', null)
    return
  }
  // Writing on a page into the page itself: plain records, no journal line; by a template each record gets its
  // body and subitems, with no toast and no receipt (v24, item 6), and the chip is the page again
  const target = aimed === 'auto' ? undefined : data.pages[aimed]
  if (props.mode === 'page' && target && target.id === props.pageId) {
    const p = target
    const by = template.value?.id
    byTemplate.value = null
    const drafts = p.kind === 'inbox' ? [{ text: capitalize(t), due: null, values: {} }] : onDay(draftsFor(t, p, Date.now()), onCalendar.value)
    const ids = [...drafts].reverse().map(d => data.addRecord({ pageId: p.id, text: d.text, due: d.due, values: d.values, via: 'manual' }).id)
    if (by) for (const id of ids) data.fillFromTemplate(id, by)
    lastSend = { text: t, aim: aimed, ids: () => ids }
    emit('sent', null)
    return
  }
  // Anywhere else: the screen docks the receipt, Уточнение or found card above this composer
  await journal.send(t, aimed, {
    today: props.mode === 'today' && aimed === 'auto',
    record: opts.record,
    onStart: (e) => {
      lastSend = { text: t, aim: aimed, entryId: e.id, ids: () => data.entries.find(x => x.id === e.id)?.recordIds ?? [] }
      emit('sent', e)
    }
  })
}

/** Puts text in the field with the keyboard open; an aim other than this composer's own lasts one send */
function setText(t: string, aim?: 'auto' | Id) {
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
  setText(r.text, r.aim)
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
    return submit({ record: true })
  }
})
</script>

<template>
  <div class="flex flex-col">
    <p
      v-if="guessLine"
      class="-mb-1 h-5 truncate pl-4 text-13 leading-5 text-toned"
      aria-hidden="true"
    >
      {{ guessLine.text }}
    </p>
    <form
      class="relative flex items-end gap-1 border border-default bg-default p-0.75 transition-[border-color] focus-within:border-line2 dark:border-line2"
      :class="multi ? 'rounded-pill-grown' : 'rounded-pill'"
      @submit.prevent="submit()"
    >
      <RecordDest
        v-if="mode === 'record'"
        v-model="recordDest"
        :name="recordName"
        @picked="field?.focus()"
      >
        <DestChip
          v-bind="chip"
          :aria-label="chipLabel"
          aria-haspopup="dialog"
        />
      </RecordDest>
      <DestChip
        v-else
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
      <div
        v-show="!speech.listening.value"
        class="grid min-w-0 flex-1"
      >
        <span
          ref="mirror"
          class="invisible col-start-1 row-start-1 max-h-32 overflow-hidden whitespace-pre-wrap break-words py-1.75 pr-1 pl-1 text-input leading-5.5"
          aria-hidden="true"
        >{{ text }}&#8203;</span>
        <textarea
          ref="field"
          v-model="text"
          rows="1"
          enterkeyhint="send"
          autocomplete="off"
          autocapitalize="sentences"
          :placeholder="hint"
          :aria-label="mode === 'record' ? (recordDest === 'note' ? 'Новый абзац' : 'Новый подпункт') : 'Новая запись'"
          class="no-scrollbar col-start-1 row-start-1 max-h-32 min-w-0 resize-none overflow-y-auto bg-transparent py-1.75 pr-1 pl-1 text-input leading-5.5 text-highlighted outline-none placeholder:truncate placeholder:text-dimmed"
          @keydown="onKey"
          @focus="emit('focus', true)"
          @blur="emit('focus', false)"
        />
      </div>

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
        :aria-label="mode === 'record' ? (recordDest === 'note' ? 'Добавить абзац' : 'Добавить подпункт') : 'Отправить'"
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
