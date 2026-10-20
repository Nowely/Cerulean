<script setup lang="ts">
// One property of a record, edited in place: text, number (stepper), «Выбор» (Статус too, as plain ink text),
// «Срок» (the same button and sheet as in a receipt)
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { PropDef, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import DueButton from './DueButton.vue'

const props = defineProps<{ rec: Rec, prop?: PropDef, due?: boolean, readonly?: boolean }>()
const data = useDataStore()
const editing = ref(false)
const draft = ref('')
const input = useTemplateRef<HTMLInputElement>('input')

const value = computed(() => props.prop ? props.rec.values[props.prop.id] ?? null : null)
const text = computed(() => {
  const p = props.prop
  if (!p) return ''
  const v = value.value
  if (v === null || v === '') return ''
  if (p.type === 'select') return p.options?.find(o => o.id === v)?.name ?? ''
  return `${v}${p.unit ? ` ${p.unit}` : ''}`
})

function setValue(v: string | number | null) {
  data.updateRecord(props.rec.id, { values: { ...props.rec.values, [props.prop!.id]: v } })
}

async function edit() {
  if (props.readonly) return
  draft.value = value.value === null ? '' : String(value.value)
  editing.value = true
  await nextTick()
  input.value?.focus()
}

function saveText() {
  const t = draft.value.trim()
  setValue(props.prop!.type === 'number' ? (t === '' ? null : Number(t.replace(',', '.')) || 0) : t || null)
  editing.value = false
}

const options = computed(() => [
  ...(props.prop?.options ?? []).map(o => ({ label: o.name, onSelect: () => setValue(o.id), active: o.id === value.value })),
  ...(value.value ? [{ label: 'Убрать', onSelect: () => setValue(null), active: false }] : [])
])
</script>

<template>
  <!-- «Выбор»: a menu of its options -->
  <UDropdownMenu
    v-if="prop?.type === 'select' && !readonly"
    :items="[options]"
    :content="{ align: 'start' }"
  >
    <button
      type="button"
      class="-mx-1.5 flex min-h-10 min-w-0 cursor-pointer items-center rounded-item px-1.5 text-left hover:bg-muted"
      :class="text ? 'text-highlighted' : 'text-toned'"
    >
      {{ text || 'Выбрать' }}
    </button>
  </UDropdownMenu>
  <span
    v-else-if="prop?.type === 'select'"
    class="text-highlighted"
  >{{ text }}</span>

  <!-- Number: a stepper -->
  <span
    v-else-if="prop?.type === 'number'"
    class="flex items-center gap-1"
  >
    <template v-if="!readonly">
      <UButton
        icon="i-lucide-minus"
        size="sm"
        square
        :aria-label="`Меньше: ${prop.name}`"
        @click="setValue(Math.max(0, Number(value ?? 0) - 1))"
      />
      <span
        class="w-10 text-center text-highlighted"
        aria-live="polite"
      >{{ value ?? 0 }}</span>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        square
        :aria-label="`Больше: ${prop.name}`"
        @click="setValue(Number(value ?? 0) + 1)"
      />
      <span
        v-if="prop.unit"
        class="ml-1 text-toned"
      >{{ prop.unit }}</span>
    </template>
    <span
      v-else
      class="text-highlighted"
    >{{ text }}</span>
  </span>

  <!-- «Срок»: the accent button that opens the «Срок» sheet -->
  <DueButton
    v-else-if="due"
    :rec="rec"
    variant="prop"
    :readonly="readonly"
  />

  <!-- Text -->
  <input
    v-else-if="editing"
    ref="input"
    v-model="draft"
    class="-mx-1.5 h-9 min-w-0 flex-1 rounded-item bg-default px-1.5 text-input text-highlighted ring ring-accent outline-none"
    :aria-label="prop?.name"
    @keydown.enter.prevent="saveText"
    @keydown.esc="editing = false"
    @blur="saveText"
  >
  <button
    v-else
    type="button"
    class="-mx-1.5 min-h-10 min-w-0 cursor-pointer truncate rounded-item px-1.5 text-left hover:bg-muted"
    :class="text ? 'text-highlighted' : 'text-toned'"
    :disabled="readonly"
    @click="edit"
  >
    {{ text || 'Добавить' }}
  </button>
</template>
