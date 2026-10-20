<script setup lang="ts">
// 36px chip with a 44px hit area: page choices in Уточнение, templates, filters
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
    class="hit-44 relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.75 whitespace-nowrap rounded-chip border pr-3 text-sm transition-colors"
    :class="[
      glyph !== undefined || icon ? 'pl-2.25' : 'pl-3',
      selected ? 'border-accent bg-accent-soft text-accent-ink' : 'border-default bg-default text-default hover:border-accented hover:text-highlighted active:bg-pressed'
    ]"
    :aria-pressed="toggle ? !!selected : undefined"
  >
    <PageTile
      v-if="glyph !== undefined"
      :glyph="glyph"
      :color="color"
      :size="18"
    />
    <UIcon
      v-else-if="icon"
      :name="icon"
      class="size-4 shrink-0"
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
