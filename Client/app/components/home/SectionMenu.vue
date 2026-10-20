<script setup lang="ts">
// «⋯» of a section: the «+» lives here. Deleting a section keeps its pages («Без секции»).
import { computed } from 'vue'
import type { Section } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useCreatePage } from '~/composables/useCreatePage'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

const props = defineProps<{ section: Section }>()
const emit = defineEmits<{ rename: [] }>()
const data = useDataStore()
const ui = useUiStore()
const { create } = useCreatePage()

const items = computed<MenuItem[][]>(() => [
  [
    { label: 'Новая страница', icon: 'i-lucide-plus', onSelect: () => create({ sectionId: props.section.id }) },
    { label: 'Переименовать', icon: 'i-lucide-pencil', onSelect: () => emit('rename') },
    {
      label: props.section.collapsed ? 'Развернуть' : 'Свернуть',
      icon: props.section.collapsed ? 'i-lucide-chevrons-up-down' : 'i-lucide-chevrons-down-up',
      onSelect: () => data.updateSection(props.section.id, { collapsed: !props.section.collapsed })
    }
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
          text: 'Страницы останутся, они переедут в «Без секции».',
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
      <UButton
        icon="i-lucide-ellipsis"
        variant="ghost"
        square
        size="xs"
        :aria-label="`Действия с секцией «${section.name}»`"
        class="max-lg:size-11 max-lg:rounded-card"
      />
    </template>
  </ActionMenu>
</template>
