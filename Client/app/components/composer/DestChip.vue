<script setup lang="ts">
// The composer's «Куда» button: where the text goes, or what Авто decides while typing
import type { Glyph, PageColor } from '~/domain/types'
import PageTile from '../common/PageTile.vue'

defineProps<{ label: string, glyph?: Glyph | null, color?: PageColor, icon?: string, active?: boolean }>()
</script>

<template>
  <button
    type="button"
    class="hit-44 relative flex h-9 max-w-44 shrink-0 cursor-pointer items-center gap-1.5 rounded-chip bg-elevated pr-1.5 pl-2 text-sm font-medium text-default hover:bg-accented aria-expanded:bg-accented lg:h-8"
    :aria-label="`Куда: ${label}`"
  >
    <PageTile
      v-if="!icon"
      :glyph="glyph"
      :color="color"
      :size="18"
    />
    <UIcon
      v-else
      :name="icon"
      class="size-4.5 shrink-0"
      :class="active ? 'text-accent' : 'text-toned'"
    />
    <span class="truncate">{{ label }}</span>
    <UIcon
      name="i-lucide-chevron-down"
      class="size-4 shrink-0 text-toned"
    />
  </button>
</template>
