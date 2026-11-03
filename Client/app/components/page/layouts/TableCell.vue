<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { Page, Rec } from '~/domain/types'
import type { ListedProp } from '~/domain/props'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { formatValue, hasValue, optionColor, optionOf, readNumber } from '~/domain/props'
import { stockLow, stockUnit } from '~/domain/stock'
import AdaptiveOverlay from '../../overlay/AdaptiveOverlay.vue'
import OptionPill from '../../common/OptionPill.vue'
import PropValue from '../../record/PropValue.vue'
import StockEditor from '../../record/StockEditor.vue'

const props = defineProps<{ page: Page, rec: Rec, column: ListedProp, readonly?: boolean }>()
const data = useDataStore()
const now = useNow()
const choosing = ref(false)
const editing = ref(false)
const stockOpen = ref(false)
const draft = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const prop = computed(() => props.column.prop)
const value = computed(() => prop.value ? props.rec.values[prop.value.id] : null)
const pill = computed(() => optionOf(prop.value, value.value))
const stock = computed(() => prop.value?.normProp ? { amountProp: prop.value.id, normProp: prop.value.normProp } : null)
const stockConfig = computed(() => props.page.stocks?.find(s => s.amountProp === prop.value?.id && s.normProp === prop.value?.normProp))
const stockText = computed(() => {
  if (!stock.value) return ''
  const amount = props.rec.values[stock.value.amountProp]
  const norm = props.rec.values[stock.value.normProp]
  if (typeof amount !== 'number' || typeof norm !== 'number') return prop.value ? formatValue(prop.value, value.value, now.value) : ''
  const unit = stockUnit(props.rec, props.page, stock.value.amountProp)
  return `${String(amount).replace('.', ',')}/${String(norm).replace('.', ',')}${unit === 'шт' ? '' : ` ${unit}`}`
})
const text = computed(() => prop.value ? formatValue(prop.value, value.value, now.value) : '')

function setValue(v: string | number | null) {
  if (!prop.value) return
  const before = props.rec.values[prop.value.id]
  const { [prop.value.id]: _old, ...rest } = props.rec.values
  data.updateRecord(props.rec.id, { values: hasValue(v) ? { ...rest, [prop.value.id]: v } : rest })
  if (prop.value.type === 'select') data.teachDepartment(props.rec.id, prop.value.id, before, v)
}
function choose(v: string | null) {
  setValue(v)
  choosing.value = false
}
async function edit() {
  if (props.readonly) return
  draft.value = value.value == null ? '' : prop.value?.type === 'number' ? String(value.value).replace('.', ',') : String(value.value)
  editing.value = true
  await nextTick()
  input.value?.focus()
}
function save() {
  if (!editing.value || !prop.value) return
  const t = draft.value.trim()
  setValue(prop.value.type === 'number' ? (t === '' ? null : readNumber(t) ?? value.value ?? null) : t || null)
  editing.value = false
}
</script>

<template>
  <div class="flex h-[43px] min-w-0 items-center overflow-hidden px-3">
    <PropValue
      v-if="column.key === 'due' || prop?.type === 'date'"
      :rec="rec"
      :prop="prop"
      :due="column.key === 'due'"
      :readonly="readonly"
    />
    <button
      v-else-if="stock && stockConfig && !readonly"
      type="button"
      class="h-11 w-full min-w-0 truncate text-left"
      :class="stockLow(rec, stock) ? 'text-warn' : 'text-toned'"
      :aria-label="`${column.name}: ${stockText || 'Добавить'} — ${rec.text}`"
      @click="stockOpen = true"
    >
      {{ stockText }}
    </button>
    <span
      v-else-if="stock"
      class="truncate"
      :class="stockLow(rec, stock) ? 'text-warn' : 'text-toned'"
    >{{ stockText }}</span>
    <AdaptiveOverlay
      v-else-if="prop?.type === 'select' && !readonly"
      v-model:open="choosing"
      :title="prop.name"
      :subtitle="rec.text"
      width="w-72"
      align="start"
    >
      <template #trigger>
        <button
          type="button"
          class="flex h-11 w-full min-w-0 cursor-pointer items-center text-left"
          :aria-label="`${prop.name}: ${text || 'Добавить'} — ${rec.text}`"
          :aria-expanded="choosing"
        >
          <OptionPill
            v-if="pill"
            v-bind="pill"
          />
        </button>
      </template>
      <div class="flex flex-col pb-1">
        <button
          v-for="o in prop.options ?? []"
          :key="o.id"
          type="button"
          class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
          :aria-pressed="o.id === value"
          @click="choose(o.id)"
        >
          <span class="min-w-0 flex-1"><OptionPill
            :name="o.name"
            :color="optionColor(prop.options!, o)"
          /></span>
          <UIcon
            v-if="o.id === value"
            name="i-lucide-check"
            class="size-4.5 text-accent"
          />
        </button>
        <button
          v-if="hasValue(value)"
          type="button"
          class="flex min-h-12 w-full cursor-pointer items-center rounded-chip px-3 text-left text-base text-toned hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
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
    <input
      v-else-if="editing"
      ref="input"
      v-model="draft"
      class="h-9 min-w-0 w-full rounded-item bg-default text-input text-highlighted ring ring-accent outline-none"
      :aria-label="`${column.name} — ${rec.text}`"
      :inputmode="prop?.type === 'number' ? 'decimal' : undefined"
      @keydown.enter.prevent="save"
      @keydown.esc="editing = false"
      @blur="save"
    >
    <button
      v-else
      type="button"
      class="h-11 w-full min-w-0 truncate text-left text-highlighted disabled:cursor-default"
      :disabled="readonly"
      :aria-label="`${column.name}: ${text || 'Добавить'} — ${rec.text}`"
      @click="edit"
    >
      {{ text }}
    </button>
    <StockEditor
      v-if="stockConfig"
      v-model:open="stockOpen"
      :page="page"
      :rec="rec"
      :stock="stockConfig"
    />
  </div>
</template>
