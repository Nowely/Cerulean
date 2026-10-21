<script setup lang="ts">
// Таблица. Desktop: columns of the chosen properties. A phone has no room for columns,
// so each record becomes a small card with its properties as lines; no horizontal scroll.
import { computed } from 'vue'
import type { Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { filterRecords, sortRecords } from '~/domain/views'
import { formatDue, isOverdue } from '~/domain/dates'
import { formatValue, propList } from '~/domain/props'
import RecordMark from '../../common/RecordMark.vue'

const props = defineProps<{ page: Page, view: ViewDef, records: Rec[] }>()
const emit = defineEmits<{ open: [rec: Rec] }>()
const data = useDataStore()
const now = useNow()
const { isDesktop } = useScreen()

const rows = computed(() => sortRecords(filterRecords(props.records, props.view), props.view.sort))
/** The chosen properties in the order of «Свойства» (a view that chose none shows every own one) */
const cols = computed(() => propList(props.page, { norms: true })
  .filter(p => p.key === 'due' ? props.view.shown.includes('due') : !p.builtin && (props.view.shown.includes(p.key) || !props.view.shown.length))
  .map(p => ({ key: p.key, name: p.name })))

function cell(rec: Rec, key: string): { text: string, warn?: boolean } {
  if (key === 'due') return rec.due ? { text: formatDue(rec.due, now.value), warn: !rec.done && isOverdue(rec.due, now.value) } : { text: '' }
  const prop = props.page.props.find(p => p.id === key)
  return { text: prop ? formatValue(prop, rec.values[key], now.value) : '' }
}
</script>

<template>
  <table
    v-if="isDesktop"
    class="mt-2 w-full border-collapse text-15 tabular-nums"
  >
    <thead>
      <tr class="border-b border-default text-left text-cap text-toned">
        <th class="w-9" />
        <th class="py-2 pr-3 font-medium">
          Запись
        </th>
        <th
          v-for="c in cols"
          :key="c.key"
          class="py-2 pr-3 font-medium"
        >
          {{ c.name }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="r in rows"
        :key="r.id"
        class="border-b border-default hover:bg-hover"
      >
        <td class="align-middle">
          <RecordMark
            :rec="r"
            :page="page"
            area="tight"
            @toggle="data.toggleDone(r.id)"
          />
        </td>
        <td class="py-1.5 pr-3">
          <button
            type="button"
            class="cursor-pointer text-left text-highlighted hover:underline"
            :class="{ 'text-dimmed line-through': r.done }"
            @click="emit('open', r)"
          >
            {{ r.text }}
          </button>
        </td>
        <td
          v-for="c in cols"
          :key="c.key"
          class="py-1.5 pr-3 text-meta"
          :class="cell(r, c.key).warn ? 'text-warn-ink' : 'text-toned'"
        >
          {{ cell(r, c.key).text }}
        </td>
      </tr>
    </tbody>
  </table>
  <ul
    v-else
    class="flex flex-col gap-2 px-3 pt-3"
  >
    <li
      v-for="r in rows"
      :key="r.id"
      class="rounded-card border border-default bg-default"
    >
      <div class="flex items-center">
        <RecordMark
          :rec="r"
          :page="page"
          @toggle="data.toggleDone(r.id)"
        />
        <button
          type="button"
          class="min-h-11 min-w-0 flex-1 cursor-pointer truncate pr-3 text-left text-record text-highlighted"
          :class="{ 'text-dimmed line-through': r.done }"
          @click="emit('open', r)"
        >
          {{ r.text }}
        </button>
      </div>
      <dl
        v-if="cols.some(c => cell(r, c.key).text)"
        class="border-t border-default px-3 py-2 text-meta"
      >
        <template
          v-for="c in cols"
          :key="c.key"
        >
          <div
            v-if="cell(r, c.key).text"
            class="flex min-h-7 items-center"
          >
            <dt class="w-28 shrink-0 text-toned">
              {{ c.name }}
            </dt>
            <dd
              class="min-w-0 truncate"
              :class="cell(r, c.key).warn ? 'text-warn-ink' : 'text-highlighted'"
            >
              {{ cell(r, c.key).text }}
            </dd>
          </div>
        </template>
      </dl>
    </li>
  </ul>
</template>
