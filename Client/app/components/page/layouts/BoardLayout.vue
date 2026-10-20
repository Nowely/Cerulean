<script setup lang="ts">
// Доска. A wide kanban does not fit a phone, so a phone shows one column at a time with a stage strip;
// desktop keeps the columns. A record moves to another column from its «⋯» or with the arrow.
import { computed, ref, watch } from 'vue'
import type { Page, PropDef, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { filterRecords, sortRecords } from '~/domain/views'
import { formatDue, isOverdue } from '~/domain/dates'
import RecordMark from '../../common/RecordMark.vue'

const props = defineProps<{ page: Page, view: ViewDef, records: Rec[], readonly?: boolean }>()
const emit = defineEmits<{ open: [rec: Rec], needProp: [] }>()
const data = useDataStore()
const now = useNow()
const { isDesktop } = useScreen()

const prop = computed<PropDef | undefined>(() => {
  const chosen = props.page.props.find(p => p.id === props.view.groupBy && p.type === 'select')
  return chosen ?? props.page.props.find(p => p.type === 'select')
})
const columns = computed(() => {
  if (!prop.value) return []
  const list = sortRecords(filterRecords(props.records, props.view), props.view.sort)
  const opts = prop.value.options ?? []
  const cols = opts.map(o => ({ id: o.id, name: o.name, records: list.filter(r => r.values[prop.value!.id] === o.id) }))
  const none = list.filter(r => !opts.some(o => o.id === r.values[prop.value!.id]))
  return none.length ? [{ id: 'none', name: 'Без значения', records: none }, ...cols] : cols
})
const stage = ref<string | null>(null)
watch(columns, (c) => {
  if (!c.some(x => x.id === stage.value)) stage.value = c[0]?.id ?? null
}, { immediate: true })
const shown = computed(() => isDesktop.value ? columns.value : columns.value.filter(c => c.id === stage.value))

function moveTo(rec: Rec, optionId: string) {
  if (!prop.value) return
  data.updateRecord(rec.id, { values: { ...rec.values, [prop.value.id]: optionId === 'none' ? null : optionId } })
}
function next(rec: Rec, colId: string) {
  const i = columns.value.findIndex(c => c.id === colId)
  const to = columns.value[i + 1]
  if (to) moveTo(rec, to.id)
}
const menuFor = (rec: Rec, colId: string) => [columns.value.filter(c => c.id !== colId).map(c => ({ label: `В «${c.name}»`, icon: 'i-lucide-arrow-right', onSelect: () => moveTo(rec, c.id) }))]
</script>

<template>
  <div
    v-if="!prop"
    class="mx-5 mt-4 rounded-card border border-default bg-default p-4 text-sm text-toned lg:mx-0"
  >
    Для доски нужно свойство «Выбор»: его варианты станут колонками, например «Надо», «В процессе», «Готово».
    <UButton
      class="mt-3 block"
      @click="emit('needProp')"
    >
      Добавить свойство
    </UButton>
  </div>
  <div v-else>
    <!-- Stage strip: every column with its count, one is open -->
    <div
      v-if="!isDesktop"
      class="no-scrollbar flex gap-1.5 overflow-x-auto px-5 pt-3 pb-1"
      role="tablist"
      aria-label="Колонки"
    >
      <button
        v-for="c in columns"
        :key="c.id"
        type="button"
        role="tab"
        :aria-selected="stage === c.id"
        class="hit-44 relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-chip border px-3 text-sm"
        :class="stage === c.id ? 'border-accent bg-accent-soft text-accent-ink' : 'border-default bg-default text-default'"
        @click="stage = c.id"
      >
        {{ c.name }}<span
          class="text-xs"
          :class="stage === c.id ? '' : 'text-toned'"
        >{{ c.records.length }}</span>
      </button>
    </div>
    <div class="flex gap-3 px-3 pt-2 lg:overflow-x-auto lg:px-0 lg:pb-2">
      <section
        v-for="c in shown"
        :key="c.id"
        class="flex min-w-0 flex-1 flex-col gap-1.5 lg:w-60 lg:flex-none lg:rounded-card lg:bg-trk lg:p-2"
        :aria-label="c.name"
      >
        <h3 class="hidden items-center gap-2 px-1.5 pb-1 text-caption text-toned lg:flex">
          {{ c.name }}<span class="text-xs text-dimmed">{{ c.records.length }}</span>
        </h3>
        <article
          v-for="r in c.records"
          :key="r.id"
          class="flex items-start rounded-card border border-default bg-default"
        >
          <RecordMark
            :rec="r"
            :page="page"
            area="tight"
            class="mt-0.5"
            @toggle="data.toggleDone(r.id)"
          />
          <button
            type="button"
            class="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center py-2 text-left"
            @click="emit('open', r)"
          >
            <span
              class="text-15 text-highlighted"
              :class="{ 'text-dimmed line-through': r.done }"
            >{{ r.text }}</span>
            <span
              v-if="r.due"
              class="text-13"
              :class="isOverdue(r.due, now) && !r.done ? 'text-warn-ink' : 'text-toned'"
            >{{ formatDue(r.due, now) }}</span>
          </button>
          <UButton
            v-if="!readonly && !isDesktop && c.id !== columns[columns.length - 1]?.id"
            icon="i-lucide-arrow-right"
            variant="ghost"
            square
            :aria-label="`В следующую колонку: ${r.text}`"
            @click="next(r, c.id)"
          />
          <UDropdownMenu
            v-if="!readonly"
            :items="menuFor(r, c.id)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis"
              variant="ghost"
              square
              :aria-label="`Переместить в колонку: ${r.text}`"
            />
          </UDropdownMenu>
        </article>
        <p
          v-if="!c.records.length"
          class="px-2 py-3 text-meta text-toned"
        >
          Пусто в этой колонке
        </p>
      </section>
    </div>
  </div>
</template>
