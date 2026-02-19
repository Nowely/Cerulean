<script setup lang="ts">
import { useShoppingStore, useThreadStore } from '~/shared/model'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'
import InputBar from '~/widgets/chat-view/components/InputBar.vue'

const threadStore = useThreadStore()
const shoppingStore = useShoppingStore()

const showChecked = ref(true)

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
    <ContentPanelHeader>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-shopping-cart"
          class="h-5 w-5 text-amber-500"
        />
        <h2 class="text-lg font-semibold">
          {{ threadStore.activeThread.value?.name }}
        </h2>
      </div>
      <template #end>
        <UButton
          v-if="checkedCount > 0"
          label="Clear checked"
          color="neutral"
          variant="link"
          size="xs"
          class="text-gray-500 hover:text-red-400"
          @click="clearChecked"
        >
          <template #trailing>
            <span class="text-xs">({{ checkedCount }})</span>
          </template>
        </UButton>
      </template>
      <template
        v-if="totalCount > 0"
        #subheader
      >
        <UProgress
          :model-value="checkedCount"
          :max="totalCount"
          color="warning"
          size="sm"
        >
          <template #status>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>{{ checkedCount }} of {{ totalCount }} items</span>
              <span>{{ progress }}%</span>
            </div>
          </template>
        </UProgress>
      </template>
    </ContentPanelHeader>

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
            class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <UCheckbox
              :model-value="false"
              color="warning"
              @update:model-value="shoppingStore.toggle(item.id)"
            />
            <span class="flex-1 text-sm">{{ item.text }}</span>
            <span
              v-if="item.quantity && item.quantity > 1"
              class="text-xs text-gray-500"
            >x{{ item.quantity }}</span>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
              @click="shoppingStore.remove(item.id)"
            />
          </div>
        </div>

        <div
          v-if="checkedItems.length > 0"
          class="px-2"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            class="w-full justify-start px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
            @click="showChecked = !showChecked"
          >
            <template #leading>
              <UIcon
                :name="showChecked ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="h-3 w-3"
              />
            </template>
            Completed ({{ checkedItems.length }})
          </UButton>
          <template v-if="showChecked">
            <div
              v-for="item in checkedItems"
              :key="item.id"
              class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <UCheckbox
                :model-value="true"
                color="warning"
                @update:model-value="shoppingStore.toggle(item.id)"
              />
              <span class="flex-1 text-sm text-gray-500 line-through">{{ item.text }}</span>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
                @click="shoppingStore.remove(item.id)"
              />
            </div>
          </template>
        </div>
      </template>
    </UScrollArea>

    <InputBar />
  </div>
</template>
