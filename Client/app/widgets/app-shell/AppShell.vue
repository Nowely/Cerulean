<script setup lang="ts">
import type { ThreadKind } from '~/shared/types'
import type { Component } from 'vue'
import { useThreadStore, useUIStore } from '~/shared/model'
import { useIsMobile } from '~/shared/lib'
import Sidebar from '~/widgets/sidebar/Sidebar.vue'
import ChatHeader from '~/widgets/chat-view/components/ChatHeader.vue'
import ChatView from '~/widgets/chat-view/ChatView.vue'
import ShoppingView from '~/widgets/shopping-view/ShoppingView.vue'
import NotesView from '~/widgets/notes-view/NotesView.vue'
import ContactsView from '~/widgets/contacts-view/ContactsView.vue'
import TasksView from '~/widgets/tasks-view/TasksView.vue'
import NotificationPanel from '~/widgets/notification-panel/NotificationPanel.vue'
import TaskDetailDrawer from '~/widgets/task-detail/TaskDetailDrawer.vue'
import TaskFormDrawer from '~/widgets/task-form/TaskFormDrawer.vue'
import TaskTemplatePicker from '~/widgets/task-form/TaskTemplatePicker.vue'

const THREAD_VIEW_MAP: Record<ThreadKind, Component> = {
  tasks: TasksView,
  shopping: ShoppingView,
  notes: NotesView,
  contacts: ContactsView,
  chat: ChatView
}

const threadStore = useThreadStore()
const uiStore = useUIStore()
const isMobile = useIsMobile()

const sidebarOpen = computed(() => uiStore.sidebarOpen.value)
const mobileSidebarOpen = computed(() => isMobile.value && sidebarOpen.value)

const activeKind = computed(() => threadStore.activeThread.value?.kind)
const contentComponent = computed(() => {
  if (!activeKind.value) return null
  return THREAD_VIEW_MAP[activeKind.value] ?? ChatView
})

const showChatHeader = computed(() => activeKind.value === 'chat')

watch(isMobile, (mobile) => {
  if (!mobile && uiStore.sidebarOpen.value) {
    uiStore.setSidebar(false)
  }
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardPanel
      v-if="!isMobile"
      id="sidebar"
      :default-size="20"
      :min-size="15"
      :max-size="30"
      resizable
    >
      <Sidebar />
    </UDashboardPanel>

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

    <UDashboardPanel id="content">
      <template v-if="threadStore.activeThread.value && contentComponent">
        <ChatHeader v-if="showChatHeader" />
        <component :is="contentComponent" />
      </template>
      <UEmpty
        v-else
        icon="i-lucide-layout-grid"
        title="Welcome to Cerulean"
        description="Select a thread from the sidebar or create a new one"
        :actions="isMobile ? [{ label: 'Open Threads', color: 'primary', onClick: () => uiStore.toggleSidebar() }] : undefined"
      />
    </UDashboardPanel>

    <NotificationPanel />
    <TaskDetailDrawer />
    <TaskFormDrawer />
    <TaskTemplatePicker />
  </UDashboardGroup>
</template>
