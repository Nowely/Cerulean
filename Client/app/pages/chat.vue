<script setup lang="ts">
// Журнал was «Чат» until v22: an old link or an installed shortcut still lands there
import { navigateTo } from '#imports'

await navigateTo('/journal', { replace: true })
</script>

<template>
  <div />
</template>
