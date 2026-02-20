<script setup lang="ts">
import type { User } from '~/shared/types'

interface Props {
  user?: User
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeMap = {
  sm: '2xs',
  md: 'xs',
  lg: 'sm'
} as const
</script>

<template>
  <UAvatar
    v-if="user"
    :alt="user.name"
    :size="sizeMap[props.size]"
    :ui="{
      root: 'font-semibold'
    }"
  >
    <template #fallback>
      {{ user.initials }}
    </template>
  </UAvatar>
</template>
