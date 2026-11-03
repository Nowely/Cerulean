<script setup lang="ts">
// One page, three containers: full (from navigation), preview (from a link: sheet or right panel)
// and glance (beside search results). Preview reads and ticks only: no composer, no swipe, no editing
// of the title. Glance is a look before opening: the first view as a plain list, no tabs.
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useOnline } from '@vueuse/core'
import { useRouter } from '#imports'
import type { Id, Layout, Page, Rec, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import { useUiStore } from '~/stores/ui'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
import { usePropSheets } from '~/composables/usePropSheets'
import { useNotify } from '~/composables/useNotify'
import { dueToday, dueThisWeek, overdue } from '~/domain/summary'
import { collected, collects, DUE_CHIPS, onlyCollects, togglePicked } from '~/domain/collect'
import { useCollecting } from '~/composables/useCollecting'
import { weekday } from '~/domain/dates'
import { bodyOf, docText } from '~/domain/body'
import { groupByDue, matchesQuery } from '~/domain/views'
import { listView } from '~/domain/templates'
import { removePageView, undoPageView } from '~/domain/stock'
import { readLine } from '~/domain/auto'
import { pageNamed } from '~/domain/rules'
import { pageColor, suggestedGlyphs } from '~/domain/look'
import { askIcon } from '~/domain/iconModel'
import { nb } from '~/domain/text'
import { useLater } from '~/composables/useLater'
import { useBackLayer } from '~/composables/useBackLayer'
import PageTile from '../common/PageTile.vue'
import TitleField from '../common/TitleField.vue'
import GlyphPicker from './GlyphPicker.vue'
import AddRow from '../common/AddRow.vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import ListLayout from './layouts/ListLayout.vue'
import ViewTabs from './ViewTabs.vue'
import NewViewTiles from './NewViewTiles.vue'
import { insertView } from './viewTabsModel'
import RecordLine from '../record/RecordLine.vue'
import CollectRow from '../record/CollectRow.vue'
import PageNote from '../body/PageNote.vue'
import PageStarters from './PageStarters.vue'

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
const online = useOnline()
const router = useRouter()
const peek = usePeek()
const later = useLater()
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
const autoApplied = ref(props.page.autoGlyph ? props.page.glyph : null)
const textual = computed(() => full.value && props.page.kind === 'page' && !hasOwn.value && !props.page.template && (!props.page.glyph || (props.page.autoGlyph && props.page.glyph === autoApplied.value)) && !gathers.value)
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
let iconTimer: ReturnType<typeof setTimeout> | undefined
let iconRequest: AbortController | undefined
let iconGeneration = 0
function cancelIcon() {
  iconGeneration++
  clearTimeout(iconTimer)
  iconRequest?.abort()
}
watch(() => props.page.id, (_id, oldId) => {
  cancelIcon()
  if (full.value && data.pages[oldId]?.autoGlyph) data.updatePage(oldId, { autoGlyph: false })
  autoApplied.value = props.page.autoGlyph ? props.page.glyph : null
  titleDraft.value = props.page.title
}, { flush: 'sync' })
watch([titleDraft, () => props.page.id, () => data.settings.aiIcon, () => data.settings.apiKey, () => data.settings.keyState, () => data.settings.provider, () => data.settings.baseUrl, () => data.settings.modelId, () => data.settings.model], () => {
  cancelIcon()
  const page = data.pages[props.page.id]
  if (!full.value || !page?.autoGlyph || page.deletedAt) return
  if (page.template || page.glyph !== autoApplied.value) {
    data.updatePage(page.id, { autoGlyph: false })
    return
  }
  if (data.settings.aiIcon === false) return
  const title = titleDraft.value
  const glyph = title.trim() ? suggestedGlyphs(title)[0] : null
  autoApplied.value = glyph
  if (page.glyph !== glyph) data.updatePage(page.id, { glyph })
  if (!title.trim() || !journal.hasModel() || !online.value) return
  const id = page.id
  const generation = iconGeneration
  const connection = { ...data.settings }
  iconTimer = setTimeout(() => {
    iconRequest = new AbortController()
    void askIcon(connection, title, iconRequest.signal).then((chosen) => {
      const current = data.pages[id]
      if (!chosen || generation !== iconGeneration || !current?.autoGlyph || current.deletedAt || current.template
        || current.glyph !== glyph || titleDraft.value !== title || data.settings.aiIcon === false || !journal.hasModel()) return
      autoApplied.value = chosen
      data.updatePage(id, { glyph: chosen })
    })
  }, 500)
}, { flush: 'sync' })
function changeGlyph(patch: { glyph?: Page['glyph'], color?: Page['color'] }) {
  if ('glyph' in patch) {
    cancelIcon()
    data.updatePage(props.page.id, { ...patch, autoGlyph: false })
  } else data.updatePage(props.page.id, patch)
}
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

const tabs = useTemplateRef<InstanceType<typeof ViewTabs>>('tabs')
const newViewOpen = ref(false)
const newViewAnchor = ref<HTMLElement | null>(null)
function openNewView(anchor?: HTMLElement) {
  newViewAnchor.value = anchor ?? tabs.value?.currentTab() ?? settingsButton.value?.$el ?? null
  if (settingsOpen.value) {
    afterSettings = () => {
      newViewOpen.value = true
    }
    settingsOpen.value = false
  } else newViewOpen.value = true
}
function addView(layout: Layout) {
  const result = insertView(props.page.views, view.value, layout)
  data.updatePage(props.page.id, { views: result.views })
  viewId.value = result.view.id
  newViewOpen.value = false
}

const settingsOpen = ref(false)
const barSettings = settingsOpen
const settingsLevel = ref<'main' | 'filter'>('main')
type FilterField = { kind: 'select', id: Id } | { kind: 'due' | 'done' }
const filterField = ref<FilterField | null>(null)
const filterFromSettings = ref(false)
useBackLayer(() => settingsOpen.value && settingsLevel.value === 'filter' && filterFromSettings.value, () => {
  settingsLevel.value = 'main'
}, 2)
useBackLayer(() => settingsOpen.value && !!filterField.value, () => {
  filterField.value = null
}, 3)
const filterTitle = computed(() => {
  const field = filterField.value
  if (!field) return 'Фильтр и сортировка'
  if (field.kind === 'due') return 'Срок'
  if (field.kind === 'done') return props.page.template === 'shop' ? 'Куплено' : 'Сделано'
  if (field.kind === 'select') return props.page.props.find(p => p.id === field.id)?.name ?? `Удалённое свойство: ${field.id}`
  return 'Фильтр и сортировка'
})
const filterBackAvailable = computed(() => settingsLevel.value === 'filter' && (!!filterField.value || filterFromSettings.value))
function filterBack() {
  if (filterField.value) filterField.value = null
  else if (filterFromSettings.value) settingsLevel.value = 'main'
}
const filterChips = computed(() => {
  const chips: { key: string, label: string, field: FilterField }[] = []
  for (const [id, values] of Object.entries(view.value.selectFilters ?? {})) {
    if (!values.length) continue
    const p = props.page.props.find(p => p.id === id && p.type === 'select')
    const names = values.map(value => p?.options?.find(o => o.id === value)?.name ?? `Удалённый вариант: ${value}`)
    chips.push({ key: `select:${id}`, label: `${p?.name ?? `Удалённое свойство: ${id}`}: ${names.join(', ')}`, field: { kind: 'select', id } })
  }
  if (view.value.dues?.length) chips.push({ key: 'due', label: `Срок: ${DUE_CHIPS.filter(c => view.value.dues?.includes(c.key)).map(c => c.label).join(', ')}`, field: { kind: 'due' } })
  return chips
})
const hasUserFilters = computed(() => filterChips.value.length > 0 || !!view.value.asking)
function removeFilter(field: FilterField) {
  const page = data.pages[props.page.id]
  const current = page?.views.find(v => v.id === view.value.id)
  if (!page || !current) return
  const selectFilters = { ...current.selectFilters }
  if (field.kind === 'select') delete selectFilters[field.id]
  const change = field.kind === 'select' ? { selectFilters } : field.kind === 'due' ? { dues: [] } : {}
  data.updatePage(page.id, { views: page.views.map(v => v.id === current.id ? { ...v, ...change } : v) })
}
/** Desktop: the page «⋯» it was opened from, where the 420px popover stands (D1); else the view bar's button */
const settingsAnchor = ref<HTMLElement | null>(null)
const menuSlot = useTemplateRef<HTMLElement>('menuSlot')
const settingsButton = useTemplateRef<{ $el?: HTMLElement }>('settingsButton')

function openTabSettings() {
  settingsLevel.value = 'main'
  settingsAnchor.value = tabs.value?.currentTab() ?? null
  settingsOpen.value = true
}

/** «Настроить вид» from the page «⋯»: on desktop at that «⋯», which has focus back once its menu is gone */
async function openSettingsFromMenu() {
  settingsLevel.value = 'main'
  if (isDesktop.value) {
    await nextTick()
    const el = document.activeElement
    const dots = el instanceof HTMLElement && el !== document.body && el.isConnected ? el.closest<HTMLElement>('button') : null
    settingsAnchor.value = dots ?? menuSlot.value?.querySelector<HTMLElement>('button') ?? null
  }
  barSettings.value = true
}

function openFilter() {
  filterFromSettings.value = true
  filterField.value = null
  settingsLevel.value = 'filter'
}

async function openFilterDirect(event: Event, field: FilterField | null = null) {
  settingsAnchor.value = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  filterFromSettings.value = false
  filterField.value = field
  settingsLevel.value = 'filter'
  await later.load()
  settingsOpen.value = true
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
  const pageId = props.page.id
  const page = data.pages[pageId]
  const gone = view.value
  const result = page && removePageView(page, gone.id)
  if (!result) return
  data.updatePage(pageId, { views: result.page.views, stocks: result.page.stocks })
  viewId.value = null
  notify(`Вид «${gone.name}» удалён`, { label: 'Отменить', run: () => {
    const current = data.pages[pageId]
    const restored = current && undoPageView(current, result.removed)
    if (!restored) return
    data.updatePage(pageId, { views: restored.views, stocks: restored.stocks })
    if (props.page.id === pageId) viewId.value = gone.id
  } })
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
const bar = computed(() => !glance.value && (hasOwn.value || gathers.value || barSettings.value || searching.value) && (!today.value || searching.value))
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
  cancelIcon()
  const typed = titleDraft.value.replace(/\s+/g, ' ').trim()
  if (full.value && data.pages[props.page.id] && typed && typed !== props.page.title) data.updatePage(props.page.id, { title: typed })
  const p = data.pages[props.page.id]
  if (full.value && p?.autoGlyph) data.updatePage(p.id, { autoGlyph: false })
  cancelIcon()
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
  const modelOn = journal.hasModel() && online.value
  const { drafts } = readLine(text, '', {
    pages: [to, ...journal.targets().filter(p => p.id !== to.id)],
    inboxId: data.inbox.id,
    learned: data.learned,
    recent: data.recent,
    now,
    place: { pageId: to.id, by: 'page' },
    today: today.value,
    split: modelOn && data.settings.aiSplit !== false,
    department: data.settings.aiDepartment !== false
  })
  let order = data.recordsOf(to.id).reduce((m, r) => Math.max(m, r.order), -1) + 1
  for (const d of drafts) data.addRecord({ pageId: to.id, text: d.text, due: d.due, values: d.values, order: order++, addedAt: now })
}

/** «Начать с» picked a kind: the «+ Новая запись» line opens with the caret */
function startAdd() {
  void nextTick(() => adder.value?.start())
}

defineExpose({
  openSettings: () => void openSettingsFromMenu(),
  toggleSearch: () => toggleSearch(),
  startAdd,
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
      <!-- The page glyph keeps its slot over the check circles without a permanent plate. -->
      <div class="flex items-center gap-2.5 lg:gap-1.5 lg:pl-1">
        <GlyphPicker
          v-if="full && page.kind === 'page'"
          v-model:open="glyphOpen"
          :glyph="page.glyph"
          :color="pageColor(page)"
          :title="titleDraft || 'Без названия'"
          :anchor="glyphAnchor"
          @change="changeGlyph"
        >
          <button
            type="button"
            class="relative flex size-7.5 shrink-0 cursor-pointer items-center justify-center rounded-tile-md active:bg-pressed lg:size-7 lg:hover:bg-hover after:absolute after:-inset-y-2 after:-left-4 after:right-0 after:content-['']"
            aria-label="Значок страницы"
          >
            <PageTile
              :glyph="page.glyph"
              :color="pageColor(page)"
              :size="22"
              tint
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

    <!-- Computer: «Начать с» sits in the page under the title, since the field on the left is Главная's (computer delta,
         item 18); a phone has it over the keyboard (pages/p/[id].vue) -->
    <PageStarters
      v-if="full && isDesktop && undecided"
      class="pt-3 pb-1"
      :page="page"
      @picked="startAdd"
    />

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
        @settings="openTabSettings"
        @add="openNewView"
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
      <UButton
        v-if="!today && full"
        ref="settingsButton"
        icon="i-lucide-sliders-horizontal"
        variant="ghost"
        square
        aria-label="Фильтр и сортировка"
        :aria-expanded="barSettings && settingsLevel === 'filter'"
        :class="['self-center', hasUserFilters ? 'text-accent-ink hover:text-accent-ink focus-visible:text-accent-ink' : '']"
        @click="openFilterDirect($event)"
      />
      <AdaptiveOverlay
        v-if="!today && full"
        v-model:open="barSettings"
        :title="settingsLevel === 'filter' ? filterTitle : 'Настроить вид'"
        width="w-105"
        :anchor="settingsAnchor"
        :back="filterBackAvailable ? filterBack : undefined"
        @closed="settingsClosed"
      >
        <template
          v-if="!isDesktop && filterBackAvailable"
          #close
        >
          <UButton
            icon="i-lucide-chevron-left"
            variant="ghost"
            square
            aria-label="Назад"
            class="order-first -ml-4"
            @click="filterBack"
          />
        </template>
        <ViewFilter
          v-if="settingsLevel === 'filter'"
          :page="page"
          :view="view"
          :field="filterField"
          @open="field => filterField = field"
          @close="settingsOpen = false"
        />
        <ViewSettings
          v-else
          :page="page"
          :view="view"
          @remove="removeView"
          @add="openNewView()"
          @new-prop="newProp"
          @filter="openFilter"
          @pick-pages="pickPages"
        />
      </AdaptiveOverlay>
      <AdaptiveOverlay
        v-if="!today && full"
        v-model:open="newViewOpen"
        title="Новый вид"
        :anchor="newViewAnchor"
      >
        <NewViewTiles @select="addView" />
      </AdaptiveOverlay>
    </div>

    <div
      v-if="bar && !today && full && filterChips.length"
      class="flex flex-wrap gap-2 px-4 pt-2 lg:px-0"
    >
      <div
        v-for="chip in filterChips"
        :key="chip.key"
        class="inline-flex h-8 max-w-full items-center rounded-item bg-accent-soft text-sm text-accent-ink"
      >
        <button
          type="button"
          class="min-w-0 cursor-pointer truncate pl-3"
          @click="openFilterDirect($event, chip.field)"
        >
          {{ chip.label }}
        </button>
        <button
          type="button"
          class="flex size-8 shrink-0 cursor-pointer items-center justify-center"
          :aria-label="`Убрать фильтр ${chip.label}`"
          @click="removeFilter(chip.field)"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4"
          />
        </button>
      </div>
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
        :readonly="!full"
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
