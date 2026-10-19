<script setup lang="ts">
import type { ShoppingItemBlock, BlockId } from '~/shared/types'
import { useBlockStore } from '~/shared/model'
import InputBar from '~/widgets/threads/components/chat-view/components/InputBar.vue'

const blockStore = useBlockStore()

const threadId = computed(() => blockStore.activeThreadId.value ?? '')

const allItems = computed(() => blockStore.getThreadShoppingItems(threadId.value))

const checkableItems = computed(() => {
  return allItems.value.filter(i => i.data.type === 'checkable' && !i.data.checked)
})

const trackableItems = computed(() => {
  return allItems.value.filter(i => i.data.type === 'trackable')
})

const checkedItems = computed(() => {
  return allItems.value.filter(i => i.data.type === 'checkable' && i.data.checked)
})

const totalCount = computed(() => allItems.value.length)

const draggedItem = ref<ShoppingItemBlock | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(event: DragEvent, item: ShoppingItemBlock) {
  draggedItem.value = item
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.id)
  }
}

function onDragEnd() {
  draggedItem.value = null
  dragOverId.value = null
}

function onDragOver(event: DragEvent, item: ShoppingItemBlock) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverId.value = item.id
}

function onDragLeave() {
  dragOverId.value = null
}

async function onDrop(event: DragEvent, targetItem: ShoppingItemBlock, itemList: ShoppingItemBlock[]) {
  event.preventDefault()
  if (!draggedItem.value || draggedItem.value.id === targetItem.id) {
    return
  }

  const fromIndex = itemList.findIndex(i => i.id === draggedItem.value!.id)
  const toIndex = itemList.findIndex(i => i.id === targetItem.id)

  if (fromIndex === -1 || toIndex === -1) return

  const newOrder = [...itemList]
  newOrder.splice(fromIndex, 1)
  newOrder.splice(toIndex, 0, draggedItem.value)

  for (let i = 0; i < newOrder.length; i++) {
    const item = newOrder[i]
    if (!item) continue
    const itemData = item.data
    await blockStore.update(item.id, {
      data: { ...itemData, sortOrder: i }
    })
  }

  draggedItem.value = null
  dragOverId.value = null
}

async function toggle(id: BlockId) {
  const item = blockStore.get(id)
  if (!item || item.meta.type !== 'shopping-item') return
  const itemData = item.data as { checked: boolean }
  await blockStore.update(id, {
    data: { ...itemData, checked: !itemData.checked }
  })
}

async function increment(id: BlockId) {
  const item = blockStore.get(id)
  if (!item || item.meta.type !== 'shopping-item') return
  const itemData = item.data as { collected: number }
  await blockStore.update(id, {
    data: { ...itemData, collected: itemData.collected + 1 }
  })
}

async function decrement(id: BlockId) {
  const item = blockStore.get(id)
  if (!item || item.meta.type !== 'shopping-item') return
  const itemData = item.data as { collected: number }
  if (itemData.collected > 0) {
    await blockStore.update(id, {
      data: { ...itemData, collected: itemData.collected - 1 }
    })
  }
}

async function convertType(id: BlockId) {
  const item = blockStore.get(id)
  if (!item || item.meta.type !== 'shopping-item') return
  const itemData = item.data as { type: 'checkable' | 'trackable', checked: boolean, collected: number, sortOrder: number }
  await blockStore.update(id, {
    data: { ...itemData, type: itemData.type === 'checkable' ? 'trackable' : 'checkable' }
  })
}

async function removeItem(id: BlockId) {
  await blockStore.remove(id)
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UDashboardNavbar
      :title="blockStore.activeThread.value?.name"
      icon="i-lucide-shopping-cart"
    />

    <UScrollArea class="flex-1">
      <UEmpty
        v-if="totalCount === 0"
        icon="i-lucide-shopping-cart"
        title="Your shopping list is empty"
        class="py-16"
      />

      <template v-else>
        <div
          v-if="checkableItems.length > 0"
          class="px-2"
        >
          <div class="px-3 pb-1 pt-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted">To Buy ({{ checkableItems.length }})</span>
          </div>
          <div
            v-for="item in checkableItems"
            :key="item.id"
            :draggable="true"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
            :class="{ 'bg-muted': dragOverId === item.id }"
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
            @dragover="onDragOver($event, item)"
            @dragleave="onDragLeave"
            @drop="onDrop($event, item, checkableItems)"
          >
            <UIcon
              name="i-lucide-grip-vertical"
              class="h-4 w-4 text-dimmed opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
            <UCheckbox
              :model-value="false"
              color="warning"
              @update:model-value="toggle(item.id)"
            />
            <span class="flex-1 text-sm">{{ item.name }}</span>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-red-400"
              @click="removeItem(item.id)"
            />
          </div>
        </div>

        <div
          v-if="trackableItems.length > 0"
          class="px-2"
        >
          <div class="px-3 pb-1 pt-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted">To Track ({{ trackableItems.length }})</span>
          </div>
          <div
            v-for="item in trackableItems"
            :key="item.id"
            :draggable="true"
            class="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
            :class="{ 'bg-muted': dragOverId === item.id }"
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
            @dragover="onDragOver($event, item)"
            @dragleave="onDragLeave"
            @drop="onDrop($event, item, trackableItems)"
          >
            <UIcon
              name="i-lucide-grip-vertical"
              class="h-4 w-4 text-dimmed opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
            <div class="flex items-center gap-1">
              <UButton
                icon="i-lucide-minus"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="item.data.collected === 0"
                @click="decrement(item.id)"
              />
              <span class="w-6 text-center text-sm tabular-nums">{{ item.data.collected }}</span>
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="increment(item.id)"
              />
            </div>
            <span class="flex-1 text-sm">{{ item.name }}</span>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-primary"
              @click="convertType(item.id)"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-red-400"
              @click="removeItem(item.id)"
            />
          </div>
        </div>

        <UCollapsible
          v-if="checkedItems.length > 0"
          class="px-2"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            class="w-full justify-start px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted"
          >
            <template #leading>
              <UIcon
                name="i-lucide-chevron-right"
                class="h-3 w-3 transition-transform group-data-[state=open]:rotate-90"
              />
            </template>
            Completed ({{ checkedItems.length }})
          </UButton>

          <template #content>
            <div
              v-for="item in checkedItems"
              :key="item.id"
              :draggable="true"
              class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
              :class="{ 'bg-muted': dragOverId === item.id }"
              @dragstart="onDragStart($event, item)"
              @dragend="onDragEnd"
              @dragover="onDragOver($event, item)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, item, checkedItems)"
            >
              <UIcon
                name="i-lucide-grip-vertical"
                class="h-4 w-4 text-dimmed opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              />
              <UCheckbox
                :model-value="true"
                color="warning"
                @update:model-value="toggle(item.id)"
              />
              <span class="flex-1 text-sm text-muted line-through">{{ item.name }}</span>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-red-400"
                @click="removeItem(item.id)"
              />
            </div>
          </template>
        </UCollapsible>
      </template>
    </UScrollArea>

    <InputBar />
  </div>
</template>
