<script setup lang="ts">
import type { NoteBlock } from '~/shared/types'
import { relativeTime } from '~/shared/utils'

interface Props {
  note: NoteBlock
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  update: [updates: { name?: string, data?: { content?: string, pinned?: boolean, tags?: string[] } }]
  delete: []
}>()

const localTitle = ref(props.note.name)
const localContent = ref(props.note.data.content)
const newTag = ref('')

watch(() => props.note.id, () => {
  localTitle.value = props.note.name
  localContent.value = props.note.data.content
})

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedUpdate() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update', { name: localTitle.value, data: { content: localContent.value } })
  }, 400)
}

function addTag() {
  const tag = newTag.value.trim().toLowerCase()
  if (!tag || props.note.data.tags.includes(tag)) {
    newTag.value = ''
    return
  }
  emit('update', { data: { tags: [...props.note.data.tags, tag] } })
  newTag.value = ''
}

function removeTag(tag: string) {
  emit('update', { data: { tags: props.note.data.tags.filter(t => t !== tag) } })
}
</script>

<template>
  <div class="flex h-full flex-col bg-default">
    <UDashboardNavbar>
      <template #leading>
        <span class="text-xs text-muted">
          Edited {{ relativeTime(note.updated) }}
        </span>
      </template>
      <template #right>
        <UButton
          :icon="note.data.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="note.data.pinned ? 'text-violet-500' : ''"
          @click="emit('update', { data: { pinned: !note.data.pinned } })"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="sm"
          class="text-dimmed hover:text-red-400"
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
    </UDashboardNavbar>

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
          v-for="tag in note.data.tags"
          :key="tag"
          variant="soft"
          size="xs"
        >
          {{ tag }}
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            class="ml-1 size-3 p-0"
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
