<script setup lang="ts">
import { useAppStore, createMessage } from '~/composables/useAppStore'
import type { Message } from '~/types'

const { state, dispatch, activeThread } = useAppStore()
const toast = useToast()

const text = ref('')
const showCommands = ref(false)
const textareaRef = ref<HTMLTextAreaElement>()

watch(text, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px'
  }
})

function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed || !activeThread.value) {
    toast.add({
      title: 'Cannot send message',
      description: 'Select a thread and type a message first.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  const message: Message = createMessage(
    activeThread.value.id,
    trimmed,
    state.value.currentUser.id,
    'text'
  )

  dispatch({ type: 'ADD_MESSAGE', message })
  toast.add({
    title: 'Message sent',
    color: 'success',
    icon: 'i-lucide-check'
  })
  text.value = ''
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleSlashCommand(cmd: string) {
  if (cmd === '/task' || cmd.startsWith('/task ')) {
    dispatch({ type: 'SHOW_TASK_FORM', show: true })
    toast.add({
      title: 'Task form opened',
      color: 'primary',
      icon: 'i-lucide-list-todo'
    })
    text.value = ''
  } else if (cmd === '/template' || cmd.startsWith('/template ')) {
    dispatch({ type: 'SHOW_TEMPLATES', show: true })
    toast.add({
      title: 'Template picker opened',
      color: 'primary',
      icon: 'i-lucide-file-text'
    })
    text.value = ''
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
    v-if="activeThread"
    class="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
  >
    <div v-if="showCommands" class="mb-2 flex flex-col gap-0.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1">
      <button
        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="dispatch({ type: 'SHOW_TASK_FORM', show: true }); text = ''; showCommands = false"
      >
        <UIcon name="i-lucide-list-todo" class="h-4 w-4 text-primary-500" />
        <span class="font-medium">/task</span>
        <span class="text-gray-500">Create a new task</span>
      </button>
      <button
        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="dispatch({ type: 'SHOW_TEMPLATES', show: true }); text = ''; showCommands = false"
      >
        <UIcon name="i-lucide-file-text" class="h-4 w-4 text-amber-500" />
        <span class="font-medium">/template</span>
        <span class="text-gray-500">Use a task template</span>
      </button>
    </div>

    <div class="flex items-end gap-2">
      <UPopover>
        <template #default>
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            aria-label="Quick actions"
          >
            <UIcon name="i-lucide-plus" class="h-5 w-5" />
          </button>
        </template>
        <template #content>
          <div class="p-1 w-52">
            <button
              class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="dispatch({ type: 'SHOW_TASK_FORM', show: true })"
            >
              <UIcon name="i-lucide-list-todo" class="h-4 w-4 text-primary-500" />
              New Task
            </button>
            <button
              class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="dispatch({ type: 'SHOW_TEMPLATES', show: true })"
            >
              <UIcon name="i-lucide-file-text" class="h-4 w-4 text-amber-500" />
              From Template
            </button>
          </div>
        </template>
      </UPopover>

      <textarea
        ref="textareaRef"
        :value="text"
        placeholder="Message or type '/' for commands..."
        rows="1"
        data-testid="message-input"
        class="flex-1 resize-none rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm leading-relaxed placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
        @input="handleInput"
        @keydown="handleKeyDown"
      />

      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all"
        :class="text.trim() ? 'bg-primary-500 text-white' : 'text-gray-400'"
        :disabled="!text.trim()"
        data-testid="send-message-btn"
        aria-label="Send message"
        @click="text.trim().startsWith('/') ? handleSlashCommand(text.trim()) : handleSend()"
      >
        <UIcon name="i-lucide-send" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>
