<script setup lang="ts">
// The composer's «Куда» button: no plate. «⑂ Авто ⌄» in accent-ink, «⑂ → Продукты» while typing (box),
// «[glyph] Продукты ⌄» on a page. Slim (Главная): «Авто ⌄» without the glyph, at most 144px.
import type { Glyph } from '~/domain/types'
import PageTile from '../common/PageTile.vue'

defineProps<{ label: string, glyph?: Glyph | null, auto?: boolean, arrow?: boolean, slim?: boolean }>()
</script>

<template>
  <button
    type="button"
    class="hit-44 relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-item text-15 font-medium hover:bg-btn active:bg-btn-pressed aria-expanded:bg-btn-pressed"
    :class="[slim ? 'max-w-36 pr-1.5 pl-3' : 'max-w-44 pr-1.5 pl-2', auto ? 'text-accent-ink' : 'text-highlighted']"
  >
    <template v-if="!slim">
      <UIcon
        v-if="auto"
        name="cer:auto"
        class="size-4 shrink-0"
      />
      <PageTile
        v-else
        :glyph="glyph"
        :size="16"
      />
    </template>
    <UIcon
      v-if="arrow"
      name="i-lucide-arrow-right"
      class="-mx-0.5 size-3.5 shrink-0"
    />
    <span class="truncate">{{ label }}</span>
    <UIcon
      v-if="!arrow"
      name="i-lucide-chevron-down"
      class="size-4 shrink-0 text-dimmed"
    />
  </button>
</template>
