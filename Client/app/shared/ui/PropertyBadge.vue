<script setup lang="ts">
import type { TaskStatus, TaskPriority } from '~/shared/types'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '~/shared/lib'
import { getStatusColor, getPriorityColor } from '~/shared/utils'

type PropertyType = 'status' | 'priority'

interface Props {
  type: PropertyType
  value: TaskStatus | TaskPriority
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true
})

const ICONS: Record<PropertyType, Record<string, string>> = {
  status: {
    'todo': 'i-lucide-circle',
    'in-progress': 'i-lucide-clock',
    'review': 'i-lucide-eye',
    'done': 'i-lucide-check-circle-2',
    'blocked': 'i-lucide-ban'
  },
  priority: {
    low: 'i-lucide-arrow-down',
    medium: 'i-lucide-arrow-right',
    high: 'i-lucide-arrow-up',
    urgent: 'i-lucide-alert-triangle'
  }
}

const CONFIG: Record<PropertyType, Record<string, { label: string }>> = {
  status: STATUS_CONFIG,
  priority: PRIORITY_CONFIG
}

const label = computed(() =>
  props.showLabel ? (CONFIG[props.type][props.value]?.label ?? props.value) : undefined
)

const icon = computed(() => ICONS[props.type][props.value] ?? '')

const color = computed(() =>
  props.type === 'status'
    ? getStatusColor(props.value as TaskStatus)
    : getPriorityColor(props.value as TaskPriority)
)
</script>

<template>
  <UBadge
    color="neutral"
    variant="subtle"
    :label="label"
  >
    <template #leading>
      <UIcon
        :name="icon"
        class="h-3 w-3"
        :style="{ color }"
      />
    </template>
  </UBadge>
</template>
