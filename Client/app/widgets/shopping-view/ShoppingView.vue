<script setup lang="ts">
import { useShoppingStore, useThreadStore } from '~/shared/model'
import { createShoppingItem } from '~/shared/lib'
import ContentPanelHeader from '~/shared/ui/ContentPanelHeader.vue'

const threadStore = useThreadStore()
const shoppingStore = useShoppingStore()

const newItemText = ref('')
const showChecked = ref(true)

const threadId = computed(() => threadStore.activeThreadId.value ?? '')

const allItems = computed(() => shoppingStore.threadItems(threadId.value))

const uncheckedItems = computed(() => allItems.value.filter(i => !i.checked))
const checkedItems = computed(() => allItems.value.filter(i => i.checked))

const groupedUnchecked = computed(() => {
  const groups: Record<string, typeof uncheckedItems.value> = {}
  for (const item of uncheckedItems.value) {
    const cat = item.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
})

const checkedCount = computed(() => shoppingStore.checkedCount(threadId.value))
const totalCount = computed(() => shoppingStore.totalCount(threadId.value))
const progress = computed(() => totalCount.value > 0 ? Math.round((checkedCount.value / totalCount.value) * 100) : 0)

function addItem() {
  const text = newItemText.value.trim()
  if (!text) return
  const item = createShoppingItem(threadId.value, text)
  shoppingStore.add(item)
  newItemText.value = ''
  threadStore.updateLastActivity(threadId.value, new Date().toISOString())
}

function clearChecked() {
  shoppingStore.clearChecked(threadId.value)
}
</script>

<template>
  <div class="flex h-full flex-col">
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
        <button
          v-if="checkedCount > 0"
          class="text-xs text-gray-500 hover:text-red-400 transition-colors"
          @click="clearChecked"
        >
          Clear checked ({{ checkedCount }})
        </button>
      </template>
    </ContentPanelHeader>

    <div
      v-if="totalCount > 0"
      class="border-b border-[hsl(var(--border))] px-4 py-2"
    >
      <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>{{ checkedCount }} of {{ totalCount }} items</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="h-1.5 w-full rounded-full bg-[hsl(var(--muted))]">
        <div
          class="h-full rounded-full bg-amber-500 transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <div class="border-b border-[hsl(var(--border))] px-4 py-2">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-plus"
          class="h-4 w-4 shrink-0 text-gray-400"
        />
        <UInput
          v-model="newItemText"
          placeholder="Add an item..."
          :ui="{ base: 'bg-transparent' }"
          @keydown.enter="addItem"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <div
        v-if="totalCount === 0"
        class="flex flex-col items-center justify-center gap-3 px-6 py-16"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <UIcon
            name="i-lucide-shopping-cart"
            class="h-8 w-8 text-amber-500"
          />
        </div>
        <p class="text-sm text-gray-500">
          Your shopping list is empty
        </p>
      </div>

      <template v-else>
        <div
          v-for="[category, items] in groupedUnchecked"
          :key="category"
          class="px-2"
        >
          <p class="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {{ category }}
          </p>
          <div
            v-for="item in items"
            :key="item.id"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <button
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-400 dark:border-gray-600 transition-colors hover:border-amber-500"
              @click="shoppingStore.toggle(item.id)"
            />
            <span class="flex-1 text-sm">{{ item.text }}</span>
            <span
              v-if="item.quantity && item.quantity > 1"
              class="text-xs text-gray-500"
            >x{{ item.quantity }}</span>
            <button
              class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
              @click="shoppingStore.remove(item.id)"
            >
              <UIcon
                name="i-lucide-x"
                class="h-4 w-4"
              />
            </button>
          </div>
        </div>

        <div
          v-if="checkedItems.length > 0"
          class="px-2"
        >
          <button
            class="flex w-full items-center gap-2 px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
            @click="showChecked = !showChecked"
          >
            <UIcon
              :name="showChecked ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="h-3 w-3"
            />
            Completed ({{ checkedItems.length }})
          </button>
          <template v-if="showChecked">
            <div
              v-for="item in checkedItems"
              :key="item.id"
              class="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <button
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-amber-500 bg-amber-500 transition-colors"
                @click="shoppingStore.toggle(item.id)"
              >
                <UIcon
                  name="i-lucide-check"
                  class="h-3 w-3 text-white"
                />
              </button>
              <span class="flex-1 text-sm text-gray-500 line-through">{{ item.text }}</span>
              <button
                class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
                @click="shoppingStore.remove(item.id)"
              >
                <UIcon
                  name="i-lucide-x"
                  class="h-4 w-4"
                />
              </button>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
