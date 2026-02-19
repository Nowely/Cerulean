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
  <UButton
    color="neutral"
    variant="ghost"
    block
    class="justify-start h-auto px-3 py-2.5"
    :class="isActive ? 'bg-sky-500/10' : ''"
    @click="emit('click')"
  >
    <template #leading>
      <UAvatar
        :alt="contact.name"
        size="md"
        :style="{ backgroundColor: getAvatarColor(contact.name) }"
        class="text-white font-semibold"
      />
    </template>
    <div class="flex min-w-0 flex-1 flex-col items-start text-left">
      <span class="text-sm font-medium truncate">{{ contact.name }}</span>
      <span
        v-if="contact.company"
        class="text-xs text-gray-500 truncate"
      >{{ contact.company }}</span>
    </div>
    <template #trailing>
      <UBadge
        v-for="tag in contact.tags.slice(0, 2)"
        :key="tag"
        color="primary"
        variant="soft"
        size="xs"
        class="text-sky-400"
      >
        {{ tag }}
      </UBadge>
    </template>
  </UButton>
</template>
