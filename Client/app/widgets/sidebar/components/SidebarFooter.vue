<script setup lang="ts">
import { ICON_BUTTON_BASE_CLASS, useDevViewport } from '~/shared/lib'

const colorMode = useColorMode()
const isDev = import.meta.dev
const { mode, cycleMode } = useDevViewport()
const iconButtonClass = `${ICON_BUTTON_BASE_CLASS} h-10 w-10 rounded-full`

type ThemeValue = 'light' | 'dark' | 'system'

const themes: { value: ThemeValue, icon: string, label: string }[] = [
  { value: 'light', icon: 'i-lucide-sun', label: 'Light' },
  { value: 'dark', icon: 'i-lucide-moon', label: 'Dark' },
  { value: 'system', icon: 'i-lucide-monitor', label: 'System' }
]

const currentTheme = computed({
  get: () => (colorMode.value as ThemeValue) || 'system',
  set: (value: ThemeValue) => {
    colorMode.value = value
  }
})

const currentThemeInfo = computed(() =>
  themes.find(t => t.value === currentTheme.value) ?? themes[2]!
)

function cycleTheme() {
  const currentIndex = themes.findIndex(t => t.value === currentTheme.value)
  const nextIndex = (currentIndex + 1) % themes.length
  currentTheme.value = themes[nextIndex]!.value
}

const viewportIcon = computed(() => {
  switch (mode.value) {
    case 'mobile': return 'i-lucide-smartphone'
    case 'desktop': return 'i-lucide-monitor'
    default: return 'i-lucide-response'
  }
})

const viewportLabel = computed(() => {
  switch (mode.value) {
    case 'mobile': return 'Mobile view'
    case 'desktop': return 'Desktop view'
    default: return 'Auto view'
  }
})
</script>

<template>
  <footer class="shrink-0 border-t border-gray-200 dark:border-gray-800 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] min-h-14">
    <div class="flex items-center gap-1">
      <button
        :class="iconButtonClass"
        :title="currentThemeInfo.label"
        @click="cycleTheme"
      >
        <UIcon
          :name="currentThemeInfo.icon"
          class="h-4 w-4"
        />
      </button>
      <button
        v-if="isDev"
        :class="iconButtonClass"
        :title="viewportLabel"
        @click="cycleMode"
      >
        <UIcon
          :name="viewportIcon"
          class="h-4 w-4"
        />
      </button>
    </div>
  </footer>
</template>
