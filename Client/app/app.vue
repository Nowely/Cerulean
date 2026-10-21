<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import AppShell from '~/components/shell/AppShell.vue'
// The same skeleton index.html shows before the app starts: no blank screen while the data is read (v22, G18)
import skeleton from '~/spa-loading-template.html?raw'

const data = useDataStore()
const journal = useJournalStore()
const route = useRoute()

onMounted(async () => {
  await data.init({ demo: route.query.demo !== undefined })
  void journal.resume()
  window.addEventListener('online', () => void journal.resume())
})
</script>

<template>
  <NuxtPwaManifest />
  <UApp
    :toaster="null"
    :tooltip="{ delayDuration: 400 }"
  >
    <AppShell v-if="data.ready">
      <NuxtPage />
    </AppShell>
    <!-- eslint-disable vue/no-v-html -- our own static markup -->
    <div
      v-else
      class="contents"
      v-html="skeleton"
    />
    <!-- eslint-enable vue/no-v-html -->
  </UApp>
</template>
