<script setup lang="ts">
// «Настройки · Главная · Чат»: three equal segments, positions fixed. Navigation, so links with aria-current.
import { computed } from 'vue'
import { useRoute } from '#imports'
import { useDataStore } from '~/stores/data'

const props = withDefaults(defineProps<{ variant?: 'bar' | 'stack' }>(), { variant: 'bar' })
const route = useRoute()
const data = useDataStore()

const tabs = computed(() => [
  { to: '/settings', label: 'Настройки', icon: 'i-lucide-settings', current: route.path.startsWith('/settings') },
  { to: '/', label: 'Главная', icon: 'i-lucide-house', current: route.path === '/' },
  { to: '/chat', label: 'Чат', icon: 'i-lucide-message-square', current: route.path === '/chat', badge: data.clarify.length }
])
const stack = computed(() => props.variant === 'stack')
</script>

<template>
  <nav
    aria-label="Разделы"
    class="flex min-w-0 flex-1 gap-0.5 rounded-card bg-trk"
    :class="stack ? 'p-0.5' : 'p-0.75'"
  >
    <NuxtLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      :aria-current="t.current ? 'page' : undefined"
      class="relative flex min-w-0 flex-1 basis-0 items-center justify-center whitespace-nowrap rounded-chip transition-colors"
      :class="[
        stack ? 'h-12 flex-col gap-1 px-0.5 text-13 leading-none' : 'h-10 gap-1.25 px-0.5 text-sm',
        t.current ? 'bg-seg-on font-medium text-highlighted shadow-seg' : 'text-toned hover:text-highlighted active:bg-pressed'
      ]"
    >
      <UIcon
        :name="t.icon"
        class="size-4 shrink-0"
        :class="t.current ? 'text-accent' : ''"
      />
      <span class="truncate">{{ t.label }}</span>
      <span
        v-if="t.badge"
        class="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.25 text-xs font-semibold"
        :class="stack ? 'absolute top-1 left-[calc(50%+7px)] bg-accent-soft text-accent-ink' : 'bg-accent text-on-accent'"
        :aria-label="`${t.badge} уточнить`"
      >{{ t.badge }}</span>
    </NuxtLink>
  </nav>
</template>
