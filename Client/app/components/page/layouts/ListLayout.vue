<script setup lang="ts">
// Список: rows, grouped when the view says so. A group caption folds its group («Хлеб и выпечка · 3 ›»), the fold
// is kept per view, and the caption sticks while its rows scroll. A row moves by drag (a long press on a phone,
// the ⋮⋮ handle on desktop), Alt+↑/↓, or «Выше»/«Ниже» for screen readers: a drop into another «Выбор» group sets
// its value, with «Яйца → Овощи и фрукты · Отменить». A long press that lets go without moving opens the row's
// «⋯». A view of ticked records ends with «Очистить купленное». A long page shows its first 100 rows and «Показать
// ещё»: 600 rows at once took seconds to open and to write to on a phone
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useNotify } from '~/composables/useNotify'
import { useScreen } from '~/composables/useScreen'
import { useListTreeHold, type TreeDrop } from '~/composables/useListTreeHold'
import { LIFTED, useDragSort } from '~/composables/useDragSort'
import { applyView, groupRecords, type Group } from '~/domain/views'
import { optionOf } from '~/domain/props'
import { isListPage } from '~/domain/auto'
import { count, RECORD_FORMS } from '~/domain/text'
import RecordRow from '../../record/RecordRow.vue'
import RecordHoldMenu from '../../record/RecordHoldMenu.vue'
import OptionPill from '../../common/OptionPill.vue'

const props = defineProps<{
  page: Page
  view: ViewDef
  records: Rec[]
  /** The page was opened then: rows written since always show */
  since?: number
  readonly?: boolean
  /** «Очистить купленное» under a view of ticked records (not while searching the page) */
  clearable?: boolean
  /** When the page was opened before this visit: records written from elsewhere after it take the fresh tint */
  seen?: number
}>()
const emit = defineEmits<{ open: [rec: Rec] }>()
const data = useDataStore()
const notify = useNotify()
const now = useNow()
const { isDesktop } = useScreen()
const stockSessions = shallowRef(new Map<Id, { snapshot: Rec, count: number }>())
function stockOpen(id: Id, open: boolean) {
  const sessions = new Map(stockSessions.value)
  const current = sessions.get(id)
  if (open) {
    const rec = data.records[id]
    if (!rec) return
    if (current) sessions.set(id, { ...current, count: current.count + 1 })
    else sessions.set(id, {
      snapshot: { ...rec, values: { ...rec.values }, tags: [...rec.tags], due: rec.due && { ...rec.due }, stockBuy: rec.stockBuy && { ...rec.stockBuy } }, count: 1
    })
  } else if (current && current.count > 1) sessions.set(id, { ...current, count: current.count - 1 })
  else sessions.delete(id)
  stockSessions.value = sessions
}
watch(() => [props.page.id, props.view.id], () => {
  stockSessions.value = new Map()
}, { flush: 'sync' })
const groups = computed(() => {
  const live = new Map(props.records.map(r => [r.id, r]))
  const records = props.records.map(r => stockSessions.value.get(r.id)?.snapshot ?? r)
  return applyView(props.page, records, props.view, now.value, data.leaving)
    .map(g => ({ ...g, records: g.records.map(r => live.get(r.id) ?? r) }))
})
/** Moves and deletions keep their «Отменить» for 8 s */
const UNDO_MS = 8000

// ---------- folding ----------

const folded = computed(() => new Set(props.view.folded ?? []))
function toggleFold(key: string) {
  const next = folded.value.has(key) ? [...folded.value].filter(k => k !== key) : [...folded.value, key]
  data.updatePage(props.page.id, { views: props.page.views.map(v => v.id === props.view.id ? { ...v, folded: next } : v) })
}

function disableLeaving(el: Element) {
  if (el instanceof HTMLElement) el.inert = true
}
function enableEntering(el: Element) {
  if (el instanceof HTMLElement) el.inert = false
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
/** An ungrouped view of ticked records names itself above its rows: «Сделано» (v23); Покупки keeps its own words */
const doneCaption = computed(() => !isListPage(props.page) && total.value > 0 && groups.value.length === 1 && !groups.value[0]!.label
  && props.view.filter.some(r => r.field === 'done' && r.value === true))

// ---------- moving a row ----------

/** The «Выбор» property the view groups by: dropping into its group sets the value */
const groupProp = computed(() => props.page.props.find(p => p.id === props.view.groupBy && p.type === 'select'))
/** A group of an option has its pill as the caption (v23); «Без отдела» stays a plain caption */
const pillOf = (g: Group) => optionOf(groupProp.value, g.key === 'none' ? null : g.key)
const hideDepartmentCaptions = computed(() => props.page.template === 'shop' && !!groupProp.value
  && groupProp.value.id === props.page.props.find(p => p.type === 'select')?.id
  && !props.view.filter.some(rule => rule.field === 'done' && rule.value === true)
  && groups.value.filter(group => group.key !== 'none').length < 2)

function visibleTree(records: Rec[]) {
  const rows: { rec: Rec, depth: number }[] = []
  const seen = new Set<Id>()
  function visit(rec: Rec, depth: number) {
    if (seen.has(rec.id)) return
    seen.add(rec.id)
    rows.push({ rec, depth })
    if (depth >= 2 || data.settings.folded.includes(`record:${rec.id}`)) return
    for (const child of data.subitemsOf(rec.id)) visit(child, depth + 1)
  }
  for (const rec of records) visit(rec, 0)
  return rows
}

function previousSibling(rec: Rec, roots: Rec[]) {
  const siblings = rec.parentId ? data.subitemsOf(rec.parentId) : roots
  const previous = siblings[siblings.findIndex(r => r.id === rec.id) - 1]
  return previous && data.canPlaceSubtree(rec.id, previous.id) ? previous : undefined
}

function nest(rec: Rec, parent: Rec) {
  if (stockSessions.value.size) return
  const placed = data.placeSubtree(rec.id, parent.id, data.subitemsOf(parent.id).length)
  if (!placed) return
  if (data.settings.folded.includes(`record:${parent.id}`)) data.toggleFolded(`record:${parent.id}`)
  notify(`Вложено в «${parent.text}»`, { label: 'Отменить', run: placed.undo }, UNDO_MS)
}

function outdent(rec: Rec) {
  if (stockSessions.value.size) return
  const parent = rec.parentId ? data.records[rec.parentId] : undefined
  if (!parent) return
  const siblings = parent.parentId ? data.subitemsOf(parent.parentId) : [...data.recordsOf(parent.pageId)].sort((a, b) => a.order - b.order)
  const index = siblings.findIndex(r => r.id === parent.id)
  if (index < 0) return
  const placed = data.placeSubtree(rec.id, parent.parentId, index + 1)
  if (placed) notify(`Вынесено из «${parent.text}»`, { label: 'Отменить', run: placed.undo }, UNDO_MS)
}

/** Puts a row at `index` of a group as the list shows it; a new group or a new sort order says so with «Отменить» */
function undoPlacement(undo: () => 'restored' | 'partial' | 'conflict') {
  const result = undo()
  if (result === 'conflict') notify('Не удалось отменить: записи или порядок изменились.')
  else if (result === 'partial') notify('Отменено частично: более поздние изменения сохранены.')
}
function place(id: Id, to: string, index: number) {
  if (stockSessions.value.size) return
  const rec = data.records[id]
  const done = rec && data.placeRecord(props.page.id, props.view.id, shown.value, id, to, index)
  if (!rec || !done) return
  if (done.into) notify(`${rec.text} → ${done.into.label}`, { label: 'Отменить', run: () => undoPlacement(done.undo) }, UNDO_MS)
  else if (done.manual) notify('Порядок: вручную', { label: 'Отменить', run: () => undoPlacement(done.undo) }, UNDO_MS)
}

/**
 * Alt+↑/↓, «Выше»/«Ниже»: one step within the group; past its edge into the next group, at the end nearest to the
 * row. The row keeps the focus when the list draws it in another group
 */
const root = useTemplateRef<HTMLElement>('root')
function shift(rec: Rec, by: -1 | 1) {
  if (stockSessions.value.size) return
  const gi = shown.value.findIndex(g => g.records.some(r => r.id === rec.id))
  const g = shown.value[gi]
  if (!g) return
  const focused = document.activeElement
  const i = g.records.findIndex(r => r.id === rec.id)
  const next: Group | undefined = shown.value[gi + by]
  if (i + by >= 0 && i + by < g.records.length) place(rec.id, g.key, i + by)
  else if (next && groupProp.value) place(rec.id, next.key, by < 0 ? next.records.length : 0)
  else return
  if (focused instanceof HTMLElement && focused.matches('[data-row-text]')) {
    void nextTick(() => {
      if (!focused.isConnected) root.value?.querySelector<HTMLElement>(`[data-drag-id="${CSS.escape(rec.id)}"] [data-row-text]`)?.focus()
    })
  }
}

// A long press lifts a row on a phone; desktop drags by the ⋮⋮ handle only, so a slow click still opens the row
const rows = new Map<Id, InstanceType<typeof RecordRow>>()
const drag = useDragSort({
  onDrop: place,
  onPress: id => rows.get(id)?.openMenu(),
  // Groups by date, and a list without groups, take no rows from another group: the row goes back
  accepts: (_id, from, to) => from === to || !!groupProp.value,
  disabled: () => !!props.readonly || stockSessions.value.size > 0
})
/** The row's own keys already move it (Alt+↑/↓ on its text), so the list leaves them alone */
function item(id: Id) {
  const b = drag.item(id)
  return { ...b, onKeydown: undefined, onPointerdown: undefined }
}

function rowGroup(id: Id) {
  return shown.value.find(g => visibleTree(g.records).some(row => row.rec.id === id))
}

function treeDestination(drop: TreeDrop) {
  if (stockSessions.value.size) return null
  const rec = data.records[drop.id]
  const target = data.records[drop.target]
  const group = rowGroup(drop.target)
  const from = rowGroup(drop.id)
  if (!rec || !target || !group || !from || rec.id === target.id || rec.pageId !== props.page.id || target.pageId !== props.page.id) return null
  const badDue = props.view.groupBy === 'due' && groupRecords([rec], 'due', props.page, now.value)[0]?.key !== group.key
  if (drop.zone === 'inside') {
    if (!data.canPlaceSubtree(rec.id, target.id)) return null
    if (from.key !== group.key && !groupProp.value && props.view.groupBy !== 'due') return null
    return { parentId: target.id, index: data.subitemsOf(target.id).filter(r => r.id !== rec.id).length, depth: 1, group, topLevel: false, badDue }
  }
  const visible = visibleTree(group.records).find(row => row.rec.id === target.id)
  if (!visible) return null
  const left = root.value?.getBoundingClientRect().left ?? 0
  const depth = Math.min(visible.depth, Math.max(0, Math.floor((drop.x - left - 48) / 32)))
  let anchor = target
  for (let d = visible.depth; d > depth; d--) {
    const parent = anchor.parentId && data.records[anchor.parentId]
    if (!parent) return null
    anchor = parent
  }
  const parentId = anchor.parentId
  const topLevel = !rec.parentId && !parentId
  if (topLevel) {
    if (from.key !== group.key && !groupProp.value && props.view.groupBy !== 'due') return null
    const siblings = group.records.filter(r => r.id !== rec.id)
    const at = siblings.findIndex(r => r.id === anchor.id)
    if (at < 0) return null
    return { parentId, index: at + (drop.zone === 'after' ? 1 : 0), depth, group, topLevel, badDue }
  }
  if ((from.key !== group.key && !groupProp.value && props.view.groupBy !== 'due') || !data.canPlaceSubtree(rec.id, parentId)) return null
  const siblings = (parentId ? data.subitemsOf(parentId) : group.records).filter(r => r.id !== rec.id)
  const at = siblings.findIndex(r => r.id === anchor.id)
  if (at < 0) return null
  return { parentId, index: at + (drop.zone === 'after' ? 1 : 0), depth, group, topLevel, badDue }
}

function dropTree(drop: TreeDrop) {
  const dest = treeDestination(drop)
  const rec = data.records[drop.id]
  if (!dest || !rec) return
  if (dest.badDue) {
    notify('Нельзя переместить: срок записи не соответствует выбранной группе.')
    return
  }
  if (dest.topLevel) return place(rec.id, dest.group.key, dest.index)
  const previous = rec.parentId ? data.records[rec.parentId] : undefined
  const oldParent = rec.parentId
  const siblings = oldParent ? data.subitemsOf(oldParent) : [...data.recordsOf(rec.pageId)].sort((a, b) => a.order - b.order)
  if (oldParent === dest.parentId && siblings.findIndex(r => r.id === rec.id) === dest.index) return
  const result = data.placeTreeRecord(props.page.id, props.view.id, shown.value, rec.id, dest.parentId, dest.group.key, dest.index, now.value)
  if (!result.ok) {
    if (result.reason === 'due-group') notify('Нельзя переместить: срок записи не соответствует выбранной группе.')
    else if (result.reason === 'order-conflict') notify('Не удалось переместить: порядок записей нельзя сохранить.')
    return
  }
  if (dest.parentId !== oldParent) {
    const parent = dest.parentId && data.records[dest.parentId]
    if (parent && data.settings.folded.includes(`record:${parent.id}`)) data.toggleFolded(`record:${parent.id}`)
    const message = parent ? `Вложено в «${parent.text}»` : `Вынесено из «${previous?.text ?? ''}»`
    notify(result.manual ? `${message} · порядок: вручную` : message, { label: 'Отменить', run: () => undoPlacement(result.undo) }, UNDO_MS)
  } else if (result.manual) notify('Порядок: вручную', { label: 'Отменить', run: () => undoPlacement(result.undo) }, UNDO_MS)
}

const tree = useListTreeHold({
  disabled: id => !!props.readonly || isDesktop.value || stockSessions.value.has(id) || id in data.leaving,
  target: drop => !!treeDestination(drop),
  drop: dropTree
})
const heldRecord = computed(() => tree.held.value ? data.records[tree.held.value.id] : undefined)
const heldItems = computed(() => tree.held.value ? rows.get(tree.held.value.id)?.holdItems ?? [] : [])
const treeLine = computed(() => {
  const dest = tree.over.value && tree.over.value.zone !== 'inside' ? treeDestination(tree.over.value) : null
  return dest?.badDue ? null : dest
})
const treeHighlight = computed(() => tree.over.value?.zone === 'inside' && !treeDestination(tree.over.value)?.badDue ? tree.over.value.target : null)
watch(() => [props.page.id, props.view.id], tree.close, { flush: 'sync' })
watch(() => heldRecord.value && [heldRecord.value.pageId, heldRecord.value.deletedAt], () => {
  if (tree.held.value && (!heldRecord.value || heldRecord.value.deletedAt || heldRecord.value.pageId !== props.page.id)) tree.close()
})
function openHeld() {
  const rec = heldRecord.value
  tree.close()
  if (rec) emit('open', rec)
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
  <div ref="root">
    <h3
      v-if="doneCaption"
      class="flex min-h-9 items-center px-4 pt-3 text-cap leading-6 text-toned lg:px-2.5 lg:pb-1 lg:leading-5"
    >
      Сделано
    </h3>
    <section
      v-for="g in shown"
      :key="g.key"
      :aria-label="g.label || undefined"
      v-bind="drag.group(g.key)"
    >
      <h3
        v-if="g.label && !hideDepartmentCaptions"
        class="sticky top-0 z-1 bg-[var(--row-bg,var(--bg))]"
      >
        <button
          type="button"
          class="flex min-h-9 w-full cursor-pointer items-center gap-1 px-4 pt-3 text-left text-cap leading-6 lg:px-2.5 lg:pb-1 lg:leading-5"
          :class="g.tone === 'warn' ? 'text-warn' : drag.joining.value === g.key && !pillOf(g) ? 'text-accent-ink' : 'text-toned hover:text-highlighted'"
          :aria-expanded="!folded.has(g.key)"
          @click="toggleFold(g.key)"
        >
          <!-- As a drop target the pill keeps its colours and takes the accent ring -->
          <OptionPill
            v-if="pillOf(g)"
            :name="g.label"
            :color="pillOf(g)!.color"
            :ring="drag.joining.value === g.key"
            class="mr-0.5"
          />
          <template v-else>
            {{ g.label }}
          </template>
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
      <Transition
        name="mf3-fold"
        @before-enter="enableEntering"
        @before-leave="disableLeaving"
      >
        <ul v-if="hideDepartmentCaptions || !folded.has(g.key)">
          <li
            v-for="row in visibleTree(g.records)"
            :key="row.rec.id"
            class="relative rounded-chip"
            :class="[LIFTED, { 'opacity-0': tree.held.value?.id === row.rec.id && tree.held.value.offset }]"
            :style="{ paddingLeft: `${row.depth * 32}px` }"
            :data-tree-row="row.rec.id"
            v-bind="readonly || row.depth ? {} : item(row.rec.id)"
            @pointerdown="tree.down($event, row.rec.id)"
          >
            <span
              v-if="tree.over.value?.target === row.rec.id && treeLine"
              class="pointer-events-none absolute right-2 z-10 h-0.5 rounded-full bg-accent before:absolute before:top-1/2 before:-left-1 before:size-2 before:-translate-y-1/2 before:rounded-full before:bg-accent"
              :class="tree.over.value.zone === 'before' ? 'top-0' : 'bottom-0'"
              :style="{ left: `${48 + treeLine.depth * 32}px` }"
              data-tree-drop-line
            />
            <RecordRow
              :ref="(el) => el ? rows.set(row.rec.id, el as InstanceType<typeof RecordRow>) : rows.delete(row.rec.id)"
              :rec="row.rec"
              :page="page"
              :view="view"
              :readonly="readonly"
              :reveal="row.rec.addedAt >= (since ?? Number.POSITIVE_INFINITY)"
              :tint="seen !== undefined && row.rec.via === 'chat' && row.rec.addedAt > seen"
              :leaving="row.depth === 0 && row.rec.id in data.leaving"
              :lifted="drag.lifted.value === row.rec.id || tree.held.value?.id === row.rec.id"
              :drop-target="treeHighlight === row.rec.id"
              :grip="readonly || row.depth ? undefined : drag.handle(row.rec.id)"
              :tree-fold="row.depth < 2"
              :nest-under="previousSibling(row.rec, g.records)"
              :tree-actions="true"
              :stock-stepper="true"
              :purchase="row.depth === 0 && !readonly && (!view.from || view.from === 'self')"
              @open="emit('open', row.rec)"
              @shift="by => shift(row.rec, by)"
              @nest="parent => nest(row.rec, parent)"
              @outdent="outdent(row.rec)"
              @stock-open="stockOpen"
            />
            <!-- The long press for screen readers (keyboards have Alt+↑/↓ on the row) -->
            <template v-if="!readonly && !row.depth">
              <button
                type="button"
                class="sr-only"
                tabindex="-1"
                @click="shift(row.rec, -1)"
              >
                Выше: {{ row.rec.text }}
              </button>
              <button
                type="button"
                class="sr-only"
                tabindex="-1"
                @click="shift(row.rec, 1)"
              >
                Ниже: {{ row.rec.text }}
              </button>
            </template>
          </li>
        </ul>
      </Transition>
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
      {{ isListPage(page) ? 'Очистить купленное' : 'Очистить сделанное' }}
    </button>
    <slot
      v-if="!total"
      name="empty"
    />
  </div>
  <RecordHoldMenu
    v-if="tree.held.value && heldRecord"
    :title="heldRecord.text"
    :rect="tree.held.value.rect"
    :down="tree.held.value.down"
    :offset="tree.held.value.offset"
    :items="heldItems"
    @close="tree.close()"
    @open="openHeld"
  >
    <RecordRow
      :rec="heldRecord"
      :page="page"
      :view="view"
      readonly
      stock-stepper
    />
  </RecordHoldMenu>
</template>
