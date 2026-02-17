<script setup lang="ts">
import type { Message } from '~/types'
import { useAppStore } from '~/composables/useAppStore'
import { STATUS_CONFIG } from '~/utils'

interface Props {
  message: Message
}

const props = defineProps<Props>()

const { getUserById } = useAppStore()

const sender = computed(() => getUserById(props.message.senderId))

const toStatus = computed(() => props.message.metadata?.to)
const statusColor = computed(() =>
  toStatus.value ? `var(--status-${toStatus.value})` : undefined
)
const statusLabel = computed(() =>
  toStatus.value ? STATUS_CONFIG[toStatus.value as keyof typeof STATUS_CONFIG]?.label : ''
)
</script>

<template>
  <div
    v-if="message.type === 'system'"
    class="flex justify-center px-4 py-1"
  >
    <span class="rounded-full bg-gray-100/60 dark:bg-gray-800/60 px-3 py-1 text-[11px] text-gray-500">
      {{ message.content }}
    </span>
  </div>

  <div
    v-else-if="message.type === 'status-change'"
    class="flex justify-center px-4 py-1"
  >
    <div class="flex items-center gap-1.5 rounded-full bg-gray-100/60 dark:bg-gray-800/60 px-3 py-1">
      <UIcon
        name="i-lucide-arrow-right"
        class="h-3 w-3 text-gray-500"
      />
      <span class="text-[11px] text-gray-500">
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ sender?.name }}</span>
        {{ ' ' }}
        {{ message.content }}
      </span>
      <span
        v-if="statusColor"
        class="inline-block h-2 w-2 rounded-full"
        :style="{ backgroundColor: statusColor }"
      />
    </div>
  </div>

  <div
    v-else-if="message.type === 'assignment'"
    class="flex justify-center px-4 py-1"
  >
    <div class="flex items-center gap-1.5 rounded-full bg-gray-100/60 dark:bg-gray-800/60 px-3 py-1">
      <UIcon
        name="i-lucide-user-plus"
        class="h-3 w-3 text-primary-500"
      />
      <span class="text-[11px] text-gray-500">
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ sender?.name }}</span>
        {{ ' ' }}
        {{ message.content }}
      </span>
    </div>
  </div>
</template>
