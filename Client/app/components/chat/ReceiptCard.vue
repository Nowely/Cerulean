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

function choose(pageId: string) {
  journal.choose(props.entry.id, { pageId })
  wrongOpen.value = false
  journal.settle(props.entry.id)
}

function more() {
  ui.pick({
    title: `Куда положить «${props.entry.text}»?`,
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
    class="overflow-hidden rounded-card border border-default bg-default [--row-bg:var(--ui-bg)]"
    :class="{ 'shadow-float': float }"
    @mouseenter="setPaused('hover', true)"
    @mouseleave="setPaused('hover', false)"
    @focusin="setPaused('focus', true)"
    @focusout="setPaused('focus', false)"
  >
    <template v-if="entry.kind === 'undone'">
      <div class="flex min-h-11 items-center gap-2 px-3 text-meta text-toned">
        <UIcon
          name="i-lucide-undo-2"
          class="size-4"
        />Отменено, ничего не записано
      </div>
    </template>
    <template v-else>
      <button
        type="button"
        class="flex min-h-11 w-full cursor-pointer items-center gap-2 pr-2.5 pl-3 text-left text-meta text-toned hover:bg-muted active:bg-pressed"
        @click="page && peek({ kind: 'page', id: page.id })"
      >
        <PageTile
          :glyph="page?.glyph"
          :color="page?.color"
          :size="18"
        />
        <span class="min-w-0 flex-1 truncate">
          {{ title }} <UIcon
            name="i-lucide-arrow-right"
            class="mx-0.5 inline-block size-3.5 align-[-2px]"
          /> <b class="font-semibold text-highlighted">{{ page?.title || 'Без названия' }}</b>
        </span>
        <span
          v-if="entry.moved"
          class="rounded-[6px] bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink"
        >перемещено</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 shrink-0"
        />
      </button>
      <ul>
        <li
          v-for="r in records"
          :key="r.id"
          class="border-t border-default"
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
        class="flex items-start gap-2 border-t border-default px-3 pt-2.75 pb-2.25 text-meta text-toned"
      >
        <UIcon
          name="i-lucide-wifi-off"
          class="mt-0.5 size-4 shrink-0"
        />
        Нет сети. Запись во Входящих и разберётся, когда сеть появится.
      </div>
      <template v-if="fresh && !offline">
        <div
          v-if="wrongOpen"
          class="flex flex-wrap gap-1.5 border-t border-default px-2.5 pt-2.5 pb-2.5"
        >
          <ChipButton
            v-for="p in others"
            :key="p.id"
            :label="p.title"
            :glyph="p.glyph"
            :color="p.color"
            @click="choose(p.id)"
          />
          <ChipButton
            label="Ещё…"
            @click="more"
          />
        </div>
        <div class="flex gap-2 border-t border-default px-2.5 pt-2 pb-2.5">
          <UButton
            :aria-pressed="wrongOpen"
            @click="wrongOpen = !wrongOpen"
          >
            Не туда
          </UButton>
          <UButton @click="journal.undo(entry.id)">
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
