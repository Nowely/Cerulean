<script setup lang="ts">
import type { TaskStatus } from '~/types'
import { STATUS_CONFIG } from '~/utils'

interface Props {
  status: TaskStatus
  showLabel?: boolean
}

withDefaults(defineProps<Props>(), {
  showLabel: true
})

const STATUS_ICONS: Record<TaskStatus, string> = {
  'todo': 'i-lucide-circle',
  'in-progress': 'i-lucide-clock',
  'review': 'i-lucide-eye',
  'done': 'i-lucide-check-circle-2',
  'blocked': 'i-lucide-ban'
}

function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    'todo': 'var(--status-todo)',
    'in-progress': 'var(--status-in-progress)',
    'review': 'var(--status-review)',
    'done': 'var(--status-done)',
    'blocked': 'var(--status-blocked)'
  }
  return colors[status]
}
</script>

<template>
  <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
    <UIcon
      :name="STATUS_ICONS[status]"
      class="h-3 w-3"
      :style="{ color: getStatusColor(status) }"
    />
    <span v-if="showLabel">{{ STATUS_CONFIG[status].label }}</span>
  </span>
</template>
