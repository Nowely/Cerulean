<script setup lang="ts">
import { useShoppingStore, useThreadStore } from '~/shared/model'
import InputBar from '~/widgets/chat-view/components/InputBar.vue'

const threadStore = useThreadStore()
const shoppingStore = useShoppingStore()

const threadId = computed(() => threadStore.activeThreadId.value ?? '')

const allItems = computed(() => shoppingStore.threadItems(threadId.value))

const uncheckedItems = computed(() => allItems.value.filter(i => !i.checked))
const checkedItems = computed(() => allItems.value.filter(i => i.checked))

const checkedCount = computed(() => shoppingStore.checkedCount(threadId.value))
const totalCount = computed(() => shoppingStore.totalCount(threadId.value))
const progress = computed(() => totalCount.value > 0 ? Math.round((checkedCount.value / totalCount.value) * 100) : 0)

function clearChecked() {
  shoppingStore.clearChecked(threadId.value)
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UDashboardNavbar
      :title="threadStore.activeThread.value?.name"
      icon="i-lucide-shopping-cart"
    >
      <template #right>
        <UButton
          v-if="checkedCount > 0"
          label="Clear checked"
          color="neutral"
          variant="link"
          size="xs"
          class="text-muted hover:text-red-400"
          @click="clearChecked"
        >
          <template #trailing>
            <span class="text-xs">({{ checkedCount }})</span>
          </template>
        </UButton>
      </template>
    </UDashboardNavbar>

    <UDashboardToolbar v-if="totalCount > 0">
      <UProgress
        :model-value="checkedCount"
        :max="totalCount"
        color="warning"
        size="sm"
      >
        <template #status>
          <div class="flex items-center justify-between text-xs text-muted w-full">
            <span>{{ checkedCount }} of {{ totalCount }} items</span>
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
        <div class="px-2">
          <div
            v-for="item in uncheckedItems"
            :key="item.id"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
          >
            <UCheckbox
              :model-value="false"
              color="warning"
              @update:model-value="shoppingStore.toggle(item.id)"
            />
            <span class="flex-1 text-sm">{{ item.text }}</span>
            <span
              v-if="item.quantity && item.quantity > 1"
              class="text-xs text-muted"
            >x{{ item.quantity }}</span>
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
                name="i-lucide-chevron-down"
                class="h-3 w-3"
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
