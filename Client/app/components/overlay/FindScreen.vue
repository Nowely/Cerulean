<script setup lang="ts">
// Поиск on a phone: a full screen opened focused with the keyboard up. Finding is recessed (a trk field),
// writing is the raised pill. Without a query the six records added last; with one «Страницы» and «Записи».
// The query, the section and the results live in FindOverlay (one logic with the desktop dialog); nothing found
// offers «Записать «…»» and, with a section chosen, «Искать везде» (v22, N19).
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import type { Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useFindRows } from '~/composables/useFindRows'
import type { Hit } from '~/domain/search'
import { count, splitMatch } from '~/domain/text'
import PageTile from '../common/PageTile.vue'
import RecordMark from '../common/RecordMark.vue'
import AdaptiveOverlay from './AdaptiveOverlay.vue'

const props = defineProps<{
  groups: { label: string, hits: Hit[] }[]
  /** Back from a result: the results are on screen as they were, so the keyboard stays down */
  restored?: boolean
}>()
const emit = defineEmits<{ close: [], pick: [hit: Hit], write: [] }>()
const q = defineModel<string>('q', { required: true })
const sectionId = defineModel<Id | null>('section', { required: true })
const data = useDataStore()
const where = ref(false)
const input = useTemplateRef<HTMLInputElement>('input')

onMounted(async () => {
  await nextTick()
  if (!props.restored) input.value?.focus()
})

const query = computed(() => q.value.trim())
const total = computed(() => props.groups.reduce((n, g) => n + g.hits.length, 0))
const section = computed(() => sectionId.value ? data.sections[sectionId.value] : undefined)

const { pageLine, recLine } = useFindRows()
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
            class="hit-44 relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-item pr-2.5 pl-3 text-sm ring ring-inset"
            :class="section ? 'bg-accent-soft text-accent-ink ring-accent' : 'bg-chip text-highlighted ring-default active:bg-chip-pressed dark:bg-chip-elev dark:ring-0'"
            aria-haspopup="dialog"
            :aria-expanded="where"
          >
            {{ section ? `Секция «${section.name}»` : 'Все секции' }}
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4"
              :class="section ? '' : 'text-dimmed'"
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
        <h2 class="px-2 pt-3 pb-1 text-cap text-toned">
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
                  <!-- A found name stays whole at full ink, the match set 600 (v23, F15) -->
                  <span class="truncate text-base leading-5.5 font-medium text-highlighted">
                    <template v-if="query && parts(h.page.title).mid">{{ parts(h.page.title).pre }}<b class="font-semibold">{{ parts(h.page.title).mid }}</b>{{ parts(h.page.title).post }}</template>
                    <template v-else>{{ h.page.title || 'Без названия' }}</template>
                  </span>
                  <span
                    v-if="pageLine(h.page)"
                    class="truncate text-13 text-toned"
                  >{{ pageLine(h.page) }}</span>
                  <span
                    v-if="h.snippet"
                    class="truncate text-13 text-toned"
                  >{{ h.snippet.pre }}<b class="font-semibold text-highlighted">{{ h.snippet.mid }}</b>{{ h.snippet.post }}</span>
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
                  :class="h.rec.done ? 'text-dimmed line-through' : 'text-highlighted'"
                >
                  <template v-if="query && parts(h.rec.text).mid">{{ parts(h.rec.text).pre }}<b class="font-semibold">{{ parts(h.rec.text).mid }}</b>{{ parts(h.rec.text).post }}</template>
                  <template v-else>{{ h.rec.text }}</template>
                </span>
                <span
                  v-if="recLine(h.rec)"
                  class="truncate text-13 text-toned"
                >{{ recLine(h.rec) }}</span>
                <!-- Found in the body: a snippet from a word before the match, the match in ink 600 (v23, A7) -->
                <span
                  v-if="h.snippet"
                  class="truncate text-13 text-toned"
                >{{ h.snippet.pre }}<b class="font-semibold text-highlighted">{{ h.snippet.mid }}</b>{{ h.snippet.post }}</span>
              </button>
            </template>
          </li>
        </ul>
      </section>
      <div
        v-if="query && !total"
        class="px-2 pt-4.5"
      >
        <p class="text-15 text-highlighted">
          Ничего не нашлось
        </p>
        <p class="mt-1.5 text-sm text-toned">
          {{ section ? `Поиск идёт только в секции «${section.name}». Выбери «Все секции», чтобы искать везде.` : 'Попробуй другое слово или начало слова.' }}
        </p>
        <div class="-mx-2.5 mt-1.5 flex flex-wrap gap-x-1">
          <button
            v-if="section"
            type="button"
            class="h-11 cursor-pointer whitespace-nowrap rounded-chip px-2.5 text-base text-accent-ink active:bg-pressed"
            @click="sectionId = null"
          >
            Искать везде
          </button>
          <button
            type="button"
            class="h-11 min-w-0 cursor-pointer truncate rounded-chip px-2.5 text-base text-accent-ink active:bg-pressed"
            @click="emit('write')"
          >
            Записать «{{ query }}»
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
