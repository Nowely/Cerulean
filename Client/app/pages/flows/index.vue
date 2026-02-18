<script setup lang="ts">
import { getFlowList } from './flows.data'

const flows = getFlowList()

const lastUpdated = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
})

useHead({
  title: 'User Flows | TaskChat'
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 p-4 md:p-8">
    <div class="mx-auto max-w-4xl">
      <header class="bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-10 shadow-2xl mb-6">
        <div class="flex flex-col items-center text-center mb-8">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30 mb-4">
            <UIcon
              name="i-lucide-layout-list"
              class="h-8 w-8 text-primary-600 dark:text-primary-400"
            />
          </div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            TaskChat User Flows
          </h1>
          <p class="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
            Interactive documentation showing how to use TaskChat features. Each flow includes step-by-step walkthroughs with live previews.
          </p>
          <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
            <UIcon
              name="i-lucide-clock"
              class="h-3.5 w-3.5"
            />
            Updated {{ lastUpdated }}
          </div>
        </div>

        <div class="flex flex-wrap justify-center gap-3 mb-8">
          <div class="flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 text-xs">
            <UIcon
              name="i-lucide-layout"
              class="h-3.5 w-3.5 text-primary-500"
            />
            <span class="text-primary-700 dark:text-primary-300">Live Previews</span>
          </div>
          <div class="flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-xs">
            <UIcon
              name="i-lucide-lightbulb"
              class="h-3.5 w-3.5 text-amber-500"
            />
            <span class="text-amber-700 dark:text-amber-300">Key Insights</span>
          </div>
          <div class="flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-xs">
            <UIcon
              name="i-lucide-smartphone"
              class="h-3.5 w-3.5 text-blue-500"
            />
            <span class="text-blue-700 dark:text-blue-300">Mobile Views</span>
          </div>
        </div>

        <div class="grid gap-3">
          <NuxtLink
            v-for="flow in flows"
            :key="flow.slug"
            :to="`/flows/${flow.slug}`"
            class="group flex items-center gap-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 transition-all hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg hover:shadow-primary-500/10"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 transition-colors group-hover:bg-primary-500 group-hover:text-white">
              <UIcon
                :name="flow.icon"
                class="h-6 w-6"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {{ flow.title }}
              </div>
              <div class="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {{ flow.description }}
              </div>
            </div>
            <UIcon
              name="i-lucide-arrow-right"
              class="h-5 w-5 text-gray-300 dark:text-gray-600 transition-all group-hover:text-primary-500 group-hover:translate-x-1"
            />
          </NuxtLink>
        </div>
      </header>

      <footer class="text-center text-sm text-white/60">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 hover:text-white transition-colors"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="h-4 w-4"
          />
          Back to TaskChat
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>
