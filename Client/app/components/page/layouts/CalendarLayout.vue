<script setup lang="ts">
// Календарь by «Срок». The month shows which days have records; a phone lists the selected day below it (only
// the time on its rows, the caption says the day), desktop writes the records into the days. The month folds to
// the selected week with words, «Свернуть до недели» / «Показать месяц» (v22, N11, N13). The selected day is
// where the page's composer writes: «Запись на вс, 25 окт», a record without its own date lands on it (G6).
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Page, Rec, ViewDef } from '~/domain/types'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { useCalendarDay } from '~/composables/useCalendarDay'
import { filterRecords, sortRecords } from '~/domain/views'
import { addDays, dayKey, isOverdue, keyToDate } from '~/domain/dates'
import RecordRow from '../../record/RecordRow.vue'

const props = defineProps<{ page: Page, view: ViewDef, records: Rec[], readonly?: boolean }>()
const emit = defineEmits<{ open: [rec: Rec] }>()
const now = useNow()
const { isDesktop } = useScreen()

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WEEK = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const today = computed(() => dayKey(now.value))
const month = ref(today.value.slice(0, 7))
const picked = ref(today.value)
/** Folded to the selected week (a phone gives the day's list the screen) */
const week = ref(false)

// The composer of this page writes on the selected day while the calendar is on screen
const aim = useCalendarDay()
watch(picked, (date) => {
  if (!props.readonly) aim.value = { pageId: props.page.id, date }
}, { immediate: true })
onBeforeUnmount(() => {
  if (aim.value?.pageId === props.page.id) aim.value = null
})

const list = computed(() => sortRecords(filterRecords(props.records, props.view), 'due'))
const byDay = computed(() => {
  const m = new Map<string, Rec[]>()
  for (const r of list.value) {
    if (!r.due) continue
    m.set(r.due.date, [...(m.get(r.due.date) ?? []), r])
  }
  return m
})
const undated = computed(() => list.value.filter(r => !r.due))

/** Monday of the week a day is in */
const mondayOf = (key: string) => addDays(key, -((keyToDate(key).getDay() + 6) % 7))
const days = computed(() => {
  if (week.value && !isDesktop.value) return Array.from({ length: 7 }, (_, i) => addDays(mondayOf(picked.value), i))
  const start = mondayOf(`${month.value}-01`)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
})
const title = computed(() => {
  const d = keyToDate(`${month.value}-01`)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
})
const folded = computed(() => week.value && !isDesktop.value)
/** ‹ › go by month, or by week while folded (the selected day moves with it) */
function step(n: number) {
  if (folded.value) {
    pick(addDays(picked.value, 7 * n))
    return
  }
  const d = keyToDate(`${month.value}-01`)
  d.setMonth(d.getMonth() + n)
  month.value = dayKey(d).slice(0, 7)
}
function pick(d: string) {
  picked.value = d
  month.value = d.slice(0, 7)
}
/** One dot a day: warn while something on it is overdue, as «было вчера» says everywhere else */
const late = (d: string) => (byDay.value.get(d) ?? []).some(r => !r.done && isOverdue(r.due, now.value))
const pickedRecords = computed(() => byDay.value.get(picked.value) ?? [])
const pickedLabel = computed(() => keyToDate(picked.value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }))
const dayLabel = (d: string) => {
  const n = byDay.value.get(d)?.length ?? 0
  return `${keyToDate(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}${d === today.value ? ', сегодня' : ''}${n ? `, записей: ${n}` : ''}`
}
</script>

<template>
  <div class="pt-3 lg:px-0">
    <div class="flex items-center gap-0.5 pr-2 pb-1 pl-4 lg:px-0 lg:pb-2">
      <h3 class="flex-1 text-base font-medium text-highlighted lg:text-15 lg:font-semibold">
        {{ title }}
      </h3>
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        square
        :aria-label="folded ? 'Предыдущая неделя' : 'Предыдущий месяц'"
        @click="step(-1)"
      />
      <UButton
        variant="ghost"
        class="text-15 font-normal text-accent-ink lg:text-sm"
        @click="pick(today)"
      >
        Сегодня
      </UButton>
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        square
        :aria-label="folded ? 'Следующая неделя' : 'Следующий месяц'"
        @click="step(1)"
      />
    </div>

    <!-- Phone: one surface card without inner lines; the selected day filled, today ringed, a dot under days with records -->
    <template v-if="!isDesktop">
      <div class="mx-4 mt-1 grid grid-cols-7 rounded-card bg-card px-1 py-1.5 tabular-nums">
        <span
          v-for="w in WEEK"
          :key="w"
          class="pt-0.5 pb-1 text-center text-xs text-toned"
        >{{ w }}</span>
        <button
          v-for="d in days"
          :key="d"
          type="button"
          class="relative flex h-11 cursor-pointer flex-col items-center justify-center"
          :aria-label="dayLabel(d)"
          :aria-pressed="picked === d"
          @click="pick(d)"
        >
          <span
            class="flex size-7.5 items-center justify-center rounded-full text-15"
            :class="picked === d
              ? 'bg-accent font-medium text-on-accent'
              : d === today
                ? 'font-medium text-accent-ink ring-[1.5px] ring-accent ring-inset'
                : d.slice(0, 7) !== month ? 'text-dimmed' : 'text-highlighted'"
          >{{ keyToDate(d).getDate() }}</span>
          <span
            v-if="byDay.get(d)?.length"
            class="absolute bottom-0.5 size-1 rounded-full"
            :class="late(d) ? 'bg-warn' : 'bg-ring'"
          />
        </button>
      </div>
      <button
        type="button"
        class="hit-44 relative flex h-9 w-full cursor-pointer items-center justify-center gap-1 text-13 text-toned"
        :aria-expanded="!week"
        @click="week = !week"
      >
        {{ week ? 'Показать месяц' : 'Свернуть до недели' }}
        <UIcon
          name="i-lucide-chevron-down"
          class="size-3 transition-transform duration-150"
          :class="week ? '' : 'rotate-180'"
        />
      </button>
      <h3 class="px-4 pt-1 text-cap leading-6 text-toned">
        {{ pickedLabel }}
      </h3>
      <RecordRow
        v-for="r in pickedRecords"
        :key="r.id"
        :rec="r"
        :page="page"
        :view="view"
        :readonly="readonly"
        day
        @open="emit('open', r)"
      />
      <p
        v-if="!pickedRecords.length"
        class="px-4 py-2 text-meta text-toned"
      >
        На этот день ничего нет.
      </p>
    </template>

    <!-- Desktop: the records are written into the days -->
    <div
      v-else
      class="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-default bg-line tabular-nums"
    >
      <span
        v-for="w in WEEK"
        :key="w"
        class="bg-default py-1 text-center text-xs text-toned"
      >{{ w }}</span>
      <button
        v-for="d in days"
        :key="d"
        type="button"
        class="flex min-h-24 cursor-pointer flex-col items-stretch gap-0.5 bg-default p-1 text-left hover:bg-muted"
        :class="d.slice(0, 7) !== month ? 'opacity-50' : ''"
        :aria-label="dayLabel(d)"
        :aria-pressed="picked === d"
        @click="pick(d)"
      >
        <span
          class="flex size-7 items-center justify-center rounded-full text-13"
          :class="picked === d
            ? 'bg-accent font-semibold text-on-accent'
            : d === today ? 'font-semibold text-accent-ink ring-[1.5px] ring-accent ring-inset' : 'text-highlighted'"
        >{{ keyToDate(d).getDate() }}</span>
        <span
          v-for="r in (byDay.get(d) ?? []).slice(0, 3)"
          :key="r.id"
          class="truncate rounded-[4px] bg-elevated px-1 text-xs text-highlighted"
          :class="{ 'line-through opacity-60': r.done }"
          @click.stop="emit('open', r)"
        >{{ r.text }}</span>
        <span
          v-if="(byDay.get(d)?.length ?? 0) > 3"
          class="px-1 text-xs text-toned"
        >+{{ byDay.get(d)!.length - 3 }}</span>
      </button>
    </div>

    <template v-if="undated.length">
      <h3 class="px-4 pt-4 text-cap leading-6 text-toned lg:px-2.5 lg:pb-1">
        Без срока
      </h3>
      <RecordRow
        v-for="r in undated"
        :key="r.id"
        :rec="r"
        :page="page"
        :view="view"
        :readonly="readonly"
        @open="emit('open', r)"
      />
    </template>
  </div>
</template>
