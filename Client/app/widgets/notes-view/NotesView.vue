<script setup lang="ts">
import { useNoteStore, useThreadStore } from '~/shared/model'
import { createNote } from '~/shared/lib'
import NoteCard from './components/NoteCard.vue'
import NoteEditor from './components/NoteEditor.vue'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'

const threadStore = useThreadStore()
const noteStore = useNoteStore()

const searchQuery = ref('')
const threadId = computed(() => threadStore.activeThreadId.value ?? '')

const filteredNotes = computed(() =>
  noteStore.searchNotes(threadId.value, searchQuery.value),
)

const isEditing = computed(() => noteStore.activeNoteId.value !== null)

function createNewNote() {
  const note = createNote(threadId.value, '', '')
  noteStore.add(note)
  noteStore.setActive(note.id)
  threadStore.updateLastActivity(threadId.value, new Date().toISOString())
}

function openNote(id: string) {
  noteStore.setActive(id)
}

function closeEditor() {
  noteStore.setActive(null)
}

function deleteNote(id: string) {
  noteStore.remove(id)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <ContentPanelHeader>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-notebook-pen"
          class="h-5 w-5 text-violet-500"
        />
        <h2 class="text-lg font-semibold">
          {{ threadStore.activeThread.value?.name }}
        </h2>
        <span class="text-xs text-gray-500">
          {{ filteredNotes.length }} notes
        </span>
      </div>
      <template #end>
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="createNewNote"
        />
      </template>
    </ContentPanelHeader>

    <div class="border-b border-[hsl(var(--border))] px-4 py-2">
      <div class="flex items-center gap-2 rounded-lg bg-[hsl(var(--muted))] px-3 py-1.5">
        <UIcon
          name="i-lucide-search"
          class="h-4 w-4 text-gray-400"
        />
        <UInput
          v-model="searchQuery"
          placeholder="Search notes..."
          :ui="{ base: 'bg-transparent' }"
        />
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <div
        class="flex-1 overflow-y-auto scrollbar-thin p-3"
        :class="{ 'hidden md:block md:w-1/2 lg:w-2/5': isEditing }"
      >
        <div
          v-if="filteredNotes.length === 0"
          class="flex flex-col items-center justify-center gap-3 px-6 py-16"
        >
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
            <UIcon
              name="i-lucide-notebook-pen"
              class="h-8 w-8 text-violet-500"
            />
          </div>
          <p class="text-sm text-gray-500">
            {{ searchQuery ? 'No notes match your search' : 'No notes yet' }}
          </p>
          <UButton
            v-if="!searchQuery"
            color="primary"
            @click="createNewNote"
          >
            Create a note
          </UButton>
        </div>

        <div
          v-else
          class="grid grid-cols-1 gap-2 sm:grid-cols-2"
          :class="{ 'sm:grid-cols-1': isEditing }"
        >
          <NoteCard
            v-for="note in filteredNotes"
            :key="note.id"
            :note="note"
            :is-active="noteStore.activeNoteId.value === note.id"
            @click="openNote(note.id)"
            @pin="noteStore.togglePin(note.id)"
            @delete="deleteNote(note.id)"
          />
        </div>
      </div>

      <NoteEditor
        v-if="isEditing && noteStore.activeNote.value"
        :note="noteStore.activeNote.value"
        class="w-full md:w-1/2 lg:w-3/5 border-l border-[hsl(var(--border))]"
        @close="closeEditor"
        @update="(updates) => noteStore.update(noteStore.activeNoteId.value!, updates)"
        @delete="deleteNote(noteStore.activeNoteId.value!)"
      />
    </div>
  </div>
</template>
