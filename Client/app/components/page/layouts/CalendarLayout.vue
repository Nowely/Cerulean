<script setup lang="ts">
// Календарь by «Срок». The month shows which days have records; a phone lists the chosen day below it,
// desktop writes the records into the days.
import { computed, ref } from 'vue'
import type { Page, Rec, ViewDef } from '~/domain/types'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
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

const days = computed(() => {
  const first = keyToDate(`${month.value}-01`)
  const shift = (first.getDay() + 6) % 7
  const start = addDays(`${month.value}-01`, -shift)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
})
const title = computed(() => {
  const d = keyToDate(`${month.value}-01`)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
})
function step(n: number) {
  const d = keyToDate(`${month.value}-01`)
  d.setMonth(d.getMonth() + n)
  month.value = dayKey(d).slice(0, 7)
}
/** One dot a day: warn while something on it is overdue, as «было вчера» says everywhere else */
const late = (d: string) => (byDay.value.get(d) ?? []).some(r => !r.done && isOverdue(r.due, now.value))
const pickedRecords = computed(() => byDay.value.get(picked.value) ?? [])
const pickedLabel = computed(() => keyToDate(picked.value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }))
</script>

<template>
  <div class="px-3 pt-3 lg:px-0">
    <div class="flex items-center gap-1 px-2 pb-2">
      <h3 class="flex-1 text-base font-semibold text-highlighted lg:text-15">
        {{ title }}
      </h3>
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        square
        aria-label="Предыдущий месяц"
        @click="step(-1)"
      />
      <UButton
        variant="ghost"
        @click="month = today.slice(0, 7); picked = today"
      >
        Сегодня
      </UButton>
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        square
        aria-label="Следующий месяц"
        @click="step(1)"
      />
    </div>
    <div class="grid grid-cols-7 text-center text-xs text-toned">
      <span
        v-for="w in WEEK"
        :key="w"
        class="py-1"
      >{{ w }}</span>
    </div>
    <div class="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-default bg-line tabular-nums">
      <button
        v-for="d in days"
        :key="d"
        type="button"
        class="flex cursor-pointer flex-col items-stretch gap-0.5 bg-default p-1 text-left hover:bg-muted lg:min-h-24"
        :class="[d.slice(0, 7) !== month ? 'opacity-50' : '', picked === d && !isDesktop ? 'bg-accent-soft!' : '']"
        :aria-label="`${keyToDate(d).getDate()}: ${byDay.get(d)?.length ?? 0}`"
        :aria-pressed="picked === d"
        @click="picked = d"
      >
        <span
          class="mx-auto flex size-7 items-center justify-center rounded-full text-13 lg:mx-0"
          :class="d === today ? 'bg-accent font-semibold text-on-accent' : 'text-highlighted'"
        >{{ keyToDate(d).getDate() }}</span>
        <template v-if="isDesktop">
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
        </template>
        <span
          v-else
          class="mx-auto flex h-1.5"
        >
          <span
            v-if="byDay.get(d)?.length"
            class="size-1.5 rounded-full"
            :class="late(d) ? 'bg-warn' : 'bg-ring'"
          />
        </span>
      </button>
    </div>
    <template v-if="!isDesktop">
      <h3 class="px-2 pt-4 pb-1 text-cap text-toned">
        {{ pickedLabel }}
      </h3>
      <RecordRow
        v-for="r in pickedRecords"
        :key="r.id"
        :rec="r"
        :page="page"
        :view="view"
        :readonly="readonly"
        class="-mx-3"
        @open="emit('open', r)"
      />
      <p
        v-if="!pickedRecords.length"
        class="px-2 py-2 text-meta text-toned"
      >
        На этот день ничего нет.
      </p>
    </template>
    <template v-if="undated.length">
      <h3 class="px-2 pt-4 pb-1 text-cap text-toned">
        Без срока
      </h3>
      <RecordRow
        v-for="r in undated"
        :key="r.id"
        :rec="r"
        :page="page"
        :view="view"
        :readonly="readonly"
        class="-mx-3 lg:mx-0"
        @open="emit('open', r)"
      />
    </template>
  </div>
</template>
