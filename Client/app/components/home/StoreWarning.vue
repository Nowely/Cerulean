<script setup lang="ts">
// The browser keeps nothing (a private window, blocked site data). The one tinted warning in the product:
// on Главная it opens the list and leads to Настройки; there it replaces the status line and says what to do.
// The same block on desktop (v22 desktop addendum, HomeNoStore).
import { useRouter } from '#imports'
import { useCopy } from '~/composables/useCopy'

const props = withDefaults(defineProps<{ place?: 'home' | 'settings' }>(), { place: 'home' })
const router = useRouter()
const { saveCopy } = useCopy()
const home = props.place === 'home'
</script>

<template>
  <div
    :role="home ? 'alert' : 'status'"
    class="rounded-card bg-warn-soft px-3.5 pt-3 pb-1"
  >
    <p class="text-base leading-5 font-medium text-warn-ink">
      Изменения не сохраняются
    </p>
    <p class="mt-1 mb-1.5 text-sm leading-5 text-default">
      <template v-if="home">
        Браузер не даёт хранить данные, так бывает в приватном окне. Всё пропадёт, когда закроешь вкладку.
      </template>
      <template v-else>
        Открой сайт в обычном окне, не в приватном, или разреши ему хранить данные в настройках браузера. До тех пор сохраняй копию.
      </template>
    </p>
    <div class="-mx-2.5 flex gap-1">
      <UButton
        color="primary"
        variant="ghost"
        size="lg"
        class="px-2.5 font-normal"
        @click="saveCopy()"
      >
        Сохранить копию
      </UButton>
      <UButton
        v-if="home"
        color="primary"
        variant="ghost"
        size="lg"
        class="px-2.5 font-normal"
        @click="router.push('/settings')"
      >
        Как исправить
      </UButton>
    </div>
  </div>
</template>
