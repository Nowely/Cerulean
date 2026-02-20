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
  <UCard
    class="flow-step-card transition-all"
    :class="[
      isActive
        ? 'border-primary-500 shadow-lg shadow-primary-500/10'
        : darkMode
          ? 'border-muted bg-muted'
          : 'border-default bg-white',
      isActive && darkMode ? 'bg-primary-900/20' : '',
      isActive && !darkMode ? 'bg-primary-50/50' : ''
    ]"
    :ui="{
      header: 'p-4 border-b border-muted',
      body: 'p-4 space-y-4',
      footer: 'p-3 rounded-lg'
    }"
  >
    <template #header>
      <div class="flex items-start gap-3">
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
              :class="isActive ? 'text-primary-600' : 'text-muted'"
            >
              {{ step.label || 'Step' }}
            </span>
            <UBadge
              v-if="isActive"
              variant="soft"
              size="xs"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
              Current
            </UBadge>
          </div>
          <h4
            class="font-semibold"
            :class="darkMode ? 'text-highlighted' : 'text-highlighted'"
          >
            {{ step.title }}
          </h4>
        </div>
      </div>
    </template>

    <div class="action-section">
      <div class="flex items-center gap-2 mb-2">
        <UIcon
          name="i-lucide-mouse-pointer-click"
          class="h-4 w-4 text-primary-500"
        />
        <span
          class="text-xs font-semibold"
          :class="darkMode ? 'text-toned' : 'text-default'"
        >Action</span>
      </div>
      <p
        class="text-sm leading-relaxed"
        :class="darkMode ? 'text-dimmed' : 'text-toned'"
      >
        {{ step.action }}
      </p>
    </div>

    <UCollapsible :default-open="isActive">
      <UButton
        color="neutral"
        variant="ghost"
        class="group w-full justify-start px-0"
        trailing-icon="i-lucide-chevron-down"
        :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200 ml-auto' }"
      >
        <template #leading>
          <UIcon
            name="i-lucide-eye"
            class="h-4 w-4 text-amber-500"
          />
        </template>
        <span
          class="text-xs font-semibold"
          :class="darkMode ? 'text-toned' : 'text-default'"
        >Expected Result</span>
      </UButton>
      <template #content>
        <p
          class="mt-3 text-sm leading-relaxed pl-6"
          :class="darkMode ? 'text-dimmed' : 'text-toned'"
        >
          {{ step.result }}
        </p>
      </template>
    </UCollapsible>

    <div class="mockup-section">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-layout"
            class="h-4 w-4 text-muted"
          />
          <span
            class="text-xs font-semibold"
            :class="darkMode ? 'text-toned' : 'text-default'"
          >Preview</span>
        </div>
        <UButton
          icon="i-lucide-smartphone"
          :label="mobileMode ? 'Mobile' : 'Desktop'"
          :color="mobileMode ? 'primary' : 'neutral'"
          :variant="mobileMode ? 'solid' : 'outline'"
          size="xs"
          @click="emit('toggle-mobile')"
        />
        <UButton
          :icon="darkMode ? 'i-lucide-sun' : 'i-lucide-moon'"
          :label="darkMode ? 'Light' : 'Dark'"
          :color="darkMode ? 'primary' : 'neutral'"
          :variant="darkMode ? 'solid' : 'outline'"
          size="xs"
          @click="emit('toggle-dark')"
        />
      </div>
      <FlowMockup
        :wireframe="step.wireframe"
        :highlights="step.highlights"
        :mobile-mode="mobileMode"
        :dark-mode="darkMode"
      />
    </div>

    <template
      v-if="step.annotations?.length"
      #footer
    >
      <div
        class="annotations-section"
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
    </template>
  </UCard>
</template>
