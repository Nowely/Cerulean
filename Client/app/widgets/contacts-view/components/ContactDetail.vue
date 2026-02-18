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
    notes: form.value.notes,
  })
  editing.value = false
}

function addTag() {
  const tag = newTag.value.trim().toLowerCase()
  if (!tag || props.contact.tags.includes(tag)) { newTag.value = ''; return }
  emit('update', { tags: [...props.contact.tags, tag] })
  newTag.value = ''
}

function removeTag(tag: string) {
  emit('update', { tags: props.contact.tags.filter(t => t !== tag) })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 60% 45%)`
}
</script>

<template>
  <div class="flex h-full flex-col bg-[hsl(var(--background))]">
    <!-- Toolbar -->
    <div class="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors md:hidden"
        @click="emit('close')"
      >
        <UIcon
          name="i-lucide-arrow-left"
          class="h-4 w-4"
        />
      </button>
      <div class="flex items-center gap-1">
        <button
          class="flex h-8 items-center gap-1 rounded-lg px-2 hover:bg-[hsl(var(--muted))] transition-colors text-xs"
          @click="editing ? save() : (editing = true)"
        >
          <UIcon
            :name="editing ? 'i-lucide-check' : 'i-lucide-pencil'"
            class="h-3.5 w-3.5"
          />
          {{ editing ? 'Save' : 'Edit' }}
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          @click="emit('delete')"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="h-4 w-4 text-gray-400 hover:text-red-400"
          />
        </button>
        <button
          class="hidden md:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          @click="emit('close')"
        >
          <UIcon
            name="i-lucide-x"
            class="h-4 w-4"
          />
        </button>
      </div>
    </div>

    <!-- Contact info -->
    <div class="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
      <!-- Avatar & name -->
      <div class="flex flex-col items-center gap-3 mb-6">
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
          :style="{ backgroundColor: getAvatarColor(contact.name) }"
        >
          {{ getInitials(contact.name) }}
        </div>
        <template v-if="editing">
          <input
            v-model="form.name"
            class="text-center text-xl font-semibold bg-transparent outline-none border-b border-[hsl(var(--border))]"
          >
        </template>
        <template v-else>
          <h2 class="text-xl font-semibold">
            {{ contact.name }}
          </h2>
          <p
            v-if="contact.company"
            class="text-sm text-gray-500"
          >
            {{ contact.company }}
          </p>
        </template>
      </div>

      <!-- Fields -->
      <div class="flex flex-col gap-4">
        <div
          v-for="field in [
            { icon: 'i-lucide-mail', key: 'email', label: 'Email', value: contact.email },
            { icon: 'i-lucide-phone', key: 'phone', label: 'Phone', value: contact.phone },
            { icon: 'i-lucide-building-2', key: 'company', label: 'Company', value: contact.company },
          ]"
          :key="field.key"
          class="flex items-start gap-3"
        >
          <UIcon
            :name="field.icon"
            class="h-4 w-4 mt-0.5 text-gray-400"
          />
          <div class="flex-1">
            <p class="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-0.5">
              {{ field.label }}
            </p>
            <template v-if="editing">
              <input
                v-model="(form as Record<string, any>)[field.key]"
                class="w-full bg-transparent text-sm outline-none border-b border-[hsl(var(--border))] pb-0.5"
                :placeholder="`Add ${field.label.toLowerCase()}...`"
              >
            </template>
            <template v-else>
              <p class="text-sm">
                {{ field.value || '---' }}
              </p>
            </template>
          </div>
        </div>

        <!-- Notes -->
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-file-text"
            class="h-4 w-4 mt-0.5 text-gray-400"
          />
          <div class="flex-1">
            <p class="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-0.5">
              Notes
            </p>
            <template v-if="editing">
              <textarea
                v-model="form.notes"
                class="w-full resize-none bg-transparent text-sm outline-none border-b border-[hsl(var(--border))] pb-0.5 min-h-[60px]"
                placeholder="Add notes..."
              />
            </template>
            <template v-else>
              <p class="text-sm whitespace-pre-wrap">
                {{ contact.notes || '---' }}
              </p>
            </template>
          </div>
        </div>

        <!-- Tags -->
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-tag"
            class="h-4 w-4 mt-0.5 text-gray-400"
          />
          <div class="flex-1">
            <p class="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">
              Tags
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in contact.tags"
                :key="tag"
                class="flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-400"
              >
                {{ tag }}
                <button @click="removeTag(tag)">
                  <UIcon
                    name="i-lucide-x"
                    class="h-3 w-3"
                  />
                </button>
              </span>
              <input
                v-model="newTag"
                type="text"
                placeholder="Add tag..."
                class="w-20 bg-transparent text-xs outline-none placeholder:text-gray-500"
                @keydown.enter="addTag"
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
