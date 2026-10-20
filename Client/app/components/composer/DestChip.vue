<script setup lang="ts">
// The composer's «Куда» button: text only, no plate, at most 144px. «Авто ⌄» in accent-ink, the page's name on
// a page, «Эта страница ⌄» on a new untitled one.
defineProps<{ label: string, auto?: boolean }>()
</script>

<template>
  <button
    type="button"
    class="hit-44 relative flex h-9 max-w-36 shrink-0 cursor-pointer items-center gap-1.5 rounded-item pr-1.5 pl-3 text-15 font-medium hover:bg-btn active:bg-btn-pressed aria-expanded:bg-btn-pressed"
    :class="auto ? 'text-accent-ink' : 'text-highlighted'"
  >
    <span class="truncate">{{ label }}</span>
    <UIcon
      name="i-lucide-chevron-down"
      class="size-4 shrink-0 text-dimmed"
    />
  </button>
</template>
