<script setup lang="ts">
import type { MessageBlock } from '~/shared/types'
import { useUserStore } from '~/shared/model'
import { getStatusColor } from '~/shared/utils'

interface Props {
  message: MessageBlock
}

const props = defineProps<Props>()

const userStore = useUserStore()

const sender = computed(() => userStore.getUserById(props.message.data.senderId))

const toStatus = computed(() => props.message.data.metadata?.to)
const statusColor = computed(() =>
  toStatus.value ? getStatusColor(toStatus.value) : undefined
)
</script>

<template>
  <UBadge
    color="neutral"
    variant="subtle"
    class="mx-auto my-2 flex justify-center rounded-full px-3 py-0.5 text-xs"
  >
    <template v-if="message.data.type === 'status-change'">
      <UIcon
        name="i-lucide-arrow-right"
        class="size-3 mr-1"
      />
      <span class="font-medium text-default">{{ sender?.name }}</span>
      {{ ' ' }}{{ message.data.content }}
      <span
        v-if="statusColor"
        class="ml-1 size-2 rounded-full"
        :style="{ backgroundColor: statusColor }"
      />
    </template>
    <template v-else-if="message.data.type === 'assignment'">
      <UIcon
        name="i-lucide-user-plus"
        class="size-3 mr-1 text-primary-500"
      />
      <span class="font-medium text-default">{{ sender?.name }}</span>
      {{ ' ' }}{{ message.data.content }}
    </template>
    <template v-else>
      {{ message.data.content }}
    </template>
  </UBadge>
</template>
