<script setup lang="ts">
const props = defineProps<{
  position?: 'top' | 'right' | 'bottom' | 'left'
  text: string
  icon?: string
  number?: number
  active?: boolean
  pulse?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const positionClass = computed(() => {
  switch (props.position) {
    case 'top': return '-top-8 left-1/2 -translate-x-1/2'
    case 'right': return 'left-full ml-2 top-1/2 -translate-y-1/2'
    case 'bottom': return '-bottom-8 left-1/2 -translate-x-1/2'
    case 'left': return 'right-full mr-2 top-1/2 -translate-y-1/2'
    default: return '-top-8 left-1/2 -translate-x-1/2'
  }
})
</script>

<template>
  <div class="flow-hotspot relative inline-flex items-center justify-center">
    <button
      class="hotspot-marker relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all"
      :class="[
        active
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
          : 'bg-white dark:bg-gray-800 border-2 border-primary-400 text-primary-600 dark:text-primary-400',
        pulse && !active ? 'animate-pulse-ring' : ''
      ]"
      @click="emit('click')"
    >
      <span
        v-if="number"
        class="text-[10px] font-bold"
      >{{ number }}</span>
      <UIcon
        v-else-if="icon"
        :name="icon"
        class="h-3.5 w-3.5"
      />
      <UIcon
        v-else
        name="i-lucide-info"
        class="h-3.5 w-3.5"
      />
    </button>

    <div
      v-if="active"
      class="hotspot-tooltip absolute z-20 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
      :class="positionClass"
    >
      {{ text }}
      <div
        class="absolute h-2 w-2 rotate-45 bg-gray-900"
        :class="{
          'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2': position === 'top',
          'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2': position === 'right',
          'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2': position === 'bottom',
          'right-0 top-1/2 translate-x-1/2 -translate-y-1/2': position === 'left'
        }"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.animate-pulse-ring {
  animation: pulse-ring 2s ease-out infinite;
}
</style>
