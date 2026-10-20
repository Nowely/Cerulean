<script setup lang="ts">
// Квитанция: what was created and where, on Поиск's row grid (glyph or mark at 12px, text at 42px, record rows
// 36px). While fresh: «Не туда» and «Отменить», whose countdown is a line along its own bottom edge. Once
// settled, «Не туда» stays as a quiet header button; on desktop it is always there.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Entry, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { usePeek } from '~/composables/usePeek'
import { useScreen } from '~/composables/useScreen'
import { count, RECORD_FORMS } from '~/domain/text'
import { rank } from '~/domain/rules'
import PageTile from '../common/PageTile.vue'
import ChipButton from '../common/ChipButton.vue'
import RecordMark from '../common/RecordMark.vue'

const FRESH_MS = 15_000

const props = defineProps<{ entry: Entry, float?: boolean }>()
const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const { peek } = usePeek()
const { isDesktop } = useScreen()

const page = computed<Page | undefined>(() => props.entry.pageId ? data.pages[props.entry.pageId] : undefined)
const records = computed(() => (props.entry.recordIds ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && !r.deletedAt))
const fresh = computed(() => journal.fresh.has(props.entry.id))
const offline = computed(() => props.entry.kind === 'offline')
const wrongOpen = ref(false)
const hovered = ref(false)
const focused = ref(false)
const paused = computed(() => hovered.value || focused.value || wrongOpen.value)
/** «Не туда» in the header: always on desktop, once settled on a phone */
const wrongInHead = computed(() => !offline.value && (isDesktop.value || !fresh.value))

// The window runs on its own clock so pausing is exact; the line only shows it
let left = FRESH_MS
let started = 0
let timer: ReturnType<typeof setTimeout> | undefined
function run() {
  clearTimeout(timer)
  if (!fresh.value || paused.value) return
  started = Date.now()
  timer = setTimeout(() => journal.settle(props.entry.id), left)
}
function hold() {
  if (!timer) return
  clearTimeout(timer)
  timer = undefined
  left = Math.max(0, left - (Date.now() - started))
}
onMounted(run)
onBeforeUnmount(() => clearTimeout(timer))
function setPaused(kind: 'hover' | 'focus', v: boolean) {
  if (kind === 'hover') hovered.value = v
  else focused.value = v
  if (paused.value) hold()
  else run()
}

/** «Не туда»: the pages Авто would pick next, the same choice as a question */
const others = computed(() => {
  const ranked = rank(props.entry.text, data.livePages, data.learned).map(r => r.pageId)
  const recent = data.recent
  return [...ranked, ...recent]
    .filter((id, i, a) => a.indexOf(id) === i && id !== props.entry.pageId)
    .map(id => data.pages[id])
    .filter((p): p is Page => !!p && !p.deletedAt && p.kind === 'page')
    .slice(0, 3)
})

/** «Отменить»: the records go, the text comes back to the composer aimed at the same page */
function undo() {
  const aim = props.entry.pageId && props.entry.pageId !== data.inbox.id ? props.entry.pageId : 'auto'
  journal.undo(props.entry.id)
  ui.refill = { text: props.entry.text, aim }
}

function choose(pageId: string) {
  journal.choose(props.entry.id, { pageId })
  wrongOpen.value = false
  journal.settle(props.entry.id)
}

function more() {
  ui.pick({
    title: 'Куда положить',
    subtitle: props.entry.text,
    guesses: others.value.map(p => p.id),
    current: props.entry.pageId,
    run: (c) => {
      journal.choose(props.entry.id, 'pageId' in c ? c : { newPage: c.newPage })
      wrongOpen.value = false
      journal.settle(props.entry.id)
    }
  })
}

const title = computed(() => `${count(records.value.length || (props.entry.recordIds?.length ?? 0), RECORD_FORMS)}`)
</script>

<template>
  <div
    class="relative overflow-hidden rounded-card"
    :class="float ? 'raised bg-default shadow-float dark:ring dark:ring-inset dark:ring-line2' : 'bg-card'"
    @mouseenter="setPaused('hover', true)"
    @mouseleave="setPaused('hover', false)"
    @focusin="setPaused('focus', true)"
    @focusout="setPaused('focus', false)"
  >
    <template v-if="entry.kind === 'undone'">
      <div class="flex min-h-11 items-center gap-3 px-3 text-meta text-toned">
        <UIcon
          name="i-lucide-undo-2"
          class="size-4.5"
        />Отменено, ничего не записано
      </div>
    </template>
    <template v-else>
      <div class="flex items-center">
        <button
          type="button"
          class="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 pr-2.5 pl-3 text-left text-sm text-toned hover:bg-muted active:bg-pressed"
          @click="page && peek({ kind: 'page', id: page.id })"
        >
          <PageTile :glyph="page?.glyph" />
          <span class="min-w-0 flex-1 truncate">
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
        </button>
        <button
          v-if="wrongInHead"
          type="button"
          class="h-11 shrink-0 cursor-pointer px-3 text-13 font-medium text-toned hover:text-highlighted aria-pressed:text-highlighted"
          :aria-pressed="wrongOpen"
          @click="wrongOpen = !wrongOpen"
        >
          Не туда
        </button>
      </div>
      <ul>
        <li
          v-for="r in records"
          :key="r.id"
          class="flex min-h-9 items-center pr-3"
        >
          <RecordMark
            :rec="r"
            :page="page"
            size="sm"
            area="tight"
            class="-mr-0.5 ml-0.5"
            @toggle="data.toggleDone(r.id)"
          />
          <button
            type="button"
            class="min-w-0 flex-1 cursor-pointer truncate py-1.5 text-left text-15 text-highlighted"
            :class="{ 'text-dimmed line-through': r.done }"
            @click="peek({ kind: 'record', id: r.id })"
          >
            {{ r.text }}
          </button>
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
        v-if="wrongOpen && !offline"
        class="flex flex-wrap gap-1.5 px-3 pt-1 pb-1"
      >
        <ChipButton
          v-for="p in others"
          :key="p.id"
          :label="p.title"
          :glyph="p.glyph"
          @click="choose(p.id)"
        />
        <ChipButton
          label="Ещё…"
          @click="more"
        />
      </div>
      <div
        v-if="fresh && !offline"
        class="flex gap-2 px-3 pt-1 pb-3"
      >
        <UButton
          v-if="!wrongInHead"
          :aria-pressed="wrongOpen"
          @click="wrongOpen = !wrongOpen"
        >
          Не туда
        </UButton>
        <UButton
          class="relative overflow-hidden"
          @click="undo"
        >
          Отменить
          <span
            class="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ring motion-safe:animate-drain motion-reduce:animate-none"
            :style="{ animationDuration: `${FRESH_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }"
            aria-hidden="true"
          />
        </UButton>
      </div>
    </template>
  </div>
</template>
