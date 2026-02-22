<script setup lang="ts">
import type { MessageBlock } from '~/shared/types'
import { useUserStore, useBlockStore } from '~/shared/model'
import { formatTime, getStatusColor, isDueOverdue, isDueSoon, resolveByIds } from '~/shared/utils'
import PropertyBadge from '~/shared/ui/PropertyBadge.vue'
import AvatarStack from '~/shared/ui/AvatarStack.vue'

interface Props {
  message: MessageBlock
  showAvatar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true
})

const userStore = useUserStore()
const blockStore = useBlockStore()

const sender = computed(() => userStore.getUserById(props.message.data.senderId))
const task = computed(() => props.message.data.taskId ? blockStore.getTask(props.message.data.taskId) : null)
const isOwn = computed(() => props.message.data.senderId === userStore.currentUserId.value)

const assigneeUsers = computed(() =>
  task.value ? resolveByIds(task.value.data.assignees, id => userStore.getUserById(id)) : []
)

const subtasks = computed(() => {
  if (!task.value) return []
  return blockStore.getChildren(task.value.id).filter(b => b.meta.type === 'task')
})

const completedSubtasks = computed(() =>
  subtasks.value.filter(s => (s.data as { status: string }).status === 'done').length
)

const overdue = computed(() =>
  task.value && isDueOverdue(task.value.data.dueDate) && task.value.data.status !== 'done'
)

const dueSoon = computed(() =>
  task.value && isDueSoon(task.value.data.dueDate) && task.value.data.status !== 'done'
)

function handleClick() {
  if (task.value) {
    blockStore.setActiveTask(task.value.id)
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
    :style="{ borderLeftColor: getStatusColor(task.data.status) }"
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
            {{ task.name }}
          </h3>
        </div>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 shrink-0 text-dimmed"
        />
      </div>
    </template>

    <p
      v-if="task.data.description"
      class="text-xs leading-relaxed text-muted line-clamp-2"
    >
      {{ task.data.description }}
    </p>

    <div class="flex flex-wrap items-center gap-1.5">
      <PropertyBadge
        type="status"
        :value="task.data.status"
      />
      <PropertyBadge
        type="priority"
        :value="task.data.priority"
      />

      <UBadge
        v-if="task.data.dueDate"
        icon="i-lucide-calendar"
        color="neutral"
        variant="subtle"
        size="xs"
        :class="overdue ? '!text-red-500' : dueSoon ? '!text-amber-500' : ''"
      >
        {{ new Date(task.data.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
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
      v-if="task.data.tags.length > 0"
      class="flex flex-wrap gap-1"
    >
      <UBadge
        v-for="tag in task.data.tags"
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
        {{ formatTime(message.updated) }}
      </span>
    </template>
  </UCard>
</template>
