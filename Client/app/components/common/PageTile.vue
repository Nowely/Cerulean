<script setup lang="ts">
// The square icon of a page or a record with its own page: 18 in chips and lines, 24 in rows, 36 in titles
import { computed } from 'vue'
import { GLYPHS, type Glyph, type PageColor } from '~/domain/types'

const props = withDefaults(defineProps<{
  glyph: Glyph | null | undefined
  color?: PageColor | null
  size?: 18 | 24 | 36
}>(), { color: 'gray', size: 24 })

const icon = computed(() => GLYPHS[props.glyph ?? 'doc'])
const box = computed(() => ({ 18: 'size-4.5 rounded-tile-sm', 24: 'size-6 rounded-tile', 36: 'size-9 rounded-tile-lg' }[props.size]))
const glyphSize = computed(() => ({ 18: 'size-3', 24: 'size-3.5', 36: 'size-5' }[props.size]))
</script>

<template>
  <span
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
</template>
