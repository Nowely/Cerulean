<script setup lang="ts">
import { useUIStore } from '~/shared/model'

type Variant = 'toolbar' | 'panel' | 'header'
type Align = 'center' | 'start'

interface Props {
  variant?: Variant
  align?: Align
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'panel',
  align: 'center'
})

const uiStore = useUIStore()

const showBackButton = computed(() => !uiStore.sidebarOpen.value)

function handleBack() {
  uiStore.setSidebar(true)
}

const containerClass = computed(() => {
  const alignItems = props.align === 'start' ? 'items-start' : 'items-center'
  const base = `flex ${alignItems}`

  if (props.variant === 'toolbar') {
    return `${base} justify-between border-b border-[hsl(var(--border))] px-4 py-2`
  }

  if (props.variant === 'header') {
    return `${base} justify-between p-4 pb-0`
  }

  return `${base} justify-between border-b border-[hsl(var(--border))] px-4 py-3`
})
</script>

<template>
  <div :class="containerClass">
    <div class="flex items-center gap-2">
      <UButton
        v-if="showBackButton"
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="handleBack"
      />
      <slot name="start" />
    </div>

    <div
      v-if="$slots.default"
      class="flex-1"
      :class="{ 'min-w-0': variant !== 'header' }"
    >
      <slot />
    </div>

    <div
      v-if="$slots.end"
      class="flex items-center gap-1"
    >
      <slot name="end" />
    </div>
  </div>

  <div
    v-if="$slots.subheader"
    class="border-b border-[hsl(var(--border))] px-4 py-2"
  >
    <slot name="subheader" />
  </div>
</template>
