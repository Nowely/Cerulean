<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useUserStore } from '~/shared/model'
import { getStatusColor } from '~/shared/utils'

interface Props {
  message: Message
}

const props = defineProps<Props>()

const userStore = useUserStore()

const sender = computed(() => userStore.getUserById(props.message.senderId))

const toStatus = computed(() => props.message.metadata?.to)
const statusColor = computed(() =>
  toStatus.value ? getStatusColor(toStatus.value) : undefined
)
</script>

<template>
  <div class="flex justify-center px-4 py-1">
    <UBadge
      color="neutral"
      variant="subtle"
      class="rounded-full px-3 py-1 text-[11px]"
    >
      <template v-if="message.type === 'status-change'">
        <UIcon
          name="i-lucide-arrow-right"
          class="h-3 w-3 mr-1.5"
        />
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ sender?.name }}</span>
        {{ ' ' }}{{ message.content }}
        <span
          v-if="statusColor"
          class="ml-1.5 h-2 w-2 rounded-full"
          :style="{ backgroundColor: statusColor }"
        />
      </template>
      <template v-else-if="message.type === 'assignment'">
        <UIcon
          name="i-lucide-user-plus"
          class="h-3 w-3 mr-1.5 text-primary-500"
        />
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ sender?.name }}</span>
        {{ ' ' }}{{ message.content }}
      </template>
      <template v-else>
        {{ message.content }}
      </template>
    </UBadge>
  </div>
</template>
