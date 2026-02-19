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
  <button
    class="group flex w-full flex-col gap-1.5 rounded-xl p-3 text-left transition-all"
    :class="[
      isActive
        ? 'bg-violet-500/10 ring-1 ring-violet-500/30'
        : 'hover:bg-[hsl(var(--muted))]'
    ]"
    @click="emit('click')"
  >
    <div class="flex items-start justify-between gap-2">
      <h3 class="text-sm font-medium leading-snug line-clamp-1">
        {{ note.title || 'Untitled' }}
      </h3>
      <div class="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          class="rounded p-1 hover:bg-[hsl(var(--muted))]"
          @click.stop="emit('pin')"
        >
          <UIcon
            :name="note.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
            class="h-3 w-3"
            :class="note.pinned ? 'text-violet-500' : 'text-gray-400'"
          />
        </button>
        <button
          class="rounded p-1 hover:bg-[hsl(var(--muted))]"
          @click.stop="emit('delete')"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="h-3 w-3 text-gray-400 hover:text-red-400"
          />
        </button>
      </div>
    </div>
    <p
      v-if="note.content"
      class="text-xs text-gray-500 line-clamp-3 leading-relaxed"
    >
      {{ note.content }}
    </p>
    <div class="flex items-center gap-2 mt-1">
      <UIcon
        v-if="note.pinned"
        name="i-lucide-pin"
        class="h-3 w-3 text-violet-500"
      />
      <span
        v-for="tag in note.tags.slice(0, 3)"
        :key="tag"
        class="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400"
      >
        {{ tag }}
      </span>
      <span class="ml-auto text-[10px] text-gray-500">
        {{ relativeTime(note.updatedAt) }}
      </span>
    </div>
  </button>
</template>
