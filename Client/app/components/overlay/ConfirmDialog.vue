<script setup lang="ts">
// A question before something nobody can undo: a sheet on a phone with the warn action on top, a dialog on desktop
import { computed } from 'vue'
import { useUiStore } from '~/stores/ui'
import { useScreen } from '~/composables/useScreen'

const ui = useUiStore()
const { isDesktop } = useScreen()
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
    v-if="isDesktop"
    v-model:open="open"
    :title="ui.confirming?.title"
    :description="ui.confirming?.text"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #footer>
      <UButton
        class="h-9"
        @click="open = false"
      >
        Отмена
      </UButton>
      <UButton
        color="error"
        variant="solid"
        class="h-9"
        @click="run"
      >
        {{ ui.confirming?.action }}
      </UButton>
    </template>
  </UModal>
  <UDrawer
    v-else
    v-model:open="open"
    :title="ui.confirming?.title"
    :description="ui.confirming?.text"
  >
    <template #content>
      <div class="flex flex-col gap-2 px-5 pt-2 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <h2 class="text-sheet text-highlighted">
          {{ ui.confirming?.title }}
        </h2>
        <p class="pb-3 text-base text-toned">
          {{ ui.confirming?.text }}
        </p>
        <UButton
          color="error"
          variant="solid"
          size="xl"
          class="w-full"
          @click="run"
        >
          {{ ui.confirming?.action }}
        </UButton>
        <UButton
          size="xl"
          class="w-full"
          @click="open = false"
        >
          Отмена
        </UButton>
      </div>
    </template>
  </UDrawer>
</template>
