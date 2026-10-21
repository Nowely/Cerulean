<script setup lang="ts">
// Поиск. A full screen on a phone; on desktop a Ctrl K dialog with the found item previewed on the right.
// Both use the same rows: without a query the six records added last, with one «Страницы» then «Записи».
// A result opens as a preview (it is a link, not navigation); «Открыть» or ↵ opens it full. Поиск stays in
// history with its query and section (?find=…&in=…), so back from a result returns to the same results (v22, G11).
// Nothing found offers «Искать везде» with a section chosen, and «Записать «…»», a send from Главная (v22, N19).
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import type { Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'
import { useFind } from '~/composables/useFind'
import { encodeTarget, pathOf, type Target } from '~/composables/usePeek'
import { useFindRows } from '~/composables/useFindRows'
import { lastAdded, search, type Hit } from '~/domain/search'
import { splitMatch } from '~/domain/text'
import PageTile from '../common/PageTile.vue'
import RecordMark from '../common/RecordMark.vue'
import PageView from '../page/PageView.vue'
import RecordView from '../record/RecordView.vue'
import FindScreen from './FindScreen.vue'

const data = useDataStore()
const ui = useUiStore()
const { pageLine, recLine } = useFindRows()
const { isDesktop } = useScreen()
const find = useFind()
const route = useRoute()
const router = useRouter()

const q = ref('')
/** One section, or every section */
const sectionId = ref<Id | null>(null)
/** Back from a result: Поиск shows what it showed, and the phone keeps the keyboard down */
const restored = ref(false)
const active = ref(0)
const input = useTemplateRef<HTMLInputElement>('input')

const open = computed({
  get: () => find.isOpen.value,
  set: (v) => {
    if (!v) find.close()
  }
})
watch(open, async (v) => {
  if (!v) return
  const kept = route.query.find
  const inSection = route.query.in
  restored.value = typeof kept === 'string' && !!kept
  q.value = typeof kept === 'string' && kept ? kept : ui.findQuery
  sectionId.value = typeof inSection === 'string' && data.sections[inSection] ? inSection : null
  ui.findQuery = ''
  active.value = 0
  await nextTick()
  input.value?.focus()
}, { immediate: true })

const sections = computed(() => [
  { label: 'Все секции', value: 'all' },
  ...data.sectionList.map(s => ({ label: s.name, value: s.id }))
])
/** The desktop select says 'all' for «Все секции» */
const sectionValue = computed({
  get: () => sectionId.value ?? 'all',
  set: (v: string) => {
    sectionId.value = v === 'all' ? null : v
  }
})
const section = computed(() => sectionId.value ? data.sections[sectionId.value] : undefined)

const groups = computed<{ label: string, hits: Hit[] }[]>(() => {
  const inSection = sectionId.value
  if (!q.value.trim()) {
    const recs = lastAdded(data.liveRecords.filter(r => !inSection || data.pages[r.pageId]?.sectionId === inSection))
    return [{ label: 'Недавние записи', hits: recs.map(rec => ({ kind: 'record' as const, rec })) }]
  }
  const hits = search(q.value, data.livePages.filter(p => p.kind !== 'today'), data.liveRecords, { titlesOnly: false, sectionId: inSection })
  return [
    { label: 'Страницы', hits: hits.filter(h => h.kind === 'page') },
    { label: 'Записи', hits: hits.filter(h => h.kind === 'record') }
  ].filter(g => g.hits.length)
})
const flat = computed(() => groups.value.flatMap(g => g.hits))
watch(flat, () => {
  active.value = 0
})
const current = computed(() => flat.value[active.value])
const none = computed(() => !!q.value.trim() && !flat.value.length)

const targetOf = (h: Hit): Target => h.kind === 'page' ? { kind: 'page', id: h.page.id } : { kind: 'record', id: h.rec.id }

/**
 * Opens a result and keeps Поиск one step back with its query and section: a page or record pushes its screen
 * (which says «‹ Поиск»); on a phone a preview opens over Поиск and closes onto it; on desktop the panel takes
 * the dialog's place, and closing the panel brings the dialog back
 */
async function go(h: Hit, how: 'peek' | 'full') {
  const t = targetOf(h)
  const { find: _f, in: _i, peek: _p, ...rest } = route.query
  const kept = { ...rest, find: q.value.trim() || null, ...(sectionId.value ? { in: sectionId.value } : {}) }
  await router.replace({ query: kept })
  if (how === 'full') await router.push(pathOf(t))
  else await router.push({ query: { ...(isDesktop.value ? rest : kept), peek: encodeTarget(t) } })
}

/** A page opens full (Поиск closes), a record opens the preview on a phone */
function pick(h: Hit) {
  void go(h, isDesktop.value || h.kind === 'page' ? 'full' : 'peek')
}

/** Esc on the phone screen closes Поиск, unless a record's sheet is over it: then the sheet closes alone */
function closeScreen() {
  if (!route.query.peek) open.value = false
}

/** «Записать «гараж»»: Поиск closes onto Главная, whose composer sends the words like any send */
function write() {
  const t = q.value.trim()
  if (!t) return
  ui.outbox = t
  void router.replace('/')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(flat.value.length - 1, active.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(0, active.value - 1)
  } else if (e.key === 'Enter' && current.value) {
    e.preventDefault()
    void go(current.value, e.metaKey || e.ctrlKey ? 'peek' : 'full')
  }
}

const parts = (text: string) => splitMatch(text, q.value.trim())
const indexOf = (h: Hit) => flat.value.indexOf(h)
</script>

<template>
  <UModal
    v-if="isDesktop"
    v-model:open="open"
    title="Поиск"
    :ui="{ content: 'max-w-220 top-[10dvh] translate-y-0 sm:max-w-220', overlay: 'bg-scrim' }"
  >
    <template #content>
      <div
        class="flex h-[min(38rem,80dvh)] flex-col"
        @keydown="onKey"
      >
        <div class="shrink-0 px-4 pt-3.5 pb-3">
          <label class="flex h-11 items-center gap-2.5 rounded-chip bg-trk pl-3 text-toned">
            <UIcon
              name="i-lucide-search"
              class="size-4.5 shrink-0"
            />
            <input
              ref="input"
              v-model="q"
              class="h-11 min-w-0 flex-1 bg-transparent text-17 text-highlighted outline-none placeholder:text-dimmed"
              placeholder="Найти"
              aria-label="Найти"
              role="combobox"
              aria-expanded="true"
              aria-controls="find-list"
            >
            <button
              type="button"
              class="flex size-11 shrink-0 cursor-pointer items-center justify-center hover:text-highlighted"
              :aria-label="q ? 'Стереть' : 'Закрыть'"
              @click="q ? (q = '') : (open = false)"
            >
              <UIcon
                name="i-lucide-x"
                class="size-4.5"
              />
            </button>
          </label>
        </div>
        <div class="flex shrink-0 gap-2 border-b border-default px-4 pb-3">
          <USelect
            v-model="sectionValue"
            :items="sections"
            :icon="section ? 'i-lucide-check' : undefined"
            class="min-w-40"
            :class="section ? 'bg-accent-soft text-accent-ink ring-accent' : ''"
            :ui="{ leadingIcon: 'text-accent-ink', trailingIcon: section ? 'text-accent-ink' : '' }"
          >
            <template #default>
              {{ section ? `Секция «${section.name}»` : 'Все секции' }}
            </template>
          </USelect>
        </div>
        <div class="flex min-h-0 flex-1">
          <ul
            id="find-list"
            role="listbox"
            class="min-h-0 overflow-y-auto p-2"
            :class="none ? 'flex-1' : 'w-3/5 shrink-0 border-r border-default'"
            aria-label="Найденное"
          >
            <template
              v-for="g in groups"
              :key="g.label"
            >
              <li
                class="px-2.5 pt-2.5 pb-1 text-cap text-toned"
                role="presentation"
              >
                {{ g.label }}
              </li>
              <li
                v-for="h in g.hits"
                :key="h.kind + (h.kind === 'page' ? h.page.id : h.rec.id)"
                role="option"
                :aria-selected="indexOf(h) === active"
                class="flex min-h-11 cursor-pointer items-center gap-3 rounded-chip px-3"
                :class="indexOf(h) === active ? 'bg-elevated' : 'hover:bg-muted'"
                @mouseenter="active = indexOf(h)"
                @click="pick(h)"
              >
                <template v-if="h.kind === 'page'">
                  <span class="flex size-4.5 shrink-0 items-center justify-center">
                    <PageTile :glyph="h.page.glyph" />
                  </span>
                  <span class="flex min-w-0 flex-1 flex-col py-1">
                    <span
                      class="truncate text-sm font-medium"
                      :class="q.trim() ? 'text-toned' : 'text-highlighted'"
                    >
                      <template v-if="q.trim()">{{ parts(h.page.title).pre }}<b class="font-medium text-highlighted">{{ parts(h.page.title).mid }}</b>{{ parts(h.page.title).post }}</template>
                      <template v-else>{{ h.page.title || 'Без названия' }}</template>
                    </span>
                    <span
                      v-if="pageLine(h.page)"
                      class="truncate text-13 text-toned"
                    >{{ pageLine(h.page) }}</span>
                  </span>
                </template>
                <template v-else>
                  <RecordMark
                    :rec="h.rec"
                    :page="data.pages[h.rec.pageId]"
                    size="sm"
                    area="tight"
                    class="-mx-0.5"
                    @toggle="data.toggleDone(h.rec.id)"
                  />
                  <span class="flex min-w-0 flex-1 flex-col py-1">
                    <span
                      class="truncate text-sm"
                      :class="h.rec.done ? 'text-dimmed line-through' : q.trim() ? 'text-toned' : 'text-highlighted'"
                    >
                      <template v-if="q.trim() && parts(h.rec.text).mid">{{ parts(h.rec.text).pre }}<b class="font-medium text-highlighted">{{ parts(h.rec.text).mid }}</b>{{ parts(h.rec.text).post }}</template>
                      <template v-else>{{ h.rec.text }}</template>
                    </span>
                    <span
                      v-if="recLine(h.rec)"
                      class="truncate text-13 text-toned"
                    >{{ recLine(h.rec) }}</span>
                  </span>
                </template>
                <UKbd
                  v-if="indexOf(h) === active"
                  value="enter"
                />
              </li>
            </template>
            <li
              v-if="none"
              class="px-2.5 pt-4"
              role="presentation"
            >
              <p class="text-15 text-highlighted">
                Ничего не нашлось
              </p>
              <p class="mt-1 max-w-105 text-sm text-toned">
                {{ section ? `Сейчас поиск только в секции «${section.name}». Выбери «Все секции», чтобы искать везде.` : 'Попробуй другое слово или начало слова.' }}
              </p>
              <div class="-mx-2.5 mt-2 flex flex-wrap gap-1">
                <button
                  v-if="section"
                  type="button"
                  class="h-8 cursor-pointer whitespace-nowrap rounded-chip px-2.5 text-sm font-medium text-accent-ink hover:bg-muted"
                  @click="sectionId = null"
                >
                  Искать везде
                </button>
                <button
                  type="button"
                  class="h-8 min-w-0 cursor-pointer truncate rounded-chip px-2.5 text-sm font-medium text-accent-ink hover:bg-muted"
                  @click="write"
                >
                  Записать «{{ q.trim() }}»
                </button>
              </div>
            </li>
            <li
              v-else-if="!flat.length"
              class="px-2.5 py-6 text-meta text-toned"
            >
              Пока нет записей
            </li>
          </ul>
          <!-- Nothing found: no preview pane, the list takes the width -->
          <div
            v-if="!none"
            class="min-h-0 flex-1 overflow-y-auto py-4"
          >
            <template v-if="current">
              <div class="flex items-center px-4 pb-2">
                <span class="flex-1 text-cap text-toned">{{ current.kind === 'page' ? 'Страница' : 'Запись' }}</span>
                <UButton @click="go(current, 'full')">
                  Открыть
                </UButton>
              </div>
              <PageView
                v-if="current.kind === 'page'"
                :key="current.page.id"
                :page="current.page"
                container="glance"
              />
              <RecordView
                v-else
                :key="current.rec.id"
                :rec="current.rec"
                container="preview"
              />
            </template>
          </div>
        </div>
        <footer class="flex shrink-0 items-center gap-4 border-t border-default px-4 py-2.5 text-13 text-toned">
          <span class="flex items-center gap-1.5"><UKbd value="↑" /><UKbd
            value="↓"
            class="-ml-1"
          />выбрать</span>
          <span class="flex items-center gap-1.5"><UKbd value="enter" />открыть</span>
          <span class="flex items-center gap-1.5"><UKbd value="ctrl" /><UKbd
            value="enter"
            class="-ml-1"
          />открыть справа</span>
          <span class="flex items-center gap-1.5"><UKbd value="Esc" />закрыть</span>
        </footer>
      </div>
    </template>
  </UModal>

  <FindScreen
    v-else-if="open"
    v-model:q="q"
    v-model:section="sectionId"
    :groups="groups"
    :restored="restored"
    @close="closeScreen"
    @pick="pick"
    @write="write"
  />
</template>
