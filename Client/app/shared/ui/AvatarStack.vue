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

const validUsers = computed(() => props.users.filter(Boolean) as User[])

const sizeMap = {
  sm: '2xs',
  md: 'xs'
} as const
</script>

<template>
  <UAvatarGroup
    :size="sizeMap[props.size]"
    :max="maxVisible"
  >
    <UAvatar
      v-for="user in validUsers"
      :key="user.id"
      :alt="user.name"
      :style="{ backgroundColor: user.color }"
      :ui="{ root: 'font-semibold text-white', fallback: 'bg-transparent' }"
    >
      <template #fallback>
        {{ user.initials }}
      </template>
    </UAvatar>
  </UAvatarGroup>
</template>
