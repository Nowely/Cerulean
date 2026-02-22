<script setup lang="ts">
import { useBlockStore, useUIStore } from '~/shared/model'
import { useSendMessage } from '~/features/message-send'
import { useToastHelpers, createBlock } from '~/shared/lib'
import type { ShoppingItemType } from '~/shared/types/shopping'

const blockStore = useBlockStore()
const uiStore = useUIStore()
const { execute: sendMessage } = useSendMessage()
const toast = useToastHelpers()

const text = ref('')
const itemType = ref<ShoppingItemType>('checkable')

const isShoppingThread = computed(() => blockStore.activeThread.value?.data.kind === 'shopping')

function toggleItemType() {
  itemType.value = itemType.value === 'checkable' ? 'trackable' : 'checkable'
}

function openTaskForm() {
  uiStore.setShowTaskForm(true)
  text.value = ''
}

function openTemplates() {
  uiStore.setShowTemplates(true)
  text.value = ''
}

async function handleSend() {
  const trimmed = text.value.trim()
  const thread = blockStore.activeThread.value
  if (!trimmed || !thread) {
    toast.warning({
      title: 'Cannot send message',
      description: 'Select a thread and type a message first.'
    })
    return
  }

  if (thread.data.kind === 'shopping') {
    const item = createBlock({
      name: trimmed,
      type: 'shopping-item',
      data: {
        type: itemType.value,
        checked: false,
        collected: 0,
        sortOrder: blockStore.getThreadShoppingItems(thread.id).length
      },
      parents: [thread.id]
    })
    await blockStore.add(item)
    await blockStore.update(thread.id, {
      data: {
        ...thread.data,
        lastActivity: new Date().toISOString()
      }
    })
  } else {
    await sendMessage({ content: trimmed, type: 'text' })
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
    v-if="blockStore.activeThread.value"
    class="shrink-0 border-t border-default bg-white dark:bg-muted px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
  >
    <UChatPrompt
      v-model="text"
      :placeholder="blockStore.activeThread.value?.data.kind === 'shopping' ? 'Add an item...' : 'Message...'"
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
        <UButton
          v-if="isShoppingThread"
          :icon="itemType === 'checkable' ? 'i-lucide-check-square' : 'i-lucide-hash'"
          color="neutral"
          variant="ghost"
          size="lg"
          class="rounded-full"
          :aria-label="itemType === 'checkable' ? 'Checkable item (click for trackable)' : 'Trackable item (click for checkable)'"
          @click="toggleItemType"
        />
        <UChatPromptSubmit
          :color="text.trim() ? 'primary' : 'neutral'"
          :disabled="!text.trim()"
          data-testid="send-message-btn"
        />
      </template>
    </UChatPrompt>
  </div>
</template>
