<script setup lang="ts">
import type { FlowStep } from '~/pages/flows/flows.types'

defineProps<{
  steps: FlowStep[]
  currentStep: number
  showAll: boolean
}>()

const emit = defineEmits<{
  (e: 'update:currentStep', step: number): void
  (e: 'update:showAll', value: boolean): void
}>()

function goToStep(idx: number) {
  emit('update:currentStep', idx)
  emit('update:showAll', false)
}
</script>

<template>
  <div class="flow-timeline">
    <div class="timeline-header flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Flow Progress
      </h3>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">
          {{ showAll ? `All ${steps.length} steps` : `Step ${currentStep + 1} of ${steps.length}` }}
        </span>
        <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            :checked="showAll"
            type="checkbox"
            class="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            @change="emit('update:showAll', ($event.target as HTMLInputElement).checked)"
          >
          Show all
        </label>
      </div>
    </div>

    <div class="timeline-container relative">
      <div class="timeline-track absolute top-4 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />

      <div
        class="timeline-progress absolute top-4 left-0 h-1 bg-primary-500 rounded-full transition-all duration-300"
        :style="{ width: `${((currentStep + 1) / steps.length) * 100}%` }"
      />

      <div class="timeline-steps flex justify-between relative">
        <button
          v-for="(step, idx) in steps"
          :key="idx"
          class="timeline-step flex flex-col items-center group"
          @click="goToStep(idx)"
        >
          <div
            class="step-node relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
            :class="[
              idx === currentStep && !showAll
                ? 'bg-primary-500 text-white ring-4 ring-primary-500/20 shadow-lg'
                : idx < currentStep
                  ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 border-2 border-primary-500'
                  : 'bg-white dark:bg-gray-800 text-gray-400 border-2 border-gray-300 dark:border-gray-600 group-hover:border-primary-400 group-hover:text-primary-500'
            ]"
          >
            <UIcon
              v-if="idx < currentStep"
              name="i-lucide-check"
              class="h-4 w-4"
            />
            <span
              v-else
              class="text-xs font-semibold"
            >{{ idx + 1 }}</span>
          </div>

          <div
            class="step-label mt-2 text-center max-w-[80px] md:max-w-[100px]"
          >
            <span
              class="text-[10px] md:text-xs font-medium leading-tight line-clamp-2 transition-colors"
              :class="[
                idx === currentStep && !showAll
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              ]"
            >
              {{ step.title }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <div class="timeline-actions flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        :disabled="showAll || currentStep === 0"
        class="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="goToStep(Math.max(0, currentStep - 1))"
      >
        <UIcon
          name="i-lucide-chevron-left"
          class="h-4 w-4"
        />
        Previous
      </button>

      <div class="flex items-center gap-1">
        <button
          v-for="(step, idx) in steps"
          :key="idx"
          type="button"
          class="h-2 rounded-full transition-all"
          :class="[
            idx === currentStep && !showAll
              ? 'w-6 bg-primary-500'
              : idx < currentStep
                ? 'w-2 bg-primary-400'
                : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
          ]"
          @click="goToStep(idx)"
        />
      </div>

      <button
        type="button"
        :disabled="showAll || currentStep === steps.length - 1"
        class="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="goToStep(Math.min(steps.length - 1, currentStep + 1))"
      >
        Next
        <UIcon
          name="i-lucide-chevron-right"
          class="h-4 w-4"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
