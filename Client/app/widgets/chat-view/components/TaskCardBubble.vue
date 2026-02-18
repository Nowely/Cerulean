<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useUserStore, useTaskStore } from '~/shared/model'
import { formatTime, isDueOverdue, isDueSoon } from '~/shared/utils'
import UserAvatar from '~/shared/ui/UserAvatar.vue'
import StatusBadge from '~/shared/ui/StatusBadge.vue'
import PriorityBadge from '~/shared/ui/PriorityBadge.vue'
import AvatarStack from '~/shared/ui/AvatarStack.vue'

interface Props {
  message: Message
  showAvatar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true
})

const userStore = useUserStore()
const taskStore = useTaskStore()

const sender = computed(() => userStore.getUserById(props.message.senderId))
const task = computed(() => props.message.taskId ? taskStore.getTaskById(props.message.taskId) : null)
const isOwn = computed(() => props.message.senderId === userStore.currentUserId.value)

const assigneeUsers = computed(() =>
  task.value?.assignees.map(id => userStore.getUserById(id)).filter(Boolean) ?? []
)

const subtasks = computed(() =>
  task.value ? taskStore.getSubtasks(task.value!.id) : []
)

const completedSubtasks = computed(() =>
  subtasks.value.filter(s => s.status === 'done').length
)

const overdue = computed(() =>
  task.value && isDueOverdue(task.value.dueDate) && task.value.status !== 'done'
)

const dueSoon = computed(() =>
  task.value && isDueSoon(task.value.dueDate) && task.value.status !== 'done'
)

function getStatusColor(status: string): string {
  return `var(--status-${status})`
}

function handleClick() {
  if (task.value) {
    taskStore.setActive(task.value.id)
  }
}
</script>

<template>
  <div
    v-if="task"
    class="flex gap-2 px-3"
    :class="isOwn ? 'flex-row-reverse' : 'flex-row'"
  >
    <UserAvatar
      v-if="showAvatar && !isOwn"
      :user="sender"
      size="sm"
      class="mt-1"
    />
    <div
      v-else-if="!isOwn"
      class="w-7 shrink-0"
    />

    <div
      class="flex max-w-[85%] flex-col gap-0.5"
      :class="isOwn ? 'items-end' : 'items-start'"
    >
      <span
        v-if="showAvatar && !isOwn"
        class="px-1 text-[11px] font-medium text-primary-500"
      >
        {{ sender?.name }}
      </span>

      <button
        class="w-full text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
        :class="isOwn ? 'rounded-br-md' : 'rounded-bl-md'"
        @click="handleClick"
      >
        <div class="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div
            class="w-1 shrink-0"
            :style="{ backgroundColor: getStatusColor(task.status) }"
          />
          <div class="flex flex-1 flex-col gap-2 p-3">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-semibold leading-snug">
                {{ task.title }}
              </h3>
              <UIcon
                name="i-lucide-chevron-right"
                class="h-4 w-4 shrink-0 text-gray-400 mt-0.5"
              />
            </div>

            <p
              v-if="task.description"
              class="text-[13px] leading-relaxed text-gray-500 line-clamp-2"
            >
              {{ task.description }}
            </p>

            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge :status="task.status" />
              <PriorityBadge :priority="task.priority" />

              <span
                v-if="task.dueDate"
                class="inline-flex items-center gap-1 text-[11px]"
                :class="overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-500 font-medium' : 'text-gray-500'"
              >
                <UIcon
                  name="i-lucide-calendar"
                  class="h-3 w-3"
                />
                {{ new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
              </span>

              <span
                v-if="subtasks.length > 0"
                class="inline-flex items-center gap-1 text-[11px] text-gray-500"
              >
                <UIcon
                  name="i-lucide-list-checks"
                  class="h-3 w-3"
                />
                {{ completedSubtasks }}/{{ subtasks.length }}
              </span>
            </div>

            <div
              v-if="task.tags.length > 0"
              class="flex flex-wrap gap-1"
            >
              <span
                v-for="tag in task.tags"
                :key="tag"
                class="rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
              >
                {{ tag }}
              </span>
            </div>

            <AvatarStack
              v-if="assigneeUsers.length > 0"
              :users="assigneeUsers"
              :max-visible="4"
              size="sm"
            />
          </div>
        </div>
      </button>

      <span class="px-1 text-[10px] text-gray-500">
        {{ formatTime(message.timestamp) }}
      </span>
    </div>
  </div>
</template>
