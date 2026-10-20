<script setup lang="ts">
// Избранное on a phone: two cards side by side, the summary may take two lines
import { computed } from 'vue'
import type { Page, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { pageBadge, pageSummary, recordBadge, recordSummary, summaryText } from '~/domain/summary'
import PageTile from '../common/PageTile.vue'
import CountBadge from '../common/CountBadge.vue'

const props = defineProps<{ page?: Page, rec?: Rec }>()
const data = useDataStore()
const now = useNow()

const to = computed(() => props.page ? `/p/${props.page.id}` : `/r/${props.rec!.id}`)
const name = computed(() => props.page ? props.page.title || 'Без названия' : props.rec!.text)
const tile = computed(() => props.page
  ? { glyph: props.page.glyph, color: props.page.color }
  : { glyph: props.rec!.glyph ?? 'doc', color: props.rec!.color ?? data.pages[props.rec!.pageId]?.color })
const summary = computed(() => summaryText(props.page
  ? pageSummary(props.page, data.recordsOf(props.page.id), now.value, data.liveRecords)
  : recordSummary(data.subitemsOf(props.rec!.id), now.value)))
const badge = computed(() => props.page
  ? pageBadge(props.page, data.recordsOf(props.page.id), now.value, data.liveRecords)
  : recordBadge(data.subitemsOf(props.rec!.id), now.value))
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex min-w-0 flex-col items-start gap-1.5 rounded-card border border-default bg-default p-3 text-left active:bg-pressed"
  >
    <span class="flex min-h-6 w-full items-center justify-between gap-2">
      <PageTile
        :glyph="tile.glyph"
        :color="tile.color"
      />
      <CountBadge
        v-if="badge"
        :badge="badge"
      />
    </span>
    <span class="line-clamp-2 text-base font-semibold leading-tight text-highlighted">{{ name }}</span>
    <span class="line-clamp-3 text-13 text-toned">{{ summary }}</span>
  </NuxtLink>
</template>
