<script setup lang="ts">
// «⋯» of a section, as in the spec: Новая страница, Переименовать, Изменить порядок, Новая секция (right under
// this one, its name a field at once), Удалить секцию. Deleting a section keeps its pages, they move to «Мои страницы»:
// the row says so under its name, and the toast after it takes it back.
import { computed, ref } from 'vue'
import type { Section } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useCreatePage } from '~/composables/useCreatePage'
import { useNotify } from '~/composables/useNotify'
import { count, PAGE_FORMS } from '~/domain/text'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'
import DotsButton from '../common/DotsButton.vue'
import SectionOrder from './SectionOrder.vue'

const props = defineProps<{ section: Section }>()
const emit = defineEmits<{ rename: [] }>()
const data = useDataStore()
const ui = useUiStore()
const { create } = useCreatePage()
const notify = useNotify()
const ordering = ref(false)

/** «2 страницы перейдут в Мои страницы» */
const PAGE_MOVE = ['страница перейдёт', 'страницы перейдут', 'страниц перейдут'] as const
const pageCount = computed(() => data.livePages.filter(p => p.sectionId === props.section.id).length)

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
      hint: pageCount.value ? `${count(pageCount.value, PAGE_MOVE)} в Мои страницы` : 'Страниц в секции нет',
      onSelect: remove
    }
  ]
])

/**
 * A medium action (Action weight): no confirm, the row already says where the pages go; the toast says it again
 * with «Отменить» for 8 s, which brings the section back with its pages
 */
function remove() {
  const name = props.section.name
  const { pages, undo } = data.removeSection(props.section.id)
  const where = pages.length ? `, ${count(pages.length, PAGE_FORMS)} в Моих страницах` : ''
  notify(`Секция ${name} удалена${where}`, { label: 'Отменить', run: undo }, 8000)
}
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
