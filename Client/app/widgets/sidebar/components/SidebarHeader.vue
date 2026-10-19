<script setup lang="ts">
const emit = defineEmits<{
  newThread: []
}>()

const activeTab = ref('chats')

const tabs = [
  { value: 'chats', label: 'Chats', icon: 'i-lucide-message-circle' },
  { value: 'search', label: 'Search', icon: 'i-lucide-search' },
  { value: 'notes', label: 'Notes', icon: 'i-lucide-file-text' }
]
</script>

<template>
  <div class="flex items-center gap-1 p-2">
    <UButton
      v-for="tab in tabs"
      :key="tab.value"
      :icon="tab.icon"
      :label="tab.label"
      :color="activeTab === tab.value ? 'primary' : 'neutral'"
      :variant="activeTab === tab.value ? 'soft' : 'ghost'"
      size="xs"
      @click="activeTab = tab.value"
    />
    <div class="flex-1" />
    <UButton
      icon="i-lucide-plus"
      size="xs"
      data-testid="new-thread-btn"
      @click="emit('newThread')"
    />
  </div>
</template>
