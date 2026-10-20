<script setup lang="ts">
// Top of a pushed screen on a phone (a page, a record, Чат, Настройки, Корзина): «‹ Главная» and the
// screen's actions on the right. There are no tabs: every screen is reached from Главная.
defineProps<{ to: string, label: string }>()
</script>

<template>
  <header class="flex h-13 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
    <NuxtLink
      :to="to"
      class="flex h-11 min-w-0 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink active:bg-pressed"
    >
      <UIcon
        name="i-lucide-chevron-left"
        class="size-6 shrink-0"
      /><span class="truncate">{{ label }}</span>
    </NuxtLink>
    <span class="flex-1" />
    <slot />
  </header>
</template>
