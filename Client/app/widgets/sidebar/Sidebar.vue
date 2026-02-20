<script setup lang="ts">
import type { ThreadKind } from '~/shared/types'
import { useThreadStore } from '~/shared/model'
import { useThreadManage } from '~/features/thread-manage'
import { useToastHelpers, THREAD_KINDS } from '~/shared/lib'
import SidebarHeader from './components/SidebarHeader.vue'
import SidebarFooter from './components/SidebarFooter.vue'
import ThreadItem from './components/ThreadItem.vue'

defineOptions({
  name: 'AppSidebar'
})

const threadStore = useThreadStore()
const { create: createThreadAction } = useThreadManage()
const toast = useToastHelpers()

const showNewThread = ref(false)
const newThreadName = ref('')
const newThreadKind = ref<ThreadKind>('tasks')
const creationStep = ref<'kind' | 'name'>('kind')

const activeThreadId = computed(() => threadStore.activeThreadId.value)

const pinnedThreads = computed(() =>
  threadStore.sortedThreads.value.filter((t: { pinned: boolean }) => t.pinned)
)

const unpinnedThreads = computed(() =>
  threadStore.sortedThreads.value
    .filter((t: { pinned: boolean }) => !t.pinned)
    .sort((a: { lastActivity: string }, b: { lastActivity: string }) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
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
    kind: newThreadKind.value
  })

  if (thread) {
    toast.success({
      title: 'Thread created',
      description: `${thread.name} is ready`,
      icon: 'i-lucide-check-circle'
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
}
</script>

<template>
  <SidebarHeader @new-thread="openNewThread" />

  <template v-if="pinnedThreads.length > 0">
    <USeparator
      label="Pinned"
      class="px-3 pt-3"
    />
    <ThreadItem
      v-for="thread in pinnedThreads"
      :key="thread.id"
      :thread="thread"
      :is-active="activeThreadId === thread.id"
      @click="selectThread(thread.id)"
    />
  </template>

  <template v-if="unpinnedThreads.length > 0">
    <USeparator
      v-if="pinnedThreads.length > 0"
      label="All Threads"
      class="px-3 pt-3"
    />
    <ThreadItem
      v-for="thread in unpinnedThreads"
      :key="thread.id"
      :thread="thread"
      :is-active="activeThreadId === thread.id"
      @click="selectThread(thread.id)"
    />
  </template>

  <UEmpty
    v-if="threadStore.threads.value.length === 0"
    title="No threads found"
    class="py-12"
  />

  <USlideover
    v-model:open="showNewThread"
    side="right"
  >
    <template #content>
      <template v-if="creationStep === 'kind'">
        <h3 class="text-lg font-semibold mb-1">
          New Thread
        </h3>
        <p class="text-sm text-muted mb-4">
          Choose what kind of thread to create
        </p>
        <div class="flex flex-col gap-2">
          <UButton
            v-for="opt in kindOptions"
            :key="opt.kind"
            color="neutral"
            variant="ghost"
            block
            class="justify-start h-auto p-3"
            @click="selectKind(opt.kind)"
          >
            <template #leading>
              <UAvatar
                :icon="opt.icon"
                size="lg"
                :style="{ backgroundColor: opt.color }"
                class="text-white shrink-0"
              />
            </template>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-left">
                {{ opt.label }}
              </p>
              <p class="text-xs text-muted text-left">
                {{ opt.description }}
              </p>
            </div>
          </UButton>
        </div>
      </template>

      <template v-else>
        <div class="flex items-center gap-2 mb-4">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="backToKindPicker"
          />
          <UAvatar
            :style="{ backgroundColor: THREAD_KINDS[newThreadKind].color }"
            size="sm"
          >
            <UIcon
              :name="THREAD_KINDS[newThreadKind].icon"
              class="h-4 w-4 text-white"
            />
          </UAvatar>
          <h3 class="text-sm font-semibold">
            New {{ THREAD_KINDS[newThreadKind].label }} Thread
          </h3>
        </div>

        <UInput
          v-model="newThreadName"
          :placeholder="`${THREAD_KINDS[newThreadKind].label} name...`"
          data-testid="new-thread-name-input"
          autofocus
          class="mb-3"
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
      </template>
    </template>
  </USlideover>
</template>
