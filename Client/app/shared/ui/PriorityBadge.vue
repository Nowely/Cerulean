<script setup lang="ts">
import type { TaskPriority } from '~/shared/types'
import { PRIORITY_CONFIG } from '~/shared/lib'
import { getPriorityColor } from '~/shared/utils'

interface Props {
  priority: TaskPriority
  showLabel?: boolean
}

withDefaults(defineProps<Props>(), {
  showLabel: true
})

const PRIORITY_ICONS: Record<TaskPriority, string> = {
  low: 'i-lucide-arrow-down',
  medium: 'i-lucide-arrow-right',
  high: 'i-lucide-arrow-up',
  urgent: 'i-lucide-alert-triangle'
}
</script>

<template>
  <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
    <UIcon
      :name="PRIORITY_ICONS[priority]"
      class="h-3 w-3"
      :style="{ color: getPriorityColor(priority) }"
    />
    <span v-if="showLabel">{{ PRIORITY_CONFIG[priority]?.label ?? priority }}</span>
  </span>
</template>
