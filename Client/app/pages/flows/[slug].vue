<script setup lang="ts">
import type { Flow } from './flows.types'
import { getFlow } from './flows.data'
import FlowTimeline from '~/components/flows/FlowTimeline.vue'
import FlowStepCard from './FlowStepCard.vue'

const route = useRoute()
const slug = route.params.slug as string

const flow = shallowRef<Flow | null>(null)

const flowData = getFlow(slug)
if (!flowData) {
  throw createError({ statusCode: 404, message: 'Flow not found' })
}
flow.value = flowData

const activeStep = ref(0)
const showAll = ref(false)
const mobileMode = ref(false)
const darkMode = ref(false)

const currentStep = computed(() => {
  if (!flow.value) return null
  return flow.value.steps[activeStep.value] ?? null
})

const lastUpdated = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
})

useHead(() => ({
  title: flow.value ? `${flow.value.title} | TaskChat Flows` : 'Flow | TaskChat'
}))
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-950 p-3 md:p-6">
    <div
      v-if="flow"
      class="mx-auto w-full max-w-5xl"
    >
      <header class="bg-white dark:bg-gray-900 rounded-xl p-5 md:p-6 shadow-sm mb-4">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <UIcon
                :name="flow.icon"
                class="h-6 w-6 text-primary-600 dark:text-primary-400"
              />
            </div>
            <div>
              <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ flow.title }}
              </h1>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ flow.summary }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button
              class="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300': mobileMode }"
              @click="mobileMode = !mobileMode"
            >
              <UIcon
                name="i-lucide-smartphone"
                class="h-4 w-4"
              />
              Mobile
            </button>
            <button
              class="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300': darkMode }"
              @click="darkMode = !darkMode"
            >
              <UIcon
                name="i-lucide-moon"
                class="h-4 w-4"
              />
              Dark
            </button>
            <div class="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <span class="text-xs text-gray-400">
              {{ lastUpdated }}
            </span>
          </div>
        </div>
      </header>

      <div class="bg-white dark:bg-gray-900 rounded-xl p-4 md:p-6 shadow-sm mb-4">
        <FlowTimeline
          :steps="flow.steps"
          :current-step="activeStep"
          :show-all="showAll"
          @update:current-step="activeStep = $event"
          @update:show-all="showAll = $event"
        />
      </div>

      <div class="space-y-4">
        <template v-if="showAll">
          <FlowStepCard
            v-for="(step, idx) in flow.steps"
            :key="idx"
            :step="step"
            :step-number="idx + 1"
            :is-active="idx === activeStep"
            :mobile-mode="mobileMode"
            :dark-mode="darkMode"
          />
        </template>
        <FlowStepCard
          v-else-if="currentStep"
          :step="currentStep"
          :step-number="activeStep + 1"
          :is-active="true"
          :mobile-mode="mobileMode"
          :dark-mode="darkMode"
        />
      </div>

      <section class="bg-white dark:bg-gray-900 rounded-xl p-5 md:p-6 shadow-sm mt-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon
            name="i-lucide-lightbulb"
            class="h-5 w-5 text-amber-500"
          />
          <h2 class="font-semibold text-gray-900 dark:text-gray-100">
            Key Observations
          </h2>
        </div>
        <ul class="grid gap-3 md:grid-cols-2">
          <li
            v-for="(obs, i) in flow.observations"
            :key="i"
            class="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3"
          >
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <UIcon
                name="i-lucide-sparkles"
                class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-900 dark:text-gray-100">{{ obs.label }}</span>
              <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                {{ obs.description }}
              </p>
            </div>
          </li>
        </ul>
      </section>

      <footer class="mt-6 text-center">
        <NuxtLink
          to="/flows"
          class="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="h-4 w-4"
          />
          Back to all flows
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>
