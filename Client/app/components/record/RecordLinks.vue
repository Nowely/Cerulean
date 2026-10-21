<script setup lang="ts">
// «Связано»: records and pages linked to a record, whichever side made the link.
// A link opens in the preview, like every link to another context.
// A mention is a link too (v23, M5, F10): line 2 starts with where the thing lives and goes on «· в тексте» on the record
// whose body holds the mention, «· «the sentence»» on the other (the quote last, taking the ellipsis).
import { computed } from 'vue'
import type { Page, Rec } from '~/domain/types'
import { useDataStore, type Related } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { usePeek } from '~/composables/usePeek'
import { pageSubline } from '~/domain/summary'
import PageTile from '../common/PageTile.vue'
import RecordLine from './RecordLine.vue'

const props = defineProps<{ rec: Rec }>()
const data = useDataStore()
const now = useNow()
const peek = usePeek()

const links = computed(() => data.relatedOf(props.rec.id))
const subline = (page: Page) => pageSubline(page, data.recordsOf(page.id), now.value, data.liveRecords)
const reason = (l: Related) => l.why === 'text' ? 'в тексте' : l.why === 'quote' && l.quote ? `«${l.quote}»` : ''
/** A page's line 2: its section and the reason, or its summary for a hand link */
function pageLine(l: Related, page: Page) {
  const why = reason(l)
  if (!why) return subline(page)
  const section = page.sectionId ? data.sections[page.sectionId]?.name : ''
  return section ? `${section} · ${why}` : why
}
</script>

<template>
  <ul>
    <li
      v-for="l in links"
      :key="l.hit.kind === 'page' ? l.hit.page.id : l.hit.rec.id"
    >
      <button
        v-if="l.hit.kind === 'page'"
        type="button"
        class="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-item px-2.5 text-left hover:bg-muted"
        @click="peek.peek({ kind: 'page', id: l.hit.page.id })"
      >
        <PageTile
          :glyph="l.hit.page.glyph"
          :color="l.hit.page.color"
        />
        <span class="flex min-w-0 flex-1 flex-col py-1">
          <span class="truncate text-15 text-highlighted">{{ l.hit.page.title || 'Без названия' }}</span>
          <span
            v-if="pageLine(l, l.hit.page)"
            class="truncate text-caption text-toned"
          >{{ pageLine(l, l.hit.page) }}</span>
        </span>
      </button>
      <RecordLine
        v-else
        :rec="l.hit.rec"
        density="list"
        :reason="reason(l)"
        @open="peek.peek({ kind: 'record', id: l.hit.rec.id })"
      />
    </li>
  </ul>
</template>
