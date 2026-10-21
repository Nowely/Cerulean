<script setup lang="ts">
// «⋯» of a page: Переименовать, Значок и цвет, Избранное, «Что сюда класть», section, view settings, «Свойства», copy, delete.
// From Главная «Переименовать» and «Значок и цвет» open the page with its title or icon picker ready.
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRouter } from '#imports'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNotify } from '~/composables/useNotify'
import { usePropSheets } from '~/composables/usePropSheets'
import { toMarkdown } from '~/domain/export'
import { propList } from '~/domain/props'
import { pageColor } from '~/domain/look'
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
const ui = useUiStore()
const router = useRouter()
const notify = useNotify()
const propSheets = usePropSheets()

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

/** The page takes it from here: its title in focus, or its icon picker open */
function edit(what: 'title' | 'glyph') {
  if (what === 'title') ui.focusTitle = props.page.id
  else ui.openGlyph = props.page.id
  if (props.home) void router.push(`/p/${props.page.id}`)
}

const items = computed<MenuItem[][]>(() => {
  const own = props.page.kind === 'page'
  const first: MenuItem[] = [
    ...(own ? [{ label: 'Переименовать', icon: 'i-lucide-pencil', onSelect: () => edit('title') }] : []),
    {
      label: props.page.favorite === null ? 'Добавить в избранное' : 'Убрать из избранного',
      icon: 'i-lucide-star',
      onSelect: () => data.toggleFavorite({ kind: 'page', id: props.page.id })
    }
  ]
  if (own) {
    // The words Авто files by (v23: never «описание»), in muted on the right
    first.push({ label: 'Что сюда класть', icon: 'i-lucide-lightbulb', value: props.page.description || 'не задано', onSelect: () => describing.value = true })
    first.push({ label: 'Значок и цвет', icon: 'i-lucide-palette', onSelect: () => edit('glyph') })
    first.push({ label: 'Переместить в секцию', icon: 'i-lucide-arrow-right', value: section.value?.name ?? 'Мои страницы', onSelect: () => moving.value = true })
  }
  if (props.page.kind !== 'today' && !props.home) first.push({ label: 'Настроить вид', icon: 'i-lucide-sliders-horizontal', onSelect: () => emit('settings') })
  // Their number counts Срок and Заметка too, so it matches the rows of the list
  if (own) first.push({ label: 'Свойства', icon: 'i-lucide-list', value: String(propList(props.page).length), onSelect: () => propSheets.list(props.page.id) })
  first.push({ label: 'Скопировать как текст', icon: 'i-lucide-copy', onSelect: copy })
  return system.value ? [first] : [first, [{ label: 'Удалить', icon: 'i-lucide-trash-2', danger: true, onSelect: remove }]]
})
</script>

<template>
  <ActionMenu
    v-model:open="open"
    :items="items"
    :title="page.title || 'Без названия'"
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
        :color="pageColor(page)"
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
