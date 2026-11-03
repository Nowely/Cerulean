<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Page, Rec, StockConfig } from '~/domain/types'
import { stockLow, stockView } from '~/domain/stock'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import { stepperPatch, stepperText } from './stock-stepper'

const props = defineProps<{ page: Page, rec: Rec, stock: StockConfig }>()
const emit = defineEmits<{ 'open-change': [recordId: string, open: boolean] }>()
const data = useDataStore()
const notify = useNotify()
const open = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let session: { pageId: string, recId: string, stock: StockConfig } | undefined
const current = computed(() => data.records[props.rec.id] ?? props.rec)
const page = computed(() => data.pages[props.page.id] ?? props.page)
const text = computed(() => stepperText(current.value, page.value, props.stock, open.value))
const low = computed(() => stockLow(current.value, props.stock))

function close() {
  clearTimeout(timer)
  timer = undefined
  if (open.value && session) emit('open-change', session.recId, false)
  open.value = false
  session = undefined
}

function touch() {
  if (!open.value) return
  clearTimeout(timer)
  timer = setTimeout(close, 3000)
}

function show() {
  if (!text.value) return
  session = { pageId: props.page.id, recId: props.rec.id, stock: { ...props.stock } }
  open.value = true
  emit('open-change', session.recId, true)
  touch()
}

function step(direction: -1 | 1) {
  touch()
  if (!session) return
  const rec = data.records[session.recId]
  const result = stepperPatch(data.pages[session.pageId], rec, session.stock, direction, session.recId in data.waiting)
  if (!result || !rec) return
  data.updateRecord(rec.id, result.patch)
  if (result.becameLow) {
    const currentPage = data.pages[session.pageId]
    const buy = currentPage && stockView(currentPage, session.stock, 'buy')
    notify(buy ? `${rec.text} теперь в «${buy.name}»` : `${rec.text}: запас заканчивается`)
  }
}

watch(() => [props.page.id, props.rec.id, props.stock.amountProp, props.stock.normProp, props.stock.buyViewId, props.stock.stockViewId], close, { flush: 'sync' })
onBeforeUnmount(close)
</script>

<template>
  <span
    v-if="text"
    class="inline-flex shrink-0 items-center text-[15px] tabular-nums"
    :class="low ? 'text-warn-ink' : 'text-toned'"
    @click.stop
    @pointerdown.stop="touch"
    @keydown.stop
  >
    <template v-if="open">
      <button
        type="button"
        class="h-9 w-11"
        :aria-label="`Уменьшить остаток: ${rec.text}`"
        @click="step(-1)"
      >
        −
      </button>
      <span>{{ text }}</span>
      <button
        type="button"
        class="h-9 w-11"
        :aria-label="`Увеличить остаток: ${rec.text}`"
        @click="step(1)"
      >
        +
      </button>
    </template>
    <button
      v-else
      type="button"
      class="min-h-11"
      :aria-label="`Осталось ${text}: ${rec.text}`"
      :aria-expanded="false"
      @click="show"
    >
      {{ text }}
    </button>
  </span>
</template>
