<script setup lang="ts">
// A record on its page. Mobile: swipe left for «Переместить» and «Удалить».
// Desktop: the same actions appear on hover after the row's values, and a right click opens all of them.
// The row is one Tab stop, its text: ↑/↓ between rows, Space ticks, Enter opens, Delete deletes,
// Shift+F10 opens «⋯», Alt+↑/↓ moves the row. The right side shows properties, never when it was made (v22).
import { computed, ref, useTemplateRef, type FunctionalComponent } from 'vue'
import { LazyUContextMenu, LazyUDropdownMenu, LazyUTooltip } from '#components'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { useSwipe } from '~/composables/useSwipe'
import { useRecordActions } from '~/composables/useRecordActions'
import { useLater } from '~/composables/useLater'
import { formatDue, isOverdue } from '~/domain/dates'
import RecordMark from '../common/RecordMark.vue'
import ChipButton from '../common/ChipButton.vue'

const props = withDefaults(defineProps<{
  rec: Rec
  page: Page
  view?: ViewDef
  /** Preview keeps reading and ticking only: no swipe, no hover actions */
  readonly?: boolean
  selected?: boolean
  /** Subitems under a record: a step is often a whole sentence, so it wraps instead of being cut */
  wrap?: boolean
}>(), { readonly: false, selected: false, wrap: false })

const emit = defineEmits<{ open: [], choose: [pageId: Id | 'more' | 'new'], shift: [by: -1 | 1] }>()

const data = useDataStore()
const journal = useJournalStore()
const now = useNow()
const { isDesktop } = useScreen()
const actions = useRecordActions()
const el = useTemplateRef<HTMLElement>('el')
const ACTIONS_WIDTH = 184
const swipe = useSwipe(el, ACTIONS_WIDTH)

// Until the menu code is in (useLater) the row, its hover buttons and «⋯» stand without their menus and
// tooltips; a phone never gets the right-click menu or the tooltips at all
const later = useLater()
const Bare: FunctionalComponent = (_, { slots }) => slots.default?.()
Bare.inheritAttrs = false
const menuOpen = ref(false)
function openMenu() {
  menuOpen.value = true
  void later.load()
}

const subs = computed(() => data.subitemsOf(props.rec.id))
const subsDone = computed(() => subs.value.filter(s => s.done).length)
// The rows of the latest send carry the fresh tint, which fades by itself (fresh-tint); nothing says «только что»
const fresh = computed(() => Date.now() - props.rec.addedAt < 5000 && !props.rec.done)
const late = computed(() => !props.rec.done && isOverdue(props.rec.due, now.value))
const inbox = computed(() => props.page.kind === 'inbox')
const asking = computed(() => inbox.value && props.rec.tags.includes('clarify') && !props.rec.done)
/** Waiting for the network: a state on the right, not a tag */
const waiting = computed(() => inbox.value && props.rec.tags.includes('offline'))

/** «Справа в строке»: the view's chosen properties, empty ones hidden */
const right = computed(() => {
  const shown = props.view?.shown ?? ['due']
  const out: { key: string, text: string, tone?: 'warn' | 'low', icon?: string }[] = []
  for (const key of shown) {
    if (key === 'due') {
      if (props.rec.due) out.push({ key, text: late.value ? `было ${formatDue(props.rec.due, now.value)}` : formatDue(props.rec.due, now.value), tone: late.value ? 'warn' : undefined })
      continue
    }
    if (key === 'note') continue
    const prop = props.page.props.find(p => p.id === key)
    const value = props.rec.values[key]
    if (!prop || value === null || value === undefined || value === '') continue
    if (prop.type === 'select') {
      const name = prop.options?.find(o => o.id === value)?.name
      if (name) out.push({ key, text: name })
    } else if (prop.type === 'number' && prop.normProp) {
      continue // shown as a stepper
    } else {
      out.push({ key, text: `${value}${prop.unit ? ` ${prop.unit}` : ''}` })
    }
  }
  return out
})

const stock = computed(() => {
  const prop = props.page.props.find(p => p.type === 'number' && p.normProp && (props.view?.shown ?? []).includes(p.id))
  if (!prop) return null
  const value = props.rec.values[prop.id]
  if (typeof value !== 'number') return null
  const norm = props.rec.values[prop.normProp!]
  return { prop, value, low: typeof norm === 'number' && value < norm }
})

const notePreview = computed(() => (props.view?.shown ?? []).includes('note') ? props.rec.note.split('\n')[0] : '')

function step(by: number) {
  if (!stock.value) return
  data.updateRecord(props.rec.id, { values: { ...props.rec.values, [stock.value.prop.id]: Math.max(0, stock.value.value + by) } })
}

const menu = computed(() => [
  [
    { label: 'Открыть', icon: 'i-lucide-arrow-up-right', onSelect: () => emit('open') },
    { label: 'Переместить', icon: 'i-lucide-folder-input', onSelect: () => actions.move([props.rec.id]) },
    { label: props.rec.favorite === null ? 'Добавить в избранное' : 'Убрать из избранного', icon: 'i-lucide-star', onSelect: () => actions.favorite(props.rec) },
    { label: 'Скопировать текст', icon: 'i-lucide-copy', onSelect: () => actions.copy(props.rec) }
  ],
  [
    { label: 'Удалить', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => actions.remove([props.rec.id]) }
  ]
])

// Keys on the row's text, its one Tab stop
function onKey(e: KeyboardEvent) {
  if (props.readonly) return
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.altKey) {
    e.preventDefault()
    emit('shift', e.key === 'ArrowUp' ? -1 : 1)
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const rows = [...document.querySelectorAll<HTMLElement>('[data-row-text]')]
    rows[rows.indexOf(e.currentTarget as HTMLElement) + (e.key === 'ArrowUp' ? -1 : 1)]?.focus()
  } else if (e.key === ' ') {
    e.preventDefault()
    data.toggleDone(props.rec.id)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    actions.remove([props.rec.id])
  } else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
    e.preventDefault()
    openMenu()
  }
}

/** Two pages worked out again from the pages there are now; «Ещё…» has the rest */
const guesses = computed(() => journal.guessesFor(props.rec).slice(0, 2).map(id => data.pages[id]!))
</script>

<template>
  <div class="relative">
    <!-- Swipe actions sit behind the row -->
    <div
      v-if="!readonly && !isDesktop"
      class="absolute inset-y-0 right-2 flex gap-1"
      :class="swipe.offset.value === 0 ? 'invisible' : ''"
      :aria-hidden="swipe.offset.value === 0"
    >
      <button
        type="button"
        class="flex w-22 cursor-pointer flex-col items-center justify-center gap-0.75 rounded-chip bg-elevated text-xs font-medium text-highlighted active:bg-accented"
        :tabindex="swipe.offset.value === 0 ? -1 : 0"
        @click="swipe.close(); actions.move([rec.id])"
      >
        <UIcon
          name="i-lucide-arrow-right"
          class="size-4.5"
        />Переместить
      </button>
      <button
        type="button"
        class="flex w-22 cursor-pointer flex-col items-center justify-center gap-0.75 rounded-chip bg-warn text-xs font-medium text-on-accent active:opacity-90"
        :tabindex="swipe.offset.value === 0 ? -1 : 0"
        @click="swipe.close(); actions.remove([rec.id])"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="size-4.5"
        />Удалить
      </button>
    </div>

    <component
      :is="later.ready.value && isDesktop ? LazyUContextMenu : Bare"
      :items="menu"
      :disabled="readonly"
    >
      <div
        ref="el"
        class="group/row relative mx-1 flex min-h-11 items-center rounded-chip pr-3 lg:mx-0 lg:min-h-10 lg:pr-1.5"
        :class="[
          selected ? 'bg-sel' : 'bg-[var(--row-bg,var(--bg))] lg:hover:bg-hover',
          { 'fresh-tint': fresh },
          swipe.dragging.value ? '' : 'transition-transform duration-200 ease-out-soft',
          // The browser keeps vertical scroll and leaves the sideways drag to the swipe (no pointercancel)
          readonly ? '' : 'touch-pan-y'
        ]"
        :style="swipe.offset.value ? { transform: `translateX(${swipe.offset.value}px)` } : undefined"
        @pointerdown="!readonly && swipe.onStart($event)"
        @pointermove="!readonly && swipe.onMove($event)"
        @pointerup="swipe.onEnd()"
        @pointercancel="swipe.onEnd()"
        @click.capture="swipe.swallowClick"
      >
        <RecordMark
          :rec="rec"
          :page="page"
          :tabbable="readonly"
          class="lg:size-9"
          @toggle="data.toggleDone(rec.id)"
        />
        <button
          type="button"
          data-row-text
          class="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-px rounded-item py-1 pr-1 pl-0.5 text-left lg:min-h-10"
          @click="emit('open')"
          @keydown="onKey"
        >
          <span
            class="text-record"
            :class="[wrap ? 'line-clamp-3' : 'truncate', rec.done ? 'text-dimmed line-through' : 'text-highlighted']"
          >{{ rec.text }}</span>
          <span
            v-if="notePreview"
            class="truncate text-caption font-normal text-toned"
          >{{ notePreview }}</span>
        </button>

        <span class="ml-2 flex shrink-0 items-center gap-2.5 text-meta text-toned tabular-nums">
          <span v-if="waiting">ждёт сети</span>
          <UIcon
            v-if="rec.note && !notePreview"
            name="i-lucide-file-text"
            class="size-4"
            aria-label="есть заметка"
          />
          <span
            v-if="subs.length"
            :aria-label="`подпункты: ${subsDone} из ${subs.length}`"
          >{{ subsDone }}/{{ subs.length }}</span>
          <span
            v-for="r in right"
            :key="r.key"
            :class="r.tone === 'warn' ? 'text-warn-ink' : ''"
          >{{ r.text }}</span>
        </span>

        <!-- Запасы: the number against its norm, with a stepper -->
        <span
          v-if="stock"
          class="ml-1 flex shrink-0 items-center gap-0.5"
        >
          <span
            v-if="stock.low"
            class="mr-1 flex items-center gap-1 text-caption font-normal text-toned"
          >
            <UIcon
              name="i-lucide-trending-down"
              class="size-3.5"
            />мало
          </span>
          <button
            type="button"
            class="hit-44 relative flex size-8 cursor-pointer items-center justify-center rounded-chip border border-default bg-default text-highlighted active:bg-pressed"
            :aria-label="`Меньше: ${rec.text}`"
            @click="step(-1)"
          >
            <UIcon
              name="i-lucide-minus"
              class="size-4"
            />
          </button>
          <span
            class="w-7 text-center text-body text-highlighted"
            aria-live="polite"
          >{{ stock.value }}</span>
          <button
            type="button"
            class="hit-44 relative flex size-8 cursor-pointer items-center justify-center rounded-chip border border-default bg-default text-highlighted active:bg-pressed"
            :aria-label="`Больше: ${rec.text}`"
            @click="step(1)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
          </button>
        </span>

        <!-- Desktop: the actions on hover, after the values; on touch they live in the swipe and in «⋯» -->
        <span
          v-if="!readonly && isDesktop"
          class="ml-1 hidden shrink-0 items-center gap-0.5 group-hover/row:flex group-focus-within/row:flex"
        >
          <component
            :is="later.ready.value ? LazyUTooltip : Bare"
            text="Переместить"
          >
            <UButton
              icon="i-lucide-arrow-right"
              variant="ghost"
              square
              size="sm"
              tabindex="-1"
              :aria-label="`Переместить «${rec.text}»`"
              @click="actions.move([rec.id])"
            />
          </component>
          <component
            :is="later.ready.value ? LazyUTooltip : Bare"
            text="Удалить"
          >
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              square
              size="sm"
              tabindex="-1"
              :aria-label="`Удалить «${rec.text}»`"
              @click="actions.remove([rec.id])"
            />
          </component>
        </span>
        <component
          :is="later.ready.value ? LazyUDropdownMenu : Bare"
          v-if="!readonly"
          v-model:open="menuOpen"
          :items="menu"
          :content="{ align: 'end' }"
        >
          <component
            :is="later.ready.value && isDesktop ? LazyUTooltip : Bare"
            text="Все действия"
          >
            <UButton
              icon="i-lucide-ellipsis"
              variant="ghost"
              square
              size="sm"
              tabindex="-1"
              :aria-label="`Действия: ${rec.text}`"
              class="sr-only lg:not-sr-only lg:opacity-0 lg:group-hover/row:opacity-100 lg:group-focus-within/row:opacity-100 lg:aria-expanded:opacity-100"
              @click="!later.ready.value && openMenu()"
            />
          </component>
        </component>
      </div>
    </component>

    <!-- Входящие: two guessed pages right on the row, saying what a tap does (a preview only reads) -->
    <div
      v-if="(asking || waiting) && !readonly"
      class="flex flex-wrap gap-1.5 pr-3 pb-3 pl-12 lg:pl-11"
    >
      <ChipButton
        v-for="g in guesses"
        :key="g.id"
        :label="`→ ${g.title || 'Без названия'}`"
        :aria-label="`Переместить в «${g.title || 'Без названия'}»`"
        @click="emit('choose', g.id)"
      />
      <ChipButton
        label="Ещё…"
        @click="emit('choose', 'more')"
      />
    </div>
  </div>
</template>
