<script setup lang="ts">
import type { User } from '~/types'

interface Props {
  users: (User | undefined)[]
  maxVisible?: number
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 3,
  size: 'sm'
})

const visible = computed(() =>
  (props.users.filter(Boolean) as User[]).slice(0, props.maxVisible)
)

const remaining = computed(() =>
  props.users.filter(Boolean).length - props.maxVisible
)

const sizeClasses = computed(() =>
  props.size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
)
</script>

<template>
  <div class="flex items-center -space-x-2">
    <div
      v-for="user in visible"
      :key="user.id"
      class="flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-gray-900"
      :class="sizeClasses"
      :style="{ backgroundColor: user.color }"
    >
      {{ user.initials }}
    </div>
    <div
      v-if="remaining > 0"
      class="flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900 font-medium"
      :class="sizeClasses"
    >
      +{{ remaining }}
    </div>
  </div>
</template>
