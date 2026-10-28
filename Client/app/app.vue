<script setup lang="ts">
import { onMounted } from 'vue'
import { useColorMode, useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useCloudStore } from '~/stores/cloud'
import { useJournalStore } from '~/stores/journal'
import AppShell from '~/components/shell/AppShell.vue'
// The same skeleton index.html shows before the app starts: no blank screen while the data is read (v22, G18)
import skeleton from '~/spa-loading-template.html?raw'

const data = useDataStore()
const journal = useJournalStore()
const cloud = useCloudStore()
const route = useRoute()
const colorMode = useColorMode()

onMounted(async () => {
  await data.init({ demo: route.query.demo !== undefined })
  // Sync (when connected) starts once the data is read; the theme follows the person too, through color-mode
  cloud.start({
    get: () => colorMode.preference,
    set: (v) => {
      colorMode.preference = v
    }
  })
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
