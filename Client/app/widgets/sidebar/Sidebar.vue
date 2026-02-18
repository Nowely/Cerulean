<script setup lang="ts">
import { useThreadStore } from '~/entities/thread/store'
import { useUIStore } from '~/entities/ui/store'
import { useCreateThread } from '~/features/create-thread/useCreateThread'
import { useSearchThreads } from '~/features/search-threads/useSearchThreads'
import { useIsMobile } from '~/composables/useIsMobile'
import SidebarHeader from './components/SidebarHeader.vue'
import SidebarFooter from './components/SidebarFooter.vue'
import ThreadItem from './components/ThreadItem.vue'
import type { Thread } from '~/shared/types'

const threadStore = useThreadStore()
const uiStore = useUIStore()
const { execute: createThreadAction } = useCreateThread()
const { results, setSearch } = useSearchThreads()
const isMobile = useIsMobile()
const toast = useToast()

const showNewThread = ref(false)
const newThreadName = ref('')
const newThreadType = ref<Thread['type']>('project')

const activeThreadId = computed(() => threadStore.activeThreadId)

const pinnedThreads = computed(() =>
  results.value.filter(t => t.pinned)
)

const unpinnedThreads = computed(() =>
  results.value
    .filter(t => !t.pinned)
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
)

function handleCreateThread() {
  if (!newThreadName.value.trim()) {
    toast.add({
      title: 'Thread name is required',
      color: 'warning',
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  const thread = createThreadAction({
    name: newThreadName.value.trim(),
    type: newThreadType.value
  })

  if (thread) {
    toast.add({
      title: 'Thread created',
      description: `${thread.name} is ready`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  }

  showNewThread.value = false
  newThreadName.value = ''
}

function openNewThread() {
  showNewThread.value = true
}
</script>

<template>
  <div class="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
    <SidebarHeader @new-thread="openNewThread" />

    <div
      class="flex-1 overflow-y-auto"
      data-testid="thread-list"
    >
      <div class="flex flex-col gap-0.5 px-2 pb-4">
        <template v-if="pinnedThreads.length > 0">
          <p class="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Pinned
          </p>
          <ThreadItem
            v-for="thread in pinnedThreads"
            :key="thread.id"
            :thread="thread"
            :is-active="activeThreadId === thread.id"
            @click="threadStore.setActive(thread.id)"
          />
        </template>

        <template v-if="unpinnedThreads.length > 0">
          <p
            v-if="pinnedThreads.length > 0"
            class="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
          >
            All Threads
          </p>
          <ThreadItem
            v-for="thread in unpinnedThreads"
            :key="thread.id"
            :thread="thread"
            :is-active="activeThreadId === thread.id"
            @click="threadStore.setActive(thread.id)"
          />
        </template>

        <div
          v-if="results.length === 0"
          class="flex flex-col items-center gap-2 px-4 py-12 text-center"
        >
          <p class="text-sm text-gray-500">
            No threads found
          </p>
        </div>
      </div>
    </div>

    <SidebarFooter />

    <USlideover
      v-model:open="showNewThread"
      :side="isMobile ? 'bottom' : 'right'"
      :ui="{ content: 'max-h-[50dvh]' }"
    >
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-1">
            New Thread
          </h3>
          <p class="text-sm text-gray-500 mb-4">
            Create a new project, group, or direct thread
          </p>

          <div class="flex flex-col gap-4">
            <input
              v-model="newThreadName"
              type="text"
              placeholder="Thread name..."
              data-testid="new-thread-name-input"
              class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 text-sm outline-none focus:ring-1 focus:ring-primary-500"
              autofocus
              @keydown.enter="handleCreateThread"
            >

            <div class="flex gap-2">
              <button
                v-for="type in (['project', 'group', 'direct'] as const)"
                :key="type"
                class="flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors"
                :class="newThreadType === type
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'"
                @click="newThreadType = type"
              >
                {{ type }}
              </button>
            </div>

            <UButton
              block
              :disabled="!newThreadName.trim()"
              data-testid="create-thread-submit-btn"
              @click="handleCreateThread"
            >
              Create Thread
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
