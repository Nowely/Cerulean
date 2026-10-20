<script setup lang="ts">
// Квитанция: what was created and where, on Поиск's row grid (glyph or mark at 12px, text at 42px, record rows
// 36px). «Не туда» is always the quiet header button; the footer holds only «Отменить» while fresh, whose countdown
// is a line along its own bottom edge (15 s in Чат, 10 s after the last send when docked, paused while touched or
// open). After that only «Отменить» goes: the receipt and its «Не туда» stay.
// Docked above a composer a series of sends to one page reads as one receipt: «Отменить «Яблоки»» takes back the
// latest send (its rows tinted fresh), «Не туда» moves them all. With the keyboard up it is one 44px line.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from '#imports'
import type { Entry, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore, type Choice } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { usePeek } from '~/composables/usePeek'
import { useScreen } from '~/composables/useScreen'
import { count, RECORD_FORMS } from '~/domain/text'
import PageTile from '../common/PageTile.vue'
import RecordMark from '../common/RecordMark.vue'
import DueButton from '../record/DueButton.vue'
import PlaceChips from './PlaceChips.vue'

const CHAT_MS = 15_000
const DOCK_MS = 10_000

const props = withDefaults(defineProps<{
  entry: Entry
  /** Docked: the sends joined into this receipt, oldest first, ending with `entry` */
  series?: Entry[]
  /** Floated above a composer: «в Чате ›», a 10 s window */
  docked?: boolean
  /** The keyboard is up on a phone: one line, a tap opens the card */
  line?: boolean
}>(), { series: undefined, docked: false, line: false })
const emit = defineEmits<{ open: [], undone: [entry: Entry] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const router = useRouter()
const { peek } = usePeek()
const { isDesktop } = useScreen()

const sends = computed(() => props.series?.length ? props.series : [props.entry])
const page = computed<Page | undefined>(() => props.entry.pageId ? data.pages[props.entry.pageId] : undefined)
const recsOf = (e: Entry) => (e.recordIds ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && !r.deletedAt)
const records = computed(() => sends.value.flatMap(recsOf))
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
const made = computed(() => sends.value.some(e => e.made) && !props.entry.moved)
const resumed = computed(() => !!props.entry.resumed && !props.entry.moved)

/** Line 2 of a record row: a state, or nothing (a recognised date is its own button) */
function subOf(r: Rec, i: number): string {
  if (offline.value) return 'ждёт сети'
  if (made.value && i === 0) return 'новая страница из шаблона'
  if (resumed.value) return 'разобрано, когда появилась сеть'
  return ''
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
  if (page.value) peek({ kind: 'page', id: page.value.id })
}

/** Inside a docked card the pressed state needs the raised fill so it never merges with the chips under it */
const quiet = 'flex h-8 shrink-0 cursor-pointer items-center rounded-item px-2.5 text-13 font-medium text-toned hover:bg-btn hover:text-highlighted active:bg-btn-pressed aria-pressed:bg-btn-pressed aria-pressed:text-highlighted'
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
          class="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 pr-1 pl-3 text-left text-sm text-toned active:bg-pressed"
          :aria-expanded="line ? false : undefined"
          @click="openHead"
        >
          <PageTile :glyph="page?.glyph" />
          <span class="min-w-0 truncate">
            {{ title }} → <b class="font-medium text-highlighted">{{ page?.title || 'Без названия' }}</b>
            <span
              v-if="entry.moved"
              class="text-dimmed"
            > · перемещено</span>
          </span>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 shrink-0 text-dimmed"
          />
          <span class="flex-1" />
        </button>
        <button
          v-if="!offline"
          type="button"
          :class="quiet"
          :aria-pressed="wrongOpen"
          @click="wrongOpen = !wrongOpen"
        >
          Не туда
        </button>
        <button
          v-if="line && fresh && !offline"
          type="button"
          :class="quiet"
          @click="undo"
        >
          Отменить
        </button>
      </div>
      <template v-if="!line">
        <ul>
          <li
            v-for="(r, i) in records"
            :key="r.id"
            class="flex min-h-9 items-center pr-1.5"
            :class="{ 'bg-fresh': joined && fresh && lastIds.has(r.id) }"
          >
            <RecordMark
              :rec="r"
              :page="page"
              size="sm"
              area="tight"
              class="-mr-0.5 ml-0.5"
              @toggle="data.toggleDone(r.id)"
            />
            <div class="flex min-w-0 flex-1 flex-col py-1.5">
              <button
                type="button"
                class="min-w-0 cursor-pointer truncate text-left text-15 text-highlighted"
                :class="{ 'text-dimmed line-through': r.done }"
                @click="peek({ kind: 'record', id: r.id })"
              >
                {{ r.text }}
              </button>
              <span
                v-if="subOf(r, i) || (isDesktop && r.due && !r.done)"
                class="flex min-w-0 items-center gap-1.5 text-13 text-toned"
              >
                <span
                  v-if="subOf(r, i)"
                  class="truncate"
                >{{ subOf(r, i) }}</span>
                <DueButton
                  v-if="isDesktop && r.due && !r.done && !offline"
                  :rec="r"
                  variant="line"
                />
              </span>
            </div>
            <span
              v-if="!isDesktop && r.due && !r.done && !offline"
              class="ml-2 shrink-0"
            >
              <DueButton
                :rec="r"
                variant="row"
              />
            </span>
          </li>
        </ul>
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
        <div
          v-if="fresh && !offline"
          class="flex items-center gap-2 border-t px-3 py-2"
          :class="docked ? 'border-line' : 'border-canvas'"
        >
          <UButton
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
            v-if="docked"
            to="/chat"
            class="-mr-1.5 flex h-8 shrink-0 items-center gap-0.5 rounded-item pr-1.5 pl-2.5 text-13 text-dimmed hover:bg-btn hover:text-highlighted"
          >
            в Чате<UIcon
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
