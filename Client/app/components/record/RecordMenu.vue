<script setup lang="ts">
// «⋯» of a record page: it starts with «Переименовать», which puts the title in focus
import { computed } from 'vue'
import { useRouter } from '#imports'
import type { Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useRecordActions } from '~/composables/useRecordActions'
import { useTemplates } from '~/composables/useTemplates'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

const props = defineProps<{ rec: Rec }>()
const data = useDataStore()
const ui = useUiStore()
const router = useRouter()
const actions = useRecordActions()
const templates = useTemplates()
const place = computed(() => data.placeOf(props.rec).title)

const items = computed<MenuItem[][]>(() => [
  [
    { label: 'Переименовать', icon: 'i-lucide-pencil', onSelect: () => ui.focusTitle = props.rec.id },
    { label: props.rec.favorite === null ? 'Добавить в избранное' : 'Убрать из избранного', icon: 'i-lucide-star', onSelect: () => actions.favorite(props.rec) },
    // v24 fixes (20): «на другую страницу»; «Сделать шаблоном» right after it (v24, И9), on a record of a page
    ...(props.rec.parentId
      ? []
      : [
          { label: 'Переместить на другую страницу', icon: 'i-lucide-arrow-right', value: place.value, onSelect: () => actions.move([props.rec.id]) },
          { label: 'Сделать шаблоном', icon: 'cer:stamp', onSelect: () => templates.make(props.rec) }
        ]),
    { label: 'Скопировать как текст', icon: 'i-lucide-copy', onSelect: () => actions.copyAsText(props.rec) }
  ],
  [
    {
      label: 'Удалить',
      icon: 'i-lucide-trash-2',
      danger: true,
      onSelect: () => {
        const back = props.rec.parentId ? `/r/${props.rec.parentId}` : `/p/${props.rec.pageId}`
        actions.remove([props.rec.id])
        void router.replace(back)
      }
    }
  ]
])
</script>

<template>
  <ActionMenu
    :items="items"
    :title="rec.text"
    :caption="place"
    label="Действия с записью"
    width="w-93"
  />
</template>
