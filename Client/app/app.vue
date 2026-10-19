<script setup lang="ts">
import { useAppInit } from '~/shared/lib'
import { computed, onMounted } from 'vue'
import { useColorMode, useHead, useSeoMeta } from '#imports'

const colorMode = useColorMode()
const { init } = useAppInit()

onMounted(() => {
  init()
})

const themeColor = computed(() => {
  if (colorMode.value === 'dark') return '#121519'
  if (colorMode.value === 'light') return '#ffffff'
  return colorMode.preference === 'dark' ? '#121519' : '#ffffff'
})

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
    { name: 'theme-color', content: themeColor }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'TaskChat'
const description = 'A task management app with real-time chat and collaboration features'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
