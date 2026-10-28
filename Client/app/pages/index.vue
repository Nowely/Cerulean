<script setup lang="ts">
// Главная. On a phone it is the first screen. On a computer Главная is the left column (AppShell) and something is always
// open on the right: `/` opens the page opened last, «Быстрый старт» on a first run (computer delta, item 2)
import { watch } from 'vue'
import { useHead, useRouter } from '#imports'
import { useScreen } from '~/composables/useScreen'
import { startPage } from '~/composables/useOpened'
import HomePane from '~/components/home/HomePane.vue'

useHead({ title: 'Главная · Cerulean' })

const { isDesktop } = useScreen()
const router = useRouter()
watch(isDesktop, (desk) => {
  if (desk) void router.replace(`/p/${startPage()}`)
}, { immediate: true })
</script>

<template>
  <HomePane v-if="!isDesktop" />
</template>
