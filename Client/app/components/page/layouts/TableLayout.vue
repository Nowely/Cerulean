<script setup lang="ts">
import { computed } from 'vue'
import type { Page, Rec, ViewDef } from '~/domain/types'
import type { ListedProp } from '~/domain/props'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { usePropSheets } from '~/composables/usePropSheets'
import { useNotify } from '~/composables/useNotify'
import { filterRecords, sortRecords } from '~/domain/views'
import { formatAdded } from '~/domain/dates'
import { propList } from '~/domain/props'
import RecordMark from '../../common/RecordMark.vue'
import TableCell from './TableCell.vue'
import TableNoteCell from './TableNoteCell.vue'

const props = defineProps<{ page: Page, view: ViewDef, records: Rec[], readonly?: boolean }>()
const emit = defineEmits<{ open: [rec: Rec] }>()
const data = useDataStore()
const now = useNow()
const propSheets = usePropSheets()
const notify = useNotify()

function toggle(rec: Rec) {
  const context = !props.readonly && !rec.parentId && (!props.view.from || props.view.from === 'self')
    ? { pageId: props.page.id, viewId: props.view.id }
    : undefined
  const result = data.toggleDone(rec.id, context)
  if (result === 'invalid-norm') notify('Укажите неотрицательную норму запаса перед покупкой')
  else if (result === 'conflict') notify('Запись изменилась. Обновите её и попробуйте снова')
}

const rows = computed(() => {
  const records = sortRecords(filterRecords(props.records, props.view, data.leaving, now.value), props.view.sort)
  if (props.view.from && props.view.from !== 'self') return records.map(rec => ({ rec, depth: 0 }))
  const result: { rec: Rec, depth: number }[] = []
  const seen = new Set<string>()
  function visit(rec: Rec, depth: number) {
    if (seen.has(rec.id)) return
    seen.add(rec.id)
    result.push({ rec, depth })
    if (depth >= 2) return
    for (const child of data.subitemsOf(rec.id)) {
      if (child.pageId === props.page.id) visit(child, depth + 1)
    }
  }
  for (const rec of records) visit(rec, 0)
  return result
})
const cols = computed(() => propList(props.page).filter(p => p.key !== 'note' && (p.key !== 'due' || props.view.shown.includes('due'))))

function width(col: ListedProp): number {
  if (col.key === 'due' || col.type === 'date') return 116
  if (col.prop?.normProp) return 80
  if (col.type === 'select') return 156
  if (col.type === 'number') return 108
  if (col.type === 'relation') return 120
  return 190
}
</script>

<template>
  <div
    class="mt-2 max-w-full overflow-x-auto"
    data-phone-table
  >
    <table
      class="table-fixed border-separate border-spacing-0 text-15 tabular-nums"
      :style="{ width: `${176 + cols.reduce((sum, col) => sum + width(col), 0) + 190 + 108 + (readonly ? 0 : 44)}px` }"
    >
      <colgroup>
        <col style="width: 176px">
        <col
          v-for="c in cols"
          :key="c.key"
          :style="{ width: `${width(c)}px` }"
        >
        <col style="width: 190px">
        <col style="width: 108px">
        <col
          v-if="!readonly"
          style="width: 44px"
        >
      </colgroup>
      <thead>
        <tr class="text-left text-13 text-toned">
          <th class="sticky left-0 z-10 h-9 min-w-44 border-r border-b border-default bg-default px-3 font-medium">
            Название
          </th>
          <th
            v-for="c in cols"
            :key="c.key"
            class="h-9 border-r border-b border-default px-3 font-medium"
            :style="{ minWidth: `${width(c)}px` }"
          >
            {{ c.name }}
          </th>
          <th class="h-9 min-w-47.5 border-r border-b border-default px-3 font-medium">
            Заметка
          </th>
          <th class="h-9 min-w-27 border-b border-default px-3 font-medium">
            Добавлено
          </th>
          <th
            v-if="!readonly"
            class="h-9 border-b border-default p-0"
          >
            <button
              type="button"
              class="hit-44 relative flex size-8 cursor-pointer items-center justify-center text-dimmed hover:text-highlighted"
              aria-label="Новое свойство"
              @click="propSheets.create(page.id, { from: 'view' })"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-5"
              />
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="{ rec: r, depth } in rows"
          :key="r.id"
        >
          <td class="sticky left-0 z-10 h-11 border-r border-b border-default bg-default p-0">
            <div
              class="flex w-44 items-center"
              :style="{ paddingLeft: `${depth * 20}px` }"
            >
              <RecordMark
                :rec="r"
                :page="page"
                area="tight"
                @toggle="toggle(r)"
              />
              <button
                type="button"
                class="h-[43px] min-w-0 flex-1 cursor-pointer truncate pr-2 text-left text-highlighted hover:underline"
                :class="{ 'text-dimmed line-through': r.done }"
                @click="emit('open', r)"
              >
                {{ r.text }}
              </button>
            </div>
          </td>
          <td
            v-for="c in cols"
            :key="c.key"
            class="h-11 border-r border-b border-default p-0 align-middle"
          >
            <TableCell
              :page="page"
              :rec="r"
              :column="c"
              :readonly="readonly"
            />
          </td>
          <td class="h-11 border-r border-b border-default px-3 text-toned">
            <TableNoteCell
              :rec="r"
              :readonly="readonly"
              @open="emit('open', r)"
            />
          </td>
          <td class="h-11 border-b border-default px-3 text-toned">
            {{ formatAdded(r.addedAt, now) }}
          </td>
          <td
            v-if="!readonly"
            class="border-b border-default"
          />
        </tr>
      </tbody>
    </table>
  </div>
</template>
