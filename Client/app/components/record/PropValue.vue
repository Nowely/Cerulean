<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { PropDef, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { dueChoices } from '~/domain/dates'
import { formatValue, hasValue, optionColor, optionOf, readNumber, TYPE_ICONS } from '~/domain/props'
import { stockUnit } from '~/domain/stock'
import DueButton from './DueButton.vue'
import StockEditor from './StockEditor.vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import OptionPill from '../common/OptionPill.vue'

const props = defineProps<{ rec: Rec, prop?: PropDef, due?: boolean, readonly?: boolean }>()
const emit = defineEmits<{ closed: [] }>()
const data = useDataStore()
const now = useNow()
const editing = ref(false)
const draft = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const dueButton = useTemplateRef<InstanceType<typeof DueButton>>('dueButton')
const choosing = ref(false)
const stockOpen = ref(false)
const page = computed(() => data.pages[props.rec.pageId])
const stock = computed(() => page.value?.stocks?.find(s => s.amountProp === props.prop?.id && s.normProp === props.prop?.normProp))

const value = computed(() => props.prop ? props.rec.values[props.prop.id] ?? null : null)
const text = computed(() => props.prop ? formatValue(props.prop, value.value, now.value) : '')
/** A «Выбор» value reads as its pill, here as on the row */
const pill = computed(() => optionOf(props.prop, value.value))
const norm = computed(() => props.prop?.normProp ? props.rec.values[props.prop.normProp] : null)
const hasNorm = computed(() => props.prop?.type === 'number' && hasValue(value.value) && typeof norm.value === 'number' && typeof value.value === 'number')
const low = computed(() => hasNorm.value && Number(value.value) <= 1 && Number(value.value) < Number(norm.value))
const display = computed(() => hasNorm.value
  ? `${String(value.value).replace('.', ',')} из ${String(norm.value).replace('.', ',')}${stock.value && page.value ? ` ${stockUnit(props.rec, page.value, stock.value.amountProp)}` : props.prop?.unit ? ` ${props.prop.unit}` : ''}`
  : text.value)

function setValue(v: string | number | null) {
  const before = props.rec.values[props.prop!.id]
  const { [props.prop!.id]: _old, ...rest } = props.rec.values
  data.updateRecord(props.rec.id, { values: hasValue(v) ? { ...rest, [props.prop!.id]: v } : rest })
  if (props.prop?.type === 'select') data.teachDepartment(props.rec.id, props.prop.id, before, v)
}

async function edit() {
  if (props.readonly) return
  if (stock.value) {
    stockOpen.value = true
    return
  }
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
  emit('closed')
}
function cancelEdit() {
  editing.value = false
  emit('closed')
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
    variant="card"
    :readonly="readonly"
    @closed="emit('closed')"
  />

  <!-- «Выбор» and Дата: a sheet of the options (with their colour) or of the days -->
  <AdaptiveOverlay
    v-else-if="sheeted && !readonly"
    v-model:open="choosing"
    :title="prop!.name"
    :subtitle="rec.text"
    width="w-72"
    align="start"
    @closed="emit('closed')"
  >
    <template #trigger>
      <button
        type="button"
        class="flex min-h-6 min-w-0 cursor-pointer items-center gap-1.5 text-left"
        :aria-label="`${prop!.name}: ${text || 'Добавить'}`"
        :class="text ? 'text-highlighted' : 'text-toned'"
        :aria-expanded="choosing"
      >
        <OptionPill
          v-if="pill"
          v-bind="pill"
        />
        <span
          v-else
          class="flex items-center gap-1.5"
        ><UIcon
          :name="TYPE_ICONS[prop!.type]"
          class="size-4 shrink-0"
        />{{ text || (prop!.type === 'select' ? 'Выбрать' : 'Добавить') }}</span>
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
          <span class="flex min-w-0 flex-1">
            <OptionPill
              :name="o.name"
              :color="o.dot"
            />
          </span>
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
  <OptionPill
    v-else-if="pill"
    v-bind="pill"
  />
  <span
    v-else-if="sheeted"
    class="flex items-center gap-1.5 text-highlighted"
  ><UIcon
    :name="TYPE_ICONS[prop!.type]"
    class="size-4 shrink-0"
  />{{ text }}</span>

  <!-- Text, and a number still without one: a field -->
  <input
    v-else-if="editing"
    ref="input"
    v-model="draft"
    class="-mx-1.5 h-9 min-w-0 flex-1 rounded-item bg-default px-1.5 text-input text-highlighted ring ring-accent outline-none"
    :inputmode="prop?.type === 'number' ? 'decimal' : undefined"
    :aria-label="prop?.name"
    @keydown.enter.prevent="saveText"
    @keydown.esc="cancelEdit"
    @blur="saveText"
  >
  <button
    v-else
    type="button"
    class="flex min-h-6 min-w-0 cursor-pointer items-center gap-1.5 text-left disabled:cursor-default"
    :class="low ? 'text-warn' : text ? 'text-highlighted' : 'text-toned'"
    :disabled="readonly"
    :aria-label="`${prop?.name}: ${display || 'Добавить'}`"
    @click="edit"
  >
    <UIcon
      :name="hasNorm ? 'i-lucide-box' : TYPE_ICONS[prop!.type]"
      class="size-4 shrink-0"
    />
    {{ display || 'Добавить' }}
  </button>
  <StockEditor
    v-if="page && stock"
    v-model:open="stockOpen"
    :page="page"
    :rec="rec"
    :stock="stock"
    @closed="emit('closed')"
  />
</template>
