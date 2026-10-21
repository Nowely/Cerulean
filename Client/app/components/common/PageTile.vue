<script setup lang="ts">
// A page's icon. Everywhere it is a bare glyph (18 in rows, 16 in the composer and the desktop sidebar, 14 in chips,
// receipts and record lines), muted. A chosen colour (v23, «Без цвета» until one is chosen) tints it only where a
// page is picked or listed as itself (`tint`: Главная, the sidebar, the page picker, the composer chip). On the page
// itself, next to its title and in its page menu, it sits on its tile (`tile`: 24, or `page` next to a page title:
// 30 on a phone, 36 on desktop): the colour's fill and glyph, or the neutral grey fill with a muted glyph.
import { computed } from 'vue'
import { GLYPHS, type Glyph, type PageColor } from '~/domain/types'

const props = withDefaults(defineProps<{
  glyph: Glyph | null | undefined
  /** The page's chosen colour (`pageColor`), null for «Без цвета» */
  color?: PageColor | null
  size?: 14 | 16 | 18 | 24 | 36 | 'page'
  tile?: boolean
  tint?: boolean
}>(), { color: null, size: 18, tile: false, tint: false })

const icon = computed(() => GLYPHS[props.glyph ?? 'doc'] ?? GLYPHS.doc)
const bare = computed(() => ({ 14: 'size-3.5', 16: 'size-4', 18: 'size-4.5', 24: 'size-6', 36: 'size-9', page: 'size-7.5 lg:size-9' }[props.size]))
const box = computed(() => ({ 14: 'size-3.5 rounded-tile-sm', 16: 'size-4 rounded-tile-sm', 18: 'size-4.5 rounded-tile-sm', 24: 'size-6 rounded-tile', 36: 'size-9 rounded-tile-lg', page: 'size-7.5 rounded-tile-md lg:size-9 lg:rounded-tile-lg' }[props.size]))
const glyphSize = computed(() => ({ 14: 'size-2.5', 16: 'size-3', 18: 'size-3', 24: 'size-3.5', 36: 'size-5', page: 'size-4.5 lg:size-5' }[props.size]))
const ink = computed(() => props.color ? `var(--c-${props.color})` : undefined)
</script>

<template>
  <span
    v-if="tile"
    class="inline-flex shrink-0 items-center justify-center"
    :class="[box, color ? '' : 'text-toned']"
    :style="{ background: `var(--b-${color ?? 'gray'})`, color: ink }"
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
    class="shrink-0"
    :class="[bare, tint && color ? '' : 'text-toned']"
    :style="tint && color ? { color: ink } : undefined"
    aria-hidden="true"
  />
</template>
