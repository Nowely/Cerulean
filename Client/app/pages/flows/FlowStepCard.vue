<script setup lang="ts">
import type { FlowStep } from './flows.types'
import FlowMockup from '~/components/flows/FlowMockup.vue'

defineProps<{
  step: FlowStep
  stepNumber: number
  isActive?: boolean
  mobileMode?: boolean
  darkMode?: boolean
}>()
</script>

<template>
  <article
    class="flow-step-card rounded-xl border transition-all"
    :class="[
      isActive
        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    ]"
  >
    <div class="step-header flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
      <div
        class="step-number flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
        :class="[
          isActive
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        ]"
      >
        {{ stepNumber }}
      </div>

      <div class="step-info flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span
            class="text-[10px] font-semibold uppercase tracking-wider"
            :class="isActive ? 'text-primary-600' : 'text-gray-500'"
          >
            {{ step.label || 'Step' }}
          </span>
          <span
            v-if="isActive"
            class="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:text-primary-300"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
            Current
          </span>
        </div>
        <h4 class="font-semibold text-gray-900 dark:text-gray-100">
          {{ step.title }}
        </h4>
      </div>
    </div>

    <div class="step-content p-4 space-y-4">
      <div class="action-section">
        <div class="flex items-center gap-2 mb-2">
          <UIcon
            name="i-lucide-mouse-pointer-click"
            class="h-4 w-4 text-primary-500"
          />
          <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Action</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {{ step.action }}
        </p>
      </div>

      <details
        class="result-section group"
        :open="isActive"
      >
        <summary class="flex items-center gap-2 cursor-pointer list-none">
          <div class="flex items-center gap-2 flex-1">
            <UIcon
              name="i-lucide-eye"
              class="h-4 w-4 text-amber-500"
            />
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Expected Result</span>
          </div>
          <UIcon
            name="i-lucide-chevron-down"
            class="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <p class="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-6">
          {{ step.result }}
        </p>
      </details>

      <div class="mockup-section">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-layout"
              class="h-4 w-4 text-gray-500"
            />
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Preview</span>
          </div>
        </div>
        <FlowMockup
          :wireframe="step.wireframe"
          :highlights="step.highlights"
          :mobile-mode="mobileMode"
          :dark-mode="darkMode"
        />
      </div>

      <div
        v-if="step.annotations?.length"
        class="annotations-section bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3"
      >
        <div class="flex items-center gap-2 mb-2">
          <UIcon
            name="i-lucide-lightbulb"
            class="h-4 w-4 text-amber-600"
          />
          <span class="text-xs font-semibold text-amber-700 dark:text-amber-400">Key Points</span>
        </div>
        <ul class="space-y-1.5">
          <li
            v-for="(annotation, i) in step.annotations"
            :key="i"
            class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300"
          >
            <UIcon
              :name="annotation.icon || 'i-lucide-info'"
              class="h-3.5 w-3.5 mt-0.5 shrink-0"
            />
            <span>{{ annotation.text }}</span>
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>
