<script setup lang="ts">
// «Настроить вид»: how this view shows the page. Filter and sort live here, not in the bar; so does «Новый вид».
import { computed } from 'vue'
import type { FilterRule, GroupBy, Layout, Page, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { groupOptions } from '~/domain/views'
import { nameForLayout } from '~/domain/templates'
import { propList, TYPE_NAMES } from '~/domain/props'
import SegmentedControl from '../common/SegmentedControl.vue'

const props = defineProps<{ page: Page, view: ViewDef }>()
// `newProp`: «Новое свойство» opens the property editor; after «Создать» this sheet is back with it switched on
const emit = defineEmits<{ remove: [], add: [], newProp: [] }>()
const data = useDataStore()

function patch(p: Partial<ViewDef>) {
  data.updatePage(props.page.id, { views: props.page.views.map(v => v.id === props.view.id ? { ...v, ...p } : v) })
}

const LAYOUTS: { value: Layout, label: string }[] = [
  { value: 'list', label: 'Список' },
  { value: 'board', label: 'Доска' },
  { value: 'table', label: 'Таблица' },
  { value: 'calendar', label: 'Календарь' }
]
// A view follows its type («Список» → «Доска») until a name is typed
const layout = computed({
  get: () => props.view.layout,
  set: (v: Layout) => patch({ layout: v, ...(props.view.named ? {} : { name: nameForLayout(props.page.views, v, props.view.id) }) })
})
const name = computed({ get: () => props.view.name, set: (v: string) => patch({ name: v, named: true }) })

// Select items can't carry an empty value: «Без групп» is 'none'
const groups = computed(() => groupOptions(props.page).map(o => ({ label: o.label, value: o.value ?? 'none' })))
const groupBy = computed({
  get: () => props.view.groupBy ?? 'none',
  set: (v: string) => patch({ groupBy: (v === 'none' ? null : v) as GroupBy })
})

const shop = computed(() => props.page.template === 'shop')
const filters = computed(() => [
  { label: shop.value ? 'Не куплено' : 'Не готово', value: 'open' },
  { label: shop.value ? 'Куплено' : 'Готово', value: 'done' },
  { label: 'Все', value: 'all' }
])
const doneFilter = computed({
  get: () => {
    const rule = props.view.filter.find(r => r.field === 'done')
    return !rule ? 'all' : rule.value ? 'done' : 'open'
  },
  set: (v: string) => {
    const rest = props.view.filter.filter(r => r.field !== 'done')
    const rule: FilterRule[] = v === 'all' ? [] : [{ field: 'done', op: 'is', value: v === 'done' }]
    patch({ filter: [...rule, ...rest] })
  }
})

const SORTS = [
  { label: 'Вручную', value: 'manual' },
  { label: 'По сроку', value: 'due' },
  { label: 'По названию', value: 'name' }
]
const sort = computed({ get: () => props.view.sort, set: (v: ViewDef['sort']) => patch({ sort: v }) })

// «Справа в строке» follows the order of «Свойства»; a number's «Норма» is not a row of its own
const shownRows = computed(() => propList(props.page).map(p => ({ key: p.key, name: p.name, type: TYPE_NAMES[p.type] })))
function toggleShown(key: string, on: boolean) {
  const shown = props.view.shown.filter(k => k !== key)
  patch({ shown: on ? [...shown, key] : shown })
}

/** The page deletes it, with «Отменить» (the same as «Удалить вид» in the view menu) */
function removeView() {
  if (props.page.views.length > 1) emit('remove')
}
</script>

<template>
  <div class="flex flex-col gap-1 px-2 pb-2">
    <label class="block px-2 pt-1">
      <span class="block pb-1.5 text-cap text-toned">Название вида</span>
      <UInput
        v-model="name"
        class="w-full"
      />
    </label>

    <p class="px-2 pt-3 pb-1.5 text-cap text-toned">
      Как показывать
    </p>
    <div class="px-2">
      <SegmentedControl
        v-model="layout"
        :options="LAYOUTS"
        label="Как показывать"
      />
    </div>

    <div class="mt-2 divide-y divide-default">
      <label class="flex min-h-12.5 items-center gap-3 px-2 lg:min-h-11">
        <span class="flex-1 text-base text-highlighted lg:text-15">Группы</span>
        <USelect
          v-model="groupBy"
          :items="groups"
          variant="ghost"
          class="min-w-36"
          :ui="{ base: 'text-toned justify-end' }"
        />
      </label>
      <label
        v-if="page.hasDone"
        class="flex min-h-12.5 items-center gap-3 px-2 lg:min-h-11"
      >
        <span class="flex-1 text-base text-highlighted lg:text-15">Фильтр</span>
        <USelect
          v-model="doneFilter"
          :items="filters"
          variant="ghost"
          class="min-w-36"
        />
      </label>
      <label class="flex min-h-12.5 items-center gap-3 px-2 lg:min-h-11">
        <span class="flex-1 text-base text-highlighted lg:text-15">Сортировка</span>
        <USelect
          v-model="sort"
          :items="SORTS"
          variant="ghost"
          class="min-w-36"
        />
      </label>
    </div>

    <p class="px-2 pt-4 pb-1 text-cap text-toned">
      Справа в строке
    </p>
    <div class="divide-y divide-default">
      <label
        v-for="r in shownRows"
        :key="r.key"
        class="flex min-h-12.5 cursor-pointer items-center gap-2 px-2 lg:min-h-11"
      >
        <span class="flex-1 text-base text-highlighted lg:text-15">{{ r.name }} <span class="text-13 text-toned">{{ r.type }}</span></span>
        <USwitch
          :model-value="view.shown.includes(r.key)"
          :aria-label="r.name"
          @update:model-value="v => toggleShown(r.key, v)"
        />
      </label>
    </div>

    <button
      type="button"
      class="flex min-h-12.5 cursor-pointer items-center gap-3 rounded-chip px-2 text-left text-base text-default hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
      aria-haspopup="dialog"
      @click="emit('newProp')"
    >
      <UIcon
        name="i-lucide-plus"
        class="size-5 text-toned"
      />Новое свойство
    </button>
    <button
      type="button"
      class="flex min-h-12.5 cursor-pointer items-center gap-3 rounded-chip px-2 text-left text-base text-default hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
      @click="emit('add')"
    >
      <UIcon
        name="i-lucide-list-plus"
        class="size-5 text-toned"
      />Новый вид
    </button>
    <button
      v-if="page.views.length > 1"
      type="button"
      class="flex min-h-12.5 cursor-pointer items-center gap-3 rounded-chip px-2 text-left text-base text-warn-ink hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
      @click="removeView"
    >
      <UIcon
        name="i-lucide-trash-2"
        class="size-5"
      />Удалить вид
    </button>
  </div>
</template>
