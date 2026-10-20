<script setup lang="ts">
// Top of Главная. Phone: the title in the page-title role and three glyphs, Найти, Чат and «⋯».
// Чат carries an 8px accent dot while records wait for «уточнить» (the number stays on Входящие).
// Desktop: the 72px title header with «⋯» only (Найти and Чат are in the sidebar).
// «⋯» of Главная: «Компактные строки», «Новая страница», «Новая секция», «Настройки», «Корзина».
import { computed } from 'vue'
import { useRouter } from '#imports'
import { useDataStore } from '~/stores/data'
import { useFind } from '~/composables/useFind'
import { useCreatePage } from '~/composables/useCreatePage'
import { count } from '~/domain/text'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'
import DotsButton from '../common/DotsButton.vue'
import TitleHeader from '../shell/TitleHeader.vue'

const emit = defineEmits<{ newSection: [], top: [] }>()
const data = useDataStore()
const router = useRouter()
const find = useFind()
const { create } = useCreatePage()

const waiting = computed(() => data.clarify.length)
const chatLabel = computed(() => waiting.value
  ? `Чат: ${count(waiting.value, ['запись ждёт', 'записи ждут', 'записей ждут'])} уточнения`
  : 'Чат')

const items = computed<MenuItem[][]>(() => [
  [{
    label: 'Компактные строки',
    icon: 'i-lucide-rows-3',
    checked: data.settings.homeRows === 'compact',
    onSelect: () => data.setSettings({ homeRows: data.settings.homeRows === 'compact' ? 'summary' : 'compact' })
  }],
  [
    { label: 'Новая страница', icon: 'i-lucide-square-pen', onSelect: () => create() },
    { label: 'Новая секция', icon: 'i-lucide-list-plus', onSelect: () => emit('newSection') }
  ],
  [
    { label: 'Настройки', icon: 'i-lucide-settings', onSelect: () => void router.push('/settings') },
    { label: 'Корзина', icon: 'i-lucide-trash-2', onSelect: () => void router.push('/settings/trash') }
  ]
])
</script>

<template>
  <TitleHeader title="Главная">
    <ActionMenu
      :items="items"
      title="Главная"
      label="Действия с Главной"
    >
      <DotsButton
        label="Действия с Главной"
        tone="muted"
      />
    </ActionMenu>
  </TitleHeader>
  <header class="flex h-15 shrink-0 items-center pt-[env(safe-area-inset-top)] pr-1 pl-4 lg:hidden">
    <h1 class="min-w-0 flex-1">
      <button
        type="button"
        class="max-w-full cursor-pointer truncate text-left text-28 font-semibold tracking-[-.015em] text-highlighted"
        @click="emit('top')"
      >
        Главная
      </button>
    </h1>
    <button
      type="button"
      class="hit-44 relative flex size-11 cursor-pointer items-center justify-center rounded-item text-toned active:bg-pressed"
      aria-label="Найти"
      @click="find.open()"
    >
      <UIcon
        name="i-lucide-search"
        class="size-5"
      />
    </button>
    <NuxtLink
      to="/chat"
      class="relative flex size-11 items-center justify-center rounded-item text-toned active:bg-pressed"
      :aria-label="chatLabel"
    >
      <UIcon
        name="i-lucide-message-square"
        class="size-5"
      />
      <span
        v-if="waiting"
        class="absolute top-2.25 right-2 size-2 rounded-full bg-accent ring-2 ring-canvas"
        aria-hidden="true"
      />
    </NuxtLink>
    <ActionMenu
      :items="items"
      title="Главная"
      label="Действия с Главной"
      headless
    >
      <DotsButton
        label="Действия с Главной"
        tone="muted"
        class="size-11"
      />
    </ActionMenu>
  </header>
</template>
