<script setup lang="ts">
// A question before something that can't be undone with one tap
import { computed } from 'vue'
import { useUiStore } from '~/stores/ui'

const ui = useUiStore()
const open = computed({
  get: () => !!ui.confirming,
  set: (v) => {
    if (!v) ui.confirming = null
  }
})
function run() {
  const c = ui.confirming
  ui.confirming = null
  c?.run()
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="ui.confirming?.title"
    :description="ui.confirming?.text"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #footer>
      <UButton
        size="lg"
        class="lg:h-9"
        @click="open = false"
      >
        Отмена
      </UButton>
      <UButton
        color="error"
        variant="solid"
        size="lg"
        class="lg:h-9"
        @click="run"
      >
        {{ ui.confirming?.action }}
      </UButton>
    </template>
  </UModal>
</template>
