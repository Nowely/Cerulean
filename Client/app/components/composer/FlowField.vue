<script setup lang="ts">
// The field (main flow, items 3–9, 12, 21–27): the one place to write on Главная and on pages. Closed it is a 44px pill:
// the place chip, the unsent words or an example, the mic. Open it is a card over the keyboard: the title line (17/24, a
// date tinted where it was typed), the note line, and a bar with the place chip, the date chip and ↑. With a model a line
// that holds several records shows them as a list, each row with its own place; without one a line is one record and goes
// where the chip says (Josh 28 Oct, 4 and 9). The chip names the place, tinted when Авто chose it; nothing on the way
// explains itself in words. A send keeps the field open and empty for the next record, and on Главная the place picked by
// hand stays (Josh 28 Oct, 3). «Отменить» gives the words back (Josh 28 Oct, 6).
import { computed, inject, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch, watchEffect } from 'vue'
import { useOnline } from '@vueuse/core'
import type { Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore, type Filed } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { UNDO_MS, useNotify } from '~/composables/useNotify'
import { useNow } from '~/composables/useNow'
import { useFind } from '~/composables/useFind'
import { useSpeech } from '~/composables/useSpeech'
import { useScreen } from '~/composables/useScreen'
import { useTemplates } from '~/composables/useTemplates'
import { useCreatePage } from '~/composables/useCreatePage'
import { usePlaces } from '~/composables/usePlaces'
import { askModel, ModelError, type ModelResult } from '~/domain/model'
import { fieldDate, readLine, readModel, type LineContext, type LineDraft } from '~/domain/auto'
import { cleanRecordText, isSearch, readDue } from '~/domain/parse'
import { dayKey, formatDue } from '~/domain/dates'
import { into } from '~/domain/text'
import { DOCK_LINE } from '~/composables/useDockEdge'
import { useCollecting } from '~/composables/useCollecting'
import { useCalendarDay } from '~/composables/useCalendarDay'
import { collects, firstDay, onlyCollects } from '~/domain/collect'
import ComposerField from './ComposerField.vue'
import MentionRow from './MentionRow.vue'
import PlaceChip from './PlaceChip.vue'
import PlacesPopover from './PlacesPopover.vue'

const props = withDefaults(defineProps<{
  /** home: Главная · page: a page's own field · today: Сегодня (Задачи, due today) */
  mode: 'home' | 'page' | 'today'
  pageId?: Id
}>(), { pageId: undefined })

const emit = defineEmits<{ open: [boolean] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const notify = useNotify()
const now = useNow()
const find = useFind()
const online = useOnline()
const templates = useTemplates()
const { list: listPage } = useCreatePage()
const { isDesktop } = useScreen()

const field = useTemplateRef<InstanceType<typeof ComposerField>>('field')
const noteEl = useTemplateRef<HTMLTextAreaElement>('noteEl')

// ---------- what is typed ----------

const open = ref(false)
/** Right after a send: the field stays open and empty with the keyboard, with no wash behind it (item 9) */
const sent = ref(false)
const title = ref('')
/** What the title's «@» chips point at */
const links = ref<Id[]>([])
const note = ref('')
/** The note line was filled by the model's reading, not typed: a new reading may replace it (item 23) */
const noteBy = ref<'model' | null>(null)
/** The date words dropped with a tap on the date chip: while typed the same, no date (item 7) */
const noDate = ref<string | null>(null)
/** The model's own date dropped the same way, for the words it was read from */
const noModelDue = ref<string | null>(null)
/**
 * A place picked by hand. On Главная it stays after the send and when Главная is opened again (Josh 28 Oct, 3); on a
 * page it holds for one record, as the page is the place there
 */
const picked = ref<Id | null>(props.mode === 'home' ? ui.homePlace : null)
watch(picked, (id) => {
  if (props.mode === 'home') ui.homePlace = id
})
/** Places picked on rows of the list, by the row's title (item 8) */
const rows = ref<Record<string, Id>>({})
/** The places popover: over the bar's chip, or over row `i`'s chip */
const pop = ref<'main' | number | null>(null)

watch(open, v => emit('open', v))
watch(title, (t) => {
  if (t.trim()) return
  if (noteBy.value === 'model') note.value = ''
  noteBy.value = null
})

// ---------- where it goes ----------

const page = computed(() => props.pageId ? data.pages[props.pageId] : undefined)
const todo = computed(() => data.livePages.find(p => p.kind === 'page' && p.template === 'todo' && !onlyCollects(p)))
/** The view this page shows while it collects from other pages (v24): Авто chooses, unless it collects from one page */
const collecting = useCollecting()
const collectView = computed(() => {
  const c = collecting.value
  if (props.mode !== 'page' || !c || c.pageId !== props.pageId) return null
  const v = data.pages[c.pageId]?.views.find(x => x.id === c.viewId)
  return v && collects(v) ? v : null
})
/** The page's calendar has a day selected: a record with no date of its own gets it (v22, G6) */
const calendar = useCalendarDay()
const day = computed(() => {
  if (collectView.value) return firstDay(collectView.value, now.value)
  const c = calendar.value
  return props.mode === 'page' && c && c.pageId === props.pageId && !picked.value ? c.date : null
})
/** The place the screen gives: the page itself, Задачи on Сегодня, none on Главная (Авто chooses) */
const home = computed<{ pageId: Id, by: 'page' } | null>(() => {
  const v = collectView.value
  if (v) return v.from === 'pick' && v.pages?.length === 1 ? { pageId: v.pages[0]!, by: 'page' } : null
  if (props.mode === 'page' && page.value) return { pageId: page.value.id, by: 'page' }
  if (props.mode === 'today' && todo.value) return { pageId: todo.value.id, by: 'page' }
  return null
})
/** A page picked by hand that was deleted meanwhile is no place: the chip is back to Входящие (or Авто) */
const pickedLive = computed(() => picked.value && data.pages[picked.value] && !data.pages[picked.value]!.deletedAt ? picked.value : null)
const place = computed<LineContext['place']>(() => pickedLive.value ? { pageId: pickedLive.value, by: 'user' } : home.value)

/** The places on offer: Входящие, then the pages as Главная lists them (Избранное, Мои страницы, the sections) */
const places = usePlaces()

/**
 * A page's template aimed by «+» on its «Шаблоны» row (v24): the next record is made by it. A computer's pages have no
 * field, so Главная's takes the aim, with that page picked as its place (computer delta, item 6)
 */
const byTemplate = ref<Id | null>(null)
watch(templates.aim, (a) => {
  if (!a) return
  if (props.mode === 'page' ? a.pageId !== props.pageId : props.mode !== 'home' || !isDesktop.value) return
  templates.aim.value = null
  if (props.mode === 'home') picked.value = a.pageId
  byTemplate.value = a.id
  openField()
}, { immediate: true })
const template = computed(() => {
  const of = page.value ?? (pickedLive.value ? data.pages[pickedLive.value] : undefined)
  return byTemplate.value ? of?.templates?.find(t => t.id === byTemplate.value) ?? null : null
})

const modelOn = computed(() => journal.hasModel() && online.value)

const ctx = computed<LineContext>(() => ({
  pages: journal.targets(),
  inboxId: data.inbox.id,
  learned: data.learned,
  recent: data.recent,
  now: now.value,
  place: place.value,
  rows: rows.value,
  noDate: noDate.value,
  today: props.mode === 'today',
  day: day.value,
  sort: modelOn.value
}))

/** The rules' reading, at once on every key; the word being typed is not a detail word yet (item 8) */
const rules = computed(() => readLine(title.value, note.value, { ...ctx.value, live: true }))

// ---------- the model reads after a pause in typing (items 21–23) ----------

const reading = shallowRef<{ stamp: string, result: ModelResult } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let reader: AbortController | null = null
/** What the person typed since the last reading: that reading is old, its list dims and its chips wait */
const fresh = computed(() => !!reading.value && reading.value.stamp === title.value)
const modelDrafts = computed(() => reading.value ? readModel(reading.value.result, reading.value.stamp, note.value, ctx.value) : null)

watch(title, (t) => {
  clearTimeout(timer)
  if (!modelOn.value || !t.trim() || isSearch(t)) {
    reader?.abort()
    if (!t.trim()) reading.value = null
    return
  }
  timer = setTimeout(() => void read(t), 650)
})
async function read(t: string) {
  // One reading at a time: the one in flight is for words that are gone
  reader?.abort()
  const mine = new AbortController()
  reader = mine
  try {
    const result = await askModel(data.settings, t, journal.targets(), Date.now(), mine.signal)
    if (mine.signal.aborted || title.value !== t) return
    if (data.settings.keyState !== 'ok') data.setSettings({ keyState: 'ok' })
    reading.value = { stamp: t, result }
    fillFromReading()
  } catch (e) {
    const reason = e instanceof ModelError ? e.reason : 'other'
    if (reason === 'key' || reason === 'model') data.setSettings({ keyState: 'bad' })
  } finally {
    if (reader === mine) reader = null
  }
}
/** One record: the model fills the note line when it is empty or was its own; it never replaces what was typed */
function fillFromReading() {
  const d = modelDrafts.value
  if (!d || d.length !== 1) return
  if (!note.value.trim() || noteBy.value === 'model') {
    note.value = d[0]!.note
    noteBy.value = d[0]!.note ? 'model' : null
  }
}
onBeforeUnmount(() => {
  clearTimeout(timer)
  reader?.abort()
})

// ---------- what the field shows ----------

/** Several records: the list under the title, from the model's reading or the rules (item 8) */
const list = computed<{ drafts: LineDraft[], stale: boolean } | null>(() => {
  const m = modelDrafts.value
  if (m && m.length > 1) return { drafts: m, stale: !fresh.value }
  if (m && fresh.value) return null
  const r = rules.value.drafts
  return r.length > 1 ? { drafts: r, stale: false } : null
})
/** One record: the model's when its reading is for these words, else the rules' */
const single = computed<LineDraft | null>(() => {
  const m = modelDrafts.value
  if (m && fresh.value && m.length === 1) return m[0]!
  return rules.value.drafts[0] ?? null
})
const chipPage = computed(() => place.value?.pageId ?? single.value?.pageId ?? data.inbox.id)
const chipAuto = computed(() => !place.value && chipPage.value !== data.inbox.id)
/** With a model, Главная's list starts with «Авто»; it carries the tick while the model chooses (Josh 28 Oct, 3) */
const autoRow = computed(() => props.mode === 'home' && modelOn.value && pop.value === 'main' ? { on: !place.value } : null)
const chipName = computed(() => template.value ? template.value.name : data.pages[chipPage.value]?.title || 'Без названия')

/** The date in the title line: what the rules read there, else the model's own; null once its chip was tapped */
const date = computed(() => fieldDate(title.value, now.value, noDate.value))
const modelDue = computed(() => fresh.value && single.value?.due && noModelDue.value !== title.value && !readDue(title.value, now.value).due ? single.value.due : null)
const due = computed(() => date.value?.due ?? modelDue.value)
const dueText = computed(() => due.value ? formatDue(due.value, now.value) : '')
const marks = computed(() => date.value?.spans ?? [])

/**
 * An example until the person's own first record exists anywhere (with a model, one that holds two records), then the
 * action's name. «Быстрый старт» is not theirs (Josh 28 Oct, 5)
 */
const anyRecord = computed(() => data.liveRecords.some(r => !r.seed))
// On a computer the field says «Записать…» (Telegram's «Написать сообщение…»), so it does not read as a second «+ Новая
// запись» beside the page's own row (computer delta, item 7)
const action = computed(() => isDesktop.value ? 'Записать…' : 'Новая запись')
const placeholder = computed(() => props.mode !== 'home' ? '' : anyRecord.value ? action.value : modelOn.value ? 'Купить хлеб и позвонить маме завтра' : 'Позвонить маме в 10')
/** Open on a page the title line names the action, so «Заметка» is never the card's first words (item 12) */
const openPlaceholder = computed(() => placeholder.value || action.value)
const hasWords = computed(() => !!title.value.trim())

// ---------- open and close ----------

/** Open with the caret at the end of the title, in the same tap, so a phone brings its keyboard up */
function openField(opts: { places?: boolean } = {}) {
  open.value = true
  sent.value = false
  if (opts.places) pop.value = 'main'
  focusTitle()
}
function focusTitle() {
  field.value?.focus()
  void nextTick(() => field.value?.focus())
}
/** Put away: the words stay, in ink, in the closed pill */
function close() {
  open.value = false
  pop.value = null
  field.value?.blur()
  noteEl.value?.blur()
}
/** Desktop has no wash: the field closes when the focus leaves it with nothing typed */
const card = useTemplateRef<HTMLElement>('card')
function focusOut(e: FocusEvent) {
  if (!isDesktop.value || hasWords.value || note.value.trim()) return
  const to = e.relatedTarget as Node | null
  if (to && card.value?.contains(to)) return
  close()
}
defineExpose({ close, open: () => openField(), isOpen: open })

// The note line grows to five lines, then scrolls
function grow() {
  const el = noteEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 110)}px`
}
watch(note, () => nextTick(grow))

// ---------- the chips ----------

function togglePlaces(at: 'main' | number) {
  if (list.value?.stale && at !== 'main') return
  pop.value = pop.value === at ? null : at
}
function pick(id: Id) {
  const at = pop.value
  pop.value = null
  if (typeof at === 'number') {
    const d = list.value?.drafts[at]
    if (d) rows.value = { ...rows.value, [d.text]: id }
  } else {
    byTemplate.value = null
    picked.value = home.value?.pageId === id ? null : id
  }
  focusTitle()
}
/** «Авто» hands the choice back to the model */
function pickAuto() {
  pop.value = null
  byTemplate.value = null
  picked.value = null
  focusTitle()
}
/** «Новая страница» in the list: a plain list under «Мои страницы» (or the page of that name), picked for the record */
function pickNew(name: string) {
  pick(listPage(name).id)
}
const popCurrent = computed(() => autoRow.value?.on ? null : typeof pop.value === 'number' ? list.value?.drafts[pop.value]?.pageId ?? chipPage.value : chipPage.value)
/** A tap on the date drops it: the words stay as typed, and editing them reads the date again */
function dropDate() {
  if (date.value) noDate.value = date.value.words
  else if (modelDue.value) noModelDue.value = title.value
  focusTitle()
}

// ---------- dictation (item 27): the words go into the title line and are read like typed ones ----------

const speech = useSpeech((t) => {
  title.value = t
})
function dictate() {
  if (!online.value) {
    notify('Диктовка без сети не работает')
    return
  }
  if (speech.listening.value) return speech.stop()
  if (!open.value) openField()
  speech.start(title.value.trim())
}
watch(speech.error, (e) => {
  if (e) notify(e)
})

// ---------- «@» ----------

const mention = computed(() => field.value?.mention ?? null)
const dockLine = inject(DOCK_LINE, null)
watchEffect(() => {
  if (dockLine) dockLine.value = !!mention.value
})
onBeforeUnmount(() => {
  if (dockLine) dockLine.value = false
})

// ---------- send (items 9, 12, 24) ----------

/** The record shows where it was written: on this page, or on Сегодня when it is due today */
function here(d: LineDraft): boolean {
  if (props.mode === 'page') return !collectView.value && d.pageId === props.pageId
  if (props.mode === 'today') return !!d.due && d.due.date <= dayKey(Date.now())
  return false
}

/** «A, B и C» */
function namesOf(ids: Id[]): string {
  const names = ids.map(id => data.pages[id]?.title || 'Без названия')
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} и ${names[names.length - 1]}` : names[0] ?? ''
}

/** The notice of the latest send, so leaving the screen takes it, and a late reading of the same send can follow it */
let sendNotice: { id: number, entryId: Id } | null = null
const NOTICE_MS = 6000

/** What was in the field at a send: «Отменить» puts it back as it was (Josh 28 Oct, 6) */
interface Typed {
  title: string
  links: Id[]
  note: string
  noteBy: 'model' | null
  noDate: string | null
  noModelDue: string | null
  picked: Id | null
  byTemplate: Id | null
}

/** After a send: Главная's cards light up, and the notice names where the records went that do not show here */
function landed(f: Filed, drafts: LineDraft[], typed: Typed, late = false) {
  const away = drafts.filter(d => !here(d))
  if (props.mode === 'home') {
    const at = Date.now()
    ui.freshPages = { ...ui.freshPages, ...Object.fromEntries([...new Set(away.map(d => d.pageId))].map(id => [id, at])) }
  }
  if (late && (!sendNotice || sendNotice.entryId !== f.entryId || ui.notice?.id !== sendNotice.id)) return
  if (!away.length) {
    if (late && sendNotice && ui.notice?.id === sendNotice.id) ui.notice = null
    return
  }
  const id = notify(`Добавлено ${into(namesOf([...new Set(away.map(d => d.pageId))]))}`, { label: 'Отменить', run: () => undoSend(f, typed) }, NOTICE_MS)
  sendNotice = { id, entryId: f.entryId }
}
/**
 * «Отменить»: every record of that send goes, the cards are as they were, and the field opens with exactly what was
 * sent, the caret at the end of the title, so a change and Enter send it again (Gmail's «Undo send» reopens the draft)
 */
function undoSend(f: Filed, typed: Typed) {
  journal.undo(f.entryId)
  const tints = { ...ui.freshPages }
  for (const id of f.pages) delete tints[id]
  ui.freshPages = tints
  title.value = typed.title
  links.value = typed.links
  note.value = typed.note
  noteBy.value = typed.noteBy
  noDate.value = typed.noDate
  noModelDue.value = typed.noModelDue
  picked.value = typed.picked
  byTemplate.value = typed.byTemplate
  open.value = true
  sent.value = false
  focusTitle()
}
// Writing the next record puts the last send's notice away: its «Отменить» would give the words back over new ones
watch(title, (t) => {
  if (t.trim() && sendNotice && ui.notice?.id === sendNotice.id) ui.notice = null
})
onBeforeUnmount(() => {
  if (sendNotice && ui.notice?.id === sendNotice.id) ui.notice = null
})

/** The words of a record whose own note was typed: the title as typed, cleaned by the rules */
const typedTitle = (t: string) => rules.value.drafts.length === 1 ? rules.value.drafts[0]!.text : cleanRecordText(readDue(t, Date.now()).rest || t)

/** Send what is typed; `stay` keeps the field open and empty with the keyboard for the next record (item 9) */
function send(stay = true) {
  const t = title.value.trim()
  if (!t) return
  data.clearWriteFailed()
  speech.stop()
  pop.value = null
  // Only an explicit search goes to Поиск («найди…», «где…»): everything else is written down
  if (isSearch(t)) {
    find.open(t.replace(/^\S+\s*/, ''))
    reset()
    return
  }
  const m = modelDrafts.value
  const ready = !!m?.length && fresh.value
  let drafts: LineDraft[]
  if (ready && m!.length === 1) {
    // One record: what is filed is what was on screen. The model's title goes only with its own note in the note line
    const d0 = m![0]!
    const shown = noteBy.value === 'model' || !d0.note
    drafts = [{ ...d0, text: shown ? d0.text : typedTitle(t), note: note.value.trim(), due: due.value ?? d0.due, pageId: chipPage.value, by: place.value?.by ?? 'auto' }]
  } else {
    // On send every word is finished: «… и по» is read with «по» as a detail word
    drafts = ready ? m! : readLine(title.value, note.value, ctx.value).drafts
  }
  if (!drafts.length) return
  const tpl = template.value
  const typedNote = note.value.trim()
  const lineCtx = ctx.value
  const typed: Typed = { title: title.value, links: links.value, note: note.value, noteBy: noteBy.value, noDate: noDate.value, noModelDue: noModelDue.value, picked: picked.value, byTemplate: byTemplate.value }
  const filed = journal.write(t, drafts, { here, links: links.value })
  if (tpl) for (const id of filed.ids) data.fillFromTemplate(id, tpl.id)
  // With a model, a place picked by hand teaches Авто that word, silently (item 5); without one nothing is learned
  if (modelOn.value) for (const d of drafts) if (d.by === 'user') data.teach(d.text, d.pageId)
  last = { text: title.value, links: links.value, ids: filed.ids, entryId: filed.entryId }
  landed(filed, drafts, typed)
  // The send never waits for the model: when it reads these words later, the records are filed again (item 24)
  if (modelOn.value && !ready && !(readDue(t, Date.now()).due && !date.value)) {
    const keepTitle = (d: LineDraft): LineDraft => typedNote ? { ...d, text: typedTitle(t), note: typedNote } : d
    void journal.lateRead(filed, t, typedNote, lineCtx, { here, keepTitle }, (again) => {
      const read = again.ids.map(id => data.records[id]).filter(r => !!r).map(r => ({ pageId: r!.pageId, due: r!.due } as LineDraft))
      landed(again, read, typed, true)
    })
  }
  reset()
  if (!stay) return
  sent.value = true
  focusTitle()
}

// «Записать «гараж»» in Поиск: Главная's field sends the words like any send (v22, N19)
watch(() => ui.outbox, (t) => {
  if (!t || props.mode !== 'home') return
  ui.outbox = null
  title.value = t
  send(false)
}, { immediate: true })

function reset() {
  title.value = ''
  links.value = []
  note.value = ''
  noteBy.value = null
  noDate.value = null
  noModelDue.value = null
  rows.value = {}
  if (props.mode !== 'home') picked.value = null
  byTemplate.value = null
  reading.value = null
}

// A send the browser could not keep (out of space): taken back, its words return to the field
let last: { text: string, links: Id[], ids: Id[], entryId: Id } | null = null
watch(() => data.writeFailed, (f) => {
  const s = last
  if (!f || !s || !s.ids.some(id => f.ids.includes(id))) return
  last = null
  journal.undo(s.entryId)
  title.value = s.text
  links.value = s.links
  notify(f.reason === 'quota' ? 'Не сохранилось: в браузере нет места' : 'Не сохранилось', { label: 'Повторить', run: () => send(false) }, UNDO_MS)
})

/** Enter in the note line is a new line; Enter in the title sends (Shift+Enter breaks the line) */
function noteKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
/** Esc puts the field away; while the «@» row is open the Esc is the row's own and never comes here */
function titleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
</script>

<template>
  <div class="relative">
    <!-- Behind the open field the screen dims; a tap there puts the field away and keeps the words (item 4) -->
    <button
      v-if="open && !sent && !isDesktop"
      type="button"
      class="field-wash fixed inset-0 z-2 cursor-default"
      aria-label="Свернуть поле"
      tabindex="-1"
      @click="close"
    />

    <!-- Over the wash with the card, so its chips take the tap -->
    <MentionRow
      v-if="mention && open"
      class="relative z-3"
      :mention="mention"
      @pick="t => field?.pick(t)"
      @closed="focusTitle"
    />

    <!-- Closed: the pill. The words not yet sent stay in ink («Продолжить: …») -->
    <div
      v-if="!open"
      class="relative z-3 flex min-h-11 items-center gap-0.5 rounded-pill border border-line2 bg-elev p-0.75"
      data-field="closed"
    >
      <PlaceChip
        :name="chipName"
        :auto="chipAuto && hasWords"
        data-places-chip
        data-chip="closed"
        :aria-label="`Куда: ${chipName}. Выбрать другое место`"
        @click="openField({ places: true })"
      />
      <button
        type="button"
        class="-my-0.75 h-11 min-w-0 flex-1 cursor-text truncate px-1.5 text-left text-input leading-11"
        :class="hasWords ? 'text-highlighted' : 'text-dimmed'"
        :aria-label="hasWords ? `Продолжить: ${title}` : mode === 'home' ? (isDesktop ? 'Записать' : 'Новая запись') : 'Поле записи'"
        @click="openField()"
      >
        {{ hasWords ? title : placeholder }}
      </button>
      <!-- Offline the mic is faint and a tap says why (spec «Action weight»). A computer has no mic (computer delta, item 7) -->
      <button
        v-if="speech.supported && !isDesktop"
        type="button"
        class="hit-44 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full"
        :class="online ? 'text-toned active:bg-pressed' : 'text-dimmed'"
        :aria-label="online ? 'Надиктовать' : 'Надиктовать: без сети не работает'"
        :aria-disabled="!online || undefined"
        @click="dictate"
      >
        <UIcon
          name="i-lucide-mic"
          class="size-5"
        />
      </button>
    </div>

    <!-- Open: the card over the keyboard. Mounted while closed too (unseen), so a tap on the pill focuses it at once -->
    <form
      ref="card"
      class="flex flex-col gap-0.5 rounded-sheet border border-line bg-elev pt-2.5 pr-1.5 pb-1.5 pl-1.5 shadow-float dark:border-line2 lg:shadow-none lg:focus-within:border-ring"
      :class="open ? 'relative z-3' : 'pointer-events-none absolute inset-x-0 bottom-0 -z-1 opacity-0'"
      :aria-hidden="open ? undefined : 'true'"
      data-field="open"
      @submit.prevent="send()"
      @focusout="focusOut"
    >
      <ComposerField
        ref="field"
        v-model="title"
        v-model:links="links"
        label="Запись"
        :placeholder="openPlaceholder"
        mentions
        field-class="px-2.5 py-0.5"
        text-class="text-17 leading-6"
        :marks="marks"
        @enter="send()"
        @keydown="titleKey"
        @focus="v => v && !open && openField()"
      />
      <textarea
        v-if="!list"
        ref="noteEl"
        v-model="note"
        rows="1"
        class="no-scrollbar block max-h-27.5 min-h-6.5 w-full resize-none overflow-y-auto bg-transparent px-2.5 py-0.5 text-input leading-5.5 text-default outline-none placeholder:text-dimmed"
        style="caret-color: var(--accent)"
        placeholder="Заметка"
        aria-label="Заметка"
        autocomplete="off"
        autocapitalize="sentences"
        @input="noteBy = null"
        @keydown="noteKey"
      />

      <!-- Several records: what will be added, each with its own place; a newer reading on its way dims it -->
      <ul
        v-if="list"
        class="mx-1 mt-1.5 flex flex-col border-t border-line transition-opacity duration-150 dark:border-line2"
        :class="{ 'pointer-events-none opacity-50': list.stale }"
        :aria-label="`Будет добавлено: ${list.drafts.length}`"
      >
        <li
          v-for="(d, i) in list.drafts"
          :key="i"
          class="rise-in relative flex min-h-11 items-start gap-2.5 py-2 pr-0 pl-1.5 not-first:border-t not-first:border-line dark:not-first:border-line2"
        >
          <span
            class="mx-1.5 mt-2 size-1.5 shrink-0 rounded-full bg-faint"
            aria-hidden="true"
          />
          <span class="flex min-w-0 flex-1 flex-col gap-px">
            <span class="text-base leading-5.5 break-words text-highlighted">{{ d.text }}</span>
            <span
              v-if="d.due || d.note"
              class="text-sm leading-4.75 break-words text-toned"
            ><span
              v-if="d.due"
              class="text-accent-ink"
            >{{ formatDue(d.due, now) }}</span><template v-if="d.due && d.note"> · </template>{{ d.note }}</span>
          </span>
          <span class="relative -mt-0.75">
            <PlaceChip
              :name="data.pages[d.pageId]?.title || 'Без названия'"
              :auto="d.by === 'auto' && d.pageId !== data.inbox.id"
              small
              data-places-chip
              data-chip="row"
              :aria-label="`Куда: ${data.pages[d.pageId]?.title || 'Без названия'}. Выбрать другое место`"
              :aria-expanded="pop === i"
              @click="togglePlaces(i)"
            />
          </span>
        </li>
      </ul>

      <div class="mt-1 flex items-center gap-1">
        <span
          v-if="!list"
          class="relative"
        >
          <PlaceChip
            :name="chipName"
            :auto="chipAuto && !template"
            data-places-chip
            data-chip="main"
            :aria-label="`Куда: ${chipName}. Выбрать другое место`"
            :aria-expanded="pop === 'main'"
            @click="togglePlaces('main')"
          />
        </span>
        <button
          v-if="due && !list"
          type="button"
          class="relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.25 rounded-item bg-accent-soft pr-2.25 pl-1.75 text-13 font-medium whitespace-nowrap text-accent-ink after:absolute after:inset-x-0 after:-inset-y-2"
          :aria-label="`Срок: ${dueText}. Убрать срок`"
          data-date-chip
          @pointerdown.prevent
          @mousedown.prevent
          @click="dropDate"
        >
          <UIcon
            name="i-lucide-calendar"
            class="size-3.5"
          />{{ dueText }}<UIcon
            name="i-lucide-x"
            class="ml-px size-3 opacity-70"
          />
        </button>
        <span class="flex-1" />
        <button
          v-if="hasWords"
          type="submit"
          class="hit-44 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-on-accent"
          aria-label="Записать"
          @pointerdown.prevent
          @mousedown.prevent
        >
          <UIcon
            name="i-lucide-arrow-up"
            class="size-4.5"
          />
        </button>
        <button
          v-else-if="speech.supported && !isDesktop"
          type="button"
          class="hit-44 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full active:bg-pressed"
          :class="speech.listening.value ? 'text-accent-ink' : online ? 'text-toned' : 'text-dimmed'"
          :aria-label="speech.listening.value ? 'Остановить диктовку' : online ? 'Надиктовать' : 'Надиктовать: без сети не работает'"
          :aria-disabled="!online || undefined"
          :aria-pressed="speech.listening.value"
          @pointerdown.prevent
          @mousedown.prevent
          @click="dictate"
        >
          <UIcon
            name="i-lucide-mic"
            class="size-5"
          />
        </button>
      </div>

      <PlacesPopover
        v-if="pop !== null && open"
        :pages="places"
        :current="popCurrent"
        :end="typeof pop === 'number'"
        :auto="autoRow"
        @pick="pick"
        @auto="pickAuto"
        @create="pickNew"
        @back="focusTitle"
        @close="pop = null"
      />
    </form>
  </div>
</template>
