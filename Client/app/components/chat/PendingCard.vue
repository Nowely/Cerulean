<script setup lang="ts">
// While Авто decides: «Разбирается…» and two skeleton lines
defineProps<{ float?: boolean }>()
</script>

<template>
  <div
    class="overflow-hidden rounded-card border border-default bg-default"
    :class="{ 'shadow-float': float }"
    role="status"
  >
    <div class="flex min-h-11 items-center gap-2 px-3 text-meta text-toned">
      <UIcon
        name="cer:auto"
        class="size-4"
      />Разбирается…
    </div>
    <div
      v-for="w in ['w-40', 'w-28']"
      :key="w"
      class="flex min-h-11 items-center gap-3 border-t border-default px-3"
    >
      <USkeleton class="size-3.5" />
      <USkeleton
        class="h-2.5"
        :class="w"
      />
    </div>
  </div>
</template>
