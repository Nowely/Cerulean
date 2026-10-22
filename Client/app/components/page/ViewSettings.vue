<script setup lang="ts">
// «Настроить вид»: how this view shows the page. Filter and sort live here, not in the bar; so does «Новый вид».
import { computed } from 'vue'
import type { GroupBy, Id, Layout, Page, ViewDef, ViewSource } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import { useScreen } from '~/composables/useScreen'
import { groupOptions } from '~/domain/views'
import { nameForLayout } from '~/domain/templates'
import { propList, TYPE_NAMES } from '~/domain/props'
import { collects, filterWords, SOURCES } from '~/domain/collect'
import { textW } from '~/domain/fit'
import SegmentedControl from '../common/SegmentedControl.vue'

const props = defineProps<{ page: Page, view: ViewDef }>()
// `newProp`: «Новое свойство» opens the property editor; after «Создать» this sheet is back with it switched on.
// `filter`: «Фильтр» opens its sheet (phone) or level (desktop); `pickPages`: «Страницы» opens «Откуда записи»
const emit = defineEmits<{ remove: [], add: [], newProp: [], filter: [], pickPages: [] }>()
const data = useDataStore()
const notify = useNotify()
const { isDesktop } = useScreen()

/** By ids, from the store: «Отменить» may run after this sheet has gone */
function patchView(pageId: Id, viewId: Id, p: Partial<ViewDef>) {
  const page = data.pages[pageId]
  if (page) data.updatePage(pageId, { views: page.views.map(v => v.id === viewId ? { ...v, ...p } : v) })
}
function patch(p: Partial<ViewDef>) {
  patchView(props.page.id, props.view.id, p)
}

// ---------- «Откуда записи» (v24, И10; medium, «Отменить» 8 s) ----------

/** Not on Входящие, and not on a view of stock (Запасы): it counts this page's own quantities */
const stockView = computed(() => props.page.props.some(p => p.type === 'number' && p.normProp && props.view.shown.includes(p.id)))
const canFrom = computed(() => props.page.kind === 'page' && !stockView.value)
const from = computed({
  get: () => props.view.from ?? 'self',
  set: (v: ViewSource) => setFrom(v)
})
/**
 * The rows change in place and the notice says what the view shows now, with «Отменить». «Выбранные» the first time
 * starts with the page itself when it has records of its own; otherwise the picker opens at once with nothing picked
 */
function setFrom(v: ViewSource) {
  if (v === from.value) return
  const { id: pageId } = props.page
  const { id: viewId, name } = props.view
  const before: Partial<ViewDef> = { from: props.view.from, pages: props.view.pages }
  const own = data.liveRecords.some(r => r.pageId === pageId)
  const first = v === 'pick' && !props.view.pages?.length
  patch({ from: v, ...(first ? { pages: own ? [pageId] : [] } : {}) })
  notify(`Вид «${name}»: ${SOURCES.find(s => s.value === v)!.notice}`, { label: 'Отменить', run: () => patchView(pageId, viewId, before) })
  if (first && !own) emit('pickPages')
}
const pickCount = computed(() => props.view.pages?.length ? String(props.view.pages.length) : 'не выбраны')
const collecting = computed(() => collects(props.view))

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

/**
 * «Фильтр» names the filter in words («Просрочено · На неделе · не сделано»); wider than about 240pt at 15px it goes
 * under its label whole, never cut (v24, item 8). It is offered where «Сделано» is, and on a collecting view
 */
const hasFilter = computed(() => props.page.hasDone || collecting.value)
const filterText = computed(() => filterWords(props.page, props.view))
const filterStacked = computed(() => !isDesktop.value && textW(filterText.value, 15) > 240)

const SORTS = [
  { label: 'Вручную', value: 'manual' },
  { label: 'По сроку', value: 'due' },
  { label: 'По названию', value: 'name' }
]
const sort = computed({ get: () => props.view.sort, set: (v: ViewDef['sort']) => patch({ sort: v }) })

// «Справа в строке» follows the order of «Свойства»; a number's «Норма» is not a row of its own
const shownRows = computed(() => propList(props.page).map(p => ({ key: p.key, name: p.name, type: TYPE_NAMES[p.type] })))
/** «Заметка» is the note glyph on rows, on unless switched off (v24 fixes, 14) */
const isShown = (key: string) => key === 'note' ? !props.view.noteOff : props.view.shown.includes(key)
function toggleShown(key: string, on: boolean) {
  if (key === 'note') return patch({ noteOff: !on })
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

    <template v-if="canFrom">
      <p class="px-2 pt-3 pb-1.5 text-cap text-toned">
        Откуда записи
      </p>
      <div class="px-2">
        <SegmentedControl
          v-model="from"
          :options="SOURCES"
          label="Откуда записи"
        />
      </div>
    </template>

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
      <!-- «Выбранные»: how many pages, «Страницы · 2 ›»; it opens the picker «Откуда записи» (v24 fixes, 14, 15) -->
      <button
        v-if="canFrom && from === 'pick'"
        type="button"
        class="flex min-h-12.5 w-full cursor-pointer items-center gap-3 px-2 text-left active:bg-pressed lg:min-h-11 lg:hover:bg-muted"
        aria-haspopup="dialog"
        @click="emit('pickPages')"
      >
        <span class="flex-1 text-base text-highlighted lg:text-15">Страницы</span>
        <span class="text-base text-toned lg:text-15">{{ pickCount }}</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-5 shrink-0 text-dimmed"
        />
      </button>
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
      <button
        v-if="hasFilter"
        type="button"
        class="flex min-h-12.5 w-full cursor-pointer items-center gap-3 px-2 text-left active:bg-pressed lg:min-h-11 lg:hover:bg-muted"
        :class="{ 'py-2': filterStacked }"
        aria-haspopup="dialog"
        :aria-label="`Фильтр: ${filterText}`"
        @click="emit('filter')"
      >
        <span
          class="flex min-w-0 flex-1"
          :class="filterStacked ? 'flex-col gap-0.5' : 'items-center gap-3'"
        >
          <span class="text-base text-highlighted lg:text-15">Фильтр</span>
          <span
            class="min-w-0 text-base text-toned lg:text-15"
            :class="{ 'flex-1 truncate text-right': !filterStacked }"
          >{{ filterText }}</span>
        </span>
        <UIcon
          :name="isDesktop ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
          class="size-5 shrink-0 text-dimmed"
        />
      </button>
      <!-- A collecting view sorts by date: «По сроку», fixed, and no manual order (v24 fixes, 14) -->
      <div
        v-if="collecting"
        class="flex min-h-12.5 items-center gap-3 px-2 lg:min-h-11"
        role="group"
        aria-label="Сортировка: По сроку"
        aria-disabled="true"
      >
        <span class="flex-1 text-base text-highlighted lg:text-15">Сортировка</span>
        <span class="text-base text-toned lg:pr-2.5 lg:text-15">По сроку</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 shrink-0 text-dimmed lg:hidden"
        />
      </div>
      <label
        v-else
        class="flex min-h-12.5 items-center gap-3 px-2 lg:min-h-11"
      >
        <span class="flex-1 text-base text-highlighted lg:text-15">Сортировка</span>
        <USelect
          v-model="sort"
          :items="SORTS"
          variant="ghost"
          class="min-w-36"
          :ui="{ base: 'text-toned justify-end' }"
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
          :model-value="isShown(r.key)"
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
