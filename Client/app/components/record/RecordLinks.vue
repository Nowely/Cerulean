<script setup lang="ts">
// «Связано»: records and pages linked to a record, whichever side made the link.
// A link opens in the preview, like every link to another context.
import { computed } from 'vue'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { usePeek } from '~/composables/usePeek'
import { pageSubline } from '~/domain/summary'
import PageTile from '../common/PageTile.vue'
import RecordLine from './RecordLine.vue'

const props = defineProps<{ rec: Rec }>()
const data = useDataStore()
const now = useNow()
const peek = usePeek()

const links = computed(() => data.linksOf(props.rec.id))
const subline = (page: Page) => pageSubline(page, data.recordsOf(page.id), now.value, data.liveRecords)
</script>

<template>
  <ul>
    <li
      v-for="l in links"
      :key="l.kind === 'page' ? l.page.id : l.rec.id"
    >
      <button
        v-if="l.kind === 'page'"
        type="button"
        class="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-item px-2.5 text-left hover:bg-muted"
        @click="peek.peek({ kind: 'page', id: l.page.id })"
      >
        <PageTile
          :glyph="l.page.glyph"
          :color="l.page.color"
        />
        <span class="flex min-w-0 flex-1 flex-col py-1">
          <span class="truncate text-15 text-highlighted">{{ l.page.title || 'Без названия' }}</span>
          <span
            v-if="subline(l.page)"
            class="truncate text-caption text-toned"
          >{{ subline(l.page) }}</span>
        </span>
      </button>
      <RecordLine
        v-else
        :rec="l.rec"
        density="list"
        @open="peek.peek({ kind: 'record', id: l.rec.id })"
      />
    </li>
  </ul>
</template>
