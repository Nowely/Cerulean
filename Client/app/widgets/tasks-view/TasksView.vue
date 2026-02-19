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
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          @click="openNewTaskForm"
        >
          <UIcon
            name="i-lucide-plus"
            class="h-4 w-4"
          />
        </button>
      </template>
    </ContentPanelHeader>

    <!-- Status filter tabs -->
    <div class="border-b border-[hsl(var(--border))] px-4 py-2">
      <div class="flex gap-1 overflow-x-auto scrollbar-thin pb-0.5">
        <button
          v-for="status in statuses"
          :key="status"
          class="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
          :class="statusFilter === status
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'text-gray-500 hover:bg-[hsl(var(--muted))]'"
          @click="statusFilter = status"
        >
          {{ status === 'all' ? 'All' : STATUS_CONFIG[status]?.label ?? status }}
          <span
            v-if="statusCounts[status]"
            class="ml-0.5 text-[10px] opacity-70"
          >
            {{ statusCounts[status] }}
          </span>
        </button>
      </div>
    </div>

    <!-- Task list -->
    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <div
        v-if="filteredTasks.length === 0"
        class="flex flex-col items-center justify-center gap-3 px-6 py-16"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <UIcon
            name="i-lucide-check-square"
            class="h-8 w-8 text-emerald-500"
          />
        </div>
        <p class="text-sm text-gray-500">
          {{ statusFilter === 'all' ? 'No tasks yet' : 'No tasks with this status' }}
        </p>
        <button
          v-if="statusFilter === 'all'"
          class="mt-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
          @click="openNewTaskForm"
        >
          Create a task
        </button>
      </div>

      <div class="flex flex-col gap-0.5 p-2">
        <button
          v-for="task in filteredTasks"
          :key="task.id"
          class="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[hsl(var(--muted))]"
          :class="{ 'bg-emerald-500/5': taskStore.activeTaskId.value === task.id }"
          @click="openTask(task.id)"
        >
          <div class="mt-0.5 shrink-0">
            <StatusBadge
              :status="task.status"
              :show-label="false"
            />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-sm font-medium leading-snug">{{ task.title }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <PriorityBadge
                :priority="task.priority"
                :show-label="false"
              />
              <span
                v-for="tag in task.tags.slice(0, 3)"
                :key="tag"
                class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400"
              >
                {{ tag }}
              </span>
              <span
                v-if="task.dueDate"
                class="text-[10px] text-gray-500"
              >
                Due {{ relativeTime(task.dueDate) }}
              </span>
            </div>
          </div>
          <div class="shrink-0">
            <AvatarStack
              v-if="task.assignees.length > 0"
              :users="task.assignees.map(id => userStore.getUserById(id)).filter(Boolean) as any[]"
              :max-visible="2"
              size="sm"
            />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
