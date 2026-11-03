<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Page, Rec, StockConfig } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'
import { stockDraft, stockEditorPatch, type StockDraft } from './stock-editor'

const props = defineProps<{ page: Page, rec: Rec, stock: StockConfig }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ closed: [] }>()
const data = useDataStore()
const draft = reactive<StockDraft>({ amount: '', norm: '', unit: '' })
const initial = ref<StockDraft>({ amount: '', norm: '', unit: '' })
const session = ref<{ pageId: string, recId: string, stock: StockConfig, title: string, unit: string } | null>(null)
const error = ref('')

watch(open, (value) => {
  if (!value) return
  const rec = data.records[props.rec.id] ?? props.rec
  const stock = { ...props.stock }
  initial.value = stockDraft(rec, stock)
  Object.assign(draft, initial.value)
  session.value = {
    pageId: props.page.id, recId: rec.id, stock, title: rec.text,
    unit: props.page.props.find(p => p.id === stock.amountProp)?.unit?.trim() || 'шт'
  }
  error.value = ''
}, { immediate: true, flush: 'sync' })

function save() {
  const current = session.value
  if (!current) return
  const rec = data.records[current.recId]
  const page = data.pages[current.pageId]
  if (!rec || rec.deletedAt || rec.pageId !== current.pageId || !page || page.deletedAt
    || !page.stocks?.some(s => s.amountProp === current.stock.amountProp && s.normProp === current.stock.normProp)
    || ![current.stock.amountProp, current.stock.normProp].every(id => page.props.some(p => p.id === id && p.type === 'number'))) {
    error.value = 'Запись или свойства запасов больше недоступны.'
    return
  }
  const patch = stockEditorPatch(rec, current.stock, initial.value, draft)
  if (!patch) {
    error.value = 'Введите неотрицательное конечное число или оставьте поле пустым.'
    return
  }
  if (Object.keys(patch).length) data.updateRecord(rec.id, patch)
  open.value = false
}
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Осталось"
    :subtitle="session?.title"
    dialog
    stacked
    @closed="emit('closed')"
  >
    <form
      class="flex flex-col gap-4 px-3 pt-2 pb-3"
      @submit.prevent="save"
    >
      <p class="text-sm text-toned">
        Единица меняется без пересчёта количества.
      </p>
      <label class="flex flex-col gap-1 text-sm text-toned">
        Осталось
        <input
          v-model="draft.amount"
          type="text"
          inputmode="decimal"
          class="h-11 rounded-item bg-muted px-3 text-input text-highlighted outline-none focus-visible:ring focus-visible:ring-accent"
        >
      </label>
      <label class="flex flex-col gap-1 text-sm text-toned">
        Норма
        <input
          v-model="draft.norm"
          type="text"
          inputmode="decimal"
          class="h-11 rounded-item bg-muted px-3 text-input text-highlighted outline-none focus-visible:ring focus-visible:ring-accent"
        >
      </label>
      <label class="flex flex-col gap-1 text-sm text-toned">
        Единица
        <input
          v-model="draft.unit"
          type="text"
          :placeholder="session?.unit"
          class="h-11 rounded-item bg-muted px-3 text-input text-highlighted outline-none focus-visible:ring focus-visible:ring-accent"
        >
      </label>
      <p
        v-if="error"
        role="alert"
        class="text-sm text-warn-ink"
      >
        {{ error }}
      </p>
      <div class="flex justify-end gap-2">
        <UButton
          type="button"
          variant="ghost"
          @click="open = false"
        >
          Отмена
        </UButton>
        <UButton type="submit">
          Готово
        </UButton>
      </div>
    </form>
  </AdaptiveOverlay>
</template>
