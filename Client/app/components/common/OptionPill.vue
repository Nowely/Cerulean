<script setup lang="ts">
// A «Выбор» value wherever it shows (v23, Josh 21 Oct 06:23, «Везде»): the option's fill with its ink, 22 high,
// radius 6, 13/400, no border, cut with «…». Rows, group captions, Доска chips and cards, the record page, the value
// sheet and «Переместить в колонку» draw this one pill. `ring`: a caption that is a drop target
import type { PageColor } from '~/domain/types'

defineProps<{ name: string, color: PageColor, ring?: boolean }>()
</script>

<template>
  <span
    class="inline-block h-5.5 max-w-full min-w-0 truncate rounded-opt px-2 align-middle text-13 leading-5.5 font-normal tracking-normal"
    :class="ring ? 'ring-[1.5px] ring-accent' : ''"
    :style="{ background: `var(--b-${color})`, color: `var(--c-${color}-ink)` }"
  >{{ name }}</span>
</template>
