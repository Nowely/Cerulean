<script setup lang="ts">
// Список: rows, grouped when the view says so. A group caption folds its group («Хлеб и выпечка · 3 ›»), the fold
// is kept per view, and the caption sticks while its rows scroll. Alt+↑/↓ (and drag) move a row: past the end of
// a «Выбор» group it joins the next one, with «Отменить». A long page shows its first 100 rows and «Показать ещё»:
// 600 rows at once took seconds to open and to write to on a phone
import { computed, ref } from 'vue'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useNotify } from '~/composables/useNotify'
import { applyView, type Group } from '~/domain/views'
import RecordRow from '../../record/RecordRow.vue'

const props = defineProps<{
  page: Page
  view: ViewDef
  records: Rec[]
  /** The page was opened then: rows ticked since stay in place */
  since?: number
  readonly?: boolean
}>()
const emit = defineEmits<{ open: [rec: Rec], choose: [rec: Rec, pageId: Id | 'more' | 'new'] }>()
const data = useDataStore()
const notify = useNotify()
const now = useNow()
const groups = computed(() => applyView(props.page, props.records, props.view, now.value, props.since))

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
/** The groups cut to the first `limit` rows, in order; a group with nothing left is not shown */
const shown = computed(() => {
  if (total.value <= limit.value) return groups.value
  let left = limit.value
  return groups.value.map((g) => {
    const records = g.records.slice(0, Math.max(0, left))
    left -= records.length
    return { ...g, records }
  }).filter(g => g.records.length)
})

// ---------- moving a row ----------

/** The «Выбор» property the view groups by: dropping into its group sets the value */
const groupProp = computed(() => props.page.props.find(p => p.id === props.view.groupBy && p.type === 'select'))

/**
 * Puts a row at `index` of a group. A view sorted by a property switches to «Вручную» first (the rows keep the
 * order they had on screen); a move into another «Выбор» group sets its value. Both say so with «Отменить».
 */
function place(rec: Rec, target: Group, index: number) {
  const from = groups.value.find(g => g.records.some(r => r.id === rec.id))
  const crossing = !!from && from.key !== target.key
  if (crossing && !groupProp.value) return
  const touched = props.records.map(r => ({ id: r.id, order: r.order, values: r.values }))
  const sort = props.view.sort
  if (sort !== 'manual') {
    groups.value.flatMap(g => g.records).forEach((r, i) => data.updateRecord(r.id, { order: i }))
    data.updatePage(props.page.id, { views: props.page.views.map(v => v.id === props.view.id ? { ...v, sort: 'manual' } : v) })
  }
  const others = target.records.filter(r => r.id !== rec.id).map(r => data.records[r.id]!)
  const before = others[index - 1]
  const after = others[index]
  const order = before && after ? (before.order + after.order) / 2 : before ? before.order + 1 : after ? after.order - 1 : rec.order
  const values = crossing ? { ...rec.values, [groupProp.value!.id]: target.key === 'none' ? null : target.key } : rec.values
  data.updateRecord(rec.id, { order, values })
  const undo = () => {
    for (const t of touched) data.updateRecord(t.id, { order: t.order, values: t.values })
    if (sort !== 'manual') data.updatePage(props.page.id, { views: props.page.views.map(v => v.id === props.view.id ? { ...v, sort } : v) })
  }
  if (crossing) notify(`${rec.text} → ${target.label}`, { label: 'Отменить', run: undo })
  else if (sort !== 'manual') notify('Порядок: вручную', { label: 'Отменить', run: undo })
}

/** Alt+↑/↓: one step within the group; past its edge into the next group, at the end nearest to the row */
function shift(rec: Rec, by: -1 | 1) {
  const gi = groups.value.findIndex(g => g.records.some(r => r.id === rec.id))
  const g = groups.value[gi]
  if (!g) return
  const i = g.records.findIndex(r => r.id === rec.id)
  if (i + by >= 0 && i + by < g.records.length) return place(rec, g, i + by)
  const next = groups.value[gi + by]
  if (next && groupProp.value) place(rec, next, by < 0 ? next.records.length : 0)
}
</script>

<template>
  <div>
    <section
      v-for="g in shown"
      :key="g.key"
      :aria-label="g.label || undefined"
    >
      <h3
        v-if="g.label"
        class="sticky top-0 z-1 bg-[var(--row-bg,var(--bg))]"
      >
        <button
          type="button"
          class="flex min-h-9 w-full cursor-pointer items-center gap-1 px-4 pt-3 text-left text-cap leading-6 lg:min-h-8 lg:px-2.5 lg:leading-5"
          :class="g.tone === 'warn' ? 'text-warn-ink' : 'text-toned hover:text-highlighted'"
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
        >
          <RecordRow
            :rec="r"
            :page="page"
            :view="view"
            :readonly="readonly"
            @open="emit('open', r)"
            @choose="id => emit('choose', r, id)"
            @shift="by => shift(r, by)"
          />
        </li>
      </ul>
    </section>
    <button
      v-if="total > limit"
      type="button"
      class="mx-2 mt-1 flex h-11 cursor-pointer items-center rounded-item px-3 text-15 text-accent-ink hover:bg-muted active:bg-pressed lg:mx-0 lg:h-9 lg:px-2.5 lg:text-sm"
      @click="limit += STEP * 2"
    >
      Показать ещё {{ total - limit }}
    </button>
    <slot
      v-if="!total"
      name="empty"
    />
  </div>
</template>
