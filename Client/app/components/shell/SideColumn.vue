<script setup lang="ts">
// The computer's left column (computer delta, items 1, 3, 24): Главная itself on its own surface, 390 wide from 1200px and
// 320 from 900px, with a 1px line on its right edge. What is inside knows it is here (useSide)
import { provide } from 'vue'
import { SIDE } from '~/composables/useSide'
import HomePane from '../home/HomePane.vue'

provide(SIDE, true)
</script>

<template>
  <aside
    class="relative flex w-80 shrink-0 flex-col border-r border-line bg-side xl:w-97.5"
    aria-label="Главная"
    data-side
  >
    <HomePane />
  </aside>
</template>
