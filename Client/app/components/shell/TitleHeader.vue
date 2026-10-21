<script setup lang="ts">
// Desktop top of Главная, Журнал and Настройки: the screen's title in the page-title role (30/600) in the
// content column, its few actions on the right. Pages keep the 48px bar (DeskHeader).
withDefaults(defineProps<{ title: string, width?: 'home' | 'chat' }>(), { width: 'home' })
</script>

<template>
  <header class="hidden h-18 shrink-0 lg:block lg:px-8">
    <div
      class="mx-auto flex h-full w-full items-center gap-1"
      :class="width === 'chat' ? 'max-w-160' : 'max-w-180'"
    >
      <h1 class="min-w-0 flex-1 truncate text-30 font-semibold tracking-[-.015em] text-highlighted">
        <slot name="title">
          {{ title }}
        </slot>
      </h1>
      <slot />
    </div>
  </header>
</template>
