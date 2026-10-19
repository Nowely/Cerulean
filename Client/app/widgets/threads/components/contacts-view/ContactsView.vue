<script setup lang="ts">
import { useBlockStore } from '~/shared/model'
import { createBlock } from '~/shared/lib'
import type { ContactBlock } from '~/shared/types'
import ContactCard from './components/ContactCard.vue'
import ContactDetail from './components/ContactDetail.vue'

const blockStore = useBlockStore()

const searchQuery = ref('')
const showNewForm = ref(false)
const newName = ref('')
const newEmail = ref('')
const activeContactId = ref<string | null>(null)

const threadId = computed(() => blockStore.activeThreadId.value ?? '')

const allContacts = computed(() => blockStore.getThreadContacts(threadId.value))

const filteredContacts = computed(() => {
  if (!searchQuery.value) return allContacts.value
  const q = searchQuery.value.toLowerCase()
  return allContacts.value.filter(c =>
    c.name.toLowerCase().includes(q)
    || c.data.email?.toLowerCase().includes(q)
    || c.data.company?.toLowerCase().includes(q)
  )
})

const activeContact = computed(() =>
  activeContactId.value ? blockStore.get(activeContactId.value) as ContactBlock | undefined : undefined
)

const isDetailOpen = computed(() => activeContactId.value !== null)

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
  activeContactId.value = id
}

function closeDetail() {
  activeContactId.value = null
}

async function addContact() {
  const name = newName.value.trim()
  if (!name) return
  const thread = blockStore.getThread(threadId.value)
  if (!thread) return
  const contact = createBlock({
    name,
    type: 'contact',
    data: {
      email: newEmail.value.trim() || undefined,
      tags: []
    },
    parents: [threadId.value]
  })
  await blockStore.add(contact)
  await blockStore.update(threadId.value, {
    data: {
      ...thread.data,
      lastActivity: new Date().toISOString()
    }
  })
  newName.value = ''
  newEmail.value = ''
  showNewForm.value = false
}

async function deleteContact(id: string) {
  await blockStore.remove(id)
  if (activeContactId.value === id) {
    activeContactId.value = null
  }
}

async function updateContact(id: string, updates: { name?: string, data?: Partial<ContactBlock['data']> }) {
  const contact = blockStore.get(id)
  if (!contact || contact.meta.type !== 'contact') return
  const contactData = contact.data as ContactBlock['data']

  if (updates.name !== undefined) {
    await blockStore.update(id, { name: updates.name })
  }
  if (updates.data !== undefined) {
    await blockStore.update(id, { data: { ...contactData, ...updates.data } })
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UDashboardNavbar
      :title="blockStore.activeThread.value?.name"
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
        flush
        class="mb-2"
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
            :is-active="activeContactId === contact.id"
            @click="openContact(contact.id)"
          />
        </div>
      </UScrollArea>

      <ContactDetail
        v-if="isDetailOpen && activeContact"
        :contact="activeContact"
        class="w-full md:w-3/5 border-l border-default"
        @close="closeDetail"
        @update="(updates) => updateContact(activeContactId!, updates)"
        @delete="deleteContact(activeContactId!)"
      />
    </div>
  </div>
</template>
