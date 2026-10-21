<script setup lang="ts">
// One property of a record, edited in place: text and an empty number in a field, a number with a value on a
// stepper, «Выбор» and Дата in a small sheet (a popover on desktop) — the options with their colour dots, or the
// days — and «Срок» with the same button and sheet as in a receipt. `open()` opens the control at once
// (a property just picked in «+ Свойство»).
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { PropDef, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { dueChoices } from '~/domain/dates'
import { formatValue, hasValue, optionColor, readNumber } from '~/domain/props'
import DueButton from './DueButton.vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const props = defineProps<{ rec: Rec, prop?: PropDef, due?: boolean, readonly?: boolean }>()
const data = useDataStore()
const now = useNow()
const editing = ref(false)
const draft = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const dueButton = useTemplateRef<InstanceType<typeof DueButton>>('dueButton')
const choosing = ref(false)

const value = computed(() => props.prop ? props.rec.values[props.prop.id] ?? null : null)
const text = computed(() => props.prop ? formatValue(props.prop, value.value, now.value) : '')

function setValue(v: string | number | null) {
  const { [props.prop!.id]: _old, ...rest } = props.rec.values
  data.updateRecord(props.rec.id, { values: hasValue(v) ? { ...rest, [props.prop!.id]: v } : rest })
}

async function edit() {
  if (props.readonly) return
  draft.value = value.value === null ? '' : String(value.value).replace(/^(-?\d+)\.(\d+)$/, '$1,$2')
  editing.value = true
  await nextTick()
  input.value?.focus()
}

function saveText() {
  if (!editing.value) return
  const t = draft.value.trim()
  // A number keeps what reads as one; anything else leaves the old value
  setValue(props.prop!.type === 'number' ? (t === '' ? null : readNumber(t) ?? value.value) : t || null)
  editing.value = false
}

function choose(v: string | number | null) {
  setValue(v)
  choosing.value = false
}

const options = computed(() => (props.prop?.options ?? []).map(o => ({ ...o, dot: optionColor(props.prop!.options!, o) })))
const days = computed(() => dueChoices(now.value))
const sheeted = computed(() => props.prop?.type === 'select' || props.prop?.type === 'date')

defineExpose({
  open: () => {
    if (props.readonly) return
    if (props.due) dueButton.value?.show()
    else if (sheeted.value) choosing.value = true
    else void edit()
  }
})
</script>

<template>
  <!-- «Срок»: the accent button that opens the «Срок» sheet -->
  <DueButton
    v-if="due"
    ref="dueButton"
    :rec="rec"
    variant="prop"
    :readonly="readonly"
  />

  <!-- «Выбор» and Дата: a sheet of the options (with their colour) or of the days -->
  <AdaptiveOverlay
    v-else-if="sheeted && !readonly"
    v-model:open="choosing"
    :title="prop!.name"
    :subtitle="rec.text"
    width="w-72"
    align="start"
  >
    <template #trigger>
      <button
        type="button"
        class="-mx-1.5 flex min-h-10 min-w-0 cursor-pointer items-center rounded-item px-1.5 text-left hover:bg-muted"
        :class="text ? 'text-highlighted' : 'text-toned'"
        :aria-expanded="choosing"
      >
        <span class="truncate">{{ text || (prop!.type === 'select' ? 'Выбрать' : 'Добавить') }}</span>
      </button>
    </template>
    <div class="flex flex-col pb-1">
      <template v-if="prop!.type === 'select'">
        <button
          v-for="o in options"
          :key="o.id"
          type="button"
          class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
          :aria-pressed="o.id === value"
          @click="choose(o.id)"
        >
          <span
            class="mx-1 size-3 shrink-0 rounded-full"
            :style="{ background: `var(--c-${o.dot})` }"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate">{{ o.name }}</span>
          <UIcon
            v-if="o.id === value"
            name="i-lucide-check"
            class="size-4.5 text-accent"
          />
        </button>
      </template>
      <template v-else>
        <button
          v-for="d in days"
          :key="d.key"
          type="button"
          class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
          :aria-pressed="d.key === value"
          @click="choose(d.key)"
        >
          <span class="min-w-0 flex-1 truncate">{{ d.label }}</span>
          <UIcon
            v-if="d.key === value"
            name="i-lucide-check"
            class="size-4.5 text-accent"
          />
        </button>
      </template>
      <button
        v-if="hasValue(value)"
        type="button"
        class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-toned hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
        @click="choose(null)"
      >
        Убрать
      </button>
    </div>
  </AdaptiveOverlay>
  <span
    v-else-if="sheeted"
    class="text-highlighted"
  >{{ text }}</span>

  <!-- A number with a value: a stepper -->
  <span
    v-else-if="prop?.type === 'number' && hasValue(value) && !editing"
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
      <!-- A tap on the number types another one -->
      <button
        type="button"
        class="h-8 min-w-10 cursor-pointer rounded-item px-1 text-center text-highlighted tabular-nums hover:bg-muted"
        aria-live="polite"
        :aria-label="`${prop.name}: ${text}. Изменить`"
        @click="edit"
      >
        {{ String(value).replace('.', ',') }}
      </button>
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

  <!-- Text, and a number still without one: a field -->
  <input
    v-else-if="editing"
    ref="input"
    v-model="draft"
    class="-mx-1.5 h-9 min-w-0 flex-1 rounded-item bg-default px-1.5 text-input text-highlighted ring ring-accent outline-none"
    :inputmode="prop?.type === 'number' ? 'decimal' : undefined"
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
