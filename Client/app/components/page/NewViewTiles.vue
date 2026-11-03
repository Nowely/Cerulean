<script setup lang="ts">
import type { Layout } from '~/domain/types'

const emit = defineEmits<{ select: [layout: Layout] }>()
const layouts: { value: Layout, name: string, icon: string }[] = [
  { value: 'list', name: 'Список', icon: 'i-lucide-list' },
  { value: 'table', name: 'Таблица', icon: 'i-lucide-table' },
  { value: 'board', name: 'Доска', icon: 'i-lucide-columns-3' },
  { value: 'calendar', name: 'Календарь', icon: 'i-lucide-calendar-days' }
]
</script>

<template>
  <div class="grid grid-cols-4 gap-2 px-2 pt-1 pb-3">
    <button
      v-for="layout in layouts"
      :key="layout.value"
      type="button"
      class="flex h-22 min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-muted text-14 text-default hover:bg-pressed"
      @click="emit('select', layout.value)"
    >
      <UIcon
        :name="layout.icon"
        class="size-7 text-toned"
      />
      {{ layout.name }}
    </button>
  </div>
</template>
