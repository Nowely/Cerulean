<script setup lang="ts">
import type { Contact } from '~/shared/types'

interface Props {
  contact: Contact
  isActive: boolean
}

defineProps<Props>()
const emit = defineEmits<{ click: [] }>()

function getAvatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 60% 45%)`
}
</script>

<template>
  <UUser
    :name="contact.name"
    :avatar="{
      alt: contact.name,
      size: 'md',
      ui: { root: 'font-semibold' }
    }"
    :ui="{
      root: `w-full px-3 py-2.5 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-sky-500/10' : 'hover:bg-elevated'}`
    }"
    @click="emit('click')"
  >
    <template #description>
      <span
        v-if="contact.company"
        class="text-xs text-muted truncate"
      >
        {{ contact.company }}
      </span>
      <div
        v-if="contact.tags.length > 0"
        class="flex gap-1 ml-auto shrink-0"
      >
        <UBadge
          v-for="tag in contact.tags.slice(0, 2)"
          :key="tag"
          variant="soft"
          size="xs"
          class="text-sky-400"
        >
          {{ tag }}
        </UBadge>
      </div>
    </template>
  </UUser>
</template>
