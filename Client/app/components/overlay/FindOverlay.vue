<script setup lang="ts">
// Поиск. A full screen on a phone; on desktop a Ctrl K dialog with the found item previewed on the right.
// Both use the same rows: without a query the six records added last, with one «Страницы» then «Записи».
// A result opens as a preview (it is a link, not navigation); «Открыть» or ↵ opens it full.
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
/** The text Поиск opens with on a phone */
const initial = ref('')
const titlesOnly = ref(false)
const sectionId = ref<Id | 'all'>('all')
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
  q.value = ui.findQuery
  initial.value = ui.findQuery
  ui.findQuery = ''
  active.value = 0
  await nextTick()
  input.value?.focus()
})

const sections = computed(() => [
  { label: 'Все секции', value: 'all' },
  ...data.sectionList.map(s => ({ label: s.name, value: s.id }))
])

const groups = computed<{ label: string, hits: Hit[] }[]>(() => {
  const inSection = sectionId.value === 'all' ? null : sectionId.value
  if (!q.value.trim()) {
    const recs = lastAdded(data.liveRecords.filter(r => !inSection || data.pages[r.pageId]?.sectionId === inSection))
    return [{ label: 'Недавние записи', hits: recs.map(rec => ({ kind: 'record' as const, rec })) }]
  }
  const hits = search(q.value, data.livePages.filter(p => p.kind !== 'today'), data.liveRecords, { titlesOnly: titlesOnly.value, sectionId: sectionId.value === 'all' ? null : sectionId.value })
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

const targetOf = (h: Hit): Target => h.kind === 'page' ? { kind: 'page', id: h.page.id } : { kind: 'record', id: h.rec.id }

/** Leaves Поиск in one history step, so back returns to where it was opened */
function go(h: Hit, how: 'peek' | 'full') {
  const { find: _, peek: __, ...query } = route.query
  const t = targetOf(h)
  if (how === 'full') void router.replace(pathOf(t))
  else void router.replace({ query: { ...query, peek: encodeTarget(t) } })
}

/** A page opens full (Поиск closes), a record opens the preview on a phone */
function pick(h: Hit) {
  go(h, isDesktop.value || h.kind === 'page' ? 'full' : 'peek')
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
    go(current.value, e.metaKey || e.ctrlKey ? 'peek' : 'full')
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
        <div class="shrink-0 px-3 pt-3 pb-2">
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
        <div class="flex shrink-0 gap-2 border-b border-default px-3 pb-3">
          <UButton
            :aria-pressed="titlesOnly"
            size="md"
            @click="titlesOnly = !titlesOnly"
          >
            Только названия
          </UButton>
          <USelect
            v-model="sectionId"
            :items="sections"
            class="w-40"
          />
        </div>
        <div class="flex min-h-0 flex-1">
          <ul
            id="find-list"
            role="listbox"
            class="min-h-0 w-3/5 shrink-0 overflow-y-auto border-r border-default p-2"
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
              v-if="!flat.length"
              class="px-2.5 py-6 text-meta text-toned"
            >
              {{ q ? 'Ничего не нашлось' : 'Пока нет записей' }}
            </li>
          </ul>
          <div class="min-h-0 flex-1 overflow-y-auto py-4">
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
    :initial="initial"
    @close="open = false"
    @pick="pick"
  />
</template>
