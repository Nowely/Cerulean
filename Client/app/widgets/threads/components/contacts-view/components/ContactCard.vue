<script setup lang="ts">
import type { ContactBlock } from '~/shared/types'

interface Props {
  contact: ContactBlock
  isActive: boolean
}

defineProps<Props>()
const emit = defineEmits<{ click: [] }>()
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
        v-if="contact.data.company"
        class="text-xs text-muted truncate"
      >
        {{ contact.data.company }}
      </span>
      <div
        v-if="contact.data.tags.length > 0"
        class="flex gap-1 ml-auto shrink-0"
      >
        <UBadge
          v-for="tag in contact.data.tags.slice(0, 2)"
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
