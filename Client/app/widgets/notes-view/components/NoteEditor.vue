<script setup lang="ts">
import type { Note } from '~/shared/types'
import { relativeTime } from '~/shared/utils'

interface Props {
  note: Note
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  update: [updates: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'pinned'>>]
  delete: []
}>()

const localTitle = ref(props.note.title)
const localContent = ref(props.note.content)
const newTag = ref('')

watch(() => props.note.id, () => {
  localTitle.value = props.note.title
  localContent.value = props.note.content
})

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedUpdate() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update', { title: localTitle.value, content: localContent.value })
  }, 400)
}

function addTag() {
  const tag = newTag.value.trim().toLowerCase()
  if (!tag || props.note.tags.includes(tag)) { newTag.value = ''; return }
  emit('update', { tags: [...props.note.tags, tag] })
  newTag.value = ''
}

function removeTag(tag: string) {
  emit('update', { tags: props.note.tags.filter(t => t !== tag) })
}
</script>

<template>
  <div class="flex h-full flex-col bg-[hsl(var(--background))]">
    <!-- Toolbar -->
    <div class="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2">
      <div class="flex items-center gap-2">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors md:hidden"
          @click="emit('close')"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="h-4 w-4"
          />
        </button>
        <span class="text-xs text-gray-500">
          Edited {{ relativeTime(note.updatedAt) }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          @click="emit('update', { pinned: !note.pinned })"
        >
          <UIcon
            :name="note.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
            class="h-4 w-4"
            :class="note.pinned ? 'text-violet-500' : ''"
          />
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          @click="emit('delete')"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="h-4 w-4 text-gray-400 hover:text-red-400"
          />
        </button>
        <button
          class="hidden md:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          @click="emit('close')"
        >
          <UIcon
            name="i-lucide-x"
            class="h-4 w-4"
          />
        </button>
      </div>
    </div>

    <!-- Editor body -->
    <div class="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
      <input
        v-model="localTitle"
        type="text"
        placeholder="Note title..."
        class="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-gray-400"
        @input="debouncedUpdate"
      >
      <textarea
        v-model="localContent"
        placeholder="Start writing..."
        class="mt-3 w-full flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-500 min-h-[300px]"
        @input="debouncedUpdate"
      />

      <!-- Tags -->
      <div class="mt-4 flex flex-wrap items-center gap-1.5">
        <span
          v-for="tag in note.tags"
          :key="tag"
          class="flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400"
        >
          {{ tag }}
          <button @click="removeTag(tag)">
            <UIcon
              name="i-lucide-x"
              class="h-3 w-3"
            />
          </button>
        </span>
        <input
          v-model="newTag"
          type="text"
          placeholder="Add tag..."
          class="w-20 bg-transparent text-xs outline-none placeholder:text-gray-500"
          @keydown.enter="addTag"
        >
      </div>
    </div>
  </div>
</template>
