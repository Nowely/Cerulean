<script setup lang="ts">
// Top of Главная, Чат and Настройки on a phone: the tabs and «Найти»
import { useFind } from '~/composables/useFind'
import AppTabs from './AppTabs.vue'

const find = useFind()
</script>

<template>
  <header class="flex h-15 shrink-0 items-center gap-1.5 pt-[env(safe-area-inset-top)] pr-2 pl-3 lg:hidden">
    <AppTabs />
    <UButton
      icon="i-lucide-search"
      variant="ghost"
      square
      size="lg"
      aria-label="Найти"
      class="text-toned"
      @click="find.open()"
    />
  </header>
</template>
