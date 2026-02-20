<script setup lang="ts">
import type { Message } from '~/shared/types'
import { useUserStore, useTaskStore } from '~/shared/model'
import { formatTime, getStatusColor, isDueOverdue, isDueSoon, resolveByIds } from '~/shared/utils'
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
  <UCard
    v-if="task"
    variant="outline"
    task
    class="max-w-[75%] cursor-pointer transition-transform active:scale-[0.98] my-1"
    :class="[isOwn ? 'ml-auto rounded-br-md' : 'mr-auto rounded-bl-md']"
    :style="{ borderLeftColor: getStatusColor(task.status) }"
    :ui="{ body: 'sm:gap-2 gap-1.5', header: 'p-2 sm:p-2', footer: 'p-2 sm:p-2 pt-0' }"
    @click="handleClick"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <UBadge
            v-if="showAvatar && !isOwn"
            :label="sender?.name"
            variant="subtle"
            size="xs"
          />
          <h3 class="text-sm font-semibold leading-snug truncate">
            {{ task.title }}
          </h3>
        </div>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 shrink-0 text-dimmed"
        />
      </div>
    </template>

    <p
      v-if="task.description"
      class="text-xs leading-relaxed text-muted line-clamp-2"
    >
      {{ task.description }}
    </p>

    <div class="flex flex-wrap items-center gap-1.5">
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
        icon="i-lucide-calendar"
        color="neutral"
        variant="subtle"
        size="xs"
        :class="overdue ? '!text-red-500' : dueSoon ? '!text-amber-500' : ''"
      >
        {{ new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
      </UBadge>

      <UBadge
        v-if="subtasks.length > 0"
        icon="i-lucide-list-checks"
        color="neutral"
        variant="subtle"
        size="xs"
      >
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
        :label="tag"
        color="neutral"
        variant="subtle"
        size="xs"
      />
    </div>

    <AvatarStack
      v-if="assigneeUsers.length > 0"
      :users="assigneeUsers"
      :max-visible="4"
      size="sm"
    />

    <template #footer>
      <span class="text-[10px] text-muted">
        {{ formatTime(message.timestamp) }}
      </span>
    </template>
  </UCard>
</template>
