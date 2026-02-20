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
    class="max-w-[85%] cursor-pointer transition-transform active:scale-[0.98] mx-3"
    :class="[isOwn ? 'ml-auto rounded-br-md' : 'mr-auto rounded-bl-md']"
    :ui="{
      root: 'border-l-4',
      header: 'p-3 pb-0',
      body: 'p-3 pt-2 flex flex-col gap-2',
      footer: 'p-3 pt-0'
    }"
    :style="{ borderLeftColor: getStatusColor(task.status) }"
    @click="handleClick"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <UBadge
          v-if="showAvatar && !isOwn"
          color="primary"
          variant="subtle"
          size="xs"
          class="font-medium"
        >
          {{ sender?.name }}
        </UBadge>
        <h3 class="text-sm font-semibold leading-snug flex-1 min-w-0">
          {{ task.title }}
        </h3>
        <UIcon
          name="i-lucide-chevron-right"
          class="h-4 w-4 shrink-0 text-gray-400"
        />
      </div>
    </template>

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

    <template #footer>
      <span class="text-[10px] text-gray-500">
        {{ formatTime(message.timestamp) }}
      </span>
    </template>
  </UCard>
</template>
