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
import { usePropSheets } from '~/composables/usePropSheets'
import { useNotify } from '~/composables/useNotify'
import { dueToday, dueThisWeek, overdue } from '~/domain/summary'
import { collected, collects, onlyCollects, togglePicked } from '~/domain/collect'
import { useCollecting } from '~/composables/useCollecting'
import { weekday } from '~/domain/dates'
import { bodyOf, docText } from '~/domain/body'
import { groupByDue, matchesQuery } from '~/domain/views'
import { listView, nameForLayout } from '~/domain/templates'
import { readLine } from '~/domain/auto'
import { pageNamed } from '~/domain/rules'
import { pageColor } from '~/domain/look'
import { nb } from '~/domain/text'
import PageTile from '../common/PageTile.vue'
import TitleField from '../common/TitleField.vue'
import GlyphPicker from './GlyphPicker.vue'
import AddRow from '../common/AddRow.vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import ListLayout from './layouts/ListLayout.vue'
import ViewTabs from './ViewTabs.vue'
import RecordLine from '../record/RecordLine.vue'
import CollectRow from '../record/CollectRow.vue'
import PageNote from '../body/PageNote.vue'

// A list is what most pages show; the other views and the settings load when a page needs them
const BoardLayout = defineAsyncComponent(() => import('./layouts/BoardLayout.vue'))
const TableLayout = defineAsyncComponent(() => import('./layouts/TableLayout.vue'))
const CalendarLayout = defineAsyncComponent(() => import('./layouts/CalendarLayout.vue'))
const ViewSettings = defineAsyncComponent(() => import('./ViewSettings.vue'))
const ViewFilter = defineAsyncComponent(() => import('./ViewFilter.vue'))

const props = withDefaults(defineProps<{ page: Page, container?: 'full' | 'preview' | 'glance' }>(), { container: 'full' })
const emit = defineEmits<{ editing: [boolean] }>()

const data = useDataStore()
const journal = useJournalStore()
const notify = useNotify()
const ui = useUiStore()
const now = useNow()
const router = useRouter()
const peek = usePeek()
const { isDesktop } = useScreen()

const full = computed(() => props.container === 'full')
const records = computed(() => data.recordsOf(props.page.id))
const today = computed(() => props.page.kind === 'today')
/** Any record of its own, done or not: the page's views (its tabs) show from the first one (main flow, item 2) */
const hasOwn = computed(() => data.liveRecords.some(r => r.pageId === props.page.id))
const gathers = computed(() => props.page.views.some(collects))
/**
 * A page with no records and no kind yet (no template, no glyph) is its title and its text (main flow, item 16, as a
 * new page in Notion): the text fills the screen, and with nothing written «Начать с» offers a kind over the keyboard
 */
const textual = computed(() => full.value && props.page.kind === 'page' && !hasOwn.value && !props.page.template && !props.page.glyph && !gathers.value)
const bodyText = computed(() => docText(bodyOf(props.page)).trim())
const undecided = computed(() => textual.value && !bodyText.value)
/**
 * Under the title only the warn word «1 просрочено» (main flow, acceptance 1): no count and no source line. The list
 * shows itself, and the count is on Главная's card
 */
const late = computed(() => {
  if (collecting.value) return overdue(collectedAll.value, now.value).length
  if (today.value) return overdue(dueToday(data.liveRecords, now.value), now.value).length
  return overdue(records.value, now.value).length
})

// A new page named like one there is says so under its title (v22, G3): «Открыть» goes to that page, and this one,
// still empty, goes away
const titleDraft = ref(props.page.title)
watch(() => props.page.title, (t) => {
  titleDraft.value = t
})
const taken = computed(() => textual.value ? pageNamed(titleDraft.value, data.livePages.filter(p => p.id !== props.page.id)) : undefined)
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

// Opening a page clears its dot on Главная: what was written from elsewhere since the last visit takes the fresh tint
// here instead (main flow, item 10). A row written after this moment always shows
const openedAt = ref(Date.now())
const seen = ref(props.page.seenAt)
onMounted(() => {
  seen.value = data.visitPage(props.page.id) || seen.value
})
watch(() => props.page.id, (id, old) => {
  if (id === old) return
  openedAt.value = Date.now()
  seen.value = data.visitPage(id)
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
 * A view that collects records (v24, И10): one list by date from every page or the chosen ones, through its
 * «Фильтр»; the rows open as a preview over this page. The page's composer follows it (useCollecting)
 */
const collecting = computed(() => !today.value && collects(view.value))
const collectedAll = computed(() => collecting.value ? collected(view.value, data.liveRecords, now.value, data.leaving) : [])
const collectedRows = computed(() => query.value.trim() ? collectedAll.value.filter(r => matchesQuery(r, query.value)) : collectedAll.value)
const collectingNow = useCollecting()
watch([() => props.page.id, () => view.value.id, collecting, full], ([pageId, id, on, isFull]) => {
  if (!isFull) return
  if (on) collectingNow.value = { pageId, viewId: id }
  else if (collectingNow.value?.pageId === pageId) collectingNow.value = null
}, { immediate: true })
onBeforeUnmount(() => {
  if (full.value && collectingNow.value?.pageId === props.page.id) collectingNow.value = null
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
const barSettings = settingsOpen
/** Desktop: «Фильтр» is the second level of the same popover, with ‹ (v24, D5); Esc goes back, a click outside closes */
const settingsLevel = ref<'main' | 'filter'>('main')
/** Phone: «Фильтр» is a sheet of its own with no ‹; closing it brings «Настроить вид» back (v24 fixes, 21) */
const filterOpen = ref(false)
/** Desktop: the page «⋯» it was opened from, where the 420px popover stands (D1); else the view bar's button */
const settingsAnchor = ref<HTMLElement | null>(null)
const menuSlot = useTemplateRef<HTMLElement>('menuSlot')
const settingsButton = useTemplateRef<{ $el?: HTMLElement }>('settingsButton')

/** «Настроить вид» from the page «⋯»: on desktop at that «⋯», which has focus back once its menu is gone */
async function openSettingsFromMenu() {
  if (isDesktop.value) {
    await nextTick()
    const el = document.activeElement
    const dots = el instanceof HTMLElement && el !== document.body && el.isConnected ? el.closest<HTMLElement>('button') : null
    settingsAnchor.value = dots ?? menuSlot.value?.querySelector<HTMLElement>('button') ?? null
  }
  barSettings.value = true
}

function openFilter() {
  if (isDesktop.value) {
    settingsLevel.value = 'filter'
    return
  }
  afterSettings = () => {
    filterOpen.value = true
  }
  settingsOpen.value = false
}

/**
 * «Страницы» of «Выбранные» (v24 fixes, 15): the page picker «Откуда записи» in its multi-pick mode, a sheet on the
 * phone, on desktop a popover at the same anchor; closing it brings «Настроить вид» back
 */
function pickPages() {
  const pageId = props.page.id
  const viewId = view.value.id
  const anchor = isDesktop.value ? settingsAnchor.value ?? settingsButton.value?.$el ?? null : null
  const own = data.liveRecords.some(r => r.pageId === pageId)
  const current = () => data.pages[pageId]?.views.find(v => v.id === viewId)
  afterSettings = () => ui.pick({
    title: 'Откуда записи',
    subtitle: `вид «${current()?.name ?? view.value.name}»`,
    anchor,
    multi: {
      picked: () => current()?.pages ?? [],
      toggle: (id) => {
        const page = data.pages[pageId]
        const v = current()
        if (page && v) data.updatePage(pageId, { views: page.views.map(x => x.id === viewId ? { ...x, pages: togglePicked(v, id) } : x) })
      },
      // A page without records of its own is not offered to itself
      skip: own ? [] : [pageId]
    },
    onClose: () => {
      settingsOpen.value = true
    },
    run: () => {}
  })
  settingsOpen.value = false
}

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
  settingsLevel.value = 'main'
  if (run) run()
  else settingsAnchor.value = null
}
/** «Удалить вид» in «Настроить вид»: the tabs take it with «Отменить»; an empty page has no tabs, so it goes the same way here */
function removeView() {
  settingsOpen.value = false
  if (tabs.value) return tabs.value.remove(view.value)
  const before = props.page.views
  const gone = view.value
  if (before.length < 2) return
  data.updatePage(props.page.id, { views: before.filter(v => v.id !== gone.id) })
  viewId.value = null
  notify(`Вид «${gone.name}» удалён`, { label: 'Отменить', run: () => data.updatePage(props.page.id, { views: before }) })
}
/** Board and table want the whole width of the main column on desktop */
const wide = computed(() => view.value.layout === 'board' || view.value.layout === 'table')
/** What the header names once the title block has scrolled under it (v23, B2, F14): the open tab too, as the tabs went with it */
const heading = computed(() => nb(`${props.page.title || 'Без названия'}${!today.value && hasOwn.value && views.value.length > 1 ? ` · ${view.value.name}` : ''}`))

// Search inside the page
const searching = ref(false)
/**
 * The view bar (tabs, search, «Настроить вид»); Сегодня shows it only while searching; a collecting page always. It
 * stays while «Настроить вид» is open, so a page that stops collecting there («Эта страница») keeps its sheet
 */
const bar = computed(() => !glance.value && (hasOwn.value || gathers.value || barSettings.value || filterOpen.value || searching.value) && (!today.value || searching.value))
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
const todayGroups = computed(() => groupByDue(dueToday(data.liveRecords, now.value, data.leaving).filter(r => matchesQuery(r, query.value)), now.value))
/**
 * Сегодня (v23, B4, M15): after today the folding «На неделе», the six days after it. It starts folded, or open when
 * nothing is due today, and then stays as it was left (kept with the other folds in settings)
 */
const week = computed(() => today.value ? dueThisWeek(data.liveRecords, now.value, data.leaving).filter(r => matchesQuery(r, query.value)) : [])
const WEEK = 'today-week:'
const weekOpen = computed(() => {
  const left = data.settings.folded.find(k => k.startsWith(WEEK))
  return left ? left === `${WEEK}open` : !todayGroups.value.length
})
function toggleWeek() {
  data.setSettings({ folded: [...data.settings.folded.filter(k => !k.startsWith(WEEK)), `${WEEK}${weekOpen.value ? 'folded' : 'open'}`] })
}

// Title: edited in place on the full page; a new page opens with it focused
const titleInput = useTemplateRef<InstanceType<typeof TitleField>>('titleInput')
const titleFocused = ref(false)
function onTitleFocus(v: boolean) {
  titleFocused.value = v
  // A focused title keeps the field under it (v23, Q1); on a page with no kind yet «Начать с» stands in for it
  if (undecided.value || !v) emit('editing', v)
}
/** Enter in the title goes on to the page's text (Notion); a list with nothing in it goes on to its first record */
function titleEnter() {
  if (textual.value) note.value?.focus()
  else if (canAdd.value && !hasOwn.value) adder.value?.start()
}
const glyphOpen = ref(false)
/** Desktop: «Значок и цвет» opened from the page «⋯» stands at that «⋯» */
const glyphAnchor = ref<HTMLElement | null>(null)
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
  // The menu has closed and given focus back to its «⋯»
  glyphAnchor.value = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
  glyphOpen.value = true
}, { immediate: true })
watch(glyphOpen, (v) => {
  if (!v) glyphAnchor.value = null
})
// «Сделать записью» on the note (v24): the new record is the newest of the first view, so that view shows
watch(() => ui.firstView, (id) => {
  if (!full.value || id !== props.page.id) return
  ui.firstView = null
  viewId.value = null
}, { immediate: true })

function openRecord(rec: Rec) {
  if (full.value) void router.push(`/r/${rec.id}`)
  else peek.peek({ kind: 'record', id: rec.id })
}

// A page with no title, no text and no records goes away on leaving it, silently, as in Notion (main flow, item 16). A
// title still being typed is kept: this runs before the field's own blur would save it
onBeforeUnmount(() => {
  const typed = titleDraft.value.replace(/\s+/g, ' ').trim()
  if (full.value && data.pages[props.page.id] && typed && typed !== props.page.title) data.updatePage(props.page.id, { title: typed })
  const p = data.pages[props.page.id]
  if (full.value && p && p.kind === 'page' && !p.title.trim() && !p.description.trim() && !docText(bodyOf(p)).trim() && !data.liveRecords.some(r => r.pageId === p.id)) {
    data.purgePages([p.id])
  }
})

/** Nothing describes an empty page (main flow, item 2): only a search or a view of ticked records says it found nothing */
const emptyText = computed(() => {
  if (query.value.trim()) return 'Ничего не нашлось'
  const done = view.value.filter.find(r => r.field === 'done')
  if (done?.value === true) return records.value.length ? 'Пока ничего не отмечено.' : ''
  if (done?.value === false && records.value.length) return 'Всё сделано.'
  if (!full.value) return 'Нет записей'
  return ''
})

// ---------- «+ Новая запись» (main flow, item 11): the last row of the open view ----------

const adder = useTemplateRef<InstanceType<typeof AddRow>>('adder')
const note = useTemplateRef<InstanceType<typeof PageNote>>('note')
const openView = computed(() => !view.value.filter.some(r => r.field === 'done' && r.value === true))
const canAdd = computed(() => full.value && !glance.value && !query.value.trim() && (today.value || (layout.value === 'list' && !collecting.value && openView.value && !textual.value)))
/** On the page, at the end of its list; on Сегодня into Задачи, due today, so it shows where it was written */
/**
 * «+ Новая запись» reads the line as the field does (acceptance 1): the date becomes Срок, a quantity the quantity, a
 * thing to buy gets its department, and with a model a list splits. The place is always this page; on Сегодня, Задачи
 * with today
 */
function addHere(text: string) {
  const to = today.value ? data.livePages.find(p => p.kind === 'page' && p.template === 'todo' && !onlyCollects(p)) ?? data.inbox : props.page
  const now = Date.now()
  const { drafts } = readLine(text, '', {
    pages: [to, ...journal.targets().filter(p => p.id !== to.id)],
    inboxId: data.inbox.id,
    learned: data.learned,
    recent: data.recent,
    now,
    place: { pageId: to.id, by: 'page' },
    today: today.value,
    // Without a model one line is one record (Josh 28 Oct, 9)
    sort: journal.hasModel()
  })
  // At the end of the list, in the order typed
  let order = data.recordsOf(to.id).reduce((m, r) => Math.max(m, r.order), -1) + 1
  for (const d of drafts) data.addRecord({ pageId: to.id, text: d.text, due: d.due, values: d.values, order: order++, addedAt: now })
}

defineExpose({
  openSettings: () => void openSettingsFromMenu(),
  toggleSearch: () => toggleSearch(),
  /** «Начать с» picked a kind: the «+ Новая запись» line opens with the caret */
  startAdd: () => void nextTick(() => adder.value?.start()),
  wide,
  heading,
  undecided
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
      <!-- The glyph on its tile, the doc glyph until a kind or a glyph is chosen; no «Добавить значок» (main flow, item 16) -->
      <div class="flex items-center gap-2.5 lg:gap-3.5">
        <GlyphPicker
          v-if="full && page.kind === 'page'"
          v-model:open="glyphOpen"
          :glyph="page.glyph"
          :color="pageColor(page)"
          :title="page.title || 'Без названия'"
          :anchor="glyphAnchor"
          @change="p => data.updatePage(page.id, p)"
        >
          <button
            type="button"
            class="flex shrink-0 cursor-pointer rounded-tile-md lg:rounded-tile-lg"
            aria-label="Значок страницы"
          >
            <PageTile
              :glyph="page.glyph"
              :color="pageColor(page)"
              size="page"
              tile
            />
          </button>
        </GlyphPicker>
        <PageTile
          v-else-if="page.glyph"
          :glyph="page.glyph"
          :color="pageColor(page)"
          size="page"
          tile
        />
        <TitleField
          v-if="full && page.kind === 'page'"
          ref="titleInput"
          :value="page.title"
          label="Название страницы"
          placeholder="Без названия"
          enter-key="next"
          @save="t => data.updatePage(page.id, { title: t })"
          @focus="onTitleFocus"
          @draft="t => titleDraft = t"
          @enter="titleEnter"
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
          ref="menuSlot"
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
        v-else-if="late"
        class="mt-0.5 text-meta font-medium text-warn lg:mt-1.5 lg:text-sm"
      >
        {{ late }} просрочено
      </p>
    </div>

    <!-- The page's text (v23 «Заметка к странице»): between the title block and the tabs, drawn once it has text. A page
         with no records and no kind is its text, which fills the screen with no placeholder (main flow, item 16) -->
    <PageNote
      v-if="page.kind === 'page'"
      ref="note"
      :page="page"
      :editable="full"
      :fill="textual && !taken"
    />

    <!-- Views: underlined tabs; search and «Настроить вид» on the right. A page with no records yet has none (main flow,
         item 2): views come from «⋯ → Настроить вид» -->
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
        @settings="barSettings = true"
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
        v-model:open="barSettings"
        :title="settingsLevel === 'filter' ? 'Фильтр' : 'Настроить вид'"
        :subtitle="settingsLevel === 'filter' ? `вид «${view.name}»` : undefined"
        width="w-105"
        :anchor="settingsAnchor"
        :back="settingsLevel === 'filter' ? () => settingsLevel = 'main' : undefined"
        @closed="settingsClosed"
      >
        <template #trigger>
          <UButton
            ref="settingsButton"
            icon="i-lucide-sliders-horizontal"
            variant="ghost"
            square
            aria-label="Настроить вид"
            :aria-expanded="barSettings"
            class="self-center"
          />
        </template>
        <ViewFilter
          v-if="settingsLevel === 'filter'"
          :page="page"
          :view="view"
        />
        <ViewSettings
          v-else
          :page="page"
          :view="view"
          @remove="removeView"
          @add="addView"
          @new-prop="newProp"
          @filter="openFilter"
          @pick-pages="pickPages"
        />
      </AdaptiveOverlay>
      <AdaptiveOverlay
        v-if="!today && full && !isDesktop"
        v-model:open="filterOpen"
        title="Фильтр"
        :subtitle="`вид «${view.name}»`"
        stacked
        @closed="settingsOpen = true"
      >
        <ViewFilter
          :page="page"
          :view="view"
        />
      </AdaptiveOverlay>
    </div>

    <!-- Records: the title block ends where they start (data-rows, the large-title collapse) -->
    <div
      :class="!full ? 'lg:px-2' : ''"
      data-rows
    >
      <template v-if="today">
        <section
          v-for="g in todayGroups"
          :key="g.key"
          :aria-label="g.label"
        >
          <h3
            class="px-4 pt-3 text-cap leading-6 lg:px-2.5 lg:pt-4 lg:pb-1 lg:leading-5"
            :class="g.tone === 'warn' ? 'text-warn' : 'text-toned'"
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
        <section
          v-if="week.length"
          aria-label="На неделе"
        >
          <h3 class="px-4 pt-3 text-cap leading-6 lg:px-2.5 lg:pt-4 lg:pb-1 lg:leading-5">
            <button
              type="button"
              class="hit-44 flex cursor-pointer items-center gap-1 text-toned hover:text-highlighted"
              :aria-expanded="weekOpen"
              @click="toggleWeek"
            >
              На неделе
              <span
                v-if="!weekOpen"
                class="font-normal text-dimmed tabular-nums"
              >· {{ week.length }}</span>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-3 shrink-0 text-dimmed transition-transform duration-150"
                :class="weekOpen ? '' : '-rotate-90'"
              />
            </button>
          </h3>
          <template v-if="weekOpen">
            <RecordLine
              v-for="r in week"
              :key="r.id"
              :rec="r"
              :end="weekday(r.due!.date, now)"
              density="list"
              class="mx-1 lg:mx-0"
              @open="peek.peek({ kind: 'record', id: r.id })"
            />
          </template>
        </section>
      </template>
      <div
        v-else-if="collecting && layout === 'list'"
        :class="glance ? 'pt-3' : bar ? '' : 'lg:pt-1'"
      >
        <CollectRow
          v-for="r in collectedRows"
          :key="r.id"
          :rec="r"
          :view="view"
          :readonly="!full"
          @open="peek.peek({ kind: 'record', id: r.id })"
        />
        <p
          v-if="!collectedRows.length"
          class="px-5 py-6 text-meta text-toned lg:px-2.5"
        >
          {{ query.trim() ? 'Ничего не нашлось' : 'Под этот фильтр пока ничего не подходит.' }}
        </p>
      </div>
      <template v-else-if="layout === 'list'">
        <ListLayout
          :page="page"
          :view="view"
          :records="shown"
          :since="openedAt"
          :readonly="!full"
          :clearable="!query.trim()"
          :seen="full ? seen : undefined"
          :class="glance ? 'pt-3' : bar ? '' : 'lg:pt-1'"
          @open="openRecord"
        >
          <template #empty>
            <p
              v-if="emptyText"
              class="px-5 py-6 text-meta text-toned lg:px-2.5"
            >
              {{ emptyText }}
            </p>
          </template>
        </ListLayout>
      </template>
      <BoardLayout
        v-else-if="layout === 'board'"
        :page="page"
        :view="view"
        :records="collecting ? collectedRows : shown"
        :readonly="!full"
        @open="openRecord"
      />
      <TableLayout
        v-else-if="layout === 'table'"
        :page="page"
        :view="view"
        :records="collecting ? collectedRows : shown"
        @open="openRecord"
      />
      <CalendarLayout
        v-else
        :page="page"
        :view="view"
        :records="collecting ? collectedRows : shown"
        :readonly="!full"
        @open="openRecord"
      />
      <AddRow
        v-if="canAdd"
        ref="adder"
        label="Новая запись"
        :class="today ? 'pt-1' : hasOwn ? '' : 'pt-1.5'"
        @add="addHere"
        @open="v => emit('editing', v)"
      />
    </div>
  </div>
</template>
