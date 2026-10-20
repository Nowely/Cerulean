<script setup lang="ts">
// Desktop top bar of the main column: a title or the breadcrumb, actions on the right
defineProps<{ title?: string }>()
</script>

<template>
  <header class="hidden h-12 shrink-0 items-center gap-1.5 border-b border-default pr-3 pl-3.5 lg:flex">
    <div class="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-toned">
      <slot>
        <h1 class="truncate font-medium text-highlighted">
          {{ title }}
        </h1>
      </slot>
    </div>
    <slot name="actions" />
  </header>
</template>
