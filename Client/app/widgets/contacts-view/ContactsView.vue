<script setup lang="ts">
import { useContactStore, useThreadStore } from '~/shared/model'
import { createContact } from '~/shared/lib'
import ContactCard from './components/ContactCard.vue'
import ContactDetail from './components/ContactDetail.vue'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'

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
  <div class="flex h-full flex-col">
    <ContentPanelHeader>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-contact"
          class="h-5 w-5 text-sky-500"
        />
        <h2 class="text-lg font-semibold">
          {{ threadStore.activeThread.value?.name }}
        </h2>
        <span class="text-xs text-gray-500">
          {{ filteredContacts.length }} contacts
        </span>
      </div>
      <template #end>
        <UButton
          :icon="showNewForm ? 'i-lucide-x' : 'i-lucide-plus'"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="showNewForm = !showNewForm"
        />
      </template>
    </ContentPanelHeader>

    <div class="border-b border-[hsl(var(--border))] px-4 py-2">
      <div
        v-if="showNewForm"
        class="flex flex-col gap-2 rounded-lg bg-[hsl(var(--muted))] p-3 mb-2"
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
          color="primary"
          class="self-end"
          :disabled="!newName.trim()"
          @click="addContact"
        >
          Add Contact
        </UButton>
      </div>

      <UInput
        v-model="searchQuery"
        placeholder="Search contacts..."
        icon="i-lucide-search"
        variant="soft"
      />
    </div>

    <div class="flex flex-1 overflow-hidden">
      <div
        class="flex-1 overflow-y-auto scrollbar-thin"
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
          <p class="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {{ letter }}
          </p>
          <ContactCard
            v-for="contact in contacts"
            :key="contact.id"
            :contact="contact"
            :is-active="contactStore.activeContactId.value === contact.id"
            @click="openContact(contact.id)"
          />
        </div>
      </div>

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
