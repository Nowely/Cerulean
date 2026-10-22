<script setup lang="ts">
// A mistyped address or a crash: one calm line in Russian and the way back to Главная
import { computed } from 'vue'
import { clearError, useHead } from '#imports'
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const missing = computed(() => props.error.statusCode === 404)
useHead({ title: computed(() => `${missing.value ? 'Такой страницы нет' : 'Что-то сломалось'} · Cerulean`) })
</script>

<template>
  <main class="flex h-dvh flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
    <p class="text-lg font-semibold text-highlighted">
      {{ missing ? 'Такой страницы нет' : 'Что-то сломалось' }}
    </p>
    <p class="max-w-80 text-15 text-toned">
      {{ missing ? 'Адрес набран с ошибкой или ссылка устарела. Все записи на месте.' : 'Записи на месте: они хранятся в этом браузере. Вернись на главную и попробуй ещё раз.' }}
    </p>
    <button
      type="button"
      class="h-11 cursor-pointer rounded-card bg-btn px-4 text-15 font-medium text-highlighted hover:bg-btn-pressed active:bg-btn-pressed lg:h-9 lg:text-sm"
      @click="clearError({ redirect: '/' })"
    >
      На главную
    </button>
  </main>
</template>
