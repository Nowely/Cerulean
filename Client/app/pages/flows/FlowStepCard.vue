<script setup lang="ts">
import type { FlowStep } from '~/shared/lib'
import { FlowMockup } from '~/widgets/flow-viewer'

defineProps<{
  step: FlowStep
  stepNumber: number
  isActive?: boolean
  mobileMode?: boolean
  darkMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-mobile' | 'toggle-dark'): void
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
      <UAvatar
        :text="String(stepNumber)"
        size="lg"
        :color="isActive ? 'primary' : 'neutral'"
        :variant="isActive ? 'solid' : 'soft'"
        class="shrink-0 font-bold"
      />

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span
            class="text-[10px] font-semibold uppercase tracking-wider"
            :class="isActive ? 'text-primary-600' : 'text-gray-500'"
          >
            {{ step.label || 'Step' }}
          </span>
          <UBadge
            v-if="isActive"
            color="primary"
            variant="soft"
            size="xs"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
            Current
          </UBadge>
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
          <UIcon
            name="i-lucide-mouse-pointer-click"
            class="h-4 w-4 text-primary-500"
          />
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

      <details
        class="result-section group"
        :open="isActive"
      >
        <summary class="flex items-center gap-2 cursor-pointer list-none">
          <UIcon
            name="i-lucide-eye"
            class="h-4 w-4 text-amber-500"
          />
          <span
            class="text-xs font-semibold flex-1"
            :class="darkMode ? 'text-gray-300' : 'text-gray-700'"
          >Expected Result</span>
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
            <UIcon
              name="i-lucide-layout"
              class="h-4 w-4 text-gray-500"
            />
            <span
              class="text-xs font-semibold"
              :class="darkMode ? 'text-gray-300' : 'text-gray-700'"
            >Preview</span>
          </div>
          <button
            class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all"
            :class="[
              mobileMode
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                : darkMode
                  ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
            ]"
            @click="emit('toggle-mobile')"
          >
            <UIcon
              name="i-lucide-smartphone"
              class="h-3.5 w-3.5"
            />
            {{ mobileMode ? 'Mobile' : 'Desktop' }}
          </button>
          <button
            class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all"
            :class="[
              darkMode
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
            ]"
            @click="emit('toggle-dark')"
          >
            <UIcon
              :name="darkMode ? 'i-lucide-sun' : 'i-lucide-moon'"
              class="h-3.5 w-3.5"
            />
            {{ darkMode ? 'Light' : 'Dark' }}
          </button>
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
        <UIcon
          name="i-lucide-lightbulb"
          class="h-4 w-4 text-amber-600"
        />
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
  </article>
</template>
