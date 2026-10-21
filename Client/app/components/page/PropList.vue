<script setup lang="ts">
// «Свойства»: the page's properties in their order, Срок and Заметка among them («встроенное», they only move).
// A row opens its editor; a long press lifts it to reorder, and screen readers get «Выше» and «Ниже».
import { computed } from 'vue'
import type { Id, Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { propList, TYPE_ICONS, TYPE_NAMES } from '~/domain/props'
import { LIFTED, useDragSort } from '~/composables/useDragSort'

const props = defineProps<{ page: Page }>()
const emit = defineEmits<{ edit: [id: Id], create: [] }>()
const data = useDataStore()
const rows = computed(() => propList(props.page))
const drag = useDragSort({ onDrop: (id, _group, index) => data.moveProp(props.page.id, id, index) })
</script>

<template>
  <div class="flex flex-col pb-1">
    <ul
      v-bind="drag.group('props')"
      aria-label="Свойства страницы"
    >
      <li
        v-for="p in rows"
        :key="p.key"
        v-bind="drag.item(p.key)"
        class="rounded-chip"
        :class="LIFTED"
      >
        <button
          type="button"
          class="flex min-h-12.5 w-full items-center gap-3 rounded-chip px-3 text-left text-base lg:min-h-10 lg:text-15"
          :class="p.builtin ? 'cursor-default' : 'cursor-pointer hover:bg-muted active:bg-pressed'"
          :aria-label="p.builtin ? (p.key === 'due' ? 'Срок, встроенное: Сегодня и календарь работают по нему' : `${p.name}, встроенное`) : `Изменить «${p.name}»`"
          @click="p.builtin || emit('edit', p.key)"
        >
          <UIcon
            :name="TYPE_ICONS[p.type]"
            class="size-5 shrink-0 text-toned"
          />
          <span class="min-w-0 flex-1 truncate text-highlighted">{{ p.name }}</span>
          <span class="shrink-0 text-15 text-toned lg:text-sm">{{ p.builtin ? 'встроенное' : TYPE_NAMES[p.type] }}</span>
          <UIcon
            v-if="!p.builtin"
            name="i-lucide-chevron-right"
            class="size-4 shrink-0 text-dimmed"
          />
          <span
            v-else
            class="w-4 shrink-0"
          />
        </button>
        <!-- The long press for screen readers (keyboards have Alt+↑/↓ on the row) -->
        <button
          type="button"
          class="sr-only"
          tabindex="-1"
          @click="drag.move(p.key, -1)"
        >
          Выше: {{ p.name }}
        </button>
        <button
          type="button"
          class="sr-only"
          tabindex="-1"
          @click="drag.move(p.key, 1)"
        >
          Ниже: {{ p.name }}
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="flex min-h-12.5 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-toned hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
      aria-haspopup="dialog"
      @click="emit('create')"
    >
      <UIcon
        name="i-lucide-plus"
        class="size-5 shrink-0"
      />Новое свойство
    </button>
  </div>
</template>
