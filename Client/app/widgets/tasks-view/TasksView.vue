<script setup lang="ts">
import type { TaskStatus } from '~/shared/types'
import { useTaskStore, useThreadStore, useUIStore, useUserStore } from '~/shared/model'
import { STATUS_CONFIG } from '~/shared/lib'
import StatusBadge from '~/shared/ui/StatusBadge.vue'
import PriorityBadge from '~/shared/ui/PriorityBadge.vue'
import AvatarStack from '~/shared/ui/AvatarStack.vue'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'
import { relativeTime } from '~/shared/utils'

const threadStore = useThreadStore()
const taskStore = useTaskStore()
const userStore = useUserStore()
const uiStore = useUIStore()

const statusFilter = ref<TaskStatus | 'all'>('all')

const threadId = computed(() => threadStore.activeThreadId.value ?? '')

const allTasks = computed(() => taskStore.threadTasks(threadId.value))

const filteredTasks = computed(() => {
  if (statusFilter.value === 'all') return allTasks.value
  return allTasks.value.filter(t => t.status === statusFilter.value)
})

const statusCounts = computed(() => {
  const counts: Record<string, number> = { all: allTasks.value.length }
  for (const task of allTasks.value) {
    counts[task.status] = (counts[task.status] ?? 0) + 1
  }
  return counts
})

const statuses: (TaskStatus | 'all')[] = ['all', 'todo', 'in-progress', 'review', 'done', 'blocked']

const statusTabs = computed(() =>
  statuses.map(status => ({
    label: status === 'all' ? 'All' : STATUS_CONFIG[status]?.label ?? status,
    value: status,
    badge: statusCounts.value[status] || undefined
  }))
)

function openTask(taskId: string) {
  taskStore.setActive(taskId)
}

function openNewTaskForm() {
  uiStore.setShowTaskForm(true)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <ContentPanelHeader>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-check-square"
          class="h-5 w-5 text-emerald-500"
        />
        <h2 class="text-lg font-semibold">
          {{ threadStore.activeThread.value?.name }}
        </h2>
        <span class="text-xs text-gray-500">
          {{ allTasks.length }} tasks
        </span>
      </div>
      <template #end>
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="openNewTaskForm"
        />
      </template>
    </ContentPanelHeader>

    <div class="border-b border-[hsl(var(--border))] px-4 py-2">
      <UTabs
        v-model="statusFilter"
        :items="statusTabs"
        color="neutral"
        variant="pill"
        size="xs"
        :content="false"
      />
    </div>

    <UScrollArea class="flex-1">
      <UEmpty
        v-if="filteredTasks.length === 0"
        icon="i-lucide-check-square"
        :title="statusFilter === 'all' ? 'No tasks yet' : 'No tasks with this status'"
        :actions="statusFilter === 'all' ? [{ label: 'Create a task', color: 'primary', onClick: openNewTaskForm }] : undefined"
        class="py-16"
      />

      <div class="flex flex-col gap-0.5 p-2">
        <UCard
          v-for="task in filteredTasks"
          :key="task.id"
          variant="soft"
          class="cursor-pointer transition-colors hover:bg-[hsl(var(--muted))]"
          :class="{ 'bg-emerald-500/5': taskStore.activeTaskId.value === task.id }"
          :ui="{ body: 'p-3' }"
          @click="openTask(task.id)"
        >
          <div class="flex items-start gap-3">
            <StatusBadge
              :status="task.status"
              :show-label="false"
              class="mt-0.5"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="text-sm font-medium leading-snug">{{ task.title }}</span>
              <div class="flex flex-wrap items-center gap-2">
                <PriorityBadge
                  :priority="task.priority"
                  :show-label="false"
                />
                <UBadge
                  v-for="tag in task.tags.slice(0, 3)"
                  :key="tag"
                  color="primary"
                  variant="soft"
                  size="xs"
                >
                  {{ tag }}
                </UBadge>
                <span
                  v-if="task.dueDate"
                  class="text-[10px] text-gray-500"
                >
                  Due {{ relativeTime(task.dueDate) }}
                </span>
              </div>
            </div>
            <AvatarStack
              v-if="task.assignees.length > 0"
              :users="task.assignees.map(id => userStore.getUserById(id)).filter(Boolean) as any[]"
              :max-visible="2"
              size="sm"
            />
          </div>
        </UCard>
      </div>
    </UScrollArea>
  </div>
</template>
