<script setup lang="ts">
import { useContactStore, useThreadStore } from '~/shared/model'
import { createContact } from '~/shared/lib'
import ContactCard from './components/ContactCard.vue'
import ContactDetail from './components/ContactDetail.vue'

const threadStore = useThreadStore()
const contactStore = useContactStore()

const searchQuery = ref('')
const showNewForm = ref(false)
const newName = ref('')
const newEmail = ref('')

const threadId = computed(() => threadStore.activeThreadId.value ?? '')

const filteredContacts = computed(() =>
  contactStore.searchContacts(threadId.value, searchQuery.value)
)

const isDetailOpen = computed(() => contactStore.activeContactId.value !== null)

const grouped = computed(() => {
  const groups: Record<string, typeof filteredContacts.value> = {}
  for (const c of filteredContacts.value) {
    const letter = c.name[0]?.toUpperCase() ?? '#'
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(c)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
})

function openContact(id: string) {
  contactStore.setActive(id)
}

function closeDetail() {
  contactStore.setActive(null)
}

function addContact() {
  const name = newName.value.trim()
  if (!name) return
  const contact = createContact(threadId.value, name, {
    email: newEmail.value.trim() || undefined
  })
  contactStore.add(contact)
  threadStore.updateLastActivity(threadId.value, new Date().toISOString())
  newName.value = ''
  newEmail.value = ''
  showNewForm.value = false
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UDashboardNavbar
      :title="threadStore.activeThread.value?.name"
      icon="i-lucide-contact"
    >
      <template #trailing>
        <UBadge
          color="neutral"
          variant="subtle"
          size="xs"
        >
          {{ filteredContacts.length }} contacts
        </UBadge>
      </template>
      <template #right>
        <UButton
          :icon="showNewForm ? 'i-lucide-x' : 'i-lucide-plus'"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="showNewForm = !showNewForm"
        />
      </template>
    </UDashboardNavbar>

    <UDashboardToolbar class="flex-col items-stretch">
      <UCard
        v-if="showNewForm"
        variant="soft"
        class="mb-2"
        :ui="{ body: 'p-3 space-y-2' }"
      >
        <UInput
          v-model="newName"
          placeholder="Name..."
          @keydown.enter="addContact"
        />
        <UInput
          v-model="newEmail"
          placeholder="Email (optional)..."
          @keydown.enter="addContact"
        />
        <UButton
          size="sm"
          class="self-end"
          :disabled="!newName.trim()"
          @click="addContact"
        >
          Add Contact
        </UButton>
      </UCard>
      <UInput
        v-model="searchQuery"
        placeholder="Search contacts..."
        icon="i-lucide-search"
        variant="soft"
      />
    </UDashboardToolbar>

    <div class="flex flex-1 overflow-hidden">
      <UScrollArea
        class="flex-1"
        :class="{ 'hidden md:block md:w-2/5': isDetailOpen }"
      >
        <UEmpty
          v-if="filteredContacts.length === 0"
          icon="i-lucide-contact"
          :title="searchQuery ? 'No contacts match your search' : 'No contacts yet'"
        />

        <div
          v-for="[letter, contacts] in grouped"
          :key="letter"
          class="px-2"
        >
          <USeparator
            :label="letter"
            class="px-3 pt-3"
          />
          <ContactCard
            v-for="contact in contacts"
            :key="contact.id"
            :contact="contact"
            :is-active="contactStore.activeContactId.value === contact.id"
            @click="openContact(contact.id)"
          />
        </div>
      </UScrollArea>

      <ContactDetail
        v-if="isDetailOpen && contactStore.activeContact.value"
        :contact="contactStore.activeContact.value"
        class="w-full md:w-3/5 border-l border-[hsl(var(--border))]"
        @close="closeDetail"
        @update="(updates) => contactStore.update(contactStore.activeContactId.value!, updates)"
        @delete="() => { contactStore.remove(contactStore.activeContactId.value!); closeDetail() }"
      />
    </div>
  </div>
</template>
