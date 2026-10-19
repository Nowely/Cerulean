export type ContactId = string

export interface ContactData {
  email?: string
  phone?: string
  company?: string
  avatar?: string
  notes?: string
  tags: string[]
}
