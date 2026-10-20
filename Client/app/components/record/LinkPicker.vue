<script setup lang="ts">
// «Связать»: find a record or a page and tick it to link it; tick again to undo.
// Nothing typed: what is linked now, then what was opened lately.
import { computed, ref, watch } from 'vue'
import type { Rec } from '~/domain/types'
import type { Hit } from '~/domain/search'
import { recent, search } from '~/domain/search'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import PageTile from '../common/PageTile.vue'

const props = defineProps<{ rec: Rec }>()
const data = useDataStore()
const now = useNow()
const open = ref(false)
const q = ref('')
const idOf = (h: Hit) => h.kind === 'page' ? h.page.id : h.rec.id
const linked = computed(() => new Set(data.linksOf(props.rec.id).map(idOf)))

// The lists hold still while open: an unticked link stays in place to be ticked back
const before = ref<Hit[]>([])
watch(open, (v) => {
  if (!v) return
  q.value = ''
  before.value = data.linksOf(props.rec.id)
})

const groups = computed(() => {
  const own = (h: Hit) => idOf(h) !== props.rec.id
  if (q.value.trim()) {
    const hits = search(q.value, data.livePages, data.liveRecords, { titlesOnly: true, sectionId: null }).filter(own).slice(0, 30)
    return hits.length ? [{ label: '', hits }] : []
  }
  const was = new Set(before.value.map(idOf))
  const lately = recent(data.livePages, data.liveRecords, now.value, 16).flatMap(g => g.hits).filter(h => own(h) && !was.has(idOf(h)))
  return [
    { label: 'Связано', hits: before.value },
    { label: 'Недавние', hits: lately }
  ].filter(g => g.hits.length)
})
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Связать"
    align="start"
  >
    <template #trigger>
      <slot />
    </template>
    <div class="px-2 pt-1">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        placeholder="Страницы и записи"
        aria-label="Найти, что связать"
        class="w-full"
        autofocus
      />
    </div>
    <ul
      class="pt-1"
      aria-label="Что связать"
    >
      <template
        v-for="g in groups"
        :key="g.label"
      >
        <li
          v-if="g.label"
          class="px-3 pt-3 pb-1 text-caption text-toned"
          role="presentation"
        >
          {{ g.label }}
        </li>
        <li
          v-for="h in g.hits"
          :key="idOf(h)"
        >
          <button
            type="button"
            class="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-chip px-3 text-left hover:bg-muted active:bg-pressed"
            :aria-pressed="linked.has(idOf(h))"
            @click="data.toggleLink(rec.id, idOf(h))"
          >
            <PageTile
              v-if="h.kind === 'page' || h.rec.glyph"
              :glyph="h.kind === 'page' ? h.page.glyph : h.rec.glyph"
              :color="h.kind === 'page' ? h.page.color : h.rec.color"
            />
            <span
              v-else
              class="flex size-6 shrink-0 items-center justify-center text-dimmed"
              aria-hidden="true"
            >
              <span class="size-1.5 rounded-full bg-current" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col py-1">
              <span class="truncate text-15 text-highlighted">{{ h.kind === 'page' ? h.page.title || 'Без названия' : h.rec.text }}</span>
              <span
                v-if="h.kind === 'record'"
                class="truncate text-caption text-toned"
              >в {{ data.placeOf(h.rec).title }}</span>
            </span>
            <UIcon
              v-if="linked.has(idOf(h))"
              name="i-lucide-check"
              class="size-4.5 shrink-0 text-accent"
            />
          </button>
        </li>
      </template>
      <li
        v-if="!groups.length"
        class="px-3 py-5 text-meta text-toned"
      >
        {{ q.trim() ? 'Ничего не нашлось' : 'Найди страницу или запись по названию' }}
      </li>
    </ul>
  </AdaptiveOverlay>
</template>
