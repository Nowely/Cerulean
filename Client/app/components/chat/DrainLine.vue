<script setup lang="ts">
// The 15 s undo window of a fresh receipt: a 2px accent line on the card's bottom edge that drains.
// Hover or focus pauses it; with reduced motion the line stays full and still.
defineProps<{ paused: boolean, duration: number }>()
</script>

<template>
  <div
    class="h-0.5 bg-line"
    aria-hidden="true"
  >
    <div
      class="h-full origin-left bg-accent motion-safe:animate-drain motion-reduce:animate-none"
      :style="{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }"
    />
  </div>
</template>
