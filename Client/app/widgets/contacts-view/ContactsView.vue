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
  contactStore.searchContacts(threadId.value, searchQuery.value),
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
    email: newEmail.value.trim() || undefined,
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
    <!-- Header -->
    <div class="border-b border-[hsl(var(--border))] px-4 py-3">
      <div class="flex items-center justify-between">
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
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          @click="showNewForm = !showNewForm"
        >
          <UIcon
            :name="showNewForm ? 'i-lucide-x' : 'i-lucide-plus'"
            class="h-4 w-4"
          />
        </button>
      </div>

      <!-- Quick add form -->
      <div
        v-if="showNewForm"
        class="mt-2 flex flex-col gap-2 rounded-lg bg-[hsl(var(--muted))] p-3"
      >
        <input
          v-model="newName"
          type="text"
          placeholder="Name..."
          class="bg-transparent text-sm outline-none placeholder:text-gray-500"
          @keydown.enter="addContact"
        >
        <input
          v-model="newEmail"
          type="text"
          placeholder="Email (optional)..."
          class="bg-transparent text-sm outline-none placeholder:text-gray-500"
          @keydown.enter="addContact"
        >
        <button
          class="self-end rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 transition-colors"
          :disabled="!newName.trim()"
          @click="addContact"
        >
          Add Contact
        </button>
      </div>

      <!-- Search -->
      <div class="mt-2 flex items-center gap-2 rounded-lg bg-[hsl(var(--muted))] px-3 py-1.5">
        <UIcon
          name="i-lucide-search"
          class="h-4 w-4 text-gray-400"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search contacts..."
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
        >
      </div>
    </div>

    <!-- Content area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Contact list -->
      <div
        class="flex-1 overflow-y-auto scrollbar-thin"
        :class="{ 'hidden md:block md:w-2/5': isDetailOpen }"
      >
        <div
          v-if="filteredContacts.length === 0"
          class="flex flex-col items-center justify-center gap-3 px-6 py-16"
        >
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10">
            <UIcon
              name="i-lucide-contact"
              class="h-8 w-8 text-sky-500"
            />
          </div>
          <p class="text-sm text-gray-500">
            {{ searchQuery ? 'No contacts match your search' : 'No contacts yet' }}
          </p>
        </div>

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

      <!-- Detail panel -->
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
