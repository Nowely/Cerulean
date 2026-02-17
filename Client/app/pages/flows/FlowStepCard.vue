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
        ? 'border-primary-500 shadow-lg shadow-primary-500/10'
        : darkMode
          ? 'border-gray-700 bg-gray-900'
          : 'border-gray-200 bg-white',
      isActive && darkMode ? 'bg-primary-900/20' : '',
      isActive && !darkMode ? 'bg-primary-50/50' : ''
    ]"
  >
    <div
      class="step-header flex items-start gap-3 p-4 border-b"
      :class="darkMode ? 'border-gray-800' : 'border-gray-100'"
    >
      <div
        class="step-number flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
        :class="[
          isActive
            ? 'bg-primary-500 text-white'
            : darkMode
              ? 'bg-gray-800 text-gray-400'
              : 'bg-gray-100 text-gray-600'
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
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            :class="darkMode ? 'bg-primary-900/50 text-primary-300' : 'bg-primary-100 text-primary-700'"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
            Current
          </span>
        </div>
        <h4
          class="font-semibold"
          :class="darkMode ? 'text-gray-100' : 'text-gray-900'"
        >
          {{ step.title }}
        </h4>
      </div>
    </div>

    <div class="step-content p-4 space-y-4">
      <div class="action-section">
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-lucide-mouse-pointer-click" class="h-4 w-4 text-primary-500" />
          <span
            class="text-xs font-semibold"
            :class="darkMode ? 'text-gray-300' : 'text-gray-700'"
          >Action</span>
        </div>
        <p
          class="text-sm leading-relaxed"
          :class="darkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          {{ step.action }}
        </p>
      </div>

      <details class="result-section group" :open="isActive">
        <summary class="flex items-center gap-2 cursor-pointer list-none">
          <div class="flex items-center gap-2 flex-1">
            <UIcon name="i-lucide-eye" class="h-4 w-4 text-amber-500" />
            <span
              class="text-xs font-semibold"
              :class="darkMode ? 'text-gray-300' : 'text-gray-700'"
            >Expected Result</span>
          </div>
          <UIcon
            name="i-lucide-chevron-down"
            class="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <p
          class="mt-3 text-sm leading-relaxed pl-6"
          :class="darkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          {{ step.result }}
        </p>
      </details>

      <div class="mockup-section">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-layout" class="h-4 w-4 text-gray-500" />
            <span
              class="text-xs font-semibold"
              :class="darkMode ? 'text-gray-300' : 'text-gray-700'"
            >Preview</span>
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
        class="annotations-section rounded-lg p-3"
        :class="darkMode ? 'bg-amber-900/20' : 'bg-amber-50'"
      >
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-lucide-lightbulb" class="h-4 w-4 text-amber-600" />
          <span
            class="text-xs font-semibold"
            :class="darkMode ? 'text-amber-400' : 'text-amber-700'"
          >Key Points</span>
        </div>
        <ul class="space-y-1.5">
          <li
            v-for="(annotation, i) in step.annotations"
            :key="i"
            class="flex items-start gap-2 text-xs"
            :class="darkMode ? 'text-amber-300' : 'text-amber-700'"
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
