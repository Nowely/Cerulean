<script setup lang="ts">
import { useThreadStore, useUIStore, useShoppingStore } from '~/shared/model'
import { useSendMessage } from '~/features/message-send'
import { useToastHelpers, createShoppingItem } from '~/shared/lib'

const threadStore = useThreadStore()
const uiStore = useUIStore()
const shoppingStore = useShoppingStore()
const { execute: sendMessage } = useSendMessage()
const toast = useToastHelpers()

const text = ref('')

function openTaskForm() {
  uiStore.setShowTaskForm(true)
  text.value = ''
}

function openTemplates() {
  uiStore.setShowTemplates(true)
  text.value = ''
}

function handleSend() {
  const trimmed = text.value.trim()
  const thread = threadStore.activeThread.value
  if (!trimmed || !thread) {
    toast.warning({
      title: 'Cannot send message',
      description: 'Select a thread and type a message first.'
    })
    return
  }

  if (thread.kind === 'shopping') {
    const item = createShoppingItem(thread.id, trimmed)
    shoppingStore.add(item)
    threadStore.updateLastActivity(thread.id, new Date().toISOString())
  } else {
    sendMessage({ content: trimmed, type: 'text' })
    toast.success({
      title: 'Message sent',
      icon: 'i-lucide-check'
    })
  }

  text.value = ''
}
</script>

<template>
  <div
    v-if="threadStore.activeThread.value"
    class="shrink-0 border-t border-default bg-white dark:bg-muted px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
  >
    <UChatPrompt
      v-model="text"
      :placeholder="threadStore.activeThread.value?.kind === 'shopping' ? 'Add an item...' : 'Message...'"
      variant="pill"
      @submit="handleSend"
    >
      <template #leading>
        <UDropdownMenu
          :items="[[{ label: 'New Task', icon: 'i-lucide-list-todo', click: openTaskForm }, { label: 'From Template', icon: 'i-lucide-file-text', click: openTemplates }]]"
        >
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="lg"
            class="rounded-full"
            aria-label="Quick actions"
          />
        </UDropdownMenu>
      </template>

      <template #trailing>
        <UChatPromptSubmit
          :color="text.trim() ? 'primary' : 'neutral'"
          :disabled="!text.trim()"
          data-testid="send-message-btn"
        />
      </template>
    </UChatPrompt>
  </div>
</template>
