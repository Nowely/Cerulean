import type { Note } from '../types/note'
import { generateId } from '~/shared/utils'

export function createNote(
  threadId: string,
  title: string,
  content = '',
  opts?: { color?: string; tags?: string[] },
): Note {
  const now = new Date().toISOString()
  return {
    id: generateId('n'),
    threadId,
    title,
    content,
    color: opts?.color,
    pinned: false,
    tags: opts?.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }
}
