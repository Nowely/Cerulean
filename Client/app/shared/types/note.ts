export type NoteId = string

export interface NoteData {
  content: string
  color?: string
  pinned: boolean
  tags: string[]
}

/**
 * @deprecated Use Block<NoteData> instead
 */
export interface Note {
  id: NoteId
  threadId: string
  title: string
  content: string
  color?: string
  pinned: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}
