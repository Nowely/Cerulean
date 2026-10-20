<script setup lang="ts">
// The bottom of Главная: what was just written, then the slim composer.
// After a send the keyboard stays up for the next record; while it is up the receipt is one 44px line.
// Sends to the same page within 30 s join one receipt («3 записи → Продукты»): «Отменить» takes back the
// latest send and puts its text back, «Не туда» moves the whole series. A question or an unclear record
// closes the keyboard, because its card needs a tap.
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import type { Entry, Id, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { usePeek } from '~/composables/usePeek'
import { useScreen } from '~/composables/useScreen'
import { count, RECORD_FORMS } from '~/domain/text'
import { rank } from '~/domain/rules'
import AppComposer from '../composer/AppComposer.vue'
import EntryCard from '../chat/EntryCard.vue'
import PageTile from '../common/PageTile.vue'
import ChipButton from '../common/ChipButton.vue'
import RecordMark from '../common/RecordMark.vue'

const SERIES_MS = 30_000
const UNDO_MS = 10_000

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const { peek } = usePeek()
const { isDesktop } = useScreen()
const composer = useTemplateRef<InstanceType<typeof AppComposer>>('composer')

/** Lines sent from here, in order */
const ids = ref<Id[]>([])
const shown = ref(false)
const typing = ref(false)
const wrongOpen = ref(false)

const entries = computed(() => ids.value.map(id => data.entries.find(e => e.id === id)).filter((e): e is Entry => !!e && e.kind !== 'undone'))
const last = computed(() => entries.value.at(-1))
/** The latest send and the sends before it that went to the same page, each within 30 s of the next */
const series = computed<Entry[]>(() => {
  const list = entries.value
  const l = last.value
  if (!l) return []
  if (l.kind !== 'routed') return [l]
  const out = [l]
  for (let i = list.length - 2; i >= 0; i--) {
    const e = list[i]!
    if (e.kind !== 'routed' || e.pageId !== l.pageId || out[0]!.at - e.at > SERIES_MS) break
    out.unshift(e)
  }
  return out
})
const routed = computed(() => last.value?.kind === 'routed')
const page = computed<Page | undefined>(() => last.value?.pageId ? data.pages[last.value.pageId] : undefined)
const records = computed(() => series.value
  .flatMap(e => e.recordIds ?? [])
  .map(id => data.records[id])
  .filter((r): r is Rec => !!r && !r.deletedAt))
const title = computed(() => count(records.value.length, RECORD_FORMS))
/** Keyboard up on a phone: the receipt shrinks to one line so the list stays in view */
const line = computed(() => !isDesktop.value && typing.value && (routed.value || last.value?.kind === 'pending'))

// ---------- the undo window: at least 10 s after the last send, paused while the receipt is touched or open ----------

const hovered = ref(false)
const paused = computed(() => hovered.value || wrongOpen.value || !!ui.picker)
const run = ref(0)
let left = UNDO_MS
let started = 0
let timer: ReturnType<typeof setTimeout> | undefined

function arm() {
  left = UNDO_MS
  run.value++
  start()
}
function start() {
  clearTimeout(timer)
  if (paused.value || !shown.value) return
  started = Date.now()
  timer = setTimeout(expire, left)
}
function hold() {
  clearTimeout(timer)
  left = Math.max(0, left - (Date.now() - started))
}
watch(paused, p => p ? hold() : start())
onBeforeUnmount(() => clearTimeout(timer))

/** The receipt settles: it stays in Чат with «Не туда», Главная lets it go */
function expire() {
  if (last.value?.kind === 'pending') return
  if (!routed.value && last.value?.kind !== 'offline') return
  for (const e of series.value) journal.settle(e.id)
  shown.value = false
  wrongOpen.value = false
}

function onSent(e: Entry | null) {
  if (!e) return
  ids.value = [...ids.value, e.id]
  shown.value = true
  wrongOpen.value = false
  arm()
}

// A question or an unclear record needs a tap: the keyboard goes down so the card is seen
watch(() => last.value?.kind, (kind) => {
  if (kind === 'ask' || kind === 'found') composer.value?.blur()
  if (kind === 'routed' || kind === 'offline') arm()
})

/** «Отменить»: the latest send goes, its text comes back aimed at the same page */
function undo() {
  const e = last.value
  if (!e) return
  const aim = e.pageId && e.pageId !== data.inbox.id ? e.pageId : 'auto'
  journal.undo(e.id)
  ids.value = ids.value.filter(id => id !== e.id)
  if (!entries.value.length) shown.value = false
  composer.value?.setText(e.text, aim)
  arm()
}

/** «Не туда»: the pages Авто would pick next; the choice moves the whole series */
const others = computed(() => {
  const l = last.value
  if (!l) return []
  return [...rank(l.text, data.livePages, data.learned).map(r => r.pageId), ...data.recent]
    .filter((id, i, a) => a.indexOf(id) === i && id !== l.pageId)
    .map(id => data.pages[id])
    .filter((p): p is Page => !!p && !p.deletedAt && p.kind === 'page')
    .slice(0, 3)
})
function moveAll(pageId: Id) {
  for (const e of series.value) journal.choose(e.id, { pageId })
  wrongOpen.value = false
}
function more() {
  const l = last.value
  if (!l) return
  ui.pick({
    title: 'Куда положить',
    subtitle: series.value.map(e => e.text).join(', '),
    current: l.pageId,
    guesses: others.value.map(p => p.id),
    run: (c) => {
      if ('pageId' in c) return moveAll(c.pageId)
      const created = data.createPage({ title: c.newPage })
      moveAll(created.id)
    }
  })
}
function wrong() {
  if (line.value) composer.value?.blur()
  wrongOpen.value = !wrongOpen.value
}
</script>

<template>
  <div
    aria-live="polite"
    class="flex flex-col gap-2"
  >
    <template v-if="shown && last">
      <!-- Keyboard up: one line -->
      <div
        v-if="line"
        class="raised flex h-11 items-center rounded-card bg-default pr-1 pl-3 shadow-float dark:ring dark:ring-inset dark:ring-line2"
        @pointerdown.prevent
      >
        <template v-if="last.kind === 'pending'">
          <UIcon
            name="cer:auto"
            class="size-4.5 shrink-0 text-toned"
          />
          <span class="ml-3 text-sm text-toned">Разбирается…</span>
        </template>
        <template v-else>
          <PageTile :glyph="page?.glyph" />
          <span class="ml-3 min-w-0 flex-1 truncate text-sm text-toned">
            {{ title }} → <b class="font-medium text-highlighted">{{ page?.title || 'Без названия' }}</b>
          </span>
          <button
            type="button"
            class="h-9 shrink-0 cursor-pointer rounded-item px-2.5 text-13 font-medium text-toned hover:bg-btn active:bg-btn-pressed"
            @click="wrong"
          >
            Не туда
          </button>
          <button
            type="button"
            class="h-9 shrink-0 cursor-pointer rounded-item px-2.5 text-13 font-medium text-toned hover:bg-btn active:bg-btn-pressed"
            @click="undo"
          >
            Отменить
          </button>
        </template>
      </div>

      <!-- The docked receipt: Поиск's row grid, «Отменить» carries the countdown -->
      <div
        v-else-if="routed"
        class="raised overflow-hidden rounded-card bg-default shadow-float dark:ring dark:ring-inset dark:ring-line2"
        @mouseenter="hovered = true"
        @mouseleave="hovered = false"
        @touchstart.passive="hovered = true"
        @touchend.passive="hovered = false"
        @focusin="hovered = true"
        @focusout="hovered = false"
      >
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
                v-if="last.moved"
                class="text-dimmed"
              > · перемещено</span>
            </span>
          </button>
          <button
            v-if="isDesktop"
            type="button"
            class="h-11 shrink-0 cursor-pointer px-2.5 text-13 font-medium text-toned hover:text-highlighted aria-pressed:text-highlighted"
            :aria-pressed="wrongOpen"
            @click="wrongOpen = !wrongOpen"
          >
            Не туда
          </button>
          <NuxtLink
            to="/chat"
            class="flex h-11 shrink-0 items-center gap-0.5 pr-2 pl-2.5 text-13 text-dimmed hover:text-highlighted"
          >
            в Чате<UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
          </NuxtLink>
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
          v-if="wrongOpen"
          class="flex flex-wrap gap-1.5 px-3 pt-1 pb-1"
        >
          <ChipButton
            v-for="p in others"
            :key="p.id"
            :label="p.title"
            :glyph="p.glyph"
            @click="moveAll(p.id)"
          />
          <ChipButton
            label="Ещё…"
            @click="more"
          />
        </div>
        <div class="flex gap-2 px-3 pt-1 pb-3">
          <UButton
            v-if="!isDesktop"
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
              :key="run"
              class="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ring motion-safe:animate-drain motion-reduce:animate-none"
              :style="{ animationDuration: `${UNDO_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }"
              aria-hidden="true"
            />
          </UButton>
        </div>
      </div>

      <div
        v-else
        class="relative"
      >
        <EntryCard
          :entry="last"
          float
        />
        <UButton
          v-if="last.kind !== 'pending'"
          icon="i-lucide-x"
          variant="ghost"
          square
          size="sm"
          aria-label="Скрыть"
          class="absolute top-1 right-1"
          @click="shown = false"
        />
      </div>
    </template>

    <AppComposer
      ref="composer"
      mode="auto"
      @sent="onSent"
      @focus="v => typing = v"
    />
  </div>
</template>
