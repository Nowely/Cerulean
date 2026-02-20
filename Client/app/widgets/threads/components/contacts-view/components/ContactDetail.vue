<script setup lang="ts">
import type { Contact } from '~/shared/types'

interface Props {
  contact: Contact
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  update: [updates: Partial<Omit<Contact, 'id' | 'threadId' | 'createdAt'>>]
  delete: []
}>()

const editing = ref(false)
const form = ref({ ...props.contact })
const newTag = ref('')

watch(() => props.contact.id, () => {
  form.value = { ...props.contact }
  editing.value = false
})

function save() {
  emit('update', {
    name: form.value.name,
    email: form.value.email,
    phone: form.value.phone,
    company: form.value.company,
    notes: form.value.notes
  })
  editing.value = false
}

function addTag() {
  const tag = newTag.value.trim().toLowerCase()
  if (!tag || props.contact.tags.includes(tag)) {
    newTag.value = ''
    return
  }
  emit('update', { tags: [...props.contact.tags, tag] })
  newTag.value = ''
}

function removeTag(tag: string) {
  emit('update', { tags: props.contact.tags.filter(t => t !== tag) })
}
</script>

<template>
  <div class="flex h-full flex-col bg-default">
    <UDashboardNavbar>
      <template #right>
        <UButton
          :icon="editing ? 'i-lucide-check' : 'i-lucide-pencil'"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="editing ? save() : (editing = true)"
        >
          {{ editing ? 'Save' : 'Edit' }}
        </UButton>
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="sm"
          class="text-dimmed hover:text-red-400"
          @click="emit('delete')"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="hidden md:flex"
          @click="emit('close')"
        />
      </template>
    </UDashboardNavbar>

    <UScrollArea class="flex-1 px-4 py-6">
      <UUser
        v-if="!editing"
        :name="contact.name"
        :description="contact.company"
        orientation="vertical"
        size="xl"
        :avatar="{
          alt: contact.name,
          size: '3xl',
          ui: { root: 'font-bold text-2xl' }
        }"
        class="mb-6 justify-center"
      />
      <div
        v-else
        class="flex flex-col items-center gap-3 mb-6"
      >
        <UAvatar
          :alt="contact.name"
          size="3xl"
          class="font-bold"
          :ui="{ fallback: 'text-2xl' }"
        />
        <UInput
          v-model="form.name"
          class="text-center w-48"
          :ui="{ base: 'text-xl font-semibold text-center bg-transparent' }"
        />
      </div>

      <div class="flex flex-col gap-4">
        <UFormField label="Email">
          <UInput
            v-if="editing"
            v-model="form.email"
            placeholder="Add email..."
            variant="underline"
          />
          <span
            v-else
            class="text-sm"
          >{{ contact.email || '---' }}</span>
        </UFormField>

        <UFormField label="Phone">
          <UInput
            v-if="editing"
            v-model="form.phone"
            placeholder="Add phone..."
            variant="underline"
          />
          <span
            v-else
            class="text-sm"
          >{{ contact.phone || '---' }}</span>
        </UFormField>

        <UFormField label="Company">
          <UInput
            v-if="editing"
            v-model="form.company"
            placeholder="Add company..."
            variant="underline"
          />
          <span
            v-else
            class="text-sm"
          >{{ contact.company || '---' }}</span>
        </UFormField>

        <UFormField label="Notes">
          <UTextarea
            v-if="editing"
            v-model="form.notes"
            placeholder="Add notes..."
            :rows="3"
            variant="underline"
          />
          <span
            v-else
            class="text-sm whitespace-pre-wrap"
          >{{ contact.notes || '---' }}</span>
        </UFormField>

        <UFormField label="Tags">
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="tag in contact.tags"
              :key="tag"
              variant="soft"
              size="xs"
            >
              {{ tag }}
              <UButton
                v-if="editing"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                class="size-3 p-0 ml-1"
                @click="removeTag(tag)"
              />
            </UBadge>
            <UInput
              v-if="editing"
              v-model="newTag"
              placeholder="Add tag..."
              variant="none"
              size="xs"
              class="w-20"
              @keydown.enter="addTag"
            />
          </div>
        </UFormField>
      </div>
    </UScrollArea>
  </div>
</template>
