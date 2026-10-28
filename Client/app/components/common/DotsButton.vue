<script setup lang="ts">
// «⋯» on Главная: one component for the header, captions and rows. 18px glyph, 44px hit area;
// faint beside captions and rows (muted in the header), ink on hover or while its menu is open. A computer names it on
// hover (computer delta, item 20).
import { useScreen } from '~/composables/useScreen'

withDefaults(defineProps<{ label: string, tone?: 'faint' | 'muted' }>(), { tone: 'faint' })
const { isDesktop } = useScreen()
</script>

<template>
  <button
    type="button"
    class="hit-44 relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-item hover:text-highlighted active:bg-pressed lg:aria-expanded:text-highlighted"
    :class="tone === 'faint' ? 'text-dimmed' : 'text-toned'"
    :aria-label="label"
    :title="isDesktop ? label : undefined"
  >
    <UIcon
      name="i-lucide-ellipsis"
      class="size-4.5"
    />
  </button>
</template>
