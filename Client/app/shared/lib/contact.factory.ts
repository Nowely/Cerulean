import type { Contact } from '../types/contact'
import { generateId } from '~/shared/utils'

export function createContact(
  threadId: string,
  name: string,
  opts?: { email?: string, phone?: string, company?: string, notes?: string, tags?: string[] }
): Contact {
  return {
    id: generateId('c'),
    threadId,
    name,
    email: opts?.email,
    phone: opts?.phone,
    company: opts?.company,
    notes: opts?.notes,
    tags: opts?.tags ?? [],
    createdAt: new Date().toISOString()
  }
}
