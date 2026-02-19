import type { Note, NoteId } from '../types/note'
import { SEED_NOTES } from '~/shared/api/seed'

const notes = ref<Note[]>([])
const activeNoteId = ref<NoteId | null>(null)

export function useNoteStore() {
  const activeNote = computed(() =>
    notes.value.find(n => n.id === activeNoteId.value) ?? null
  )

  function threadNotes(threadId: string): Note[] {
    return notes.value
      .filter(n => n.threadId === threadId)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }

  function searchNotes(threadId: string, query: string): Note[] {
    if (!query) return threadNotes(threadId)
    const q = query.toLowerCase()
    return threadNotes(threadId).filter(
      n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    )
  }

  function totalCount(threadId: string): number {
    return notes.value.filter(n => n.threadId === threadId).length
  }

  function setActive(id: NoteId | null) {
    activeNoteId.value = id
  }

  function add(note: Note) {
    notes.value.push(note)
  }

  function update(id: NoteId, updates: Partial<Pick<Note, 'title' | 'content' | 'color' | 'tags' | 'pinned'>>) {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      Object.assign(note, updates, { updatedAt: new Date().toISOString() })
    }
  }

  function togglePin(id: NoteId) {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      note.pinned = !note.pinned
      note.updatedAt = new Date().toISOString()
    }
  }

  function remove(id: NoteId) {
    notes.value = notes.value.filter(n => n.id !== id)
    if (activeNoteId.value === id) activeNoteId.value = null
  }

  function init() {
    notes.value = SEED_NOTES.map(n => ({ ...n, tags: [...n.tags] }))
  }

  return {
    notes,
    activeNoteId,
    activeNote,
    threadNotes,
    searchNotes,
    totalCount,
    setActive,
    add,
    update,
    togglePin,
    remove,
    init
  }
}
