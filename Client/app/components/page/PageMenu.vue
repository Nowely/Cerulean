<script setup lang="ts">
// «⋯» of a page: Избранное, Описание для Авто, section, view settings, copy, delete
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRouter } from '#imports'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import { toMarkdown } from '~/domain/export'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'
import SectionSheet from './SectionSheet.vue'
import PageTile from '../common/PageTile.vue'

const DescriptionDialog = defineAsyncComponent(() => import('./DescriptionDialog.vue'))

const props = defineProps<{
  page: Page
  /** On Главная: no view settings; the row's «⋯» on desktop, a long press on the phone (`bare`, opened through v-model) */
  home?: boolean
  bare?: boolean
}>()
const emit = defineEmits<{ settings: [] }>()
const open = defineModel<boolean>('open', { default: false })
const data = useDataStore()
const router = useRouter()
const notify = useNotify()

const section = computed(() => props.page.sectionId ? data.sections[props.page.sectionId] : undefined)
const system = computed(() => props.page.kind === 'inbox')
const describing = ref(false)
const moving = ref(false)

async function copy() {
  const text = toMarkdown([props.page], data.liveRecords.filter(r => r.pageId === props.page.id), [], Date.now())
  try {
    await navigator.clipboard.writeText(text.replace(/^# Cerulean\n\n/, ''))
    notify('Страница скопирована как текст', undefined, 3000)
  } catch {
    notify('Не удалось скопировать', undefined, 3000)
  }
}

function remove() {
  const id = props.page.id
  data.removePage(id)
  if (!props.home) void router.replace('/')
  notify('Страница в корзине', { label: 'Отменить', run: () => data.restorePage(id) })
}

const items = computed<MenuItem[][]>(() => {
  const first: MenuItem[] = [
    {
      label: props.page.favorite === null ? 'Добавить в избранное' : 'Убрать из избранного',
      icon: 'i-lucide-star',
      onSelect: () => data.toggleFavorite({ kind: 'page', id: props.page.id })
    }
  ]
  if (props.page.kind === 'page') {
    first.push({ label: 'Описание для Авто', icon: 'i-lucide-lightbulb', value: props.page.description || 'нет', onSelect: () => describing.value = true })
    first.push({ label: 'Переместить в секцию', icon: 'i-lucide-arrow-right', value: section.value?.name ?? 'Недавнее', onSelect: () => moving.value = true })
  }
  if (props.page.kind !== 'today' && !props.home) first.push({ label: 'Настроить вид', icon: 'i-lucide-sliders-horizontal', onSelect: () => emit('settings') })
  first.push({ label: 'Скопировать как текст', icon: 'i-lucide-copy', onSelect: copy })
  return system.value ? [first] : [first, [{ label: 'Удалить', icon: 'i-lucide-trash-2', danger: true, onSelect: remove }]]
})
</script>

<template>
  <ActionMenu
    v-model:open="open"
    :items="items"
    :title="page.title || 'Без названия'"
    :caption="section ? `секция «${section.name}»` : undefined"
    label="Действия со страницей"
    :bare="bare"
  >
    <template
      v-if="$slots.default"
      #default
    >
      <slot />
    </template>
    <template #head>
      <PageTile
        :glyph="page.glyph"
        :color="page.color"
        :size="24"
        tile
      />
      <span class="min-w-0 flex-1 truncate text-base font-semibold text-highlighted">{{ page.title || 'Без названия' }}</span>
    </template>
  </ActionMenu>

  <DescriptionDialog
    v-model:open="describing"
    :page="page"
  />

  <SectionSheet
    v-model:open="moving"
    :page="page"
  />
</template>
