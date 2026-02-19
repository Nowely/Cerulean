<script setup lang="ts">
import type { Note } from '~/shared/types'
import { relativeTime } from '~/shared/utils'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'

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
  if (!tag || props.note.tags.includes(tag)) {
    newTag.value = ''
    return
  }
  emit('update', { tags: [...props.note.tags, tag] })
  newTag.value = ''
}

function removeTag(tag: string) {
  emit('update', { tags: props.note.tags.filter(t => t !== tag) })
}
</script>

<template>
  <div class="flex h-full flex-col bg-[hsl(var(--background))]">
    <ContentPanelHeader variant="toolbar">
      <template #start>
        <span class="text-xs text-gray-500">
          Edited {{ relativeTime(note.updatedAt) }}
        </span>
      </template>
      <template #end>
        <UButton
          :icon="note.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="note.pinned ? 'text-violet-500' : ''"
          @click="emit('update', { pinned: !note.pinned })"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="sm"
          class="text-gray-400 hover:text-red-400"
          @click="emit('delete')"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="hidden md:flex"
          @click="emit('close')"
        />
      </template>
    </ContentPanelHeader>

    <UScrollArea class="flex-1 px-4 py-3">
      <UInput
        v-model="localTitle"
        placeholder="Note title..."
        variant="none"
        size="xl"
        class="font-semibold"
        @input="debouncedUpdate"
      />
      <UTextarea
        v-model="localContent"
        placeholder="Start writing..."
        variant="none"
        autoresize
        :rows="10"
        class="mt-3 text-sm leading-relaxed"
        @input="debouncedUpdate"
      />

      <div class="mt-4 flex flex-wrap items-center gap-1.5">
        <UBadge
          v-for="tag in note.tags"
          :key="tag"
          color="primary"
          variant="soft"
          size="xs"
          class="pr-1"
        >
          {{ tag }}
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            class="ml-1 h-3 w-3 p-0"
            @click="removeTag(tag)"
          />
        </UBadge>
        <UInput
          v-model="newTag"
          placeholder="Add tag..."
          variant="none"
          size="xs"
          class="w-20"
          @keydown.enter="addTag"
        />
      </div>
    </UScrollArea>
  </div>
</template>
