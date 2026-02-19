<script setup lang="ts">
import type { ThreadKind } from '~/shared/types'
import { useThreadStore, useUIStore } from '~/shared/model'
import { useThreadManage } from '~/features/thread-manage'
import { useIsMobile, useToastHelpers, THREAD_KINDS } from '~/shared/lib'
import SidebarHeader from './components/SidebarHeader.vue'
import SidebarFooter from './components/SidebarFooter.vue'
import ThreadItem from './components/ThreadItem.vue'

defineOptions({
  name: 'AppSidebar',
})

const threadStore = useThreadStore()
const uiStore = useUIStore()
const { create: createThreadAction, results } = useThreadManage()
const isMobile = useIsMobile()
const toast = useToastHelpers()

const showNewThread = ref(false)
const newThreadName = ref('')
const newThreadKind = ref<ThreadKind>('tasks')
const creationStep = ref<'kind' | 'name'>('kind')

const activeThreadId = computed(() => threadStore.activeThreadId.value)

const pinnedThreads = computed(() =>
  results.value.filter((t: { pinned: boolean }) => t.pinned),
)

const unpinnedThreads = computed(() =>
  results.value
    .filter((t: { pinned: boolean }) => !t.pinned)
    .sort((a: { lastActivity: string }, b: { lastActivity: string }) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()),
)

const kindOptions = computed(() => Object.values(THREAD_KINDS))

function selectKind(kind: ThreadKind) {
  newThreadKind.value = kind
  creationStep.value = 'name'
}

function handleCreateThread() {
  if (!newThreadName.value.trim()) {
    toast.warning({ title: 'Thread name is required' })
    return
  }

  const thread = createThreadAction({
    name: newThreadName.value.trim(),
    kind: newThreadKind.value,
  })

  if (thread) {
    toast.success({
      title: 'Thread created',
      description: `${thread.name} is ready`,
      icon: 'i-lucide-check-circle',
    })
  }

  showNewThread.value = false
  newThreadName.value = ''
  creationStep.value = 'kind'
}

function openNewThread() {
  creationStep.value = 'kind'
  newThreadName.value = ''
  showNewThread.value = true
}

function backToKindPicker() {
  creationStep.value = 'kind'
}

function selectThread(threadId: string) {
  threadStore.setActive(threadId)
  uiStore.setSidebar(false)
}
</script>

<template>
  <div class="flex h-full flex-col bg-[hsl(var(--sidebar-background))]">
    <SidebarHeader @new-thread="openNewThread" />

    <div
      class="flex-1 overflow-y-auto scrollbar-thin"
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
            @click="selectThread(thread.id)"
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
            @click="selectThread(thread.id)"
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
      :ui="{ content: 'max-h-[70dvh]' }"
    >
      <template #content>
        <div class="p-4">
          <template v-if="creationStep === 'kind'">
            <h3 class="text-lg font-semibold mb-1">
              New Thread
            </h3>
            <p class="text-sm text-gray-500 mb-4">
              Choose what kind of thread to create
            </p>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="opt in kindOptions"
                :key="opt.kind"
                class="flex items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[hsl(var(--muted))]"
                @click="selectKind(opt.kind)"
              >
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  :style="{ backgroundColor: opt.color }"
                >
                  <UIcon
                    :name="opt.icon"
                    class="h-5 w-5"
                  />
                </div>
                <div>
                  <p class="text-sm font-medium">
                    {{ opt.label }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ opt.description }}
                  </p>
                </div>
              </button>
            </div>
          </template>

          <template v-else>
            <div class="flex items-center gap-2 mb-4">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                @click="backToKindPicker"
              >
                <UIcon
                  name="i-lucide-arrow-left"
                  class="h-4 w-4"
                />
              </button>
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full text-white"
                :style="{ backgroundColor: THREAD_KINDS[newThreadKind].color }"
              >
                <UIcon
                  :name="THREAD_KINDS[newThreadKind].icon"
                  class="h-4 w-4"
                />
              </div>
              <div>
                <h3 class="text-sm font-semibold">
                  New {{ THREAD_KINDS[newThreadKind].label }} Thread
                </h3>
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <UInput
                v-model="newThreadName"
                :placeholder="`${THREAD_KINDS[newThreadKind].label} name...`"
                data-testid="new-thread-name-input"
                autofocus
                @keydown.enter="handleCreateThread"
              />

              <UButton
                block
                :disabled="!newThreadName.trim()"
                data-testid="create-thread-submit-btn"
                @click="handleCreateThread"
              >
                Create Thread
              </UButton>
            </div>
          </template>
        </div>
      </template>
    </USlideover>
  </div>
</template>
