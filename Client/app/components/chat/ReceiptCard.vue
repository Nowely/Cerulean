<script setup lang="ts">
// Квитанция: what was created and where, on Поиск's row grid (glyph or mark at 12px, text at 42px, record rows
// 36px). «Не туда» is always the quiet header button; the footer holds only «Отменить» while fresh, whose countdown
// is a line along its own bottom edge (15 s in Журнал, 10 s after the last send when docked, paused while touched or
// open). After that only «Отменить» goes: the receipt and its «Не туда» stay.
// Docked above a composer a series of sends to one page reads as one receipt: «Отменить «Яблоки»» takes back the
// latest send (its rows tinted fresh), «Не туда» moves them all. With the keyboard up it is one 44px line.
// v22: rows have no checkbox (nobody ticks what they just wrote): a dot, or the grey page glyph when the rows went
// to different pages («2 записи → Покупки, Задачи», each row names its page and has its own «→», no «Не туда»).
// A series gives each row its «→» too. Notes say why Авто filed it the plain way, with the one action that helps
// («Повторить», «Проверить ключ»); a question written down lists «Похожее в записях».
// v22: a row repeating an open record on its page says «уже есть в списке, 2 л» with «Объединить» (G3); after a page
// was chosen by hand the note offers «Запомнить» (U5). Both change the card in place, with no notice.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from '#imports'
import type { Entry, Id, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore, type Choice } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { usePeek } from '~/composables/usePeek'
import { useScreen } from '~/composables/useScreen'
import { useNotify } from '~/composables/useNotify'
import { count, RECORD_FORMS } from '~/domain/text'
import { duplicateWords } from '~/domain/merge'
import PageTile from '../common/PageTile.vue'
import DueButton from '../record/DueButton.vue'
import PlaceChips from './PlaceChips.vue'

const CHAT_MS = 15_000
const DOCK_MS = 10_000

const props = withDefaults(defineProps<{
  entry: Entry
  /** Docked: the sends joined into this receipt, oldest first, ending with `entry` */
  series?: Entry[]
  /** Floated above a composer: a 10 s window */
  docked?: boolean
  /** Docked on Главная: the footer also has «в Журнале ›» */
  chatLink?: boolean
  /** The keyboard is up on a phone: one line, a tap opens the card */
  line?: boolean
}>(), { series: undefined, docked: false, chatLink: false, line: false })
const emit = defineEmits<{ open: [], undone: [entry: Entry] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const router = useRouter()
const { peek } = usePeek()
const { isDesktop } = useScreen()
const notify = useNotify()

const sends = computed(() => props.series?.length ? props.series : [props.entry])
const page = computed<Page | undefined>(() => props.entry.pageId ? data.pages[props.entry.pageId] : undefined)
const recsOf = (e: Entry) => (e.recordIds ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && !r.deletedAt)
/** A row per record of the sends; a record merged away shows the one it went into (`merged`) */
interface Row { key: Id, rec: Rec, entry: Entry, merged: boolean }
const rowsOf = (e: Entry): Row[] => (e.recordIds ?? []).flatMap((id): Row[] => {
  const r = data.records[id]
  if (r && !r.deletedAt) return [{ key: id, rec: r, entry: e, merged: false }]
  const into = e.merged?.[id] ? data.records[e.merged[id]] : undefined
  return into && !into.deletedAt ? [{ key: id, rec: into, entry: e, merged: true }] : []
})
const rows = computed(() => sends.value.flatMap(rowsOf))
const records = computed(() => rows.value.map(x => x.rec))
const lastIds = computed(() => new Set(props.entry.recordIds ?? []))
const fresh = computed(() => journal.fresh.has(props.entry.id))
const offline = computed(() => props.entry.kind === 'offline')
/** In a series «Отменить» names what it takes back */
const joined = computed(() => sends.value.length > 1)
const undoLabel = computed(() => {
  if (!joined.value) return 'Отменить'
  const last = recsOf(props.entry)
  return last.length === 1 ? `Отменить «${last[0]!.text}»` : `Отменить последние ${last.length}`
})
const title = computed(() => count(records.value.length || (props.entry.recordIds?.length ?? 0), RECORD_FORMS))
/** The pages the rows are on, in row order: more than one makes the receipt a list for several pages */
const places = computed(() => [...new Set(records.value.map(r => r.pageId))].map(id => data.pages[id]).filter((p): p is Page => !!p))
const several = computed(() => places.value.length > 1)
/** A split send or a series: every row has its own «→» */
const rowMoves = computed(() => sends.value.some(e => e.split) || joined.value)
const wrongShown = computed(() => !offline.value && !several.value && !sends.value.some(e => e.split))
const similar = computed(() => (props.entry.similar ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && !r.deletedAt))
const NOTES = {
  slow: { icon: 'i-lucide-clock', text: 'ИИ не ответил, запись ждёт во Входящих.', action: 'Повторить' },
  key: { icon: 'cer:auto', text: 'Разложено по простым правилам: ключ не принят.', action: 'Проверить ключ' }
} as const
/** A page chosen by hand: «Запомнить» writes the line into its «Описание для Авто», «Отменить» takes it out */
const learn = computed(() => {
  const e = props.entry
  if (!e.learn || !page.value || page.value.kind !== 'page' || several.value) return null
  const name = page.value.title || 'Без названия'
  return e.learned
    ? { icon: 'i-lucide-bookmark', text: `Запомнено в описании «${name}».`, action: 'Отменить' }
    : { icon: 'i-lucide-bookmark', text: `Запомнить: такое класть в «${name}».`, action: 'Запомнить' }
})
const note = computed(() => props.entry.note && !props.entry.moved ? NOTES[props.entry.note] : learn.value)
async function onNote() {
  const e = props.entry
  if (!e.note || e.moved) return e.learned ? journal.forget(e.id) : journal.remember(e.id)
  if (e.note === 'key') return void router.push('/settings?key')
  await journal.retry(e.id)
  // The record still waits in Входящие; the card stays and the notice says the second try failed too
  if (e.note === 'slow') notify('ИИ снова не ответил', undefined, undefined, { keepCard: true })
}

/** «Объединить» is offered while the receipt is fresh, or docked above the composer */
const offerMerge = computed(() => (fresh.value || props.docked) && !offline.value)
function duplicate(row: Row) {
  if (row.merged || !offerMerge.value) return null
  const dup = journal.duplicateFor(row.entry.id, row.rec.id)
  return dup ? duplicateWords(dup, data.pages[dup.pageId]) : null
}
const made = computed(() => sends.value.some(e => e.made) && !props.entry.moved)
const resumed = computed(() => !!props.entry.resumed && !props.entry.moved)

/** Line 2 of a record row: its page when the rows went to several pages, a state, or nothing (a date is its own button) */
function subOf(row: Row, i: number): string {
  const r = row.rec
  if (offline.value) return 'ждёт сети'
  if (row.merged) return 'объединено с записью в списке'
  const dup = duplicate(row)
  if (dup) return dup.sub
  if (several.value) return [data.pages[r.pageId]?.title || 'Без названия', r.tags.includes('clarify') ? 'уточнить' : ''].filter(Boolean).join(' · ')
  if (made.value && i === 0) return 'новая страница из шаблона'
  if (resumed.value) return 'разобрано, когда появилась сеть'
  return ''
}

/** «→» on a row: the page picker for that record alone; the row changes in place, no toast */
function moveRow(r: Rec) {
  const e = sends.value.find(x => x.recordIds?.includes(r.id))
  if (!e) return
  ui.pick({ title: 'Переместить', subtitle: r.text, current: r.pageId, run: c => journal.chooseOne(e.id, r.id, c) })
}

// ---------- the undo window runs on its own clock so pausing is exact; the line only shows it ----------

const wrongOpen = ref(false)
const hovered = ref(false)
const focused = ref(false)
const paused = computed(() => hovered.value || focused.value || wrongOpen.value || !!ui.picker)
const ms = computed(() => props.docked ? DOCK_MS : CHAT_MS)
const run = ref(0)
let left = 0
let started = 0
let timer: ReturnType<typeof setTimeout> | undefined

function arm() {
  left = ms.value
  run.value++
  start()
}
function start() {
  clearTimeout(timer)
  timer = undefined
  if (!fresh.value || paused.value) return
  started = Date.now()
  timer = setTimeout(expire, left)
}
function hold() {
  if (!timer) return
  clearTimeout(timer)
  timer = undefined
  left = Math.max(0, left - (Date.now() - started))
}
function expire() {
  for (const e of sends.value) journal.settle(e.id)
}
onMounted(arm)
onBeforeUnmount(() => clearTimeout(timer))
watch(paused, p => p ? hold() : start())
// A new send joined the receipt: the window starts again
watch(() => props.entry.id, arm)

/** «Отменить»: the latest send goes, its text comes back to the composer aimed at the same page for that one send */
function undo() {
  const e = props.entry
  const aim = e.pageId && e.pageId !== data.inbox.id && !e.made ? e.pageId : 'auto'
  journal.undo(e.id)
  ui.refill = { text: e.text, aim }
  wrongOpen.value = false
  emit('undone', e)
}

function choose(c: Choice) {
  const target = journal.chooseAll(sends.value.map(e => e.id), c)
  wrongOpen.value = false
  if (target && 'newPage' in c && !c.newPage.trim()) {
    ui.focusTitle = target.id
    void router.push(`/p/${target.id}`)
  }
}

function openHead() {
  if (props.line) return emit('open')
  if (!several.value && page.value) peek({ kind: 'page', id: page.value.id })
}

/** Inside a docked card the pressed state needs the raised fill so it never merges with the chips under it */
const quiet = 'flex h-8 shrink-0 cursor-pointer items-center rounded-item text-13 font-medium text-toned hover:bg-btn hover:text-highlighted active:bg-btn-pressed aria-pressed:bg-btn-pressed aria-pressed:text-highlighted'
</script>

<template>
  <div
    class="relative overflow-hidden rounded-card"
    :class="docked ? 'raised bg-default shadow-float dark:ring dark:ring-inset dark:ring-line2' : 'bg-card'"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @touchstart.passive="hovered = true"
    @touchend.passive="hovered = false"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <div
      v-if="entry.kind === 'undone'"
      class="flex min-h-11 items-center gap-3 px-3 text-meta text-toned"
    >
      <UIcon
        name="i-lucide-undo-2"
        class="size-4.5"
      />Отменено, ничего не записано
    </div>
    <template v-else>
      <div
        class="flex min-h-11 items-center pr-1.5"
        @pointerdown="line && $event.preventDefault()"
      >
        <button
          type="button"
          class="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 pl-3 text-left text-sm text-toned active:bg-pressed"
          :class="line ? 'pr-0' : 'pr-1'"
          :aria-expanded="line ? false : undefined"
          @click="openHead"
        >
          <UIcon
            v-if="several"
            name="cer:auto"
            class="size-4.5 shrink-0 text-toned"
          />
          <PageTile
            v-else
            :glyph="page?.glyph"
          />
          <span class="min-w-0 flex-1 truncate">
            {{ title }} → <b class="font-medium text-highlighted">{{ several ? places.map(p => p.title || 'Без названия').join(', ') : page?.title || 'Без названия' }}</b>
          </span>
          <!-- Desktop: the head is a link to the page in the panel, no chevron (Home); a folded line keeps it -->
          <UIcon
            v-if="line || !several"
            name="i-lucide-chevron-right"
            class="size-4 shrink-0 text-dimmed"
            :class="line ? '' : 'lg:hidden'"
          />
        </button>
        <!-- A state, said quietly before «Не туда» -->
        <span
          v-if="entry.moved"
          class="shrink-0 px-1 text-13 text-toned"
        >перемещено</span>
        <button
          v-if="wrongShown"
          type="button"
          :class="[quiet, line ? 'px-1.75' : 'px-2.5']"
          :aria-pressed="wrongOpen"
          @click="wrongOpen = !wrongOpen"
        >
          Не туда
        </button>
        <button
          v-if="line && fresh && !offline"
          type="button"
          :class="[quiet, 'px-1.75']"
          @click="undo"
        >
          Отменить
        </button>
      </div>
      <template v-if="!line">
        <ul>
          <li
            v-for="(row, i) in rows"
            :key="row.key"
            class="flex min-h-11 items-center gap-3 pr-1.5 pl-3"
            :class="{ 'bg-fresh': joined && fresh && lastIds.has(row.key) }"
          >
            <span
              class="flex w-4.5 shrink-0 justify-center"
              aria-hidden="true"
            >
              <PageTile
                v-if="several"
                :glyph="data.pages[row.rec.pageId]?.glyph"
              />
              <span
                v-else
                class="size-1.5 rounded-full bg-toned"
              />
            </span>
            <div class="flex min-w-0 flex-1 flex-col py-1.5">
              <button
                type="button"
                class="min-w-0 cursor-pointer truncate text-left text-15 text-highlighted"
                :class="{ 'text-dimmed line-through': row.rec.done }"
                @click="peek({ kind: 'record', id: row.rec.id })"
              >
                {{ row.rec.text }}
              </button>
              <span
                v-if="subOf(row, i) || (isDesktop && row.rec.due && !row.rec.done)"
                class="flex min-w-0 items-center gap-1.5 text-13 text-toned"
              >
                <span
                  v-if="subOf(row, i)"
                  class="truncate"
                >{{ subOf(row, i) }}</span>
                <DueButton
                  v-if="isDesktop && row.rec.due && !row.rec.done && !offline"
                  :rec="row.rec"
                  variant="line"
                />
              </span>
            </div>
            <span
              v-if="!isDesktop && row.rec.due && !row.rec.done && !offline"
              class="ml-2 shrink-0"
            >
              <DueButton
                :rec="row.rec"
                variant="row"
              />
            </span>
            <button
              v-if="duplicate(row)"
              type="button"
              class="mr-1.5 flex h-11 shrink-0 cursor-pointer items-center rounded-item px-3 text-13 font-medium lg:mr-0.5 text-accent-ink hover:bg-btn active:bg-btn-pressed"
              :aria-label="duplicate(row)!.label"
              @click="journal.merge(row.entry.id, row.rec.id)"
            >
              Объединить
            </button>
            <button
              v-else-if="rowMoves && !offline && !row.merged"
              type="button"
              class="hit-44 relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-item text-toned hover:bg-btn hover:text-highlighted active:bg-btn-pressed"
              :aria-label="`Переместить «${row.rec.text}»`"
              @click="moveRow(row.rec)"
            >
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4.5"
              />
            </button>
          </li>
        </ul>
        <div
          v-if="note"
          class="flex items-center gap-3 pr-1.5 pl-3"
        >
          <UIcon
            :name="note.icon"
            class="size-4.5 shrink-0 text-toned"
          />
          <span class="min-w-0 flex-1 py-2 text-meta text-toned">{{ note.text }}</span>
          <button
            type="button"
            class="flex h-11 shrink-0 cursor-pointer items-center rounded-item px-2 text-sm font-medium text-accent-ink hover:bg-btn active:bg-btn-pressed"
            @click="onNote"
          >
            {{ note.action }}
          </button>
        </div>
        <section
          v-if="similar.length"
          :aria-labelledby="`similar-${entry.id}`"
          class="pb-1"
        >
          <h3
            :id="`similar-${entry.id}`"
            class="px-3 pt-2 text-cap leading-6 text-toned"
          >
            Похожее в записях
          </h3>
          <button
            v-for="s in similar"
            :key="s.id"
            type="button"
            class="flex min-h-9 w-full cursor-pointer items-center gap-3 pr-3 pl-3 text-left hover:bg-btn active:bg-pressed"
            :aria-label="isDesktop ? `Открыть «${s.text}» справа` : undefined"
            @click="peek({ kind: 'record', id: s.id })"
          >
            <PageTile
              :glyph="data.pages[s.pageId]?.glyph"
              :size="14"
              class="mx-0.5"
            />
            <span class="min-w-0 flex-1 truncate text-15 text-highlighted">{{ s.text }}</span>
            <span class="shrink-0 text-13 text-toned">{{ data.pages[s.pageId]?.title }}</span>
          </button>
        </section>
        <div
          v-if="offline"
          class="flex items-start gap-3 px-3 pt-1 pb-2.5 text-meta text-toned"
        >
          <UIcon
            name="i-lucide-wifi-off"
            class="mt-0.5 size-4.5 shrink-0"
          />
          Нет сети. Запись во Входящих и разберётся, когда сеть появится.
        </div>
        <!-- «Отменить» goes when its window ends; «в Журнале ›» on Главная stays (v21 C5) -->
        <div
          v-if="(fresh && !offline) || (docked && chatLink)"
          class="flex min-h-13 items-center gap-2 border-t px-3 py-2"
          :class="docked ? 'border-line' : 'border-canvas'"
        >
          <UButton
            v-if="fresh && !offline"
            class="relative overflow-hidden"
            @click="undo"
          >
            <span class="max-w-60 truncate">{{ undoLabel }}</span>
            <span
              :key="run"
              class="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ring motion-safe:animate-drain motion-reduce:animate-none"
              :style="{ animationDuration: `${ms}ms`, animationPlayState: paused ? 'paused' : 'running' }"
              aria-hidden="true"
            />
          </UButton>
          <span class="flex-1" />
          <NuxtLink
            v-if="docked && chatLink"
            to="/journal"
            class="-mr-1.5 flex h-8 shrink-0 items-center gap-0.5 rounded-item pr-1.5 pl-2.5 text-13 text-dimmed hover:bg-btn hover:text-highlighted"
          >
            в Журнале<UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
          </NuxtLink>
        </div>
      </template>
      <PlaceChips
        v-if="wrongOpen && !offline"
        :entry="entry"
        :subject="sends.map(e => e.text).join(', ')"
        class="px-3 pt-1 pb-3"
        @choose="choose"
      />
    </template>
  </div>
</template>
