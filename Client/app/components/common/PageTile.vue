<script setup lang="ts">
// A page's icon. Everywhere it is a bare muted glyph (18 in rows, 16 in the composer and the desktop
// sidebar, 14 in chips, receipts and record lines). Only on the page itself, next to its title and in
// its page menu, it sits on the coloured tile (`tile`: 24 or 36).
import { computed } from 'vue'
import { GLYPHS, type Glyph, type PageColor } from '~/domain/types'

const props = withDefaults(defineProps<{
  glyph: Glyph | null | undefined
  color?: PageColor | null
  size?: 14 | 16 | 18 | 24 | 36
  tile?: boolean
}>(), { color: 'gray', size: 18, tile: false })

const icon = computed(() => GLYPHS[props.glyph ?? 'doc'])
const bare = computed(() => ({ 14: 'size-3.5', 16: 'size-4', 18: 'size-4.5', 24: 'size-6', 36: 'size-9' }[props.size]))
const box = computed(() => ({ 14: 'size-3.5 rounded-tile-sm', 16: 'size-4 rounded-tile-sm', 18: 'size-4.5 rounded-tile-sm', 24: 'size-6 rounded-tile', 36: 'size-9 rounded-tile-lg' }[props.size]))
const glyphSize = computed(() => ({ 14: 'size-2.5', 16: 'size-3', 18: 'size-3', 24: 'size-3.5', 36: 'size-5' }[props.size]))
</script>

<template>
  <span
    v-if="tile"
    class="inline-flex shrink-0 items-center justify-center"
    :class="box"
    :style="{ background: `var(--b-${color ?? 'gray'})`, color: `var(--c-${color ?? 'gray'})` }"
    aria-hidden="true"
  >
    <UIcon
      :name="icon"
      :class="glyphSize"
    />
  </span>
  <UIcon
    v-else
    :name="icon"
    class="shrink-0 text-toned"
    :class="bare"
    aria-hidden="true"
  />
</template>
