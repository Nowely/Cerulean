import type { Contact, ContactId } from '../types/contact'
import { SEED_CONTACTS } from '~/shared/api/seed'

const contacts = ref<Contact[]>([])
const activeContactId = ref<ContactId | null>(null)

export function useContactStore() {
  const activeContact = computed(() =>
    contacts.value.find(c => c.id === activeContactId.value) ?? null,
  )

  function threadContacts(threadId: string): Contact[] {
    return contacts.value
      .filter(c => c.threadId === threadId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  function searchContacts(threadId: string, query: string): Contact[] {
    if (!query) return threadContacts(threadId)
    const q = query.toLowerCase()
    return threadContacts(threadId).filter(
      c =>
        c.name.toLowerCase().includes(q)
        || c.email?.toLowerCase().includes(q)
        || c.company?.toLowerCase().includes(q)
        || c.tags.some(t => t.toLowerCase().includes(q)),
    )
  }

  function totalCount(threadId: string): number {
    return contacts.value.filter(c => c.threadId === threadId).length
  }

  function setActive(id: ContactId | null) {
    activeContactId.value = id
  }

  function add(contact: Contact) {
    contacts.value.push(contact)
  }

  function update(id: ContactId, updates: Partial<Omit<Contact, 'id' | 'threadId' | 'createdAt'>>) {
    const contact = contacts.value.find(c => c.id === id)
    if (contact) Object.assign(contact, updates)
  }

  function remove(id: ContactId) {
    contacts.value = contacts.value.filter(c => c.id !== id)
    if (activeContactId.value === id) activeContactId.value = null
  }

  function init() {
    contacts.value = SEED_CONTACTS.map(c => ({ ...c, tags: [...c.tags] }))
  }

  return {
    contacts,
    activeContactId,
    activeContact,
    threadContacts,
    searchContacts,
    totalCount,
    setActive,
    add,
    update,
    remove,
    init,
  }
}
