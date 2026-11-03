<script setup lang="ts">
import { computed } from 'vue'
import type { DueChip, FilterRule, Id, Page, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { collects, doneChoice, DUE_CHIPS } from '~/domain/collect'
import { optionColor } from '~/domain/props'
import { filterRecords } from '~/domain/views'
import { plural } from '~/domain/text'
import OptionPill from '../common/OptionPill.vue'

type FilterField = { kind: 'select', id: Id } | { kind: 'due' | 'done' }
const props = defineProps<{ page: Page, view: ViewDef, field: FilterField | null }>()
const emit = defineEmits<{ open: [field: FilterField], close: [] }>()
const data = useDataStore()
const SORTS = [
  { label: 'Вручную', value: 'manual' },
  { label: 'По сроку', value: 'due' },
  { label: 'По названию', value: 'name' }
]

function patch(p: Partial<ViewDef>) {
  const page = data.pages[props.page.id]
  if (page) data.updatePage(page.id, { views: page.views.map(v => v.id === props.view.id ? { ...v, ...p } : v) })
}
const sort = computed({ get: () => props.view.sort, set: (value: ViewDef['sort']) => patch({ sort: value }) })
const dues = computed(() => props.view.dues ?? [])
function toggleDue(key: DueChip) {
  const on = dues.value.includes(key)
  patch({ dues: DUE_CHIPS.map(c => c.key).filter(k => k === key ? !on : dues.value.includes(k)) })
}

const shop = computed(() => props.page.template === 'shop')
const hasDone = computed(() => props.page.hasDone || collects(props.view))
const dones = computed(() => [
  { value: 'open' as const, label: shop.value ? 'Не куплено' : 'Не сделано' },
  { value: 'done' as const, label: shop.value ? 'Куплено' : 'Сделано' },
  { value: 'all' as const, label: 'Все' }
])
const done = computed(() => doneChoice(props.view))
function setDone(v: 'open' | 'done' | 'all') {
  const rest = props.view.filter.filter(r => r.field !== 'done' || r.op !== 'is' || typeof r.value !== 'boolean')
  const rule: FilterRule[] = v === 'all' ? [] : [{ field: 'done', op: 'is', value: v === 'done' }]
  patch({ filter: [...rule, ...rest] })
}

const selections = computed(() => props.view.selectFilters ?? {})
const selectProps = computed(() => props.page.props.filter(p => p.type === 'select'))
const orphanFields = computed(() => Object.entries(selections.value).filter(([id, values]) => values.length && !selectProps.value.some(p => p.id === id)))
const filterCount = computed(() => Object.values(selections.value).filter(values => values.length).length + Number(dues.value.length > 0) + Number(!!props.view.asking))
const fieldId = computed(() => props.field?.kind === 'select' ? props.field.id : '')
const property = computed(() => selectProps.value.find(p => p.id === fieldId.value))
const choices = computed(() => selections.value[fieldId.value] ?? [])
const staleChoices = computed(() => choices.value.filter(id => !property.value?.options?.some(o => o.id === id)))
const dueWords = computed(() => DUE_CHIPS.filter(c => dues.value.includes(c.key)).map(c => c.label).join(', ') || 'Любой')
const source = computed(() => collects(props.view)
  ? data.liveRecords.filter(r => props.view.from !== 'pick' || props.view.pages?.includes(r.pageId))
  : data.recordsOf(props.page.id))
const dueCounts = computed(() => Object.fromEntries(DUE_CHIPS.map(c => [c.key,
  filterRecords(source.value, { ...props.view, dues: [c.key] }, data.leaving).length
])))
function selectionWords(id: Id): string {
  const values = selections.value[id] ?? []
  const prop = selectProps.value.find(p => p.id === id)
  return values.map(id => prop?.options?.find(o => o.id === id)?.name ?? `Удалённый вариант: ${id}`).join(', ') || 'Любой'
}
function setChoices(field: Id, values: Id[]) {
  const next = { ...selections.value }
  if (values.length) next[field] = values
  else delete next[field]
  patch({ selectFilters: next })
}
function toggleChoice(id: Id) {
  setChoices(fieldId.value, choices.value.includes(id) ? choices.value.filter(value => value !== id) : [...choices.value, id])
}
const choiceCounts = computed(() => {
  const selectFilters = { ...selections.value }
  delete selectFilters[fieldId.value]
  const counts: Record<Id, number> = {}
  for (const row of filterRecords(source.value, { ...props.view, selectFilters }, data.leaving)) {
    const value = row.values[fieldId.value]
    if (typeof value === 'string') counts[value] = (counts[value] ?? 0) + 1
  }
  return counts
})
function resetFilters() {
  patch({ selectFilters: {}, dues: [], asking: false })
}
</script>

<template>
  <div class="flex flex-col px-2 pb-2">
    <template v-if="!field">
      <div
        v-if="filterCount"
        class="flex items-center justify-between px-2 text-sm text-toned"
      >
        <span>{{ filterCount }} {{ plural(filterCount, ['фильтр', 'фильтра', 'фильтров']) }}</span>
        <button
          type="button"
          class="min-h-11 cursor-pointer text-accent-ink"
          @click="resetFilters"
        >
          Сбросить
        </button>
      </div>
      <p class="px-2 pt-1 pb-2 text-cap text-toned">
        Сортировка
      </p>
      <div
        v-if="collects(view)"
        class="flex min-h-11 items-center px-2 text-base text-toned lg:text-15"
        role="group"
        aria-label="Сортировка: По сроку"
        aria-disabled="true"
      >
        По сроку
      </div>
      <label
        v-else
        class="flex min-h-11 items-center px-2"
      >
        <span class="sr-only">Сортировка</span>
        <USelect
          v-model="sort"
          :items="SORTS"
          variant="ghost"
          class="w-full"
        />
      </label>
      <p class="px-2 pt-4 pb-1 text-cap text-toned">
        Фильтр
      </p>
      <button
        v-if="hasDone"
        type="button"
        class="flex min-h-12 w-full items-center gap-3 px-2 text-left"
        @click="emit('open', { kind: 'done' })"
      >
        <span class="flex-1">{{ shop ? 'Куплено' : 'Сделано' }}</span>
        <span class="text-toned">{{ dones.find(d => d.value === done)?.label }}</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-5 shrink-0 text-dimmed"
        />
      </button>
      <button
        v-for="p in selectProps"
        :key="p.id"
        type="button"
        class="flex min-h-12 w-full items-center gap-3 px-2 text-left"
        @click="emit('open', { kind: 'select', id: p.id })"
      >
        <span class="flex-1">{{ p.name }}</span>
        <span class="min-w-0 truncate text-toned">{{ selectionWords(p.id) }}</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-5 shrink-0 text-dimmed"
        />
      </button>
      <button
        v-for="[id] in orphanFields"
        :key="id"
        type="button"
        class="flex min-h-12 w-full items-center gap-3 px-2 text-left text-toned"
        @click="emit('open', { kind: 'select', id })"
      >
        <span class="flex-1">Удалённое свойство: {{ id }}</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-5 shrink-0 text-dimmed"
        />
      </button>
      <button
        type="button"
        class="flex min-h-12 w-full items-center gap-3 px-2 text-left"
        @click="emit('open', { kind: 'due' })"
      >
        <span class="flex-1">Срок</span><span class="min-w-0 truncate text-toned">{{ dueWords }}</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-5 shrink-0 text-dimmed"
        />
      </button>
      <label
        v-if="page.kind === 'inbox' || collects(view) || view.asking"
        class="flex min-h-12 cursor-pointer items-center gap-3 px-2"
      >
        <input
          type="checkbox"
          :checked="!!view.asking"
          @change="patch({ asking: !view.asking })"
        >
        Ждут уточнения
      </label>
      <div class="flex justify-end px-2 pt-3">
        <button
          type="button"
          class="min-h-11 cursor-pointer text-accent-ink"
          @click="emit('close')"
        >
          Готово
        </button>
      </div>
    </template>
    <template v-else-if="field.kind === 'select'">
      <fieldset
        class="px-2"
        :aria-label="property?.name ?? `Удалённое свойство: ${fieldId}`"
      >
        <label
          v-for="option in property?.options ?? []"
          :key="option.id"
          class="flex min-h-11 cursor-pointer items-center gap-3"
        >
          <input
            type="checkbox"
            :checked="choices.includes(option.id)"
            @change="toggleChoice(option.id)"
          >
          <OptionPill
            :name="option.name"
            :color="optionColor(property?.options ?? [], option)"
          />
          <span
            class="ml-auto text-sm"
            :class="choiceCounts[option.id] ? 'text-toned' : 'text-dimmed'"
          >{{ choiceCounts[option.id] ?? 0 }}</span>
        </label>
        <label
          v-for="id in staleChoices"
          :key="id"
          class="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-toned"
        >
          <input
            type="checkbox"
            checked
            @change="toggleChoice(id)"
          >Удалённый вариант: {{ id }}
        </label>
      </fieldset>
      <div class="flex justify-between px-2 pt-3">
        <button
          type="button"
          class="min-h-11 cursor-pointer text-accent-ink"
          @click="setChoices(fieldId, [])"
        >
          Очистить
        </button>
        <button
          type="button"
          class="min-h-11 cursor-pointer text-accent-ink"
          @click="emit('close')"
        >
          Готово
        </button>
      </div>
    </template>
    <template v-else-if="field.kind === 'due'">
      <fieldset
        class="px-2"
        aria-label="Срок"
      >
        <label
          v-for="c in DUE_CHIPS"
          :key="c.key"
          class="flex min-h-11 cursor-pointer items-center gap-3"
        >
          <input
            type="checkbox"
            :checked="dues.includes(c.key)"
            @change="toggleDue(c.key)"
          >{{ c.label }}
          <span
            class="ml-auto text-sm"
            :class="dueCounts[c.key] ? 'text-toned' : 'text-dimmed'"
          >{{ dueCounts[c.key] }}</span>
        </label>
      </fieldset>
      <div class="flex justify-between px-2 pt-3">
        <button
          type="button"
          class="min-h-11 cursor-pointer text-accent-ink"
          @click="patch({ dues: [] })"
        >
          Очистить
        </button>
        <button
          type="button"
          class="min-h-11 cursor-pointer text-accent-ink"
          @click="emit('close')"
        >
          Готово
        </button>
      </div>
    </template>
    <template v-else>
      <fieldset
        class="px-2"
        :aria-label="shop ? 'Куплено' : 'Сделано'"
      >
        <label
          v-for="d in dones"
          :key="d.value"
          class="flex min-h-11 cursor-pointer items-center gap-3"
        >
          <input
            type="radio"
            name="view-done"
            :checked="done === d.value"
            @change="setDone(d.value)"
          >{{ d.label }}
        </label>
      </fieldset>
      <div class="flex justify-end px-2 pt-3">
        <button
          type="button"
          class="min-h-11 cursor-pointer text-accent-ink"
          @click="emit('close')"
        >
          Готово
        </button>
      </div>
    </template>
  </div>
</template>
