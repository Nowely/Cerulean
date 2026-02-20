<script setup lang="ts">
import { useShoppingStore, useThreadStore } from '~/shared/model'
import InputBar from '~/widgets/threads/components/chat-view/components/InputBar.vue'

const threadStore = useThreadStore()
const shoppingStore = useShoppingStore()

const threadId = computed(() => threadStore.activeThreadId.value ?? '')

const checkableItems = computed(() => {
  return shoppingStore.checkableItems(threadId.value).filter(i => !i.checked)
})

const trackableItems = computed(() => {
  return shoppingStore.trackableItems(threadId.value)
})

const checkedItems = computed(() => {
  return shoppingStore.checkableItems(threadId.value).filter(i => i.checked)
})

const checkedCount = computed(() => shoppingStore.checkedCount(threadId.value))
const checkableTotal = computed(() => shoppingStore.checkableTotalCount(threadId.value))
const totalCount = computed(() => shoppingStore.totalCount(threadId.value))
const progress = computed(() => checkableTotal.value > 0 ? Math.round((checkedCount.value / checkableTotal.value) * 100) : 0)
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UDashboardNavbar
      :title="threadStore.activeThread.value?.name"
      icon="i-lucide-shopping-cart"
    />

    <UDashboardToolbar v-if="checkableTotal > 0">
      <UProgress
        :model-value="checkedCount"
        :max="checkableTotal"
        color="warning"
        size="sm"
      >
        <template #status>
          <div class="flex items-center justify-between text-xs text-muted w-full">
            <span>{{ checkedCount }} of {{ checkableTotal }} items</span>
            <span>{{ progress }}%</span>
          </div>
        </template>
      </UProgress>
    </UDashboardToolbar>

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
          <div class="flex items-center justify-between px-3 pb-1 pt-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted">To Buy</span>
            <span class="text-xs text-muted">({{ checkableItems.length }})</span>
          </div>
          <div
            v-for="item in checkableItems"
            :key="item.id"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
          >
            <UCheckbox
              :model-value="false"
              color="warning"
              @update:model-value="shoppingStore.toggle(item.id)"
            />
            <span class="flex-1 text-sm">{{ item.text }}</span>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-red-400"
              @click="shoppingStore.remove(item.id)"
            />
          </div>
        </div>

        <div
          v-if="trackableItems.length > 0"
          class="px-2"
        >
          <div class="flex items-center justify-between px-3 pb-1 pt-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted">To Track</span>
            <span class="text-xs text-muted">({{ trackableItems.length }})</span>
          </div>
          <div
            v-for="item in trackableItems"
            :key="item.id"
            class="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
          >
            <div class="flex items-center gap-1">
              <UButton
                icon="i-lucide-minus"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="item.collected === 0"
                @click="shoppingStore.decrement(item.id)"
              />
              <span class="w-6 text-center text-sm tabular-nums">{{ item.collected }}</span>
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="shoppingStore.increment(item.id)"
              />
            </div>
            <span class="flex-1 text-sm">{{ item.text }}</span>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-primary"
              @click="shoppingStore.convertType(item.id)"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-red-400"
              @click="shoppingStore.remove(item.id)"
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
              class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
            >
              <UCheckbox
                :model-value="true"
                color="warning"
                @update:model-value="shoppingStore.toggle(item.id)"
              />
              <span class="flex-1 text-sm text-muted line-through">{{ item.text }}</span>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100 transition-opacity text-dimmed hover:text-red-400"
                @click="shoppingStore.remove(item.id)"
              />
            </div>
          </template>
        </UCollapsible>
      </template>
    </UScrollArea>

    <InputBar />
  </div>
</template>
