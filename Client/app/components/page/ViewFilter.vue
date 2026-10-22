<script setup lang="ts">
// «Фильтр» of a view (v24, И10): chip rows that apply at once, and the same tap takes a chip back (light). Срок is
// multi-select with a tick in each picked chip; «Любой» clears the others and comes back with the last one off.
// Сделано is one choice, on pages with «Сделано» and on collecting views. Метка: «Ждут уточнения», the words Входящие
// uses. A phone shows it as a sheet of its own; desktop as the second level of «Настроить вид»
import { computed } from 'vue'
import type { DueChip, FilterRule, Page, ViewDef } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { collects, doneChoice, DUE_CHIPS } from '~/domain/collect'
import ChipButton from '../common/ChipButton.vue'

const props = defineProps<{ page: Page, view: ViewDef }>()
const data = useDataStore()

function patch(p: Partial<ViewDef>) {
  data.updatePage(props.page.id, { views: props.page.views.map(v => v.id === props.view.id ? { ...v, ...p } : v) })
}

const dues = computed(() => props.view.dues ?? [])
/** A tick on or off; the picks keep the chips' order, so the select's words do too */
function toggleDue(key: DueChip) {
  const on = dues.value.includes(key)
  patch({ dues: DUE_CHIPS.map(c => c.key).filter(k => k === key ? !on : dues.value.includes(k)) })
}

const shop = computed(() => props.page.template === 'shop')
const hasDone = computed(() => props.page.hasDone || collects(props.view))
const DONES = computed(() => [
  { value: 'open' as const, label: shop.value ? 'Не куплено' : 'Не сделано' },
  { value: 'done' as const, label: shop.value ? 'Куплено' : 'Сделано' },
  { value: 'all' as const, label: 'Все' }
])
const done = computed(() => doneChoice(props.view))
function setDone(v: 'open' | 'done' | 'all') {
  const rest = props.view.filter.filter(r => r.field !== 'done')
  const rule: FilterRule[] = v === 'all' ? [] : [{ field: 'done', op: 'is', value: v === 'done' }]
  patch({ filter: [...rule, ...rest] })
}
</script>

<template>
  <div class="flex flex-col px-2 pb-2">
    <p class="px-2 pt-1 pb-2 text-cap text-toned">
      Срок
    </p>
    <div
      class="flex flex-wrap gap-2 px-2"
      role="group"
      aria-label="Срок"
    >
      <ChipButton
        label="Любой"
        :selected="!dues.length"
        :aria-pressed="!dues.length"
        @click="patch({ dues: [] })"
      />
      <ChipButton
        v-for="c in DUE_CHIPS"
        :key="c.key"
        :label="c.label"
        :icon="dues.includes(c.key) ? 'i-lucide-check' : undefined"
        :selected="dues.includes(c.key)"
        :aria-pressed="dues.includes(c.key)"
        @click="toggleDue(c.key)"
      />
    </div>

    <template v-if="hasDone">
      <p class="px-2 pt-5 pb-2 text-cap text-toned">
        Сделано
      </p>
      <div
        class="flex flex-wrap gap-2 px-2"
        role="radiogroup"
        aria-label="Сделано"
      >
        <ChipButton
          v-for="d in DONES"
          :key="d.value"
          :label="d.label"
          :selected="done === d.value"
          role="radio"
          :aria-checked="done === d.value"
          @click="setDone(d.value)"
        />
      </div>
    </template>

    <p class="px-2 pt-5 pb-2 text-cap text-toned">
      Метка
    </p>
    <div class="flex flex-wrap gap-2 px-2">
      <ChipButton
        label="Ждут уточнения"
        :icon="view.asking ? 'i-lucide-check' : undefined"
        :selected="!!view.asking"
        :aria-pressed="!!view.asking"
        @click="patch({ asking: !view.asking })"
      />
    </div>
  </div>
</template>
