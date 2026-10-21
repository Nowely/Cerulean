<script setup lang="ts">
// «Изменить порядок» from a section's «⋯»: the sections in their order, each moves one step up or down.
// The section it was opened from is marked.
import type { Id } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

defineProps<{ current: Id }>()
const open = defineModel<boolean>('open', { default: false })
const data = useDataStore()
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Порядок секций"
    dialog
  >
    <ol class="flex flex-col pb-2">
      <li
        v-for="(s, i) in data.sectionList"
        :key="s.id"
        class="flex min-h-12 items-center gap-1 rounded-chip pr-1 pl-3 lg:min-h-10"
        :class="s.id === current ? 'bg-sel' : ''"
      >
        <span class="min-w-0 flex-1 truncate text-base text-highlighted lg:text-15">{{ s.name }}</span>
        <UButton
          icon="i-lucide-arrow-up"
          variant="ghost"
          square
          :disabled="i === 0"
          :aria-label="`Выше: ${s.name}`"
          @click="data.moveSection(s.id, -1)"
        />
        <UButton
          icon="i-lucide-arrow-down"
          variant="ghost"
          square
          :disabled="i === data.sectionList.length - 1"
          :aria-label="`Ниже: ${s.name}`"
          @click="data.moveSection(s.id, 1)"
        />
      </li>
    </ol>
  </AdaptiveOverlay>
</template>
