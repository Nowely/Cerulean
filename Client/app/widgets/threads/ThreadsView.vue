<script setup lang="ts">
import type { ThreadKind } from '~/shared/types'
import type { Component } from 'vue'
import { useThreadStore } from '~/shared/model'
import Sidebar from '~/widgets/sidebar/Sidebar.vue'
import SidebarFooter from '~/widgets/sidebar/components/SidebarFooter.vue'
import ChatHeader from '~/widgets/threads/components/chat-view/components/ChatHeader.vue'
import ChatView from '~/widgets/threads/components/chat-view/ChatView.vue'
import ListView from '~/widgets/threads/components/list-view/ListView.vue'
import NotesView from '~/widgets/threads/components/notes-view/NotesView.vue'
import ContactsView from '~/widgets/threads/components/contacts-view/ContactsView.vue'
import TasksView from '~/widgets/threads/components/tasks-view/TasksView.vue'
import NotificationPanel from '~/widgets/notification-panel/NotificationPanel.vue'
import TaskDetailDrawer from '~/widgets/threads/components/task-detail/TaskDetailDrawer.vue'
import TaskFormDrawer from '~/widgets/threads/components/task-form/TaskFormDrawer.vue'
import TaskTemplatePicker from '~/widgets/threads/components/task-form/TaskTemplatePicker.vue'

const THREAD_VIEW_MAP: Record<ThreadKind, Component> = {
  tasks: TasksView,
  shopping: ListView,
  checklist: ListView,
  notes: NotesView,
  contacts: ContactsView,
  chat: ChatView
}

const threadStore = useThreadStore()

const activeKind = computed(() => threadStore.activeThread.value?.kind)
const contentComponent = computed(() => {
  if (!activeKind.value) return null
  return THREAD_VIEW_MAP[activeKind.value] ?? ChatView
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      id="sidebar"
      :default-size="20"
      :min-size="15"
      :max-size="30"
      resizable
      collapsible
      :ui="{ footer: 'border-t border-default' }"
    >
      <Sidebar />
      <template #footer>
        <SidebarFooter />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="content">
      <template #header>
        <ChatHeader v-if="threadStore.activeThread.value && activeKind === 'chat'" />
      </template>

      <template v-if="threadStore.activeThread.value && contentComponent">
        <component :is="contentComponent" />
      </template>
      <UEmpty
        v-else
        icon="i-lucide-layout-grid"
        title="Welcome to Cerulean"
        description="Select a thread from the sidebar or create a new one"
      />
    </UDashboardPanel>

    <NotificationPanel />
    <TaskDetailDrawer />
    <TaskFormDrawer />
    <TaskTemplatePicker />
  </UDashboardGroup>
</template>
