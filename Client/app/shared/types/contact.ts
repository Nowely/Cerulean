export type ContactId = string

export interface Contact {
  id: ContactId
  threadId: string
  name: string
  email?: string
  phone?: string
  company?: string
  avatar?: string
  notes?: string
  tags: string[]
  createdAt: string
}
