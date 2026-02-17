<script setup lang="ts">
import type { WireframeItem } from '~/pages/flows/flows.types'

const props = defineProps<{
  wireframe: WireframeItem
  highlights?: string[]
  mobileMode?: boolean
  darkMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'interact', target: string): void
}>()

const showSidebar = ref(props.wireframe.showSidebar ?? false)
const showPanel = ref(props.wireframe.showPanel ?? false)

watch(() => props.wireframe, (wf) => {
  showSidebar.value = wf.showSidebar ?? false
  showPanel.value = wf.showPanel ?? false
}, { immediate: true })

function isHighlighted(target: string): boolean {
  return props.highlights?.includes(target) ?? false
}

function handleInteract(target: string) {
  emit('interact', target)
}

function getPanelIcon(type?: string): string {
  switch (type) {
    case 'notifications': return 'i-lucide-bell'
    case 'task-detail': return 'i-lucide-list-checks'
    case 'task-form': return 'i-lucide-file-plus'
    case 'template-picker': return 'i-lucide-copy'
    case 'command-palette': return 'i-lucide-terminal'
    case 'new-thread': return 'i-lucide-plus'
    default: return 'i-lucide-panel-right'
  }
}

const darkClass = computed(() => props.darkMode ? 'dark' : '')
</script>

<template>
  <div
    class="flow-mockup rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
    :class="darkClass"
  >
    <div
      class="mockup-container flex h-[340px] md:h-[400px]"
      :class="{ 'flex-col': mobileMode }"
    >
      <aside
        v-if="showSidebar && wireframe.sidebar"
        class="sidebar shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        :class="[
          mobileMode ? 'w-full h-32 border-r-0 border-b overflow-x-auto' : 'w-44 md:w-52',
          { 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('sidebar') }
        ]"
      >
        <div class="sidebar-header flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Threads</span>
          <button
            class="h-6 w-6 rounded-md bg-primary-500 flex items-center justify-center text-white"
            :class="{ 'animate-pulse': isHighlighted('new-thread-btn') }"
            @click="handleInteract('new-thread-btn')"
          >
            <UIcon
              name="i-lucide-plus"
              class="h-3.5 w-3.5"
            />
          </button>
        </div>

        <div
          v-if="wireframe.sidebar.search !== undefined"
          class="px-2 py-1.5"
        >
          <div
            class="flex items-center gap-2 rounded-md bg-white dark:bg-gray-800 border px-2 py-1.5 text-xs"
            :class="[
              wireframe.sidebar.searchFocused ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-gray-200 dark:border-gray-700',
              { 'ring-2 ring-primary-500 ring-offset-1': isHighlighted('search-input') }
            ]"
          >
            <UIcon
              name="i-lucide-search"
              class="h-3.5 w-3.5 text-gray-400"
            />
            <span
              v-if="wireframe.sidebar.search"
              class="text-gray-700 dark:text-gray-300"
            >{{ wireframe.sidebar.search }}</span>
            <span
              v-else
              class="text-gray-400"
            >Search...</span>
          </div>
        </div>

        <div class="thread-list px-2 py-1 space-y-0.5">
          <template
            v-for="(item, i) in wireframe.sidebar.items"
            :key="i"
          >
            <div
              v-if="item.startsWith('Pinned:') || item.startsWith('All Threads:')"
              class="px-2 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400"
            >
              {{ item.split(':')[0] }}
            </div>
            <div
              v-else
              class="thread-item flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors"
              :class="[
                wireframe.sidebar.activeItem && item.includes(wireframe.sidebar.activeItem)
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
                { 'ring-2 ring-primary-500 ring-offset-1': isHighlighted(`thread-${i}`) }
              ]"
              @click="handleInteract(`thread-${i}`)"
            >
              <div class="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
              <span class="truncate">{{ item.replace('Active: ', '').replace('Result: ', '') }}</span>
            </div>
          </template>
        </div>
      </aside>

      <main class="main-area flex-1 flex flex-col bg-white dark:bg-gray-900 min-w-0">
        <header
          v-if="wireframe.main?.header?.length"
          class="chat-header flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700"
          :class="{ 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('header') }"
        >
          <div class="flex items-center gap-2">
            <button
              v-if="mobileMode"
              class="h-7 w-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
            >
              <UIcon
                name="i-lucide-menu"
                class="h-4 w-4 text-gray-500"
              />
            </button>
            <span class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ wireframe.main.header[0] }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              v-if="wireframe.main.header[1]"
              class="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
            >
              {{ wireframe.main.header[1] }}
            </span>
            <button
              class="relative h-7 w-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
              :class="{ 'ring-2 ring-primary-500': isHighlighted('bell-icon') }"
            >
              <UIcon
                name="i-lucide-bell"
                class="h-4 w-4 text-gray-500 dark:text-gray-400"
              />
              <span class="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary-500 text-[9px] text-white flex items-center justify-center">4</span>
            </button>
          </div>
        </header>

        <div class="chat-content flex-1 overflow-y-auto p-3 space-y-2">
          <div
            v-if="wireframe.main?.items?.length === 0"
            class="flex flex-col items-center justify-center h-full text-center"
          >
            <div class="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
              <UIcon
                name="i-lucide-message-square"
                class="h-6 w-6 text-gray-400"
              />
            </div>
            <p class="text-sm text-gray-500">
              No messages yet
            </p>
          </div>

          <template v-else>
            <template
              v-for="(item, i) in wireframe.main?.items ?? []"
              :key="i"
            >
              <div
                v-if="item.startsWith('Today') || item.startsWith('Feb')"
                class="flex justify-center py-1"
              >
                <span class="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                  {{ item }}
                </span>
              </div>

              <div
                v-else-if="item.startsWith('Task card:') || item.startsWith('Input:') || item.startsWith('You:') || item.startsWith('Composer input:')"
                class="flex items-start gap-2"
                :class="{ 'ring-2 ring-primary-500 rounded-lg p-1 -m-1': isHighlighted(`message-${i}`) }"
              >
                <div class="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900 shrink-0 flex items-center justify-center">
                  <UIcon
                    name="i-lucide-user"
                    class="h-3.5 w-3.5 text-primary-600 dark:text-primary-400"
                  />
                </div>
                <div
                  class="flex-1 rounded-lg px-3 py-2 text-xs max-w-[85%]"
                  :class="[
                    item.startsWith('Task card:')
                      ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      : item.startsWith('Input:') || item.startsWith('Composer input:')
                        ? 'bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500'
                        : 'bg-gray-100 dark:bg-gray-800'
                  ]"
                >
                  <div
                    v-if="item.startsWith('Task card:')"
                    class="flex items-center gap-2 mb-1"
                  >
                    <UIcon
                      name="i-lucide-list-checks"
                      class="h-3.5 w-3.5 text-primary-500"
                    />
                    <span class="font-medium text-gray-900 dark:text-gray-100">{{ item.replace('Task card: ', '') }}</span>
                  </div>
                  <div
                    v-else
                    class="text-gray-700 dark:text-gray-300"
                  >
                    {{ item.replace('Input: ', '').replace('Composer input: ', '').replace('You: ', '') }}
                  </div>
                </div>
              </div>

              <div
                v-else
                class="flex items-start gap-2"
                :class="{ 'ring-2 ring-primary-500 rounded-lg p-1 -m-1': isHighlighted(`message-${i}`) }"
              >
                <div class="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div class="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs max-w-[85%] text-gray-700 dark:text-gray-300">
                  {{ item }}
                </div>
              </div>
            </template>
          </template>

          <div
            v-if="wireframe.main?.toast"
            class="toast-notification flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs text-white ml-auto"
            :class="{ 'animate-pulse': isHighlighted('toast') }"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="h-4 w-4"
            />
            {{ wireframe.main.toast.replace('Toast: ', '') }}
          </div>
        </div>

        <div
          v-if="wireframe.main?.composer !== undefined"
          class="composer border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900"
          :class="{ 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('composer') }"
        >
          <div
            v-if="wireframe.main.showCommandPalette"
            class="command-palette mb-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1"
            :class="{ 'ring-2 ring-primary-500': isHighlighted('command-palette') }"
          >
            <div class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <UIcon
                name="i-lucide-list-todo"
                class="h-4 w-4 text-primary-500"
              />
              <span class="text-xs font-medium">/task</span>
              <span class="text-xs text-gray-400">Create a new task</span>
            </div>
            <div class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <UIcon
                name="i-lucide-file-text"
                class="h-4 w-4 text-amber-500"
              />
              <span class="text-xs font-medium">/template</span>
              <span class="text-xs text-gray-400">Use a task template</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button class="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400">
              <UIcon
                name="i-lucide-plus"
                class="h-4 w-4"
              />
            </button>
            <div
              class="flex-1 rounded-2xl bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs flex items-center"
              :class="[
                wireframe.main.composerFocused ? 'ring-1 ring-primary-500/40' : '',
                { 'ring-2 ring-primary-500': isHighlighted('composer-input') }
              ]"
            >
              <span
                v-if="wireframe.main.composerValue"
                class="text-gray-900 dark:text-gray-100"
              >{{ wireframe.main.composerValue }}</span>
              <span
                v-else-if="wireframe.main.composer"
                class="text-gray-400"
              >{{ wireframe.main.composer }}</span>
            </div>
            <button
              class="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
              :class="wireframe.main.composerValue ? 'bg-primary-500 text-white' : 'text-gray-400'"
            >
              <UIcon
                name="i-lucide-send"
                class="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </main>

      <aside
        v-if="showPanel && wireframe.panel"
        class="panel shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto"
        :class="[
          mobileMode ? 'w-full h-auto border-l-0 border-t' : 'w-44 md:w-52',
          { 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('panel') }
        ]"
      >
        <div class="panel-header flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <UIcon
              :name="getPanelIcon(wireframe.panel.type)"
              class="h-4 w-4 text-gray-500"
            />
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">{{ wireframe.panel.title }}</span>
          </div>
          <button
            class="h-6 w-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400"
            @click="showPanel = false"
          >
            <UIcon
              name="i-lucide-x"
              class="h-3.5 w-3.5"
            />
          </button>
        </div>

        <div class="panel-content p-2 space-y-1">
          <template
            v-for="(item, i) in wireframe.panel.items"
            :key="i"
          >
            <div
              v-if="item.startsWith('Title:') || item.startsWith('Thread name:')"
              class="px-2 py-1.5 text-xs"
              :class="{ 'ring-2 ring-primary-500 rounded': isHighlighted(`panel-item-${i}`) }"
            >
              <span class="text-gray-400 text-[10px]">{{ item.split(':')[0] }}:</span>
              <span class="text-gray-700 dark:text-gray-300 ml-1">{{ item.split(':').slice(1).join(':').trim() }}</span>
            </div>
            <div
              v-else-if="item.startsWith('Type:') || item.startsWith('Selected type:')"
              class="flex gap-1 px-2 py-1.5"
            >
              <button
                v-for="t in ['Project', 'Group', 'Direct']"
                :key="t"
                class="flex-1 rounded px-2 py-1 text-[10px] font-medium"
                :class="item.toLowerCase().includes(t.toLowerCase())
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'"
              >
                {{ t }}
              </button>
            </div>
            <div
              v-else-if="item.includes('button')"
              class="px-2 py-1.5"
            >
              <button
                class="w-full rounded-lg bg-primary-500 px-3 py-2 text-xs font-medium text-white"
                :class="{ 'opacity-50': item.includes('disabled'), 'animate-pulse': isHighlighted(`panel-item-${i}`) }"
              >
                {{ item.replace('button', '').replace('enabled', '').replace('disabled', '').trim() }}
              </button>
            </div>
            <div
              v-else
              class="notification-item flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              :class="{ 'ring-2 ring-primary-500': isHighlighted(`panel-item-${i}`) }"
            >
              <div class="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-lucide-bell"
                  class="h-3 w-3 text-gray-400"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-gray-700 dark:text-gray-300 truncate">
                  {{ item }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <div class="mockup-controls flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <button
          v-if="wireframe.sidebar"
          class="rounded border px-2 py-1 text-[10px] transition-colors"
          :class="showSidebar ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400'"
          @click="showSidebar = !showSidebar"
        >
          <UIcon
            name="i-lucide-sidebar"
            class="h-3 w-3 inline mr-1"
          />
          Sidebar
        </button>
        <button
          v-if="wireframe.panel"
          class="rounded border px-2 py-1 text-[10px] transition-colors"
          :class="showPanel ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400'"
          @click="showPanel = !showPanel"
        >
          <UIcon
            name="i-lucide-panel-right"
            class="h-3 w-3 inline mr-1"
          />
          Panel
        </button>
      </div>
      <button
        class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-[10px] text-gray-600 dark:text-gray-400"
        @click="showSidebar = wireframe.showSidebar ?? false; showPanel = wireframe.showPanel ?? false"
      >
        <UIcon
          name="i-lucide-rotate-ccw"
          class="h-3 w-3 inline mr-1"
        />
        Reset
      </button>
    </div>
  </div>
</template>

<style scoped>
.flow-mockup {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.flow-mockup.dark {
  color-scheme: dark;
}
</style>
