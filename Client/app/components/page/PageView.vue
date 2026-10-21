<script setup lang="ts">
// One page, three containers: full (from navigation), preview (from a link: sheet or right panel)
// and glance (beside search results). Preview reads and ticks only: no composer, no swipe, no editing
// of the title. Glance is a look before opening: the first view as a plain list, no tabs.
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from '#imports'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useRecordActions } from '~/composables/useRecordActions'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { usePeek } from '~/composables/usePeek'
import { usePropSheets } from '~/composables/usePropSheets'
import { pageSubline, dueToday } from '~/domain/summary'
import { groupByDue, matchesQuery } from '~/domain/views'
import { listView, nameForLayout } from '~/domain/templates'
import { pageNamed } from '~/domain/rules'
import PageTile from '../common/PageTile.vue'
import TitleField from '../common/TitleField.vue'
import GlyphPicker from './GlyphPicker.vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import ListLayout from './layouts/ListLayout.vue'
import ViewTabs from './ViewTabs.vue'
import RecordLine from '../record/RecordLine.vue'
import PageNote from '../body/PageNote.vue'

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
const actions = useRecordActions()
const ui = useUiStore()
const now = useNow()
const router = useRouter()
const peek = usePeek()

const full = computed(() => props.container === 'full')
const records = computed(() => data.recordsOf(props.page.id))
const today = computed(() => props.page.kind === 'today')
const setup = computed(() => full.value && props.page.kind === 'page' && !records.value.length && !data.liveRecords.some(r => r.pageId === props.page.id))
const subline = computed(() => pageSubline(props.page, records.value, now.value, data.liveRecords))

// A new page named like one there is says so under its title (v22, G3): «Открыть» goes to that page, and this one,
// still empty, goes away
const titleDraft = ref(props.page.title)
watch(() => props.page.title, (t) => {
  titleDraft.value = t
})
const taken = computed(() => setup.value ? pageNamed(titleDraft.value, data.livePages.filter(p => p.id !== props.page.id)) : undefined)
const takenText = computed(() => {
  const p = taken.value
  const section = p?.sectionId ? data.sections[p.sectionId]?.name : undefined
  return p ? `Страница «${p.title.trim()}» уже есть${section ? ` в секции ${section}` : ''}.` : ''
})
async function openTaken() {
  const p = taken.value
  if (!p) return
  const self = props.page.id
  await router.replace(`/p/${p.id}`)
  if (data.pages[self] && !data.liveRecords.some(r => r.pageId === self)) data.purgePages([self])
}

// Opening a page sets what counts as «новых» on Главная from now on. A row ticked after this moment stays in
// place, struck through, until the page is opened again
const openedAt = ref(Date.now())
onMounted(() => data.visitPage(props.page.id))
watch(() => props.page.id, (id, old) => {
  if (id === old) return
  openedAt.value = Date.now()
  data.visitPage(id)
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

/**
 * «Новый вид» (view menu or «Настроить вид»): right after the current tab, with its filter, named after its type;
 * it is selected and «Настроить вид» opens on it, the name first
 */
const tabs = useTemplateRef<InstanceType<typeof ViewTabs>>('tabs')
function addView() {
  const at = props.page.views.findIndex(v => v.id === view.value.id) + 1
  const v = listView(nameForLayout(props.page.views, 'list'), { filter: view.value.filter.filter(r => r.field === 'done') })
  data.updatePage(props.page.id, { views: [...props.page.views.slice(0, at), v, ...props.page.views.slice(at)] })
  viewId.value = v.id
  settingsOpen.value = true
}

const settingsOpen = ref(false)

/** «Новое свойство» in «Настроить вид»: the editor takes the sheet's place, and after «Создать» the sheet is back with it switched on */
const propSheets = usePropSheets()
let afterSettings: (() => void) | null = null
function newProp() {
  const pageId = props.page.id
  const viewId = view.value.id
  afterSettings = () => propSheets.create(pageId, {
    from: 'view',
    onCreate: (p) => {
      const page = data.pages[pageId]
      if (page) data.updatePage(pageId, { views: page.views.map(v => v.id === viewId ? { ...v, shown: [...v.shown, p.id] } : v) })
    },
    onBack: () => {
      settingsOpen.value = true
    }
  })
  settingsOpen.value = false
}
function settingsClosed() {
  const run = afterSettings
  afterSettings = null
  run?.()
}
/** Board and table want the whole width of the main column on desktop */
const wide = computed(() => view.value.layout === 'board' || view.value.layout === 'table')
defineExpose({ openSettings: () => settingsOpen.value = true, toggleSearch: () => toggleSearch(), wide })

// Search inside the page
const searching = ref(false)
/** The view bar (tabs, search, «Настроить вид»); Сегодня shows it only while searching */
const bar = computed(() => !glance.value && !setup.value && (!today.value || searching.value))
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
const todayGroups = computed(() => groupByDue(dueToday(data.liveRecords, now.value, openedAt.value).filter(r => matchesQuery(r, query.value)), now.value))

// Title: edited in place on the full page; a new page opens with it focused
const titleInput = useTemplateRef<InstanceType<typeof TitleField>>('titleInput')
const titleFocused = ref(false)
function onTitleFocus(v: boolean) {
  titleFocused.value = v
  // A focused title keeps the composer under it (v23, Q1); a new page's setup stands in for it
  if (setup.value || !v) emit('editing', v)
}
const glyphOpen = ref(false)
// «Переименовать» and «Значок и цвет» from a «⋯», here or on Главная
// It waits for the field itself: a page opened in the same tap mounts after its setup has run
watch([() => ui.focusTitle, titleInput], async ([id, field]) => {
  if (!full.value || id !== props.page.id || !field) return
  ui.focusTitle = null
  await nextTick()
  field.focus()
}, { immediate: true })
watch(() => ui.openGlyph, (id) => {
  if (!full.value || id !== props.page.id) return
  ui.openGlyph = null
  glyphOpen.value = true
}, { immediate: true })

function openRecord(rec: Rec) {
  if (full.value) void router.push(`/r/${rec.id}`)
  else peek.peek({ kind: 'record', id: rec.id })
}

/** A choice on a row of Входящие settles the same Уточнение as in Журнал */
function choose(rec: Rec, choice: Id | 'more' | 'new') {
  if (choice === 'more') {
    ui.pick({ title: 'Куда положить', subtitle: rec.text, current: rec.pageId, guesses: journal.guessesFor(rec), run: c => actions.place(rec, c) })
    return
  }
  if (choice === 'new') return
  actions.place(rec, { pageId: choice })
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
  if (done?.value === true) return 'Пока ничего не отмечено.'
  if (done?.value === false && records.value.length) return 'Всё сделано.'
  if (props.page.kind === 'inbox') return 'Всё разложено. Сюда попадает то, что не удалось разложить'
  if (!full.value) return 'Нет записей'
  if (!records.value.length && titleFocused.value) return 'Назови страницу, потом пиши внизу.'
  return 'Пиши внизу: первая запись появится здесь.'
})
</script>

<template>
  <div
    class="pb-4 max-lg:sunk"
    :style="!full ? '--row-bg: var(--ui-bg)' : undefined"
  >
    <!-- Title -->
    <div
      class="px-4 pt-1 lg:px-0"
      :class="!full ? 'lg:px-4' : 'lg:pt-px'"
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
      <div class="flex items-center gap-2.5 lg:gap-3.5">
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
            class="flex shrink-0 cursor-pointer rounded-tile-md lg:rounded-tile-lg"
            aria-label="Значок страницы"
          >
            <PageTile
              :glyph="page.glyph"
              :color="page.color"
              size="page"
              tile
            />
          </button>
        </GlyphPicker>
        <PageTile
          v-else-if="page.glyph"
          :glyph="page.glyph"
          :color="page.color"
          size="page"
          tile
        />
        <TitleField
          v-if="full && page.kind === 'page'"
          ref="titleInput"
          :value="page.title"
          label="Название страницы"
          placeholder="Без названия"
          @save="t => data.updatePage(page.id, { title: t })"
          @focus="onTitleFocus"
          @draft="t => titleDraft = t"
        />
        <h1
          v-else
          class="min-w-0 flex-1 text-title text-highlighted"
          :class="!full ? 'lg:text-28' : ''"
        >
          {{ page.title || 'Без названия' }}
        </h1>
        <!-- Desktop: «⋯» ends the title row (a phone has it in the header) -->
        <span
          v-if="full && $slots.menu"
          class="hidden shrink-0 self-start lg:block"
        >
          <slot name="menu" />
        </span>
      </div>
      <p
        v-if="taken"
        class="mt-0.5 text-meta text-toned lg:mt-1.5 lg:text-sm"
        role="status"
      >
        {{ takenText }} <button
          type="button"
          class="hit-44 cursor-pointer font-medium text-accent-ink hover:underline"
          @pointerdown.prevent
          @click="openTaken"
        >
          Открыть
        </button>
      </p>
      <p
        v-else-if="subline"
        class="mt-0.5 text-meta text-toned lg:mt-1.5 lg:text-sm"
      >
        {{ subline }}
      </p>
    </div>

    <!-- «Заметка к странице» (v23): between the title block and the tabs, drawn once it has text -->
    <PageNote
      v-if="page.kind === 'page'"
      :page="page"
      :editable="full"
    />

    <NewPageSetup
      v-if="setup"
      :page="page"
      @focus="v => emit('editing', v)"
    />

    <!-- Views: underlined tabs; search and «Настроить вид» on the right. A page with no records yet has none:
         views come from «⋯ → Настроить вид» -->
    <div
      v-if="bar"
      class="mt-1 flex items-end pr-0.5 pl-1 lg:px-0"
      :class="!full ? 'lg:mx-4' : ''"
    >
      <ViewTabs
        v-if="!searching"
        ref="tabs"
        :page="page"
        :views="views"
        :current="view"
        :readonly="!full || today"
        @select="id => viewId = id"
        @settings="settingsOpen = true"
        @add="addView"
      />
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
      <!-- A preview is for reading and ticking (MobileSheet): views are set on the page itself -->
      <AdaptiveOverlay
        v-if="!today && full"
        v-model:open="settingsOpen"
        title="Настроить вид"
        @closed="settingsClosed"
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
          @remove="settingsOpen = false; tabs?.remove(view)"
          @add="addView"
          @new-prop="newProp"
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
            class="px-4 pt-3 text-cap leading-6 lg:px-2.5 lg:pt-4 lg:pb-1 lg:leading-5"
            :class="g.tone === 'warn' ? 'text-warn-ink' : 'text-toned'"
          >
            {{ g.label }}
          </h3>
          <RecordLine
            v-for="r in g.records"
            :key="r.id"
            :rec="r"
            brief
            density="list"
            class="mx-1 lg:mx-0"
            @open="peek.peek({ kind: 'record', id: r.id })"
          />
        </section>
        <p
          v-if="!todayGroups.length"
          class="px-5 py-6 text-meta text-toned lg:px-2.5"
        >
          На сегодня ничего, всё со сроком появится здесь.
        </p>
      </template>
      <template v-else-if="layout === 'list'">
        <ListLayout
          :page="page"
          :view="view"
          :records="shown"
          :since="openedAt"
          :readonly="!full"
          :clearable="!query.trim()"
          :class="glance ? 'pt-3' : bar ? '' : 'lg:pt-1'"
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
    </div>
  </div>
</template>
