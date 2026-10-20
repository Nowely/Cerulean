<script setup lang="ts">
// One-time hint under a list: neutral card, closed with a 44px ×, never shown again
import { computed } from 'vue'
import { useDataStore } from '~/stores/data'

const props = defineProps<{ id: string, icon?: string }>()
const data = useDataStore()
const shown = computed(() => !data.settings.dismissed.includes(props.id))

function close() {
  data.setSettings({ dismissed: [...data.settings.dismissed, props.id] })
}
</script>

<template>
  <div
    v-if="shown"
    class="flex items-start gap-2.5 rounded-card border border-default bg-default py-2.5 pl-3 pr-1 text-meta text-default"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      class="mt-0.5 size-4.5 shrink-0 text-toned"
    />
    <p class="min-w-0 flex-1 py-0.5 leading-snug">
      <slot />
    </p>
    <UButton
      icon="i-lucide-x"
      variant="ghost"
      square
      aria-label="Закрыть подсказку"
      class="-my-2"
      @click="close"
    />
  </div>
</template>
