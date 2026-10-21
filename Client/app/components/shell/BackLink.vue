<script setup lang="ts">
// The way back from a page or a record: «‹ Главная», «‹ Цели». Opened from Поиск it reads «‹ Поиск» and steps
// back in history, so Поиск returns with its query and results (v22, G11). The slot gets the label to show.
import { computed } from 'vue'
import { useFromFind } from '~/composables/useFromFind'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ to: string, label: string }>()
const { back, goBack } = useFromFind()
const target = computed(() => back.value ? { to: back.value, label: 'Поиск' } : { to: props.to, label: props.label })
</script>

<template>
  <NuxtLink
    v-slot="{ href, navigate }"
    :to="target.to"
    custom
  >
    <a
      :href="href ?? undefined"
      v-bind="$attrs"
      @click="(e: MouseEvent) => back ? goBack(e) : navigate(e)"
    >
      <slot :label="target.label">{{ target.label }}</slot>
    </a>
  </NuxtLink>
</template>
