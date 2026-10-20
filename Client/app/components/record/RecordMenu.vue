<script setup lang="ts">
// «⋯» of a record page
import { computed } from 'vue'
import { useRouter } from '#imports'
import type { Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useRecordActions } from '~/composables/useRecordActions'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

const props = defineProps<{ rec: Rec }>()
const data = useDataStore()
const router = useRouter()
const actions = useRecordActions()
const place = computed(() => data.placeOf(props.rec).title)

const items = computed<MenuItem[][]>(() => [
  [
    { label: props.rec.favorite === null ? 'Добавить в избранное' : 'Убрать из избранного', icon: 'i-lucide-star', onSelect: () => actions.favorite(props.rec) },
    ...(props.rec.parentId ? [] : [{ label: 'Переместить', icon: 'i-lucide-arrow-right', value: place.value, onSelect: () => actions.move([props.rec.id]) }]),
    { label: 'Скопировать текст', icon: 'i-lucide-copy', onSelect: () => actions.copy(props.rec) }
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
    :caption="`в ${place}`"
    label="Действия с записью"
  />
</template>
