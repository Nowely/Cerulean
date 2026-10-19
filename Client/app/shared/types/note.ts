export type NoteId = string

export interface NoteData {
  content: string
  color?: string
  pinned: boolean
  tags: string[]
}
