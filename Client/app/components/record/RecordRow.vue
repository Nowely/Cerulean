<script setup lang="ts">
// A record on its page. Mobile: swipe left for «Переместить» and «Удалить».
// Desktop: the same actions appear on hover, and a right click opens all of them.
// Keyboard and screen readers reach every action through «⋯».
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
import { clock, formatAdded, formatDue, formatMoment, isOverdue } from '~/domain/dates'
import RecordMark from '../common/RecordMark.vue'
import ChipButton from '../common/ChipButton.vue'

const props = withDefaults(defineProps<{
  rec: Rec
  page: Page
  view?: ViewDef
  /** Records added after this moment are new: the row is tinted and says when */
  freshSince?: number
  /** Preview keeps reading and ticking only: no swipe, no hover actions */
  readonly?: boolean
  selected?: boolean
  /** Subitems under a record: a step is often a whole sentence, so it wraps instead of being cut */
  wrap?: boolean
}>(), { freshSince: Number.POSITIVE_INFINITY, readonly: false, selected: false, wrap: false })

const emit = defineEmits<{ open: [], choose: [pageId: Id | 'more' | 'new'] }>()

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
const fresh = computed(() => props.rec.addedAt > props.freshSince && !props.rec.done)
const freshLabel = computed(() => now.value - props.rec.addedAt < 5 * 60_000 ? 'только что' : clock(props.rec.addedAt))
const late = computed(() => !props.rec.done && isOverdue(props.rec.due, now.value))
const inbox = computed(() => props.page.kind === 'inbox')
const asking = computed(() => inbox.value && props.rec.tags.includes('clarify') && !props.rec.done)
/** Waiting for the network: a state on line 2, not a tag */
const waiting = computed(() => inbox.value && props.rec.tags.includes('offline'))
const added = computed(() => waiting.value
  ? `ждёт сети · ${formatMoment(props.rec.addedAt, now.value)}`
  : formatAdded(props.rec.via, props.rec.addedAt, now.value))

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
        class="group/row relative mx-2 flex min-h-13 items-center rounded-chip pr-3 lg:mx-0 lg:min-h-10 lg:pr-1.5"
        :class="[
          fresh ? 'bg-fresh' : selected ? 'bg-sel' : 'bg-[var(--row-bg,var(--bg))] lg:hover:bg-hover',
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
          class="lg:size-9"
          @toggle="data.toggleDone(rec.id)"
        />
        <button
          type="button"
          class="flex min-h-13 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-px rounded-item py-1 pr-1 pl-0.5 text-left lg:min-h-10"
          @click="emit('open')"
        >
          <span
            class="text-record"
            :class="[wrap ? 'line-clamp-3' : 'truncate', rec.done ? 'text-dimmed line-through' : 'text-highlighted']"
          >{{ rec.text }}</span>
          <span
            v-if="inbox"
            class="truncate text-caption font-normal text-toned"
          >{{ added }}</span>
          <span
            v-else-if="notePreview"
            class="truncate text-caption font-normal text-toned"
          >{{ notePreview }}</span>
        </button>

        <span
          v-if="fresh"
          class="ml-2 shrink-0 text-caption text-accent-ink"
        >{{ freshLabel }}</span>

        <span
          v-if="!fresh"
          class="ml-2 flex shrink-0 items-center gap-2.5 text-meta text-toned tabular-nums lg:group-hover/row:hidden lg:group-focus-within/row:hidden"
          :class="readonly ? 'lg:group-hover/row:flex lg:group-focus-within/row:flex' : ''"
        >
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

        <!-- Desktop: the actions on hover; on touch they live in the swipe and in «⋯» -->
        <span
          v-if="!readonly && isDesktop"
          class="ml-1 hidden shrink-0 items-center gap-0.5 group-hover/row:flex group-focus-within/row:flex"
        >
          <component
            :is="later.ready.value ? LazyUTooltip : Bare"
            text="Переместить"
          >
            <UButton
              icon="i-lucide-folder-input"
              variant="ghost"
              square
              size="sm"
              aria-label="Переместить"
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
              aria-label="Удалить"
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
              :aria-label="`Действия: ${rec.text}`"
              class="sr-only focus:not-sr-only lg:not-sr-only lg:opacity-0 lg:group-hover/row:opacity-100 lg:focus:opacity-100 lg:aria-expanded:opacity-100"
              @click="!later.ready.value && openMenu()"
            />
          </component>
        </component>
      </div>
    </component>

    <!-- Входящие: two guessed pages right on the row, saying what a tap does (a preview only reads) -->
    <div
      v-if="(asking || waiting) && !readonly"
      class="flex flex-wrap gap-1.5 pr-3 pb-3 pl-13 lg:pl-11"
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
