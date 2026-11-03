<script setup lang="ts">
import type { Glyph, Page } from '~/domain/types'
import type { CardLine } from '~/domain/summary'
import { pageColor } from '~/domain/look'
import PageTile from '../common/PageTile.vue'
import CountBadge from '../common/CountBadge.vue'

defineProps<{
  page?: Page
  glyph: Glyph | null
  name: string
  card: CardLine
  compact?: boolean
  late: { text: string, tone: 'warn' } | null
  side: boolean
  freshGlyph: boolean
  fading: boolean
}>()
</script>

<template>
  <span
    v-if="!compact"
    class="flex size-6 shrink-0 items-center justify-center"
    data-home-glyph
  >
    <PageTile
      :glyph="glyph"
      :color="pageColor(page)"
      :size="22"
      tint
      :accent="side && freshGlyph"
      :class="{ 'transition-colors duration-1000': side && fading }"
    />
  </span>
  <span
    v-else
    class="relative flex size-4.5 shrink-0 items-center justify-center"
  >
    <PageTile
      :glyph="glyph"
      :color="pageColor(page)"
      tint
      :accent="side && freshGlyph"
      :class="{ 'transition-colors duration-1000': side && fading }"
    />
    <span
      v-if="late"
      class="absolute -top-0.5 -right-0.75 size-2 rounded-full bg-warn ring-2"
      :class="side ? 'ring-side' : 'ring-canvas'"
      role="img"
      :aria-label="late.text"
    />
  </span>
  <span class="flex min-w-0 flex-1 flex-col gap-px">
    <span class="flex min-w-0 items-center gap-1.5">
      <span
        class="min-w-0 truncate text-base leading-5.5 font-medium text-highlighted"
        :class="{ 'text-dimmed': page && !page.title }"
        data-name
      >{{ name }}</span>
      <template v-if="!compact">
        <CountBadge
          v-if="late"
          :badge="late"
        />
        <span
          v-else-if="card.open"
          class="shrink-0 text-15 leading-5 text-dimmed tabular-nums"
          data-open
        ><span class="sr-only">открытых: </span>{{ card.open }}</span>
      </template>
    </span>
    <span
      v-if="!compact && card.line"
      class="min-w-0 truncate text-sm leading-4.75 text-toned"
      data-line
    >{{ card.line }}</span>
  </span>
</template>
