<script setup lang="ts">
// First run: the same four templates as a new page. A template only gives a starting point.
import { TEMPLATES } from '~/domain/templates'
import { useCreatePage } from '~/composables/useCreatePage'
import ChipButton from '../common/ChipButton.vue'

const { create } = useCreatePage()
</script>

<template>
  <section
    class="rounded-card border border-default bg-default p-3.5"
    aria-labelledby="start-card-title"
  >
    <h2
      id="start-card-title"
      class="text-base font-semibold text-highlighted"
    >
      С чего начать
    </h2>
    <p class="mt-1 text-sm leading-relaxed text-toned">
      Начни с шаблона или просто пиши внизу: Входящие примут всё, а страницы можно завести потом.
    </p>
    <div class="mt-3 flex flex-wrap gap-1.5">
      <ChipButton
        v-for="t in TEMPLATES"
        :key="t.key"
        :label="t.name"
        :glyph="t.glyph"
        :color="t.color"
        @click="create({ template: t.key })"
      />
    </div>
  </section>
</template>
