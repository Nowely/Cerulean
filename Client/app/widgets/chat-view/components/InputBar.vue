<script setup lang="ts">
import { useThreadStore, useUIStore } from '~/shared/model'
import { useSendMessage } from '~/features/message-send'
import { useToastHelpers } from '~/shared/lib'

const threadStore = useThreadStore()
const uiStore = useUIStore()
const { execute: sendMessage } = useSendMessage()
const toast = useToastHelpers()

const text = ref('')
const showCommands = ref(false)
const textareaRef = ref<HTMLTextAreaElement>()

watch(text, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px'
  }
})

function openTaskForm() {
  uiStore.setShowTaskForm(true)
  text.value = ''
  showCommands.value = false
}

function openTemplates() {
  uiStore.setShowTemplates(true)
  text.value = ''
  showCommands.value = false
}

function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed || !threadStore.activeThread.value) {
    toast.warning({
      title: 'Cannot send message',
      description: 'Select a thread and type a message first.'
    })
    return
  }

  sendMessage({ content: trimmed, type: 'text' })
  toast.success({
    title: 'Message sent',
    icon: 'i-lucide-check'
  })
  text.value = ''
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleSlashCommand(cmd: string) {
  if (cmd === '/task' || cmd.startsWith('/task ')) {
    openTaskForm()
    toast.primary({
      title: 'Task form opened',
      icon: 'i-lucide-list-todo'
    })
  } else if (cmd === '/template' || cmd.startsWith('/template ')) {
    openTemplates()
    toast.primary({
      title: 'Template picker opened',
      icon: 'i-lucide-file-text'
    })
  } else {
    handleSend()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (text.value.trim().startsWith('/')) {
      handleSlashCommand(text.value.trim())
    } else {
      handleSend()
    }
  }
}

function handleInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  text.value = val
  showCommands.value = val === '/'
}
</script>

<template>
  <div
    v-if="threadStore.activeThread.value"
    class="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
  >
    <div
      v-if="showCommands"
      class="mb-2 flex flex-col gap-0.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1"
    >
      <button
        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="openTaskForm"
      >
        <UIcon
          name="i-lucide-list-todo"
          class="h-4 w-4 text-primary-500"
        />
        <span class="font-medium">/task</span>
        <span class="text-gray-500">Create a new task</span>
      </button>
      <button
        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="openTemplates"
      >
        <UIcon
          name="i-lucide-file-text"
          class="h-4 w-4 text-amber-500"
        />
        <span class="font-medium">/template</span>
        <span class="text-gray-500">Use a task template</span>
      </button>
    </div>

    <div class="flex items-end gap-2">
      <UPopover>
        <template #default>
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="lg"
            class="rounded-full"
            aria-label="Quick actions"
          />
        </template>
        <template #content>
          <div class="p-1 w-52">
            <button
              class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="openTaskForm"
            >
              <UIcon
                name="i-lucide-list-todo"
                class="h-4 w-4 text-primary-500"
              />
              New Task
            </button>
            <button
              class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="openTemplates"
            >
              <UIcon
                name="i-lucide-file-text"
                class="h-4 w-4 text-amber-500"
              />
              From Template
            </button>
          </div>
        </template>
      </UPopover>

      <UTextarea
        ref="textareaRef"
        :model-value="text"
        placeholder="Message or type '/' for commands..."
        :rows="1"
        autoresize
        :max-rows="5"
        data-testid="message-input"
        :ui="{
          base: 'flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm leading-relaxed'
        }"
        @update:model-value="text = $event; showCommands = $event === '/'"
        @keydown="handleKeyDown"
      />

      <UButton
        :icon="text.trim() ? 'i-lucide-send' : undefined"
        :color="text.trim() ? 'primary' : 'neutral'"
        variant="solid"
        size="lg"
        class="rounded-full"
        :class="!text.trim() && 'text-gray-400'"
        :disabled="!text.trim()"
        data-testid="send-message-btn"
        aria-label="Send message"
        @click="text.trim().startsWith('/') ? handleSlashCommand(text.trim()) : handleSend()"
      />
    </div>
  </div>
</template>
