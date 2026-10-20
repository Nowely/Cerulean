<script setup lang="ts">
// A page on Главная: tile, name with its badge on the same line, the summary under it at full width
import { computed } from 'vue'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { pageBadge, pageSummary, recordBadge, recordSummary, type Summary } from '~/domain/summary'
import PageTile from '../common/PageTile.vue'
import CountBadge from '../common/CountBadge.vue'

const props = defineProps<{ page?: Page, rec?: Rec, compact?: boolean }>()
const data = useDataStore()
const now = useNow()

const to = computed(() => props.page ? `/p/${props.page.id}` : `/r/${props.rec!.id}`)
const name = computed(() => props.page ? props.page.title || 'Без названия' : props.rec!.text)
const tile = computed(() => props.page
  ? { glyph: props.page.glyph, color: props.page.color }
  : { glyph: props.rec!.glyph ?? 'doc', color: props.rec!.color ?? data.pages[props.rec!.pageId]?.color })
const summary = computed<Summary>(() => props.page
  ? pageSummary(props.page, data.recordsOf(props.page.id), now.value, data.liveRecords)
  : recordSummary(data.subitemsOf(props.rec!.id), now.value))
const badge = computed(() => props.page
  ? pageBadge(props.page, data.recordsOf(props.page.id), now.value, data.liveRecords)
  : recordBadge(data.subitemsOf(props.rec!.id), now.value))
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex w-full items-center gap-3 rounded-card px-3 text-left hover:bg-muted active:bg-pressed lg:gap-3 lg:rounded-chip lg:px-2.5"
    :class="compact ? 'min-h-12 py-1 lg:min-h-10' : 'min-h-15.5 py-2 lg:min-h-14'"
  >
    <PageTile
      :glyph="tile.glyph"
      :color="tile.color"
    />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex min-w-0 items-center gap-2">
        <span
          class="min-w-0 truncate text-row text-highlighted"
          :class="{ 'font-medium!': compact, 'text-dimmed': !page?.title && page }"
        >{{ name }}</span>
        <CountBadge
          v-if="badge"
          :badge="badge"
        />
      </span>
      <span
        v-if="!compact && (summary.lead || summary.names)"
        class="flex min-w-0 text-meta text-toned"
      >
        <span
          v-if="summary.lead"
          class="shrink-0"
          :class="{ 'min-w-0 truncate': !summary.names }"
        >{{ summary.lead }}</span>
        <span
          v-if="summary.lead && summary.names"
          class="shrink-0"
        >&nbsp;·&nbsp;</span>
        <span
          v-if="summary.names"
          class="min-w-0 truncate"
        >{{ summary.names }}</span>
        <span
          v-if="summary.more"
          class="shrink-0"
        >&nbsp;+{{ summary.more }}</span>
      </span>
    </span>
  </NuxtLink>
</template>
