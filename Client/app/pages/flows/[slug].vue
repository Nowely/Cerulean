<script setup lang="ts">
import type { Flow } from '~/shared/lib'
import { getFlow } from './flows.data'
import { FlowTimeline } from '~/widgets/flow-viewer'
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

const d = computed(() => darkMode.value)
</script>

<template>
  <div
    class="min-h-screen p-3 md:p-6"
    :class="d ? 'bg-gray-950' : 'bg-gray-100'"
  >
    <div v-if="flow" class="mx-auto w-full max-w-5xl">
      <header
        class="rounded-xl p-5 md:p-6 shadow-sm mb-4"
        :class="d ? 'bg-gray-900' : 'bg-white'"
      >
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div class="flex items-start gap-3">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl"
              :class="d ? 'bg-primary-900/30' : 'bg-primary-100'"
            >
              <UIcon
                :name="flow.icon"
                class="h-6 w-6"
                :class="d ? 'text-primary-400' : 'text-primary-600'"
              />
            </div>
            <div>
              <h1
                class="text-xl md:text-2xl font-bold"
                :class="d ? 'text-gray-100' : 'text-gray-900'"
              >
                {{ flow.title }}
              </h1>
              <p
                class="mt-1 text-sm"
                :class="d ? 'text-gray-400' : 'text-gray-500'"
              >
                {{ flow.summary }}
              </p>
            </div>
          </div>

          <span class="text-xs text-gray-400">{{ lastUpdated }}</span>
        </div>
      </header>

      <div
        class="rounded-xl p-4 md:p-6 shadow-sm mb-4"
        :class="d ? 'bg-gray-900' : 'bg-white'"
      >
        <FlowTimeline
          :steps="flow.steps"
          :current-step="activeStep"
          :show-all="showAll"
          :dark-mode="darkMode"
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
            @toggle-mobile="mobileMode = !mobileMode"
            @toggle-dark="darkMode = !darkMode"
          />
        </template>
        <FlowStepCard
          v-else-if="currentStep"
          :step="currentStep"
          :step-number="activeStep + 1"
          :is-active="true"
          :mobile-mode="mobileMode"
          :dark-mode="darkMode"
          @toggle-mobile="mobileMode = !mobileMode"
          @toggle-dark="darkMode = !darkMode"
        />
      </div>

      <section
        class="rounded-xl p-5 md:p-6 shadow-sm mt-4"
        :class="d ? 'bg-gray-900' : 'bg-white'"
      >
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-lightbulb" class="h-5 w-5 text-amber-500" />
          <h2
            class="font-semibold"
            :class="d ? 'text-gray-100' : 'text-gray-900'"
          >
            Key Observations
          </h2>
        </div>
        <ul class="grid gap-3 md:grid-cols-2">
          <li
            v-for="(obs, i) in flow.observations"
            :key="i"
            class="flex items-start gap-3 rounded-lg p-3"
            :class="d ? 'bg-gray-800' : 'bg-gray-50'"
          >
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              :class="d ? 'bg-amber-900/30' : 'bg-amber-100'"
            >
              <UIcon
                name="i-lucide-sparkles"
                class="h-3.5 w-3.5"
                :class="d ? 'text-amber-400' : 'text-amber-600'"
              />
            </div>
            <div>
              <span
                class="text-xs font-semibold"
                :class="d ? 'text-gray-100' : 'text-gray-900'"
              >{{ obs.label }}</span>
              <p
                class="mt-0.5 text-xs"
                :class="d ? 'text-gray-400' : 'text-gray-600'"
              >
                {{ obs.description }}
              </p>
            </div>
          </li>
        </ul>
      </section>

      <footer class="mt-6 text-center">
        <NuxtLink
          to="/flows"
          class="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          :class="d ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'"
        >
          <UIcon name="i-lucide-arrow-left" class="h-4 w-4" />
          Back to all flows
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>
