<script setup lang="ts">
// 36px chip with a 44px hit area, radius 8, no border: page choices in Уточнение, filters.
// Fill is `chip` (`chip-elev` inside a raised surface); selected = accent-soft with an accent edge.
import type { Glyph, PageColor } from '~/domain/types'
import PageTile from './PageTile.vue'

defineProps<{
  label: string
  glyph?: Glyph | null
  color?: PageColor | null
  icon?: string
  selected?: boolean
  /** Toggle chips show a check when on */
  toggle?: boolean
}>()
</script>

<template>
  <button
    type="button"
    class="hit-44 relative inline-flex h-9 min-w-0 shrink-0 cursor-pointer items-center gap-1.75 whitespace-nowrap rounded-item pr-3 text-sm transition-colors"
    :class="[
      glyph !== undefined || icon ? 'pl-2.5' : 'pl-3',
      selected ? 'bg-accent-soft text-accent-ink ring ring-inset ring-accent' : 'bg-btn text-highlighted hover:bg-btn-pressed active:bg-btn-pressed aria-expanded:bg-btn-pressed'
    ]"
    :aria-pressed="toggle ? !!selected : undefined"
  >
    <PageTile
      v-if="glyph !== undefined"
      :glyph="glyph"
      :color="color"
      :size="14"
    />
    <UIcon
      v-else-if="icon"
      :name="icon"
      class="size-3.5 shrink-0"
      :class="selected ? '' : 'text-toned'"
    />
    <span class="truncate">{{ label }}</span>
    <UIcon
      v-if="toggle && selected"
      name="i-lucide-check"
      class="size-4 shrink-0"
    />
  </button>
</template>
