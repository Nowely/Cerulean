<script setup lang="ts">
// Список: rows, grouped when the view says so. A group caption folds its group («Хлеб и выпечка · 3 ›»), the fold
// is kept per view, and the caption sticks while its rows scroll. A row moves by drag (a long press on a phone,
// the ⋮⋮ handle on desktop), Alt+↑/↓, or «Выше»/«Ниже» for screen readers: a drop into another «Выбор» group sets
// its value, with «Яйца → Овощи и фрукты · Отменить». A long press that lets go without moving opens the row's
// «⋯». A view of ticked records ends with «Очистить купленное». A long page shows its first 100 rows and «Показать
// ещё»: 600 rows at once took seconds to open and to write to on a phone
import { computed, ref } from 'vue'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useNotify } from '~/composables/useNotify'
import { LIFTED, useDragSort } from '~/composables/useDragSort'
import { applyView, type Group } from '~/domain/views'
import { isListPage } from '~/domain/auto'
import { count, RECORD_FORMS } from '~/domain/text'
import RecordRow from '../../record/RecordRow.vue'

const props = defineProps<{
  page: Page
  view: ViewDef
  records: Rec[]
  /** The page was opened then: rows ticked since stay in place */
  since?: number
  readonly?: boolean
  /** «Очистить купленное» under a view of ticked records (not while searching the page) */
  clearable?: boolean
}>()
const emit = defineEmits<{ open: [rec: Rec], choose: [rec: Rec, pageId: Id | 'more' | 'new'] }>()
const data = useDataStore()
const notify = useNotify()
const now = useNow()
const groups = computed(() => applyView(props.page, props.records, props.view, now.value, props.since))
/** Moves and deletions keep their «Отменить» for 8 s */
const UNDO_MS = 8000

// ---------- folding ----------

const folded = computed(() => new Set(props.view.folded ?? []))
function toggleFold(key: string) {
  const next = folded.value.has(key) ? [...folded.value].filter(k => k !== key) : [...folded.value, key]
  data.updatePage(props.page.id, { views: props.page.views.map(v => v.id === props.view.id ? { ...v, folded: next } : v) })
}

// ---------- long pages ----------

const STEP = 100
const limit = ref(STEP)
const total = computed(() => groups.value.reduce((n, g) => n + g.records.length, 0))
/**
 * The groups cut to the first `limit` rows, in order; a group with nothing left is not shown. A row written since
 * the page was opened always shows, in its group, even past the cut: a send must never land out of sight (B4)
 */
const shown = computed(() => {
  if (total.value <= limit.value) return groups.value
  let i = 0
  const since = props.since ?? Number.POSITIVE_INFINITY
  return groups.value.map(g => ({ ...g, records: g.records.filter(r => i++ < limit.value || r.addedAt >= since) }))
    .filter(g => g.records.length)
})
const hidden = computed(() => total.value - shown.value.reduce((n, g) => n + g.records.length, 0))

// ---------- moving a row ----------

/** The «Выбор» property the view groups by: dropping into its group sets the value */
const groupProp = computed(() => props.page.props.find(p => p.id === props.view.groupBy && p.type === 'select'))

/** Puts a row at `index` of a group as the list shows it; a new group or a new sort order says so with «Отменить» */
function place(id: Id, to: string, index: number) {
  const rec = data.records[id]
  const done = rec && data.placeRecord(props.page.id, props.view.id, shown.value, id, to, index)
  if (!rec || !done) return
  if (done.into) notify(`${rec.text} → ${done.into.label}`, { label: 'Отменить', run: done.undo }, UNDO_MS)
  else if (done.manual) notify('Порядок: вручную', { label: 'Отменить', run: done.undo }, UNDO_MS)
}

/** Alt+↑/↓, «Выше»/«Ниже»: one step within the group; past its edge into the next group, at the end nearest to the row */
function shift(rec: Rec, by: -1 | 1) {
  const gi = shown.value.findIndex(g => g.records.some(r => r.id === rec.id))
  const g = shown.value[gi]
  if (!g) return
  const i = g.records.findIndex(r => r.id === rec.id)
  if (i + by >= 0 && i + by < g.records.length) return place(rec.id, g.key, i + by)
  const next: Group | undefined = shown.value[gi + by]
  if (next && groupProp.value) place(rec.id, next.key, by < 0 ? next.records.length : 0)
}

// A long press lifts a row on a phone; desktop drags by the ⋮⋮ handle only, so a slow click still opens the row
const rows = new Map<Id, InstanceType<typeof RecordRow>>()
const drag = useDragSort({
  onDrop: place,
  onPress: id => rows.get(id)?.openMenu(),
  // Groups by date, and a list without groups, take no rows from another group: the row goes back
  accepts: (_id, from, to) => from === to || !!groupProp.value,
  disabled: () => !!props.readonly
})
/** The row's own keys already move it (Alt+↑/↓ on its text), so the list leaves them alone */
function item(id: Id) {
  const b = drag.item(id)
  return { ...b, onKeydown: undefined, onPointerdown: (e: PointerEvent) => e.pointerType !== 'mouse' && b.onPointerdown(e) }
}

// ---------- «Очистить купленное» ----------

const clears = computed(() => props.clearable && !props.readonly && props.page.hasDone
  && props.view.filter.some(r => r.field === 'done' && r.value === true) && props.records.some(r => r.done))
/** Instant, to Корзина, with «Отменить» (medium weight: several records at once, nothing lost) */
function clearDone() {
  const done = data.clearDone(props.page.id, props.view.id)
  if (done.count) notify(`${count(done.count, RECORD_FORMS)} в Корзине`, { label: 'Отменить', run: done.undo }, UNDO_MS)
}
</script>

<template>
  <div>
    <section
      v-for="g in shown"
      :key="g.key"
      :aria-label="g.label || undefined"
      v-bind="drag.group(g.key)"
    >
      <h3
        v-if="g.label"
        class="sticky top-0 z-1 bg-[var(--row-bg,var(--bg))]"
      >
        <button
          type="button"
          class="flex min-h-9 w-full cursor-pointer items-center gap-1 px-4 pt-3 text-left text-cap leading-6 lg:px-2.5 lg:pb-1 lg:leading-5"
          :class="g.tone === 'warn' ? 'text-warn-ink' : drag.joining.value === g.key ? 'text-accent-ink' : 'text-toned hover:text-highlighted'"
          :aria-expanded="!folded.has(g.key)"
          @click="toggleFold(g.key)"
        >
          {{ g.label }}
          <span
            v-if="folded.has(g.key)"
            class="font-normal text-dimmed tabular-nums"
          >· {{ g.records.length }}</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-3 shrink-0 text-dimmed transition-transform duration-150"
            :class="folded.has(g.key) ? '-rotate-90' : ''"
          />
        </button>
      </h3>
      <ul v-if="!folded.has(g.key)">
        <li
          v-for="r in g.records"
          :key="r.id"
          class="rounded-chip"
          :class="LIFTED"
          v-bind="readonly ? {} : item(r.id)"
        >
          <RecordRow
            :ref="(el) => el ? rows.set(r.id, el as InstanceType<typeof RecordRow>) : rows.delete(r.id)"
            :rec="r"
            :page="page"
            :view="view"
            :readonly="readonly"
            :reveal="r.addedAt >= (since ?? Number.POSITIVE_INFINITY)"
            :lifted="drag.lifted.value === r.id"
            :grip="readonly ? undefined : drag.handle(r.id)"
            @open="emit('open', r)"
            @choose="id => emit('choose', r, id)"
            @shift="by => shift(r, by)"
          />
          <!-- The long press for screen readers (keyboards have Alt+↑/↓ on the row) -->
          <template v-if="!readonly">
            <button
              type="button"
              class="sr-only"
              tabindex="-1"
              @click="shift(r, -1)"
            >
              Выше: {{ r.text }}
            </button>
            <button
              type="button"
              class="sr-only"
              tabindex="-1"
              @click="shift(r, 1)"
            >
              Ниже: {{ r.text }}
            </button>
          </template>
        </li>
      </ul>
    </section>
    <button
      v-if="hidden > 0"
      type="button"
      class="mx-2 mt-1 flex h-11 cursor-pointer items-center rounded-item px-3 text-15 text-accent-ink hover:bg-muted active:bg-pressed lg:mx-0 lg:h-9 lg:px-2.5 lg:text-sm"
      @click="limit += STEP * 2"
    >
      Показать ещё {{ hidden }}
    </button>
    <button
      v-if="clears"
      type="button"
      class="mx-1.5 mt-1 flex h-11 cursor-pointer items-center rounded-item px-2.5 text-base text-accent-ink hover:bg-muted active:bg-pressed lg:mx-0 lg:h-9 lg:text-15"
      @click="clearDone"
    >
      {{ isListPage(page) ? 'Очистить купленное' : 'Очистить готовое' }}
    </button>
    <slot
      v-if="!total"
      name="empty"
    />
  </div>
</template>
