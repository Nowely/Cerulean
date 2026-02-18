<script setup lang="ts">
import type { TaskStatus } from '~/shared/types'
import { STATUS_CONFIG } from '~/shared/lib'
import { getStatusColor } from '~/shared/utils'

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
</script>

<template>
  <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
    <UIcon
      :name="STATUS_ICONS[status]"
      class="h-3 w-3"
      :style="{ color: getStatusColor(status) }"
    />
    <span v-if="showLabel">{{ STATUS_CONFIG[status]?.label ?? status }}</span>
  </span>
</template>
