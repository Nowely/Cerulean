<script setup lang="ts">
import type { Contact } from '~/shared/types'

interface Props {
  contact: Contact
  isActive: boolean
}

defineProps<Props>()
const emit = defineEmits<{ click: [] }>()

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 60% 45%)`
}
</script>

<template>
  <button
    class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
    :class="isActive ? 'bg-sky-500/10' : 'hover:bg-[hsl(var(--muted))]'"
    @click="emit('click')"
  >
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      :style="{ backgroundColor: getAvatarColor(contact.name) }"
    >
      {{ getInitials(contact.name) }}
    </div>
    <div class="flex min-w-0 flex-1 flex-col">
      <span class="text-sm font-medium truncate">{{ contact.name }}</span>
      <span
        v-if="contact.company"
        class="text-xs text-gray-500 truncate"
      >{{ contact.company }}</span>
    </div>
    <div
      v-if="contact.tags.length > 0"
      class="flex shrink-0 gap-1"
    >
      <span
        v-for="tag in contact.tags.slice(0, 2)"
        :key="tag"
        class="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-400"
      >
        {{ tag }}
      </span>
    </div>
  </button>
</template>
