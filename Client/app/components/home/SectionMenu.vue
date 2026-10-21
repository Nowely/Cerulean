<script setup lang="ts">
// «⋯» of a section, as in the spec: Новая страница, Переименовать, Изменить порядок, Новая секция (right under
// this one, its name a field at once), Удалить секцию. Deleting a section keeps its pages, they move to «Недавнее».
import { computed, ref } from 'vue'
import type { Section } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useCreatePage } from '~/composables/useCreatePage'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'
import DotsButton from '../common/DotsButton.vue'
import SectionOrder from './SectionOrder.vue'

const props = defineProps<{ section: Section }>()
const emit = defineEmits<{ rename: [] }>()
const data = useDataStore()
const ui = useUiStore()
const { create } = useCreatePage()
const ordering = ref(false)

const items = computed<MenuItem[][]>(() => [
  [
    { label: 'Новая страница', icon: 'i-lucide-square-pen', onSelect: () => create({ sectionId: props.section.id }) },
    { label: 'Переименовать', icon: 'i-lucide-pencil', onSelect: () => emit('rename') },
    ...(data.sectionList.length > 1 ? [{ label: 'Изменить порядок', icon: 'i-lucide-arrow-down-up', onSelect: () => ordering.value = true }] : []),
    { label: 'Новая секция', icon: 'i-lucide-list-plus', onSelect: () => ui.renameSection = data.createSection('Новая секция', props.section.id).id }
  ],
  [
    {
      label: 'Удалить секцию',
      icon: 'i-lucide-trash-2',
      danger: true,
      onSelect: () => {
        const n = data.livePages.filter(p => p.sectionId === props.section.id).length
        if (!n) return data.removeSection(props.section.id)
        ui.confirm({
          title: `Удалить секцию «${props.section.name}»?`,
          text: 'Страницы останутся, они переедут в Недавнее.',
          action: 'Удалить секцию',
          run: () => data.removeSection(props.section.id)
        })
      }
    }
  ]
])
</script>

<template>
  <ActionMenu
    :items="items"
    :title="section.name"
    caption="секция"
    :label="`Действия с секцией «${section.name}»`"
  >
    <template #default>
      <DotsButton :label="`Действия с секцией «${section.name}»`" />
    </template>
  </ActionMenu>
  <SectionOrder
    v-model:open="ordering"
    :current="section.id"
  />
</template>
