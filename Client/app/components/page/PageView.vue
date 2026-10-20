<script setup lang="ts">
// One page, three containers: full (from navigation), preview (from a link: sheet or right panel)
// and glance (beside search results). Preview reads and ticks only: no composer, no swipe, no editing
// of the title. Glance is a look before opening: the first view as a plain list, no tabs.
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from '#imports'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
import { pageSubline, dueToday } from '~/domain/summary'
import { groupByDue, matchesQuery } from '~/domain/views'
import { listView } from '~/domain/templates'
import PageTile from '../common/PageTile.vue'
import TipCard from '../common/TipCard.vue'
import GlyphPicker from './GlyphPicker.vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import ListLayout from './layouts/ListLayout.vue'
import RecordLine from '../record/RecordLine.vue'

// A list is what most pages show; the other views and the settings load when a page needs them
const BoardLayout = defineAsyncComponent(() => import('./layouts/BoardLayout.vue'))
const TableLayout = defineAsyncComponent(() => import('./layouts/TableLayout.vue'))
const CalendarLayout = defineAsyncComponent(() => import('./layouts/CalendarLayout.vue'))
const ViewSettings = defineAsyncComponent(() => import('./ViewSettings.vue'))
const NewPageSetup = defineAsyncComponent(() => import('./NewPageSetup.vue'))

const props = withDefaults(defineProps<{ page: Page, container?: 'full' | 'preview' | 'glance' }>(), { container: 'full' })
const emit = defineEmits<{ editing: [boolean] }>()

const data = useDataStore()
const journal = useJournalStore()
const ui = useUiStore()
const now = useNow()
const router = useRouter()
const { isDesktop } = useScreen()
const peek = usePeek()

const full = computed(() => props.container === 'full')
const records = computed(() => data.recordsOf(props.page.id))
const today = computed(() => props.page.kind === 'today')
const setup = computed(() => full.value && props.page.kind === 'page' && !records.value.length && !data.liveRecords.some(r => r.pageId === props.page.id))
const subline = computed(() => pageSubline(props.page, records.value, now.value, data.liveRecords))

// What was added since the last visit is tinted on the rows
const freshSince = ref(Number.POSITIVE_INFINITY)
onMounted(() => {
  freshSince.value = data.visitPage(props.page.id)
})
watch(() => props.page.id, (id, old) => {
  if (id !== old) freshSince.value = data.visitPage(id)
})

// Views: the tabs under the title. «Сегодня» has one built-in view.
const TODAY_VIEW: ViewDef = listView('Сегодня и просрочено', { groupBy: 'due' })
const views = computed(() => today.value ? [TODAY_VIEW] : props.page.views.length ? props.page.views : [listView('Список')])
const viewId = ref<Id | null>(null)
const view = computed(() => views.value.find(v => v.id === viewId.value) ?? views.value[0]!)
const glance = computed(() => props.container === 'glance')
/** What the records area draws: a glance shows any view as a list */
const layout = computed(() => glance.value ? 'list' : view.value.layout)
watch(() => props.page.id, () => {
  viewId.value = null
})

function addView() {
  const v = listView(`Вид ${props.page.views.length + 1}`, { filter: props.page.hasDone ? [{ field: 'done', op: 'is', value: false }] : [] })
  data.updatePage(props.page.id, { views: [...props.page.views, v] })
  viewId.value = v.id
  settingsOpen.value = true
}

const settingsOpen = ref(false)
/** Board and table want the whole width of the main column on desktop */
const wide = computed(() => view.value.layout === 'board' || view.value.layout === 'table')
defineExpose({ openSettings: () => settingsOpen.value = true, wide })

// Search inside the page
const searching = ref(false)
const query = ref('')
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
async function toggleSearch() {
  searching.value = !searching.value
  query.value = ''
  if (searching.value) {
    await nextTick()
    searchInput.value?.focus()
  }
}
const shown = computed(() => query.value.trim() ? records.value.filter(r => matchesQuery(r, query.value)) : records.value)
const todayGroups = computed(() => groupByDue(dueToday(data.liveRecords, now.value).filter(r => matchesQuery(r, query.value)), now.value))

// Title: edited in place on the full page; a new page opens with it focused
const titleInput = useTemplateRef<HTMLInputElement>('titleInput')
const title = computed({
  get: () => props.page.title,
  set: v => data.updatePage(props.page.id, { title: v })
})
onMounted(async () => {
  if (full.value && ui.focusTitle === props.page.id) {
    ui.focusTitle = null
    await nextTick()
    titleInput.value?.focus()
  }
})
const glyphOpen = ref(false)

function openRecord(rec: Rec) {
  if (full.value) void router.push(`/r/${rec.id}`)
  else peek.peek({ kind: 'record', id: rec.id })
}

/** A choice on a row of Входящие settles the same Уточнение as in Чат */
function choose(rec: Rec, choice: Id | 'more' | 'new') {
  if (choice === 'more') {
    ui.pick({ title: `Куда положить «${rec.text}»?`, current: rec.pageId, run: c => journal.chooseForRecord(rec.id, c) })
    return
  }
  if (choice === 'new') return
  journal.chooseForRecord(rec.id, { pageId: choice })
}

// A page made by an accidental «+» and left untouched goes away on leaving it
onBeforeUnmount(() => {
  const p = data.pages[props.page.id]
  if (full.value && p && p.kind === 'page' && !p.title.trim() && !p.description.trim() && !p.glyph && !data.liveRecords.some(r => r.pageId === p.id)) {
    data.purgePages([p.id])
  }
})

const emptyText = computed(() => {
  if (query.value.trim()) return 'Ничего не нашлось'
  const done = view.value.filter.find(r => r.field === 'done')
  if (done?.value === true) return 'Отмеченное появится здесь'
  if (props.page.kind === 'inbox') return 'Всё разложено. Сюда попадает то, что не удалось разложить'
  return full.value ? 'Пиши внизу, и записи появятся здесь' : 'Нет записей'
})
</script>

<template>
  <div
    class="pb-4"
    :style="!full ? '--row-bg: var(--ui-bg)' : undefined"
  >
    <!-- Title -->
    <div
      class="px-5 pt-1 lg:px-0"
      :class="!full ? 'lg:px-4' : 'lg:pt-8'"
    >
      <GlyphPicker
        v-if="full && setup && !page.glyph"
        v-model:open="glyphOpen"
        :glyph="page.glyph"
        :color="page.color"
        @change="p => data.updatePage(page.id, p)"
      >
        <button
          type="button"
          class="-ml-1 mb-1 flex h-11 cursor-pointer items-center gap-2.5 rounded-chip pr-2 pl-1 text-15 text-toned hover:text-highlighted lg:h-9"
        >
          <span class="size-6 rounded-tile border-[1.5px] border-dashed border-ring" />Добавить значок
        </button>
      </GlyphPicker>
      <div class="flex items-center gap-3">
        <GlyphPicker
          v-if="full && (page.glyph || !setup) && page.kind === 'page'"
          v-model:open="glyphOpen"
          :glyph="page.glyph"
          :color="page.color"
          removable
          @change="p => data.updatePage(page.id, p)"
        >
          <button
            type="button"
            class="shrink-0 cursor-pointer rounded-tile-lg"
            aria-label="Значок страницы"
          >
            <PageTile
              :glyph="page.glyph"
              :color="page.color"
              :size="36"
            />
          </button>
        </GlyphPicker>
        <PageTile
          v-else-if="page.glyph"
          :glyph="page.glyph"
          :color="page.color"
          :size="36"
        />
        <input
          v-if="full && page.kind === 'page'"
          ref="titleInput"
          v-model="title"
          class="min-w-0 flex-1 bg-transparent text-title text-highlighted caret-accent outline-none placeholder:font-medium placeholder:text-placeholder-lg"
          placeholder="Без названия"
          aria-label="Название страницы"
          enterkeyhint="done"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
          @focus="emit('editing', true)"
          @blur="emit('editing', false)"
        >
        <h1
          v-else
          class="min-w-0 flex-1 truncate text-title text-highlighted"
          :class="!full ? 'lg:text-28' : ''"
        >
          {{ page.title || 'Без названия' }}
        </h1>
      </div>
      <p
        v-if="subline"
        class="mt-1 text-meta text-toned lg:mt-1.5"
      >
        {{ subline }}
      </p>
    </div>

    <NewPageSetup
      v-if="setup"
      :page="page"
      @focus="v => emit('editing', v)"
    />

    <!-- Views: underlined tabs; search and «Настроить вид» on the right -->
    <div
      v-if="!glance"
      class="mt-3 flex items-end border-b border-default pr-0.5 pl-2 lg:mt-5 lg:px-0"
      :class="!full ? 'lg:mx-4' : ''"
    >
      <div
        v-if="!searching"
        class="no-scrollbar flex min-w-0 flex-1 overflow-x-auto lg:gap-5.5"
        role="tablist"
        aria-label="Виды"
      >
        <button
          v-for="v in views"
          :key="v.id"
          type="button"
          role="tab"
          :aria-selected="v.id === view.id"
          class="-mb-px flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap border-b-2 px-3 text-15 lg:h-10 lg:px-0.5"
          :class="v.id === view.id ? 'border-accent font-medium text-highlighted' : 'border-transparent text-toned hover:text-highlighted'"
          @click="viewId = v.id"
        >
          {{ v.name }}
        </button>
        <UButton
          v-if="full && !today && page.kind === 'page'"
          icon="i-lucide-plus"
          variant="ghost"
          square
          aria-label="Новый вид"
          class="self-center"
          @click="addView"
        />
      </div>
      <div
        v-else
        class="flex h-11 min-w-0 flex-1 items-center gap-2 pl-3 lg:h-10 lg:pl-0.5"
      >
        <UIcon
          name="i-lucide-search"
          class="size-4.5 shrink-0 text-toned"
        />
        <input
          ref="searchInput"
          v-model="query"
          class="h-full min-w-0 flex-1 bg-transparent text-input text-highlighted outline-none placeholder:text-dimmed"
          placeholder="Найти на странице"
          aria-label="Найти на странице"
          @keydown.esc="toggleSearch"
        >
      </div>
      <UButton
        :icon="searching ? 'i-lucide-x' : 'i-lucide-search'"
        variant="ghost"
        square
        :aria-label="searching ? 'Закрыть поиск' : 'Найти на странице'"
        class="self-center"
        @click="toggleSearch"
      />
      <AdaptiveOverlay
        v-if="!today"
        v-model:open="settingsOpen"
        :title="`Вид «${view.name}»`"
      >
        <template #trigger>
          <UButton
            icon="i-lucide-sliders-horizontal"
            variant="ghost"
            square
            aria-label="Настроить вид"
            :aria-expanded="settingsOpen"
            class="self-center"
          />
        </template>
        <ViewSettings
          :page="page"
          :view="view"
          @removed="viewId = null; settingsOpen = false"
        />
      </AdaptiveOverlay>
    </div>

    <!-- Records -->
    <div :class="!full ? 'lg:px-2' : ''">
      <template v-if="today">
        <section
          v-for="g in todayGroups"
          :key="g.key"
          :aria-label="g.label"
        >
          <h3
            class="px-5 pt-4 pb-1 text-caption lg:px-2.5"
            :class="g.tone === 'warn' ? 'text-warn-ink' : 'text-toned lg:text-dimmed'"
          >
            {{ g.label }}
          </h3>
          <RecordLine
            v-for="r in g.records"
            :key="r.id"
            :rec="r"
            brief
            density="list"
            class="px-2 lg:px-0"
            @open="openRecord(r)"
          />
        </section>
        <p
          v-if="!todayGroups.length"
          class="px-5 py-6 text-meta text-toned lg:px-2.5"
        >
          На сегодня ничего. Всё со сроком «сегодня» и просроченное со всех страниц появится здесь.
        </p>
      </template>
      <template v-else-if="layout === 'list'">
        <ListLayout
          :page="page"
          :view="view"
          :records="shown"
          :fresh-since="freshSince"
          :readonly="!full"
          :class="glance ? 'pt-3' : 'pt-1'"
          @open="openRecord"
          @choose="choose"
        >
          <template #empty>
            <p class="px-5 py-6 text-meta text-toned lg:px-2.5">
              {{ emptyText }}
            </p>
          </template>
        </ListLayout>
      </template>
      <BoardLayout
        v-else-if="layout === 'board'"
        :page="page"
        :view="view"
        :records="shown"
        :readonly="!full"
        @open="openRecord"
        @need-prop="settingsOpen = true"
      />
      <TableLayout
        v-else-if="layout === 'table'"
        :page="page"
        :view="view"
        :records="shown"
        @open="openRecord"
      />
      <CalendarLayout
        v-else
        :page="page"
        :view="view"
        :records="shown"
        :readonly="!full"
        @open="openRecord"
      />

      <div
        v-if="full && page.hasDone && records.length >= 3"
        class="mx-3 mt-4 lg:mx-0"
      >
        <TipCard
          v-if="!isDesktop"
          id="tip-swipe"
          icon="i-lucide-arrow-left"
        >
          Смахни строку влево, чтобы переместить или удалить. Отметить можно только кружком.
        </TipCard>
        <TipCard
          v-else
          id="tip-hover"
          icon="i-lucide-lightbulb"
        >
          Наведи на строку: справа появятся «Переместить» и «Удалить». <b class="font-semibold">Правый клик</b> открывает все действия.
        </TipCard>
      </div>
    </div>
  </div>
</template>
