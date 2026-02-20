<script setup lang="ts">
import { useDevViewport } from '~/shared/lib'

const isDev = import.meta.dev
const { mode, cycleMode } = useDevViewport()

const viewportIcon = computed(() => {
  switch (mode.value) {
    case 'mobile': return 'i-lucide-smartphone'
    case 'desktop': return 'i-lucide-monitor'
    default: return 'i-lucide-response'
  }
})

const viewportLabel = computed(() => {
  switch (mode.value) {
    case 'mobile': return 'Mobile view'
    case 'desktop': return 'Desktop view'
    default: return 'Auto view'
  }
})
</script>

<template>
  <footer class="shrink-0 border-t border-default dark:border-muted px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] min-h-14 flex items-center gap-1">
    <UColorModeButton
      color="neutral"
      variant="ghost"
      size="lg"
    />
    <UTooltip
      v-if="isDev"
      :text="viewportLabel"
    >
      <UButton
        :icon="viewportIcon"
        color="neutral"
        variant="ghost"
        size="lg"
        @click="cycleMode"
      />
    </UTooltip>
  </footer>
</template>
