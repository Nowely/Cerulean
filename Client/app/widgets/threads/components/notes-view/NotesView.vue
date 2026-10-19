<script setup lang="ts">
import { useBlockStore } from '~/shared/model'
import { createBlock } from '~/shared/lib'
import type { NoteBlock } from '~/shared/types'
import NoteCard from './components/NoteCard.vue'
import NoteEditor from './components/NoteEditor.vue'

const blockStore = useBlockStore()

const searchQuery = ref('')
const threadId = computed(() => blockStore.activeThreadId.value ?? '')

const allNotes = computed(() => blockStore.getThreadNotes(threadId.value))

const filteredNotes = computed(() => {
  if (!searchQuery.value) return allNotes.value
  const q = searchQuery.value.toLowerCase()
  return allNotes.value.filter(n =>
    n.name.toLowerCase().includes(q)
    || n.data.content.toLowerCase().includes(q)
  )
})

const activeNoteId = ref<string | null>(null)

const activeNote = computed(() =>
  activeNoteId.value ? blockStore.get(activeNoteId.value) as NoteBlock | undefined : undefined
)

const isEditing = computed(() => activeNoteId.value !== null)

async function createNewNote() {
  const thread = blockStore.getThread(threadId.value)
  if (!thread) return
  const note = createBlock({
    name: '',
    type: 'note',
    data: {
      content: '',
      pinned: false,
      tags: []
    },
    parents: [threadId.value]
  })
  await blockStore.add(note)
  activeNoteId.value = note.id
  await blockStore.update(threadId.value, {
    data: {
      ...thread.data,
      lastActivity: new Date().toISOString()
    }
  })
}

function openNote(id: string) {
  activeNoteId.value = id
}

function closeEditor() {
  activeNoteId.value = null
}

async function deleteNote(id: string) {
  await blockStore.remove(id)
  if (activeNoteId.value === id) {
    activeNoteId.value = null
  }
}

async function togglePin(id: string) {
  const note = blockStore.get(id)
  if (!note || note.meta.type !== 'note') return
  const noteData = note.data as { content: string, pinned: boolean, tags: string[] }
  await blockStore.update(id, {
    data: { ...noteData, pinned: !noteData.pinned }
  })
}

async function updateNote(id: string, updates: { name?: string, data?: Partial<{ content: string, pinned: boolean, tags: string[] }> }) {
  const note = blockStore.get(id)
  if (!note || note.meta.type !== 'note') return
  const noteData = note.data as { content: string, pinned: boolean, tags: string[] }

  if (updates.name !== undefined) {
    await blockStore.update(id, { name: updates.name })
  }
  if (updates.data !== undefined) {
    await blockStore.update(id, { data: { ...noteData, ...updates.data } })
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UDashboardNavbar
      :title="blockStore.activeThread.value?.name"
      icon="i-lucide-notebook-pen"
    >
      <template #trailing>
        <UBadge
          color="neutral"
          variant="subtle"
          size="xs"
        >
          {{ filteredNotes.length }} notes
        </UBadge>
      </template>
      <template #right>
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="createNewNote"
        />
      </template>
    </UDashboardNavbar>

    <UDashboardToolbar>
      <UInput
        v-model="searchQuery"
        placeholder="Search notes..."
        icon="i-lucide-search"
        variant="soft"
      />
    </UDashboardToolbar>

    <div class="flex flex-1 overflow-hidden">
      <UScrollArea
        class="flex-1 p-3"
        :class="{ 'hidden md:block md:w-1/2 lg:w-2/5': isEditing }"
      >
        <UEmpty
          v-if="filteredNotes.length === 0"
          icon="i-lucide-notebook-pen"
          :title="searchQuery ? 'No notes match your search' : 'No notes yet'"
          :actions="!searchQuery ? [{ label: 'Create a note', color: 'primary', onClick: createNewNote }] : undefined"
        />

        <div
          v-else
          class="grid grid-cols-1 gap-2 sm:grid-cols-2"
          :class="{ 'sm:grid-cols-1': isEditing }"
        >
          <NoteCard
            v-for="note in filteredNotes"
            :key="note.id"
            :note="note"
            :is-active="activeNoteId === note.id"
            @click="openNote(note.id)"
            @pin="togglePin(note.id)"
            @delete="deleteNote(note.id)"
          />
        </div>
      </UScrollArea>

      <NoteEditor
        v-if="isEditing && activeNote"
        :note="activeNote"
        class="w-full md:w-1/2 lg:w-3/5 border-l border-default"
        @close="closeEditor"
        @update="(updates) => updateNote(activeNoteId!, updates)"
        @delete="deleteNote(activeNoteId!)"
      />
    </div>
  </div>
</template>
