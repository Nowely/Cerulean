<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <UTooltip
    :text="text"
    :content="{ side: position || 'top' }"
    :open="active"
    arrow
  >
    <UButton
      :color="active ? 'primary' : 'neutral'"
      :variant="active ? 'solid' : 'outline'"
      size="xs"
      square
      :class="{ 'animate-pulse-ring': pulse && !active }"
      @click="emit('click')"
    >
      <span
        v-if="number"
        class="text-2xs font-bold"
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
    </UButton>
  </UTooltip>
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
