<script setup lang="ts">
// «Настроить вид»: how this view shows the page. Filter and sort live here, not in the bar; so does «Новый вид».
import { computed, ref } from 'vue'
import type { FilterRule, GroupBy, Layout, Page, PropType, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { groupOptions } from '~/domain/views'
import { uid } from '~/domain/ids'
import SegmentedControl from '../common/SegmentedControl.vue'

const props = defineProps<{ page: Page, view: ViewDef }>()
const emit = defineEmits<{ removed: [], add: [] }>()
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
const layout = computed({ get: () => props.view.layout, set: (v: Layout) => patch({ layout: v }) })
const name = computed({ get: () => props.view.name, set: (v: string) => patch({ name: v }) })

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

const TYPE_NAMES: Record<PropType, string> = { text: 'текст', number: 'число', select: 'выбор', date: 'дата', relation: 'связь' }
const shownRows = computed(() => [
  ...props.page.props.filter(p => !props.page.props.some(x => x.normProp === p.id)).map(p => ({ key: p.id, name: p.name, type: TYPE_NAMES[p.type] })),
  { key: 'due', name: 'Срок', type: 'дата' },
  { key: 'note', name: 'Заметка', type: 'текст' }
])
function toggleShown(key: string, on: boolean) {
  const shown = props.view.shown.filter(k => k !== key)
  patch({ shown: on ? [...shown, key] : shown })
}

// «Новое свойство»
const adding = ref(false)
const propName = ref('')
const propType = ref<'text' | 'number' | 'select' | 'date'>('text')
const propOptions = ref('')
const NEW_TYPES: { value: 'text' | 'number' | 'select' | 'date', label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'number', label: 'Число' },
  { value: 'select', label: 'Выбор' },
  { value: 'date', label: 'Дата' }
]
/** A «Выбор» needs its options before it can be added */
const canAdd = computed(() => !!propName.value.trim() && (propType.value !== 'select' || propOptions.value.split(',').some(o => o.trim())))
function addProp() {
  const n = propName.value.trim()
  if (!canAdd.value) return
  const id = uid('f')
  const options = propType.value === 'select'
    ? propOptions.value.split(',').map(s => s.trim()).filter(Boolean).map(o => ({ id: uid('o'), name: o }))
    : undefined
  data.updatePage(props.page.id, {
    props: [...props.page.props, { id, name: n, type: propType.value, options }],
    views: props.page.views.map(v => v.id === props.view.id ? { ...v, shown: [...v.shown, id] } : v)
  })
  adding.value = false
  propName.value = ''
  propOptions.value = ''
}

function removeView() {
  if (props.page.views.length < 2) return
  data.updatePage(props.page.id, { views: props.page.views.filter(v => v.id !== props.view.id) })
  emit('removed')
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

    <form
      v-if="adding"
      class="mt-2 flex flex-col gap-2 rounded-card border border-default p-3"
      @submit.prevent="addProp"
    >
      <UInput
        v-model="propName"
        placeholder="Название, например «Статус»"
        aria-label="Название свойства"
        autofocus
      />
      <SegmentedControl
        v-model="propType"
        :options="NEW_TYPES"
        label="Тип свойства"
      />
      <UInput
        v-if="propType === 'select'"
        v-model="propOptions"
        placeholder="Варианты через запятую"
        aria-label="Варианты"
      />
      <div class="flex justify-end gap-2">
        <UButton @click="adding = false">
          Отмена
        </UButton>
        <UButton
          type="submit"
          color="primary"
          variant="solid"
          :disabled="!canAdd"
        >
          Добавить
        </UButton>
      </div>
    </form>
    <button
      v-else
      type="button"
      class="flex min-h-12.5 cursor-pointer items-center gap-3 rounded-chip px-2 text-left text-base text-default hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
      @click="adding = true"
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
