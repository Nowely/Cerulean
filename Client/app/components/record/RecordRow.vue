<script setup lang="ts">
// A record on its page. Mobile: swipe left for «Переместить» and «Удалить»; a long press lifts the row (the list
// carries it) and letting go without moving opens its «⋯» sheet. Desktop: the same actions appear on hover after
// the row's values, a right click opens all of them, and a ⋮⋮ handle in the left gutter drags the row.
// The row is one Tab stop, its text: ↑/↓ between rows, Space ticks, Enter opens, Delete deletes,
// Shift+F10 opens «⋯», Alt+↑/↓ moves the row. The right side shows properties, never when it was made (v22).
import { computed, onMounted, ref, useTemplateRef, type FunctionalComponent } from 'vue'
import { LazyUContextMenu, LazyUDropdownMenu, LazyUTooltip } from '#components'
import { GLYPHS, type Id, type Page, type Rec, type ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { useSwipe } from '~/composables/useSwipe'
import { useRecordActions } from '~/composables/useRecordActions'
import { useLater } from '~/composables/useLater'
import { formatDue, isOverdue } from '~/domain/dates'
import { nb } from '~/domain/text'
import { formatValue } from '~/domain/props'
import RecordMark from '../common/RecordMark.vue'
import ChipButton from '../common/ChipButton.vue'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

const props = withDefaults(defineProps<{
  rec: Rec
  page: Page
  view?: ViewDef
  /** Preview keeps reading and ticking only: no swipe, no hover actions */
  readonly?: boolean
  selected?: boolean
  /** Subitems under a record: a step is often a whole sentence, so it wraps instead of being cut */
  wrap?: boolean
  /** Written while the page is open: the row comes into view when it appears */
  reveal?: boolean
  /** Under a calendar's selected day: the day goes without saying, so «Срок» shows only its time */
  day?: boolean
  /** Carried by a drag: the list draws the lift around the row, and the swipe and hover glyphs keep still */
  lifted?: boolean
  /** Desktop: the ⋮⋮ handle's bindings (`useDragSort().handle`) */
  grip?: Record<string, unknown>
}>(), { readonly: false, selected: false, wrap: false, reveal: false, day: false, lifted: false, grip: undefined })

const emit = defineEmits<{ open: [], choose: [pageId: Id | 'more' | 'new'], shift: [by: -1 | 1] }>()

const data = useDataStore()
const journal = useJournalStore()
const now = useNow()
const { isDesktop } = useScreen()
const actions = useRecordActions()
const el = useTemplateRef<HTMLElement>('el')
const ACTIONS_WIDTH = 184
const swipe = useSwipe(el, ACTIONS_WIDTH, useTemplateRef<HTMLElement>('box'))

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
// A row just written here comes into view, wherever its group puts it (B4: a long page sorted by Отдел)
onMounted(() => {
  if (props.reveal && fresh.value) el.value?.scrollIntoView({ block: 'nearest' })
})
const late = computed(() => !props.rec.done && isOverdue(props.rec.due, now.value))
const inbox = computed(() => props.page.kind === 'inbox')
const asking = computed(() => inbox.value && props.rec.tags.includes('clarify') && !props.rec.done)
/** Waiting for the network: a state on the right, not a tag */
const waiting = computed(() => inbox.value && props.rec.tags.includes('offline'))
/** A Входящие row that still needs a place: its guess chip and «⋯» end the row (a preview only reads) */
const choosing = computed(() => (asking.value || waiting.value) && !props.readonly)

/** «Справа в строке»: the view's chosen properties, empty ones hidden */
const right = computed(() => {
  const shown = props.view?.shown ?? ['due']
  const out: { key: string, text: string, tone?: 'warn' | 'low', icon?: string }[] = []
  for (const key of shown) {
    if (key === 'due') {
      const due = props.rec.due
      if (!due) continue
      if (late.value) out.push({ key, text: `было ${formatDue(due, now.value)}`, tone: 'warn' })
      else if (!props.day) out.push({ key, text: formatDue(due, now.value) })
      else if (due.time) out.push({ key, text: due.time })
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
    } else if (prop.type === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      out.push({ key, text: formatDue({ date: value }, now.value) })
    } else {
      out.push({ key, text: formatValue(prop, value, now.value) })
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
  return { prop, value, norm: typeof norm === 'number' ? norm : null, low: typeof norm === 'number' && value < norm }
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

/** The same actions as the phone's «⋯» sheet, opened by a long press that lets go without moving */
const sheet = computed<MenuItem[][]>(() => menu.value.map(g => g.map(i => ({ label: i.label, icon: i.icon, danger: 'color' in i, onSelect: i.onSelect }))))
defineExpose({ openMenu })

/** ⋮⋮: two columns of three dots */
const GRIP = [[9, 6], [15, 6], [9, 12], [15, 12], [9, 18], [15, 18]] as const

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

/**
 * Входящие (v23, B1, F13): one chip with the strongest guess, worked out again from the pages there are now; the
 * faint «⋯» has the other guesses, «Переместить…» and «Удалить», so every swipe on the row is in it too
 */
const guesses = computed(() => journal.guessesFor(props.rec).slice(0, 3).map(id => data.pages[id]).filter((p): p is Page => !!p))
const inboxMenu = computed<MenuItem[][]>(() => [
  guesses.value.slice(1).map(g => ({ label: `→ ${g.title || 'Без названия'}`, icon: GLYPHS[g.glyph ?? 'doc'], onSelect: () => emit('choose', g.id) })),
  [
    { label: 'Переместить…', icon: 'i-lucide-arrow-right', onSelect: () => emit('choose', 'more') },
    { label: 'Удалить', icon: 'i-lucide-trash-2', danger: true, onSelect: () => actions.remove([props.rec.id]) }
  ]
].filter(g => g.length))
</script>

<template>
  <div
    ref="box"
    class="relative"
  >
    <!-- Swipe actions grow from the right edge over the row's values; the mark and the text stay in place (B1) -->
    <div
      v-if="!readonly && !isDesktop"
      class="absolute inset-y-0.5 right-1 z-1 flex justify-end gap-1 overflow-hidden"
      :class="[swipe.offset.value === 0 ? 'invisible' : '', swipe.dragging.value ? '' : 'transition-[width] duration-200 ease-out-soft']"
      :style="{ width: `${-swipe.offset.value}px` }"
      :aria-hidden="swipe.offset.value === 0"
    >
      <button
        type="button"
        class="flex w-22 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.75 rounded-chip bg-elevated text-xs font-medium text-highlighted active:bg-accented"
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
        class="flex w-22 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.75 rounded-chip bg-warn text-xs font-medium text-on-accent active:opacity-90"
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
          selected ? 'bg-sel' : lifted ? '' : 'bg-[var(--row-bg,var(--bg))] lg:hover:bg-hover',
          { 'fresh-tint': fresh },
          swipe.dragging.value ? '' : 'transition-[padding] duration-200 ease-out-soft',
          // The browser keeps vertical scroll and leaves the sideways drag to the swipe (no pointercancel)
          readonly ? '' : 'touch-pan-y'
        ]"
        :style="swipe.offset.value ? { paddingRight: `${12 - swipe.offset.value}px` } : undefined"
        @pointerdown="!readonly && swipe.onStart($event)"
        @pointermove="!readonly && !lifted && swipe.onMove($event)"
        @pointerup="swipe.onEnd()"
        @pointercancel="swipe.onEnd()"
        @click.capture="swipe.swallowClick"
      >
        <!-- Desktop: the ⋮⋮ handle in the gutter left of the row, on hover and keyboard focus, so the text never moves -->
        <component
          :is="later.ready.value ? LazyUTooltip : Bare"
          v-if="grip && isDesktop && !readonly"
          text="Перетащить"
        >
          <span
            v-bind="grip"
            class="absolute top-1/2 -left-6.5 h-8 w-6 -translate-y-1/2 items-center justify-center rounded-item"
            :class="lifted ? 'flex text-toned' : 'hidden text-dimmed group-hover/row:flex group-focus-within/row:flex hover:bg-hover hover:text-highlighted'"
            aria-hidden="true"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                v-for="(c, i) in GRIP"
                :key="i"
                :cx="c[0]"
                :cy="c[1]"
                r="1.5"
              />
            </svg>
          </span>
        </component>
        <!-- Запасы (MobileStock): no tick, the text on the gutter and the norm under it -->
        <RecordMark
          v-if="!stock"
          :rec="rec"
          :page="page"
          :tabbable="readonly"
          class="lg:size-9"
          @toggle="data.toggleDone(rec.id)"
        />
        <span
          v-else
          class="w-2.5 shrink-0 lg:w-2"
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
          >{{ nb(rec.text) }}</span>
          <span
            v-if="notePreview"
            class="truncate text-caption font-normal text-toned"
          >{{ notePreview }}</span>
          <span
            v-if="stock && (stock.low || stock.norm !== null)"
            class="flex items-center gap-1 text-13 text-toned"
          >
            <UIcon
              v-if="stock.low"
              name="i-lucide-arrow-down"
              class="size-3.5"
            />{{ [stock.low ? 'мало' : '', stock.norm !== null ? `норма ${stock.norm}` : ''].filter(Boolean).join(' · ') }}
          </span>
        </button>

        <span
          v-if="waiting || subs.length || (rec.note && !notePreview) || right.length"
          class="ml-2 flex shrink-0 items-center gap-2.5 text-meta text-toned tabular-nums"
        >
          <span v-if="waiting">ждёт сети</span>
          <span
            v-if="subs.length"
            :aria-label="`подпункты: ${subsDone} из ${subs.length}`"
          >{{ subsDone }}/{{ subs.length }}</span>
          <UIcon
            v-if="rec.note && !notePreview"
            name="i-lucide-file-text"
            class="size-4"
            aria-label="есть заметка"
          />
          <span
            v-for="r in right"
            :key="r.key"
            :class="r.tone === 'warn' ? 'text-warn-ink' : ''"
          >{{ r.text }}</span>
        </span>

        <!-- Запасы: the number against its norm, with a stepper -->
        <span
          v-if="stock"
          class="ml-1 flex shrink-0 items-center gap-1.5"
        >
          <button
            type="button"
            class="hit-44 relative flex size-8 cursor-pointer items-center justify-center rounded-[9px] border border-default bg-default text-highlighted active:bg-pressed"
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
            class="hit-44 relative flex size-8 cursor-pointer items-center justify-center rounded-[9px] border border-default bg-default text-highlighted active:bg-pressed"
            :aria-label="`Больше: ${rec.text}`"
            @click="step(1)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
          </button>
        </span>

        <!-- Входящие: the strongest guess, one width (92–120) so the next row's chip lands under the thumb, then the
             faint «⋯»; at 320 the chip drops under the text as line 2 -->
        <template v-if="choosing">
          <span
            v-if="guesses[0]"
            class="sunk ml-1.5 flex max-w-30 min-w-23 shrink-0 max-[359px]:hidden"
          >
            <ChipButton
              :label="`→ ${guesses[0].title || 'Без названия'}`"
              :aria-label="`Переместить в «${guesses[0].title || 'Без названия'}»`"
              class="w-full justify-center font-medium"
              @click="emit('choose', guesses[0].id)"
            />
          </span>
          <ActionMenu
            :items="inboxMenu"
            :title="rec.text"
            caption="Входящие"
            :label="`Ещё для «${rec.text}»`"
          >
            <button
              type="button"
              class="relative -mr-2 ml-1.5 flex h-11 w-6 shrink-0 cursor-pointer items-center justify-center rounded-item text-dimmed after:absolute after:inset-y-0 after:-right-1 after:-left-0.75 hover:text-highlighted active:bg-pressed aria-expanded:text-highlighted lg:mr-0 lg:h-9 lg:w-8"
              :aria-label="`Ещё для «${rec.text}»`"
              aria-haspopup="dialog"
            >
              <UIcon
                name="i-lucide-ellipsis"
                class="size-4.5"
              />
            </button>
          </ActionMenu>
        </template>

        <!-- Desktop: the actions on hover, after the values; on touch they live in the swipe and in «⋯» -->
        <span
          v-if="!readonly && isDesktop && !lifted && !choosing"
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
          v-if="!readonly && isDesktop && !choosing"
          v-model:open="menuOpen"
          :items="menu"
          :content="{ align: 'end' }"
        >
          <component
            :is="later.ready.value ? LazyUTooltip : Bare"
            text="Все действия"
          >
            <UButton
              icon="i-lucide-ellipsis"
              variant="ghost"
              square
              size="sm"
              tabindex="-1"
              :aria-label="`Действия: ${rec.text}`"
              class="opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 aria-expanded:opacity-100"
              :class="{ invisible: lifted }"
              @click="!later.ready.value && openMenu()"
            />
          </component>
        </component>
        <!-- Phone: «⋯» is a sheet, opened by a long press that lets go without moving, and by screen readers -->
        <template v-else-if="!readonly && !isDesktop">
          <button
            type="button"
            class="sr-only"
            tabindex="-1"
            :aria-label="`Действия: ${rec.text}`"
            @click="openMenu()"
          />
          <ActionMenu
            v-model:open="menuOpen"
            :items="sheet"
            :title="rec.text"
            :label="`Действия: ${rec.text}`"
            bare
          />
        </template>
      </div>
    </component>

    <!-- Входящие at 320: the guess is line 2, under the text -->
    <div
      v-if="choosing && guesses[0]"
      class="flex pr-3 pb-2 pl-12 min-[360px]:hidden"
    >
      <span class="sunk flex max-w-30 min-w-23">
        <ChipButton
          :label="`→ ${guesses[0].title || 'Без названия'}`"
          :aria-label="`Переместить в «${guesses[0].title || 'Без названия'}»`"
          class="w-full justify-center font-medium"
          @click="emit('choose', guesses[0].id)"
        />
      </span>
    </div>
  </div>
</template>
