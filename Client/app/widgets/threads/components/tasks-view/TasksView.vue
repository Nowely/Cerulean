<script setup lang="ts">
import type { TaskStatus } from '~/shared/types'
import { useBlockStore, useUIStore, useUserStore } from '~/shared/model'
import { STATUS_CONFIG } from '~/shared/lib'
import PropertyBadge from '~/shared/ui/PropertyBadge.vue'
import AvatarStack from '~/shared/ui/AvatarStack.vue'
import { relativeTime } from '~/shared/utils'

const blockStore = useBlockStore()
const userStore = useUserStore()
const uiStore = useUIStore()

const statusFilter = ref<TaskStatus | 'all'>('all')

const threadId = computed(() => blockStore.activeThreadId.value ?? '')

const allTasks = computed(() => blockStore.getThreadTasks(threadId.value))

const filteredTasks = computed(() => {
  if (statusFilter.value === 'all') return allTasks.value
  return allTasks.value.filter(t => t.data.status === statusFilter.value)
})

const statusCounts = computed(() => {
  const counts: Record<string, number> = { all: allTasks.value.length }
  for (const task of allTasks.value) {
    counts[task.data.status] = (counts[task.data.status] ?? 0) + 1
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
  blockStore.setActiveTask(taskId)
}

function openNewTaskForm() {
  uiStore.setShowTaskForm(true)
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UDashboardNavbar
      :title="blockStore.activeThread.value?.name"
      icon="i-lucide-check-square"
    >
      <template #trailing>
        <UBadge
          color="neutral"
          variant="subtle"
          size="xs"
        >
          {{ allTasks.length }} tasks
        </UBadge>
      </template>
      <template #right>
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="openNewTaskForm"
        />
      </template>
    </UDashboardNavbar>

    <UDashboardToolbar>
      <UTabs
        v-model="statusFilter"
        :items="statusTabs"
        color="neutral"
        variant="pill"
        size="xs"
        :content="false"
      />
    </UDashboardToolbar>

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
          compact
          class="cursor-pointer transition-colors hover:bg-muted"
          :class="{ 'bg-emerald-500/5': blockStore.activeTaskId.value === task.id }"
          @click="openTask(task.id)"
        >
          <div class="flex items-start gap-3">
            <PropertyBadge
              type="status"
              :value="task.data.status"
              :show-label="false"
              class="mt-0.5"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="text-sm font-medium leading-snug">{{ task.name }}</span>
              <div class="flex flex-wrap items-center gap-2">
                <PropertyBadge
                  type="priority"
                  :value="task.data.priority"
                  :show-label="false"
                />
                <UBadge
                  v-for="tag in task.data.tags.slice(0, 3)"
                  :key="tag"
                  :label="tag"
                  variant="soft"
                  size="xs"
                />
                <span
                  v-if="task.data.dueDate"
                  class="text-xs text-muted"
                >
                  Due {{ relativeTime(task.data.dueDate) }}
                </span>
              </div>
            </div>
            <AvatarStack
              v-if="task.data.assignees.length > 0"
              :users="task.data.assignees.map(id => userStore.getUserById(id)).filter(Boolean) as any[]"
              :max-visible="2"
              size="sm"
            />
          </div>
        </UCard>
      </div>
    </UScrollArea>
  </div>
</template>
