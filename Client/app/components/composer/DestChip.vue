<script setup lang="ts">
// The composer's «Куда» button: no plate, at most 164px, in accent-ink. The destination's glyph comes first:
// Авто's fork, or the page's own glyph («Задачи» with its checkbox), so a glance tells where a send goes.
// «Эта страница ⌄» on a new untitled page.
defineProps<{ label: string, icon: string }>()
</script>

<template>
  <button
    type="button"
    class="hit-44 relative flex h-9 max-w-41 shrink-0 cursor-pointer items-center gap-1 rounded-full pr-1.5 pl-2.75 text-15 font-medium text-accent-ink hover:bg-btn active:bg-btn-pressed aria-expanded:bg-btn-pressed"
  >
    <UIcon
      :name="icon"
      class="-ml-0.5 size-4 shrink-0"
    />
    <span class="truncate">{{ label }}</span>
    <UIcon
      name="i-lucide-chevron-down"
      class="size-3.25 shrink-0 text-dimmed"
    />
  </button>
</template>
