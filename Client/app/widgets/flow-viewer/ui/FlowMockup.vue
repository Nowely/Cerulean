<script setup lang="ts">
import type { WireframeItem } from '~/shared/lib'

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

const d = computed(() => props.darkMode)
</script>

<template>
  <div
    class="flow-mockup rounded-lg border-2 overflow-hidden"
    :class="d ? 'border-muted bg-muted' : 'border-default bg-white'"
  >
    <div
      class="mockup-container flex h-[340px] md:h-[400px]"
      :class="{ 'flex-col': mobileMode }"
    >
      <aside
        v-if="showSidebar && wireframe.sidebar"
        class="sidebar shrink-0 border-r"
        :class="[
          d ? 'border-muted bg-muted' : 'border-default bg-muted',
          mobileMode ? 'w-full h-32 border-r-0 border-b overflow-x-auto' : 'w-44 md:w-52',
          { 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('sidebar') }
        ]"
      >
        <div
          class="sidebar-header flex items-center justify-between px-3 py-2 border-b"
          :class="d ? 'border-muted' : 'border-default'"
        >
          <span
            class="text-xs font-semibold"
            :class="d ? 'text-dimmed' : 'text-muted'"
          >Threads</span>
          <UButton
            icon="i-lucide-plus"
            size="xs"
            :class="{ 'animate-pulse': isHighlighted('new-thread-btn') }"
            @click="handleInteract('new-thread-btn')"
          />
        </div>

        <div
          v-if="wireframe.sidebar.search !== undefined"
          class="px-2 py-1.5"
        >
          <div
            class="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
            :class="[
              d ? 'bg-muted border-muted' : 'bg-white border-default',
              wireframe.sidebar.searchFocused ? 'border-primary-500 ring-1 ring-primary-500/30' : '',
              { 'ring-2 ring-primary-500 ring-offset-1': isHighlighted('search-input') }
            ]"
          >
            <UIcon
              name="i-lucide-search"
              class="h-3.5 w-3.5 text-dimmed"
            />
            <span
              v-if="wireframe.sidebar.search"
              :class="d ? 'text-toned' : 'text-default'"
            >{{ wireframe.sidebar.search }}</span>
            <span
              v-else
              class="text-dimmed"
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
              class="px-2 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-dimmed"
            >
              {{ item.split(':')[0] }}
            </div>
            <div
              v-else
              class="thread-item flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors"
              :class="[
                wireframe.sidebar.activeItem && item.includes(wireframe.sidebar.activeItem)
                  ? d ? 'bg-primary-900/30 text-primary-300' : 'bg-primary-50 text-primary-700'
                  : d ? 'hover:bg-elevated text-toned' : 'hover:bg-elevated text-default',
                { 'ring-2 ring-primary-500 ring-offset-1': isHighlighted(`thread-${i}`) }
              ]"
              @click="handleInteract(`thread-${i}`)"
            >
              <div
                class="h-5 w-5 rounded shrink-0"
                :class="d ? 'bg-accented' : 'bg-accented'"
              />
              <span class="truncate">{{ item.replace('Active: ', '').replace('Result: ', '') }}</span>
            </div>
          </template>
        </div>
      </aside>

      <main
        class="main-area flex-1 flex flex-col min-w-0"
        :class="d ? 'bg-muted' : 'bg-white'"
      >
        <header
          v-if="wireframe.main?.header?.length"
          class="chat-header flex items-center justify-between px-3 py-2 border-b"
          :class="[
            d ? 'border-muted' : 'border-default',
            { 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('header') }
          ]"
        >
          <div class="flex items-center gap-2">
            <UButton
              v-if="mobileMode"
              icon="i-lucide-menu"
              color="neutral"
              variant="ghost"
              size="sm"
            />
            <span
              class="font-medium text-sm"
              :class="d ? 'text-highlighted' : 'text-highlighted'"
            >{{ wireframe.main.header[0] }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              v-if="wireframe.main.header[1]"
              class="text-2xs px-1.5 py-0.5 rounded"
              :class="d ? 'text-dimmed bg-elevated' : 'text-muted bg-elevated'"
            >
              {{ wireframe.main.header[1] }}
            </span>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :class="{ 'ring-2 ring-primary-500': isHighlighted('bell-icon') }"
            >
              <template #leading>
                <div class="relative">
                  <UIcon
                    name="i-lucide-bell"
                    class="h-4 w-4"
                  />
                  <span class="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary-500 text-[9px] text-white flex items-center justify-center">4</span>
                </div>
              </template>
            </UButton>
          </div>
        </header>

        <div class="chat-content flex-1 overflow-y-auto p-3 space-y-2">
          <div
            v-if="wireframe.main?.items?.length === 0"
            class="flex flex-col items-center justify-center h-full text-center"
          >
            <div
              class="h-12 w-12 rounded-full flex items-center justify-center mb-2"
              :class="d ? 'bg-elevated' : 'bg-elevated'"
            >
              <UIcon
                name="i-lucide-message-square"
                class="h-6 w-6 text-dimmed"
              />
            </div>
            <p class="text-sm text-muted">
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
                <span
                  class="rounded-full px-2.5 py-0.5 text-2xs font-medium text-muted"
                  :class="d ? 'bg-elevated' : 'bg-elevated'"
                >{{ item }}</span>
              </div>

              <div
                v-else-if="item.startsWith('Task card:') || item.startsWith('Input:') || item.startsWith('You:') || item.startsWith('Composer input:')"
                class="flex items-start gap-2"
                :class="{ 'ring-2 ring-primary-500 rounded-lg p-1 -m-1': isHighlighted(`message-${i}`) }"
              >
                <div
                  class="h-7 w-7 rounded-full shrink-0 flex items-center justify-center"
                  :class="d ? 'bg-primary-900' : 'bg-primary-100'"
                >
                  <UIcon
                    name="i-lucide-user"
                    class="h-3.5 w-3.5"
                    :class="d ? 'text-primary-400' : 'text-primary-600'"
                  />
                </div>
                <div
                  class="flex-1 rounded-lg px-3 py-2 text-xs max-w-[85%]"
                  :class="[
                    item.startsWith('Task card:')
                      ? d ? 'bg-elevated border border-muted' : 'bg-elevated border border-default'
                      : item.startsWith('Input:') || item.startsWith('Composer input:')
                        ? d ? 'bg-elevated/50 border border-dashed border-accented text-dimmed' : 'bg-muted border border-dashed border-muted text-muted'
                        : d ? 'bg-elevated' : 'bg-elevated'
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
                    <span
                      class="font-medium"
                      :class="d ? 'text-highlighted' : 'text-highlighted'"
                    >{{ item.replace('Task card: ', '') }}</span>
                  </div>
                  <div :class="d ? 'text-toned' : 'text-default'">
                    {{ item.replace('Input: ', '').replace('Composer input: ', '').replace('You: ', '') }}
                  </div>
                </div>
              </div>

              <div
                v-else
                class="flex items-start gap-2"
                :class="{ 'ring-2 ring-primary-500 rounded-lg p-1 -m-1': isHighlighted(`message-${i}`) }"
              >
                <div
                  class="h-7 w-7 rounded-full shrink-0"
                  :class="d ? 'bg-accented' : 'bg-accented'"
                />
                <div
                  class="flex-1 rounded-lg px-3 py-2 text-xs max-w-[85%]"
                  :class="[
                    d ? 'bg-elevated text-toned' : 'bg-elevated text-default'
                  ]"
                >
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
          class="composer border-t px-3 py-2"
          :class="[
            d ? 'border-muted bg-muted' : 'border-default bg-white',
            { 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('composer') }
          ]"
        >
          <div
            v-if="wireframe.main.showCommandPalette"
            class="command-palette mb-2 rounded-lg border p-1"
            :class="[
              d ? 'border-muted bg-muted' : 'border-default bg-white',
              { 'ring-2 ring-primary-500': isHighlighted('command-palette') }
            ]"
          >
            <div
              class="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer"
              :class="d ? 'hover:bg-elevated' : 'hover:bg-elevated'"
            >
              <UIcon
                name="i-lucide-list-todo"
                class="h-4 w-4 text-primary-500"
              />
              <span class="text-xs font-medium">/task</span>
              <span class="text-xs text-dimmed">Create a new task</span>
            </div>
            <div
              class="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer"
              :class="d ? 'hover:bg-elevated' : 'hover:bg-elevated'"
            >
              <UIcon
                name="i-lucide-file-text"
                class="h-4 w-4 text-amber-500"
              />
              <span class="text-xs font-medium">/template</span>
              <span class="text-xs text-dimmed">Use a task template</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="sm"
            />
            <div
              class="flex-1 rounded-2xl px-3 py-2 text-xs flex items-center"
              :class="[
                d ? 'bg-elevated' : 'bg-elevated',
                wireframe.main.composerFocused ? 'ring-1 ring-primary-500/40' : '',
                { 'ring-2 ring-primary-500': isHighlighted('composer-input') }
              ]"
            >
              <span
                v-if="wireframe.main.composerValue"
                :class="d ? 'text-highlighted' : 'text-highlighted'"
              >{{ wireframe.main.composerValue }}</span>
              <span
                v-else
                class="text-dimmed"
              >{{ wireframe.main.composer }}</span>
            </div>
            <UButton
              icon="i-lucide-send"
              :color="wireframe.main.composerValue ? 'primary' : 'neutral'"
              :variant="wireframe.main.composerValue ? 'solid' : 'ghost'"
              size="sm"
            />
          </div>
        </div>
      </main>

      <aside
        v-if="showPanel && wireframe.panel"
        class="panel shrink-0 border-l overflow-y-auto"
        :class="[
          d ? 'border-muted bg-muted' : 'border-default bg-white',
          mobileMode ? 'w-full h-auto border-l-0 border-t' : 'w-44 md:w-52',
          { 'ring-2 ring-primary-500 ring-offset-2': isHighlighted('panel') }
        ]"
      >
        <div
          class="panel-header flex items-center justify-between px-3 py-2 border-b"
          :class="d ? 'border-muted' : 'border-default'"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="getPanelIcon(wireframe.panel.type)"
              class="h-4 w-4 text-muted"
            />
            <span
              class="text-xs font-semibold"
              :class="d ? 'text-toned' : 'text-default'"
            >{{ wireframe.panel.title }}</span>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="showPanel = false"
          />
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
              <span class="text-dimmed text-2xs">{{ item.split(':')[0] }}:</span>
              <span
                class="ml-1"
                :class="d ? 'text-toned' : 'text-default'"
              >{{ item.split(':').slice(1).join(':').trim() }}</span>
            </div>
            <div
              v-else-if="item.startsWith('Type:') || item.startsWith('Selected type:')"
              class="flex gap-1 px-2 py-1.5"
            >
              <UButton
                v-for="t in ['Project', 'Group', 'Direct']"
                :key="t"
                :label="t"
                :color="item.toLowerCase().includes(t.toLowerCase()) ? 'primary' : 'neutral'"
                :variant="item.toLowerCase().includes(t.toLowerCase()) ? 'solid' : 'soft'"
                size="xs"
                class="flex-1"
              />
            </div>
            <div
              v-else-if="item.includes('button')"
              class="px-2 py-1.5"
            >
              <UButton
                :label="item.replace('button', '').replace('enabled', '').replace('disabled', '').trim()"
                size="xs"
                block
                :disabled="item.includes('disabled')"
                :class="{ 'animate-pulse': isHighlighted(`panel-item-${i}`) }"
              />
            </div>
            <div
              v-else
              class="notification-item flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer"
              :class="[
                d ? 'hover:bg-elevated' : 'hover:bg-elevated',
                { 'ring-2 ring-primary-500': isHighlighted(`panel-item-${i}`) }
              ]"
            >
              <div
                class="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                :class="d ? 'bg-elevated' : 'bg-elevated'"
              >
                <UIcon
                  name="i-lucide-bell"
                  class="h-3 w-3 text-dimmed"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div
                  :class="d ? 'text-toned' : 'text-default'"
                  class="truncate"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <div
      class="mockup-controls flex items-center justify-between px-3 py-2 border-t"
      :class="d ? 'bg-elevated border-muted' : 'bg-muted border-default'"
    >
      <div class="flex items-center gap-2">
        <UButton
          v-if="wireframe.sidebar"
          icon="i-lucide-sidebar"
          label="Sidebar"
          :color="showSidebar ? 'primary' : 'neutral'"
          :variant="showSidebar ? 'soft' : 'outline'"
          size="xs"
          @click="showSidebar = !showSidebar"
        />
        <UButton
          v-if="wireframe.panel"
          icon="i-lucide-panel-right"
          label="Panel"
          :color="showPanel ? 'primary' : 'neutral'"
          :variant="showPanel ? 'soft' : 'outline'"
          size="xs"
          @click="showPanel = !showPanel"
        />
      </div>
      <UButton
        icon="i-lucide-rotate-ccw"
        label="Reset"
        color="neutral"
        variant="outline"
        size="xs"
        @click="showSidebar = wireframe.showSidebar ?? false; showPanel = wireframe.showPanel ?? false"
      />
    </div>
  </div>
</template>

<style scoped>
.flow-mockup {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
