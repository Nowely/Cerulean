<script setup lang="ts">
// Поиск on a phone: a full screen opened focused with the keyboard up. Finding is recessed (a trk field),
// writing is the raised pill. Without a query the six records added last; with one «Страницы» and «Записи».
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import type { Id, Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { lastAdded, search, type Hit } from '~/domain/search'
import { formatDue, isOverdue } from '~/domain/dates'
import { count, splitMatch } from '~/domain/text'
import PageTile from '../common/PageTile.vue'
import RecordMark from '../common/RecordMark.vue'
import AdaptiveOverlay from './AdaptiveOverlay.vue'

const props = defineProps<{ initial?: string }>()
const emit = defineEmits<{ close: [], pick: [hit: Hit] }>()
const data = useDataStore()
const now = useNow()
const q = ref(props.initial ?? '')
const sectionId = ref<Id | null>(null)
const where = ref(false)
const input = useTemplateRef<HTMLInputElement>('input')

onMounted(async () => {
  await nextTick()
  input.value?.focus()
})

const query = computed(() => q.value.trim())
const groups = computed<{ label: string, hits: Hit[] }[]>(() => {
  if (!query.value) {
    const recs = lastAdded(data.liveRecords.filter(r => !sectionId.value || data.pages[r.pageId]?.sectionId === sectionId.value))
    return [{ label: 'Недавние записи', hits: recs.map(rec => ({ kind: 'record' as const, rec })) }]
  }
  const hits = search(q.value, data.livePages.filter(p => p.kind !== 'today'), data.liveRecords, { titlesOnly: false, sectionId: sectionId.value })
  return [
    { label: 'Страницы', hits: hits.filter(h => h.kind === 'page') },
    { label: 'Записи', hits: hits.filter(h => h.kind === 'record') }
  ].filter(g => g.hits.length)
})
const total = computed(() => groups.value.reduce((n, g) => n + g.hits.length, 0))
const sectionLabel = computed(() => sectionId.value ? data.sections[sectionId.value]?.name ?? 'Все секции' : 'Все секции')

const sectionOf = (p: Page) => p.kind === 'inbox' ? '' : p.sectionId ? data.sections[p.sectionId]?.name ?? '' : 'Недавнее'
function recLine(r: Rec) {
  const place = data.placeOf(r).title
  const due = r.due ? `${!r.done && isOverdue(r.due, now.value) ? 'было ' : ''}${formatDue(r.due, now.value)}` : ''
  return [place ? `в ${place}` : '', due].filter(Boolean).join(' · ')
}
const parts = (text: string) => splitMatch(text, query.value)

function choose(id: Id | null) {
  sectionId.value = id
  where.value = false
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col bg-canvas pt-[env(safe-area-inset-top)]"
    role="dialog"
    aria-modal="true"
    aria-label="Поиск"
    @keydown.esc="emit('close')"
  >
    <div class="flex h-15 shrink-0 items-center gap-1 pr-1 pl-4">
      <label class="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-chip bg-trk pl-3 text-toned">
        <UIcon
          name="i-lucide-search"
          class="size-4.5 shrink-0"
        />
        <input
          ref="input"
          v-model="q"
          type="search"
          enterkeyhint="search"
          class="h-11 min-w-0 flex-1 bg-transparent text-input text-highlighted outline-none placeholder:text-dimmed"
          placeholder="Найти"
          aria-label="Найти"
        >
        <button
          v-if="q"
          type="button"
          class="flex size-11 shrink-0 cursor-pointer items-center justify-center text-toned"
          aria-label="Очистить"
          @click="q = ''; input?.focus()"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4.5"
          />
        </button>
      </label>
      <button
        type="button"
        class="h-11 shrink-0 cursor-pointer px-3 text-base text-accent-ink"
        @click="emit('close')"
      >
        Отмена
      </button>
    </div>
    <div class="flex shrink-0 flex-wrap gap-2 px-4 pb-2">
      <AdaptiveOverlay
        v-model:open="where"
        title="Где искать"
      >
        <template #trigger>
          <button
            type="button"
            class="hit-44 relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-item bg-chip pr-2.5 pl-3 text-sm text-highlighted ring ring-inset ring-default active:bg-chip-pressed dark:bg-chip-elev dark:ring-0"
            :aria-expanded="where"
          >
            {{ sectionLabel }}
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-dimmed"
            />
          </button>
        </template>
        <ul class="pb-2">
          <li
            v-for="s in [null, ...data.sectionList]"
            :key="s?.id ?? 'all'"
          >
            <button
              type="button"
              class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted active:bg-pressed"
              @click="choose(s?.id ?? null)"
            >
              <span class="min-w-0 flex-1 truncate">{{ s?.name ?? 'Все секции' }}</span>
              <UIcon
                v-if="(s?.id ?? null) === sectionId"
                name="i-lucide-check"
                class="size-4.5 text-accent"
              />
            </button>
          </li>
        </ul>
      </AdaptiveOverlay>
    </div>
    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ query ? (total ? `Найдено: ${count(total, ['результат', 'результата', 'результатов'])}` : 'Ничего не нашлось') : '' }}
    </p>
    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 pb-[max(env(safe-area-inset-bottom),1rem)] pl-2"
    >
      <section
        v-for="g in groups"
        :key="g.label"
        :aria-label="g.label"
      >
        <h2 class="px-2 pt-3 pb-1 text-xs font-medium tracking-[.02em] text-toned">
          {{ g.label }}
        </h2>
        <ul>
          <li
            v-for="h in g.hits"
            :key="h.kind === 'page' ? h.page.id : h.rec.id"
            class="flex items-center rounded-card active:bg-pressed"
          >
            <template v-if="h.kind === 'page'">
              <button
                type="button"
                class="flex min-h-13 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 text-left"
                @click="emit('pick', h)"
              >
                <span class="flex size-4.5 shrink-0 items-center justify-center">
                  <PageTile :glyph="h.page.glyph" />
                </span>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate text-base leading-5.5 font-medium text-highlighted">
                    <template v-if="query">{{ parts(h.page.title).pre }}<b class="font-medium">{{ parts(h.page.title).mid }}</b>{{ parts(h.page.title).post }}</template>
                    <template v-else>{{ h.page.title || 'Без названия' }}</template>
                  </span>
                  <span
                    v-if="sectionOf(h.page)"
                    class="truncate text-13 text-toned"
                  >в {{ sectionOf(h.page) }}</span>
                </span>
              </button>
            </template>
            <template v-else>
              <RecordMark
                :rec="h.rec"
                :page="data.pages[h.rec.pageId]"
                size="sm"
                class="-ml-1.5"
                @toggle="data.toggleDone(h.rec.id)"
              />
              <button
                type="button"
                class="flex min-w-0 flex-1 cursor-pointer flex-col justify-center pr-2 text-left"
                :class="recLine(h.rec) ? 'min-h-13' : 'min-h-9'"
                @click="emit('pick', h)"
              >
                <span
                  class="truncate text-base leading-5.5"
                  :class="h.rec.done ? 'text-dimmed line-through' : query ? 'text-toned' : 'text-highlighted'"
                >
                  <template v-if="query && parts(h.rec.text).mid">{{ parts(h.rec.text).pre }}<b class="font-medium text-highlighted">{{ parts(h.rec.text).mid }}</b>{{ parts(h.rec.text).post }}</template>
                  <template v-else>{{ h.rec.text }}</template>
                </span>
                <span
                  v-if="recLine(h.rec)"
                  class="truncate text-13 text-toned"
                >{{ recLine(h.rec) }}</span>
              </button>
            </template>
          </li>
        </ul>
      </section>
      <div
        v-if="query && !total"
        class="px-2 pt-4"
      >
        <p class="text-base text-highlighted">
          Ничего не нашлось
        </p>
        <p class="mt-1 text-sm text-toned">
          Попробуй другое слово или начало слова.
        </p>
      </div>
    </div>
  </div>
</template>
