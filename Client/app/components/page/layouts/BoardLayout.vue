<script setup lang="ts">
// Доска. A wide kanban does not fit a phone, so a phone shows one column at a time with a stage strip;
// desktop keeps the columns. A card moves on with «В «next» →» (always on a phone, on hover or focus on
// desktop) or to any column from its «⋯», which starts with «Открыть» (the preview). Every move leaves
// «Полумарафон к маю → Достигнута · Отменить», and the open column stays where it was.
import { computed, ref, watch } from 'vue'
import type { Page, PropDef, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { useNotify } from '~/composables/useNotify'
import { usePeek } from '~/composables/usePeek'
import { filterRecords, sortRecords } from '~/domain/views'
import { formatDue, isOverdue } from '~/domain/dates'
import { recordSummary } from '~/domain/summary'
import { genitive } from '~/domain/text'
import RecordMark from '../../common/RecordMark.vue'
import ActionMenu, { type MenuItem } from '../../overlay/ActionMenu.vue'

const props = defineProps<{ page: Page, view: ViewDef, records: Rec[], readonly?: boolean }>()
const emit = defineEmits<{ open: [rec: Rec], needProp: [] }>()
const data = useDataStore()
const now = useNow()
const { isDesktop } = useScreen()
const notify = useNotify()
const peek = usePeek()

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
  return none.length ? [{ id: 'none', name: `Без ${genitive(prop.value.name)}`, records: none }, ...cols] : cols
})
const stage = ref<string | null>(null)
// The open column stays put; only when it goes away («Без статуса» emptied) the first one with cards opens
watch(columns, (c) => {
  if (!c.some(x => x.id === stage.value)) stage.value = (c.find(x => x.records.length) ?? c[0])?.id ?? null
}, { immediate: true })
const shown = computed(() => isDesktop.value ? columns.value : columns.value.filter(c => c.id === stage.value))

/** «3 из 6 · дальше пробежка 6 км, 19:00» for a record with Подпункты, else its date */
function subOf(r: Rec) {
  const subs = data.subitemsOf(r.id)
  if (subs.length) {
    const s = recordSummary(subs, now.value)
    return { text: s.names ? `${s.lead} · ${s.names}` : s.lead, late: false }
  }
  return r.due ? { text: formatDue(r.due, now.value), late: isOverdue(r.due, now.value) && !r.done } : null
}

function moveTo(rec: Rec, colId: string) {
  const p = prop.value
  const col = columns.value.find(c => c.id === colId)
  if (!p || !col) return
  const before = rec.values[p.id] ?? null
  data.updateRecord(rec.id, { values: { ...rec.values, [p.id]: colId === 'none' ? null : colId } })
  notify(`${rec.text} → ${col.name}`, {
    label: 'Отменить',
    run: () => {
      const cur = data.records[rec.id]
      if (cur) data.updateRecord(rec.id, { values: { ...cur.values, [p.id]: before } })
    }
  })
}
const nextOf = (colId: string) => columns.value[columns.value.findIndex(c => c.id === colId) + 1]
const menuFor = (rec: Rec, colId: string): MenuItem[][] => [
  [{ label: 'Открыть', icon: 'i-lucide-panel-right-open', onSelect: () => peek.peek({ kind: 'record', id: rec.id }) }],
  columns.value.filter(c => c.id !== colId).map(c => ({ label: `В «${c.name}»`, icon: 'i-lucide-arrow-right', onSelect: () => moveTo(rec, c.id) }))
]
</script>

<template>
  <div
    v-if="!prop"
    class="mx-5 mt-4 rounded-card bg-card p-4 text-sm text-toned lg:mx-0"
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
    <!-- Stage strip: every column with its count, one is open. It wraps, so no column hides off-screen -->
    <div
      v-if="!isDesktop"
      class="flex flex-wrap gap-1.5 px-4 pt-3.5 pb-1.5"
      role="tablist"
      aria-label="Колонки"
    >
      <button
        v-for="c in columns"
        :key="c.id"
        type="button"
        role="tab"
        :aria-selected="stage === c.id"
        class="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-item px-3 text-sm"
        :class="stage === c.id ? 'bg-accent-soft text-accent-ink ring ring-accent ring-inset' : 'bg-trk text-default active:bg-pressed'"
        @click="stage = c.id"
      >
        {{ c.name }}<span class="text-toned tabular-nums">{{ c.records.length }}</span>
      </button>
    </div>
    <div class="flex flex-col gap-2 px-4 pt-1.5 lg:flex-row lg:items-start lg:gap-3 lg:overflow-x-auto lg:px-0 lg:pt-3.5 lg:pb-2">
      <section
        v-for="c in shown"
        :key="c.id"
        class="flex min-w-0 flex-col gap-2 lg:w-66 lg:shrink-0 lg:gap-1.5 lg:rounded-card lg:bg-card lg:p-2"
        :aria-label="`${c.name}, ${c.records.length}`"
      >
        <h3 class="hidden min-h-6 items-center gap-2 px-1.5 pb-0.5 text-xs font-medium tracking-wide text-toned lg:flex">
          {{ c.name }}<span class="font-normal text-dimmed tabular-nums">{{ c.records.length }}</span>
        </h3>
        <article
          v-for="r in c.records"
          :key="r.id"
          class="group/card flex min-h-16 flex-wrap items-center rounded-card bg-card py-1 pr-1 lg:min-h-0 lg:raised lg:items-start lg:border lg:border-default lg:bg-default lg:p-0"
        >
          <RecordMark
            :rec="r"
            :page="page"
            area="tight"
            class="lg:mt-0.5"
            @toggle="data.toggleDone(r.id)"
          />
          <button
            type="button"
            class="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-px py-2 text-left"
            :aria-label="`Открыть «${r.text}»`"
            @click="emit('open', r)"
          >
            <span
              class="text-base lg:text-15"
              :class="r.done ? 'text-dimmed line-through' : 'text-highlighted'"
            >{{ r.text }}</span>
            <span
              v-if="subOf(r)"
              class="text-13"
              :class="subOf(r)!.late ? 'text-warn-ink' : 'text-toned'"
            >{{ subOf(r)!.text }}</span>
          </button>
          <span
            v-if="!readonly"
            class="order-1 lg:pt-1.5 lg:pr-1"
          >
            <ActionMenu
              :items="menuFor(r, c.id)"
              :title="r.text"
              :label="`Действия: ${r.text}`"
            />
          </span>
          <!-- The next column by name, on its own row: a phone always shows it, desktop on hover or focus -->
          <div
            v-if="!readonly && nextOf(c.id)"
            class="order-2 basis-full pb-1 pl-10 lg:hidden lg:pr-2 lg:pb-2 lg:pl-9 lg:group-hover/card:flex lg:group-focus-within/card:flex"
          >
            <button
              type="button"
              class="hit-44 relative -mt-1.5 inline-flex h-8 cursor-pointer items-center gap-1.5 text-sm font-medium text-accent-ink lg:mt-0 lg:rounded-item lg:bg-btn lg:pr-2.5 lg:pl-3 lg:font-normal lg:text-default lg:hover:bg-btn-pressed"
              @click="moveTo(r, nextOf(c.id)!.id)"
            >
              В «{{ nextOf(c.id)!.name }}»<UIcon
                name="i-lucide-arrow-right"
                class="size-4"
              />
            </button>
          </div>
        </article>
        <p
          v-if="!c.records.length"
          class="px-2 pt-2.5 pb-3 text-13 text-toned"
        >
          Нет записей
        </p>
      </section>
    </div>
  </div>
</template>
