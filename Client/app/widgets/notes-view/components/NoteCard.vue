<script setup lang="ts">
import type { Note } from '~/shared/types'
import { relativeTime } from '~/shared/utils'

interface Props {
  note: Note
  isActive: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  click: []
  pin: []
  delete: []
}>()
</script>

<template>
  <UCard
    variant="soft"
    class="group cursor-pointer transition-all"
    :class="[
      isActive
        ? 'bg-violet-500/10 ring-1 ring-violet-500/30'
        : 'hover:bg-[hsl(var(--muted))]'
    ]"
    :ui="{ body: 'p-0', header: 'p-3 pb-0' }"
    @click="emit('click')"
  >
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-sm font-medium leading-snug line-clamp-1">
          {{ note.title || 'Untitled' }}
        </h3>
        <div class="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton
            :icon="note.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
            :color="note.pinned ? 'primary' : 'neutral'"
            variant="ghost"
            size="xs"
            @click.stop="emit('pin')"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            class="hover:text-red-400"
            @click.stop="emit('delete')"
          />
        </div>
      </div>
    </template>

    <p
      v-if="note.content"
      class="text-xs text-gray-500 line-clamp-3 leading-relaxed px-3"
    >
      {{ note.content }}
    </p>

    <template #footer>
      <div class="flex items-center gap-2 p-3 pt-2">
        <UIcon
          v-if="note.pinned"
          name="i-lucide-pin"
          class="h-3 w-3 text-violet-500"
        />
        <UBadge
          v-for="tag in note.tags.slice(0, 3)"
          :key="tag"
          color="primary"
          variant="soft"
          size="xs"
        >
          {{ tag }}
        </UBadge>
        <span class="ml-auto text-xs text-gray-500">
          {{ relativeTime(note.updatedAt) }}
        </span>
      </div>
    </template>
  </UCard>
</template>
