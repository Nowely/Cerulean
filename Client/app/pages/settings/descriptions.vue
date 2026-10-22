<script setup lang="ts">
// «Что класть на страницы»: every page's «Что сюда класть» at once (a phone screen; desktop shows the same list inline in Настройки)
import { computed } from 'vue'
import { useHead } from '#imports'
import { useDataStore } from '~/stores/data'
import AppScreen from '~/components/shell/AppScreen.vue'
import DeskHeader from '~/components/shell/DeskHeader.vue'
import DescriptionList from '~/components/settings/DescriptionList.vue'
import { useScreen } from '~/composables/useScreen'

useHead({ title: 'Что класть на страницы · Cerulean' })
const data = useDataStore()
const { isDesktop } = useScreen()
const empty = computed(() => !data.livePages.some(p => p.kind === 'page'))
</script>

<template>
  <AppScreen>
    <template #header>
      <header class="box-content flex h-11 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1.5 pl-1 lg:hidden">
        <NuxtLink
          to="/settings"
          class="flex h-11 items-center gap-0.5 rounded-card pr-2.5 pl-1 text-base text-accent-ink active:bg-pressed"
        >
          <UIcon
            name="i-lucide-chevron-left"
            class="size-6"
          />Настройки
        </NuxtLink>
      </header>
      <DeskHeader>
        <nav
          aria-label="Путь"
          class="flex min-w-0 items-center gap-1.5"
        >
          <NuxtLink
            to="/settings"
            class="hover:text-highlighted"
          >Настройки</NuxtLink>
          <span class="text-dimmed">/</span>
          <b class="truncate font-medium text-highlighted">Что класть на страницы</b>
        </nav>
      </DeskHeader>
    </template>

    <div class="mx-auto w-full pb-8 lg:max-w-180 lg:px-8 lg:pt-7">
      <h1 class="px-5 pt-1 text-title text-highlighted lg:px-0 lg:pt-0">
        Что класть на страницы
      </h1>
      <p class="px-5 pt-1.5 pb-3 text-15 leading-snug text-toned lg:px-0 lg:pt-2 lg:pb-5 lg:text-sm">
        По этим словам решается, куда положить запись. Пиши, что класть на страницу, можно с примерами.
      </p>
      <p
        v-if="empty"
        class="px-5 py-4 text-meta text-toned lg:px-0"
      >
        Страниц пока нет. Строка появится вместе с первой страницей.
      </p>
      <DescriptionList
        v-else
        :variant="isDesktop ? 'table' : 'list'"
      />
    </div>
  </AppScreen>
</template>
