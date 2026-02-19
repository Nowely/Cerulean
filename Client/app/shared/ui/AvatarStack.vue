<script setup lang="ts">
import type { User } from '~/shared/types'

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

const sizeMap = {
  sm: '2xs',
  md: 'xs'
} as const
</script>

<template>
  <UAvatarGroup :size="sizeMap[props.size]">
    <UAvatar
      v-for="user in visible"
      :key="user.id"
      :alt="user.name"
      :style="{ backgroundColor: user.color }"
      :ui="{
        root: 'font-semibold text-white',
        fallback: 'bg-transparent'
      }"
    >
      <template #fallback>
        {{ user.initials }}
      </template>
    </UAvatar>
    <UAvatar
      v-if="remaining > 0"
      :alt="`+${remaining} more`"
      class="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      :ui="{ fallback: 'bg-transparent' }"
    >
      <template #fallback>
        +{{ remaining }}
      </template>
    </UAvatar>
  </UAvatarGroup>
</template>
