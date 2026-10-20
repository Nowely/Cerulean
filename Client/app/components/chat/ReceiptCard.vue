<script setup lang="ts">
// Квитанция: what was created and where. While fresh: «Не туда» and «Отменить».
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Entry, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { usePeek } from '~/composables/usePeek'
import { count, RECORD_FORMS } from '~/domain/text'
import { rank } from '~/domain/rules'
import PageTile from '../common/PageTile.vue'
import ChipButton from '../common/ChipButton.vue'
import RecordLine from '../record/RecordLine.vue'
import DrainLine from './DrainLine.vue'

const FRESH_MS = 15_000

const props = defineProps<{ entry: Entry, float?: boolean }>()
const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const { peek, target } = usePeek()

const page = computed<Page | undefined>(() => props.entry.pageId ? data.pages[props.entry.pageId] : undefined)
const records = computed(() => (props.entry.recordIds ?? []).map(id => data.records[id]).filter((r): r is Rec => !!r && !r.deletedAt))
const fresh = computed(() => journal.fresh.has(props.entry.id))
const offline = computed(() => props.entry.kind === 'offline')
const wrongOpen = ref(false)
const hovered = ref(false)
const focused = ref(false)
const paused = computed(() => hovered.value || focused.value || wrongOpen.value)

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
      <div class="flex min-h-11 items-center gap-2 px-3 text-meta text-toned">
        <UIcon
          name="i-lucide-undo-2"
          class="size-3.5"
        />Отменено, ничего не записано
      </div>
    </template>
    <template v-else>
      <div class="flex items-center">
        <button
          type="button"
          class="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 pr-2.5 pl-3 text-left text-sm text-toned hover:bg-muted active:bg-pressed"
          @click="page && peek({ kind: 'page', id: page.id })"
        >
          <PageTile
            :glyph="page?.glyph"
            :size="14"
          />
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
          v-if="!fresh && !offline"
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
          class="border-t border-canvas"
        >
          <RecordLine
            :rec="r"
            :place="false"
            :selected="target?.kind === 'record' && target.id === r.id"
            @open="peek({ kind: 'record', id: r.id })"
          />
        </li>
      </ul>
      <div
        v-if="offline"
        class="flex items-start gap-2 border-t border-canvas px-3 pt-2.75 pb-2.25 text-meta text-toned"
      >
        <UIcon
          name="i-lucide-wifi-off"
          class="mt-0.5 size-3.5 shrink-0"
        />
        Нет сети. Запись во Входящих и разберётся, когда сеть появится.
      </div>
      <div
        v-if="wrongOpen && !offline"
        class="flex flex-wrap gap-1.5 border-t border-canvas px-2.5 pt-2.5 pb-2.5"
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
      <template v-if="fresh && !offline">
        <div class="flex gap-2 border-t border-canvas px-2.5 pt-2 pb-2.5">
          <UButton
            :aria-pressed="wrongOpen"
            @click="wrongOpen = !wrongOpen"
          >
            Не туда
          </UButton>
          <UButton @click="undo">
            Отменить
          </UButton>
        </div>
        <DrainLine
          :paused="paused"
          :duration="FRESH_MS"
        />
      </template>
    </template>
  </div>
</template>
