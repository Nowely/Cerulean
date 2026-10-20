<script setup lang="ts">
// One property of a record, edited in place: text, number (stepper), «Выбор», «Срок»
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { Due, PropDef, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { formatDueLong, isOverdue } from '~/domain/dates'

const props = defineProps<{ rec: Rec, prop?: PropDef, due?: boolean, readonly?: boolean }>()
const data = useDataStore()
const now = useNow()
const editing = ref(false)
const draft = ref('')
const input = useTemplateRef<HTMLInputElement>('input')

const value = computed(() => props.prop ? props.rec.values[props.prop.id] ?? null : null)
const text = computed(() => {
  if (props.due) return props.rec.due ? formatDueLong(props.rec.due, now.value) : ''
  const p = props.prop!
  const v = value.value
  if (v === null || v === '') return ''
  if (p.type === 'select') return p.options?.find(o => o.id === v)?.name ?? ''
  return `${v}${p.unit ? ` ${p.unit}` : ''}`
})
const late = computed(() => props.due && !props.rec.done && isOverdue(props.rec.due, now.value))

function setValue(v: string | number | null) {
  data.updateRecord(props.rec.id, { values: { ...props.rec.values, [props.prop!.id]: v } })
}

async function edit() {
  if (props.readonly) return
  if (props.due) {
    draft.value = props.rec.due?.date ?? ''
  } else {
    draft.value = value.value === null ? '' : String(value.value)
  }
  editing.value = true
  await nextTick()
  input.value?.focus()
}

function saveText() {
  const t = draft.value.trim()
  setValue(props.prop!.type === 'number' ? (t === '' ? null : Number(t.replace(',', '.')) || 0) : t || null)
  editing.value = false
}

const time = ref(props.rec.due?.time ?? '')
function saveDue() {
  const date = draft.value
  const due: Due | null = date ? (time.value ? { date, time: time.value.replace(/^0(\d)/, '$1') } : { date }) : null
  data.updateRecord(props.rec.id, { due })
  editing.value = false
}

const options = computed(() => [
  ...(props.prop?.options ?? []).map(o => ({ label: o.name, onSelect: () => setValue(o.id), active: o.id === value.value })),
  ...(value.value ? [{ label: 'Убрать', onSelect: () => setValue(null), active: false }] : [])
])
const status = computed(() => props.prop?.type === 'select' && props.prop.name === 'Статус')
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
      class="flex min-h-10 min-w-0 cursor-pointer items-center rounded-item text-left"
      :class="status && text ? 'h-7 rounded-chip bg-accent-soft px-2.5 text-meta font-medium text-accent-ink' : 'px-1.5 -mx-1.5 hover:bg-muted text-highlighted'"
    >
      {{ text || 'Выбрать' }}
    </button>
  </UDropdownMenu>
  <span
    v-else-if="prop?.type === 'select'"
    :class="status && text ? 'inline-flex h-7 items-center rounded-chip bg-accent-soft px-2.5 text-meta font-medium text-accent-ink' : 'text-highlighted'"
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

  <!-- «Срок»: date and an optional time -->
  <form
    v-else-if="due && editing"
    class="flex flex-wrap items-center gap-2 py-1"
    @submit.prevent="saveDue"
  >
    <input
      ref="input"
      v-model="draft"
      type="date"
      class="h-9 rounded-chip border border-default bg-default px-2 text-input text-highlighted"
      aria-label="Дата"
    >
    <input
      v-model="time"
      type="time"
      class="h-9 rounded-chip border border-default bg-default px-2 text-input text-highlighted"
      aria-label="Время"
    >
    <UButton
      type="submit"
      color="primary"
      variant="solid"
      size="sm"
    >
      Готово
    </UButton>
    <UButton
      v-if="rec.due"
      size="sm"
      @click="draft = ''; saveDue()"
    >
      Убрать
    </UButton>
  </form>
  <button
    v-else-if="due"
    type="button"
    class="-mx-1.5 min-h-10 cursor-pointer rounded-item px-1.5 text-left hover:bg-muted"
    :class="late ? 'text-warn-ink' : text ? 'text-highlighted' : 'text-toned'"
    :disabled="readonly"
    @click="edit"
  >
    {{ text ? (late ? `${text} · просрочено` : text) : 'Добавить срок' }}
  </button>

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
