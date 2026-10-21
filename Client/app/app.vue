<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from '#imports'
import { useDataStore } from '~/stores/data'
import { useJournalStore } from '~/stores/journal'
import AppShell from '~/components/shell/AppShell.vue'

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
  </UApp>
</template>
