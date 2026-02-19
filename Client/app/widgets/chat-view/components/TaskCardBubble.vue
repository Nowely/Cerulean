<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useUserStore, useTaskStore } from '~/shared/model'
import { formatTime, getStatusColor, isDueOverdue, isDueSoon, resolveByIds } from '~/shared/utils'
import UserAvatar from '~/shared/ui/UserAvatar.vue'
import PropertyBadge from '~/shared/ui/PropertyBadge.vue'
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
  task.value ? resolveByIds(task.value.assignees, id => userStore.getUserById(id)) : []
)

const subtasks = computed(() =>
  task.value ? taskStore.getSubtasks(task.value.id) : []
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

function handleClick() {
  if (task.value) {
    taskStore.setActive(task.value.id)
  }
}
</script>

<template>
  <div
    v-if="task"
    class="flex items-end gap-2 px-3"
    :class="isOwn ? 'flex-row-reverse' : 'flex-row'"
  >
    <UserAvatar
      v-if="showAvatar && !isOwn"
      :user="sender"
      size="sm"
    />

    <div
      class="flex max-w-[85%] flex-col gap-0.5"
      :class="isOwn ? 'items-end' : 'items-start'"
    >
      <UBadge
        v-if="showAvatar && !isOwn"
        color="primary"
        variant="subtle"
        size="xs"
        class="mx-1 font-medium"
      >
        {{ sender?.name }}
      </UBadge>

      <UCard
        variant="outline"
        class="w-full max-w-[85%] cursor-pointer transition-transform active:scale-[0.98]"
        :class="isOwn ? 'ml-auto rounded-br-md' : 'mr-auto rounded-bl-md'"
        :ui="{ body: 'p-0' }"
        @click="handleClick"
      >
        <div class="flex">
          <div
            class="w-1 shrink-0 rounded-l-lg"
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
              <PropertyBadge
                type="status"
                :value="task.status"
              />
              <PropertyBadge
                type="priority"
                :value="task.priority"
              />

              <UBadge
                v-if="task.dueDate"
                color="neutral"
                variant="subtle"
                size="xs"
                :class="overdue ? '!text-red-500' : dueSoon ? '!text-amber-500' : ''"
              >
                <template #leading>
                  <UIcon
                    name="i-lucide-calendar"
                    class="h-3 w-3"
                  />
                </template>
                {{ new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
              </UBadge>

              <UBadge
                v-if="subtasks.length > 0"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                <template #leading>
                  <UIcon
                    name="i-lucide-list-checks"
                    class="h-3 w-3"
                  />
                </template>
                {{ completedSubtasks }}/{{ subtasks.length }}
              </UBadge>
            </div>

            <div
              v-if="task.tags.length > 0"
              class="flex flex-wrap gap-1"
            >
              <UBadge
                v-for="tag in task.tags"
                :key="tag"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ tag }}
              </UBadge>
            </div>

            <AvatarStack
              v-if="assigneeUsers.length > 0"
              :users="assigneeUsers"
              :max-visible="4"
              size="sm"
            />
          </div>
        </div>
      </UCard>

      <span class="px-1 text-[10px] text-gray-500">
        {{ formatTime(message.timestamp) }}
      </span>
    </div>
  </div>
</template>
