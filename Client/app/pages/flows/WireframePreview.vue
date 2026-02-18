<script setup lang="ts">
import type { WireframeItem } from '~/shared/lib'

const props = defineProps<{
  wireframe: WireframeItem
}>()

const showSidebar = ref(props.wireframe.showSidebar ?? false)
const showPanel = ref(props.wireframe.showPanel ?? false)

function syncToggleState() {
  showSidebar.value = props.wireframe.showSidebar ?? false
  showPanel.value = props.wireframe.showPanel ?? false
}

watch(() => props.wireframe, syncToggleState, { immediate: true })
</script>

<template>
  <div class="rounded-lg border border-gray-300 bg-gray-50 p-4">
    <div class="mb-3 flex flex-wrap gap-2">
      <button
        v-if="wireframe.sidebar"
        type="button"
        :aria-pressed="showSidebar"
        :class="[
          'rounded border px-2 py-1 text-xs',
          showSidebar ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 bg-white'
        ]"
        @click="showSidebar = !showSidebar"
      >
        Sidebar
      </button>
      <button
        v-if="wireframe.panel"
        type="button"
        :aria-pressed="showPanel"
        :class="[
          'rounded border px-2 py-1 text-xs',
          showPanel ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 bg-white'
        ]"
        @click="showPanel = !showPanel"
      >
        Panel
      </button>
      <button
        type="button"
        class="ml-auto rounded border border-gray-300 bg-white px-2 py-1 text-xs"
        @click="syncToggleState"
      >
        Reset
      </button>
    </div>
    <div class="flex min-h-[240px] gap-2 rounded-lg border border-gray-300 bg-gray-200 p-2">
      <aside
        v-if="showSidebar && wireframe.sidebar"
        class="w-1/3 rounded-lg border border-gray-300 bg-gray-100 p-2"
      >
        <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {{ wireframe.sidebar.title || 'Sidebar' }}
        </div>
        <div
          v-if="wireframe.sidebar.search"
          class="mb-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs"
        >
          Search: {{ wireframe.sidebar.search }}
        </div>
        <div class="space-y-1">
          <div
            v-for="(item, i) in wireframe.sidebar.items"
            :key="i"
            class="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
          >
            {{ item }}
          </div>
        </div>
      </aside>
      <section class="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {{ wireframe.main?.title || 'Main Area' }}
        </div>
        <div
          v-if="wireframe.main?.header"
          class="mb-2 flex flex-wrap gap-1"
        >
          <span
            v-for="(h, i) in wireframe.main.header"
            :key="i"
            class="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs"
          >
            {{ h }}
          </span>
        </div>
        <div
          v-if="wireframe.main?.items?.length"
          class="space-y-1"
        >
          <div
            v-for="(item, i) in wireframe.main.items"
            :key="i"
            class="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
          >
            {{ item }}
          </div>
        </div>
        <div
          v-if="wireframe.main?.toast"
          class="mt-2 justify-self-end rounded border border-primary-600 bg-primary-900 px-2 py-1 text-xs text-primary-100"
        >
          {{ wireframe.main.toast }}
        </div>
        <div
          v-if="wireframe.main?.composer"
          class="mt-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-500"
        >
          {{ wireframe.main.composer }}
        </div>
      </section>
      <aside
        v-if="showPanel && wireframe.panel"
        class="w-1/3 rounded-lg border border-gray-300 bg-white p-2"
      >
        <div class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {{ wireframe.panel.title || 'Panel' }}
        </div>
        <div class="space-y-1">
          <div
            v-for="(item, i) in wireframe.panel.items"
            :key="i"
            class="rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs"
          >
            {{ item }}
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
