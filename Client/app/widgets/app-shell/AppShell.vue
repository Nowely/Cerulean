<script setup lang="ts">
import { useThreadStore } from '~/entities/thread'
import { useUIStore } from '~/shared/model'
import { useIsMobile } from '~/composables/useIsMobile'
import Sidebar from '~/widgets/sidebar/Sidebar.vue'
import ChatHeader from '~/widgets/chat-view/components/ChatHeader.vue'
import ChatView from '~/widgets/chat-view/ChatView.vue'
import NotificationPanel from '~/widgets/notification-panel/NotificationPanel.vue'
import TaskDetailDrawer from '~/widgets/task-detail/TaskDetailDrawer.vue'
import TaskFormDrawer from '~/widgets/task-form/TaskFormDrawer.vue'
import TaskTemplatePicker from '~/widgets/task-form/TaskTemplatePicker.vue'

const threadStore = useThreadStore()
const uiStore = useUIStore()
const isMobile = useIsMobile()

const sidebarOpen = computed(() => uiStore.sidebarOpen.value)
const mobileSidebarOpen = computed(() => isMobile.value && sidebarOpen.value)

watch(isMobile, (mobile) => {
  if (!mobile && uiStore.sidebarOpen.value) {
    uiStore.setSidebar(false)
  }
})
</script>

<template>
  <div class="flex h-dvh w-full overflow-hidden">
    <aside
      v-if="!isMobile"
      class="w-80 shrink-0 border-r border-gray-200 dark:border-gray-700"
    >
      <Sidebar />
    </aside>

    <USlideover
      :open="mobileSidebarOpen"
      side="left"
      :ui="{ content: 'w-80' }"
      @update:open="(o) => uiStore.setSidebar(o as boolean)"
    >
      <template #content>
        <Sidebar />
      </template>
    </USlideover>

    <main class="flex flex-1 flex-col overflow-hidden">
      <template v-if="threadStore.activeThread.value">
        <ChatHeader />
        <ChatView />
      </template>
      <template v-else>
        <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-500/10">
            <UIcon
              name="i-lucide-message-square"
              class="h-10 w-10 text-primary-500"
            />
          </div>
          <div class="text-center">
            <h2 class="text-lg font-semibold">
              Welcome to TaskChat
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Select a thread from the sidebar to start managing tasks
            </p>
          </div>
          <button
            v-if="isMobile"
            class="mt-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            data-testid="open-threads-btn"
            @click="uiStore.toggleSidebar()"
          >
            Open Threads
          </button>
        </div>
      </template>
    </main>

    <NotificationPanel />
    <TaskDetailDrawer />
    <TaskFormDrawer />
    <TaskTemplatePicker />
  </div>
</template>
