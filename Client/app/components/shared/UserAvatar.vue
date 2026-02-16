<script setup lang="ts">
import type { User } from '~/types'

interface Props {
  user?: User
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-7 w-7 text-[10px]'
    case 'lg': return 'h-11 w-11 text-sm'
    default: return 'h-9 w-9 text-xs'
  }
})
</script>

<template>
  <div
    v-if="user"
    class="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    :class="sizeClasses"
    :style="{ backgroundColor: user.color }"
    :aria-label="user.name"
  >
    {{ user.initials }}
  </div>
</template>
