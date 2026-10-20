<script setup lang="ts">
// While Авто decides: «Разбирается…» and two skeleton lines
defineProps<{ float?: boolean }>()
</script>

<template>
  <div
    class="overflow-hidden rounded-card"
    :class="float ? 'raised bg-default shadow-float dark:ring dark:ring-inset dark:ring-line2' : 'bg-card'"
    role="status"
  >
    <div class="flex min-h-11 items-center gap-2 px-3 text-meta text-toned">
      <UIcon
        name="cer:auto"
        class="size-3.5"
      />Разбирается…
    </div>
    <div
      v-for="w in ['w-40', 'w-28']"
      :key="w"
      class="flex min-h-11 items-center gap-3 px-3"
    >
      <USkeleton class="size-3.5" />
      <USkeleton
        class="h-2.5"
        :class="w"
      />
    </div>
  </div>
</template>
