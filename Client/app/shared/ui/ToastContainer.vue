<script setup lang="ts">
const { toasts, remove } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="flex items-start gap-3">
            <UIcon
              v-if="toast.icon"
              :name="toast.icon"
              class="mt-0.5 h-5 w-5 shrink-0"
              :class="{
                'text-primary-500': toast.color === 'primary',
                'text-green-500': toast.color === 'success',
                'text-red-500': toast.color === 'error',
                'text-yellow-500': toast.color === 'warning',
                'text-gray-500': toast.color === 'neutral'
              }"
            />
            <div class="flex-1">
              <p
                v-if="toast.title"
                class="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {{ toast.title }}
              </p>
              <p
                v-if="toast.description"
                class="mt-1 text-sm text-gray-500 dark:text-gray-400"
              >
                {{ toast.description }}
              </p>
              <div
                v-if="toast.actions"
                class="mt-2 flex gap-2"
              >
                <UButton
                  v-for="action in toast.actions"
                  :key="action.label"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :label="action.label"
                  @click="action.onClick"
                />
              </div>
            </div>
            <button
              class="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              @click="remove(toast.id)"
            >
              <UIcon
                name="i-lucide-x"
                class="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
