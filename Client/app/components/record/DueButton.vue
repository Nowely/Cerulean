<script setup lang="ts">
// «Срок» changed by a tap: a date Авто recognised while filing (a receipt row) and the Срок of a record page are
// one accent-ink button with a clock glyph. It opens the «Срок» sheet (a 300px popover on desktop): Сегодня ·
// Завтра · «В субботу» · «Без срока», then the time chips. The record, its receipt and Сегодня follow at once.
// Nothing is edited by words for now.
import { computed, ref } from 'vue'
import type { Due, Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { dueChoices, formatDue, formatDueLong, isOverdue } from '~/domain/dates'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const props = withDefaults(defineProps<{
  rec: Rec
  /** row: the end of a phone receipt row (44px target) · line: line 2 of a desktop receipt row · prop: the record page */
  variant?: 'row' | 'line' | 'prop'
  /** Read, not changed (the preview in Поиск): the date as plain words */
  readonly?: boolean
}>(), { variant: 'row', readonly: false })

const data = useDataStore()
const now = useNow()
const open = ref(false)

const TIMES = ['9:00', '10:00', '12:00', '19:00']

const late = computed(() => !props.rec.done && isOverdue(props.rec.due, now.value))
const text = computed(() => {
  const due = props.rec.due
  if (!due) return 'Добавить срок'
  if (props.variant === 'prop') return late.value ? `было ${formatDue(due, now.value)}` : formatDueLong(due, now.value).split(' · ')[0]!
  return late.value ? `было ${formatDue(due, now.value)}` : formatDue(due, now.value)
})
/** «· через 7 месяцев» after the date on the record page (muted on desktop) */
const after = computed(() => {
  if (props.variant !== 'prop' || !props.rec.due || late.value) return ''
  return formatDueLong(props.rec.due, now.value).split(' · ')[1] ?? ''
})
const days = computed(() => dueChoices(now.value))
const times = computed(() => {
  const t = props.rec.due?.time
  return t && !TIMES.includes(t) ? [...TIMES, t].sort((a, b) => a.padStart(5, '0').localeCompare(b.padStart(5, '0'))) : TIMES
})

function set(due: Due | null) {
  data.updateRecord(props.rec.id, { due })
}
function day(key: string) {
  set(props.rec.due?.time ? { date: key, time: props.rec.due.time } : { date: key })
}
function none() {
  set(null)
  open.value = false
}
/** A second tap on the chosen time drops it; a time without a day means today */
function time(t: string) {
  const date = props.rec.due?.date ?? days.value[0]!.key
  set(props.rec.due?.time === t ? { date } : { date, time: t })
}

/** Срок just picked in «+ Свойство» opens its sheet at once */
defineExpose({ show: () => open.value = true })
</script>

<template>
  <span
    v-if="readonly"
    class="truncate"
    :class="late ? 'text-warn' : rec.due ? 'text-highlighted' : 'text-toned'"
  >{{ rec.due ? text : 'Без срока' }}</span>
  <AdaptiveOverlay
    v-else
    v-model:open="open"
    title="Срок"
    :subtitle="rec.text"
    width="w-75"
    align="start"
  >
    <template #trigger>
      <!-- The record page on a phone reads «25 октября · через 6 дней» in plain accent words, no glyph (MobileLinked) -->
      <button
        type="button"
        class="group/due inline-flex min-w-0 shrink-0 cursor-pointer items-center gap-1 text-left"
        :class="[
          late ? 'text-warn' : rec.due ? 'text-accent-ink' : 'text-toned',
          variant === 'row' ? 'hit-44 relative -mr-1.5 h-7 rounded-badge px-1.5 text-13 active:bg-pressed' : '',
          variant === 'line' ? '-mx-1 h-5.5 rounded-badge px-1 text-13 hover:bg-hover' : '',
          variant === 'prop' ? '-mx-1.5 min-h-10 rounded-item px-1.5 text-base hover:bg-muted lg:text-15' : '',
          !rec.due ? '' : variant === 'prop' ? 'lg:font-medium' : 'font-medium'
        ]"
        :aria-label="rec.due ? `Срок: ${text}. Изменить` : 'Добавить срок'"
        :aria-expanded="open"
      >
        <UIcon
          v-if="rec.due"
          name="i-lucide-clock-3"
          class="shrink-0"
          :class="variant === 'prop' ? 'hidden size-3.5 lg:block' : 'size-3'"
        />
        <span class="truncate">{{ text }}</span>
        <!-- The button's gap is the space before «·» -->
        <span
          v-if="after"
          class="truncate font-normal lg:text-toned"
        >· {{ after }}</span>
      </button>
    </template>
    <div class="flex flex-col pb-1">
      <button
        v-for="d in days"
        :key="d.key"
        type="button"
        class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
        :aria-pressed="rec.due?.date === d.key"
        @click="day(d.key)"
      >
        <span class="min-w-0 flex-1 truncate">{{ d.label }}</span>
        <UIcon
          v-if="rec.due?.date === d.key"
          name="i-lucide-check"
          class="size-4.5 text-accent"
        />
      </button>
      <button
        type="button"
        class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
        :aria-pressed="!rec.due"
        @click="none"
      >
        <span class="min-w-0 flex-1 truncate">Без срока</span>
        <UIcon
          v-if="!rec.due"
          name="i-lucide-check"
          class="size-4.5 text-accent"
        />
      </button>
      <div class="mx-3 my-1.5 border-t border-default" />
      <p class="px-3 pt-1 pb-1 text-cap text-toned">
        Время
      </p>
      <div class="flex flex-wrap gap-1.5 px-2 pb-2">
        <button
          v-for="t in times"
          :key="t"
          type="button"
          class="hit-44 relative inline-flex h-9 cursor-pointer items-center rounded-item px-3 text-sm tabular-nums transition-colors lg:h-8 lg:px-2.5"
          :class="rec.due?.time === t ? 'bg-accent-soft text-accent-ink ring ring-inset ring-accent' : 'bg-btn text-highlighted hover:bg-btn-pressed active:bg-btn-pressed'"
          :aria-pressed="rec.due?.time === t"
          @click="time(t)"
        >
          {{ t }}
        </button>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
