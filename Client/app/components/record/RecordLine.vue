<script setup lang="ts">
// A record shown outside its page (receipts, found cards, Поиск, Сегодня):
// the text, and under it «Задачи · сегодня, 10:00» (the bare place name first, then the date). The mark works everywhere.
import { computed } from 'vue'
import type { Rec } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { formatDue, formatDueBrief, isOverdue } from '~/domain/dates'
import { nb, splitMatch } from '~/domain/text'
import { bodyOf, isEmptyDoc } from '~/domain/body'
import RecordMark from '../common/RecordMark.vue'

const props = withDefaults(defineProps<{
  rec: Rec
  /** «Задачи» on line 2; off where the place is already said (a receipt) */
  place?: boolean
  /** Only the time for a date of today (inside «Сегодня», whose «Просрочено» caption is its one warn signal) */
  brief?: boolean
  /** Highlight a search match */
  query?: string
  density?: 'card' | 'list'
  selected?: boolean
  /** Right of the text, 14 muted: the weekday under «На неделе» («ср», «завтра»); line 2 then names the place only */
  end?: string
  /** Why it is in «Связано» (v23), after the place in place of the date: «в тексте», ««Сначала дочитать …»» */
  reason?: string
}>(), { place: true, brief: false, query: '', density: 'card', selected: false, end: '', reason: '' })

const emit = defineEmits<{ open: [] }>()
const data = useDataStore()
const now = useNow()

const page = computed(() => data.pages[props.rec.pageId])
const where = computed(() => data.placeOf(props.rec).title)
const late = computed(() => !props.rec.done && isOverdue(props.rec.due, now.value))
const when = computed(() => {
  if (!props.rec.due || props.end) return ''
  const d = props.brief ? formatDueBrief(props.rec.due, now.value) : formatDue(props.rec.due, now.value)
  return late.value ? `было ${d}` : d
})
const parts = computed(() => splitMatch(props.rec.text, props.query))
const tag = computed(() => props.rec.tags.includes('offline') ? 'ждёт сети' : props.rec.tags.includes('clarify') ? 'уточнить' : '')
const hasLine2 = computed(() => (props.place && where.value) || when.value || tag.value || props.reason)
const hasNote = computed(() => !isEmptyDoc(bodyOf(props.rec)))
</script>

<template>
  <div
    class="flex items-center"
    :class="density === 'card' ? 'min-h-11 pr-3 pl-0.5' : 'min-h-11 pr-3'"
  >
    <RecordMark
      :rec="rec"
      :page="page"
      :size="density === 'card' ? 'sm' : 'md'"
      :area="density === 'card' ? 'tight' : 'row'"
      @toggle="data.toggleDone(rec.id)"
    />
    <button
      type="button"
      class="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-px rounded-item py-1 pr-1.5 text-left"
      :class="[density === 'card' ? 'text-15' : 'pl-0.5 text-record leading-[1.3]', selected ? 'bg-elevated' : '']"
      @click="emit('open')"
    >
      <span
        class="max-w-full truncate text-highlighted"
        :class="{ 'text-dimmed line-through': rec.done }"
      >
        <template v-if="parts.mid">{{ parts.pre }}<mark class="rounded-[3px] bg-accent-soft font-semibold text-highlighted">{{ parts.mid }}</mark>{{ parts.post }}</template>
        <template v-else>{{ nb(rec.text) }}</template>
      </span>
      <span
        v-if="hasLine2"
        class="max-w-full truncate text-caption font-normal"
        :class="late && !brief && !reason ? 'text-warn-ink' : 'text-toned'"
      >
        <template v-if="reason">{{ place && where ? `${where} · ${reason}` : reason }}</template>
        <template v-else>
          <template v-if="place && where">{{ where }}</template>
          <template v-if="place && where && (when || tag)"> · </template>
          <template v-if="when">{{ when }}</template>
          <template v-if="when && tag"> · </template>
          <span
            v-if="tag"
            :class="tag === 'уточнить' ? 'text-accent-ink' : ''"
          >{{ tag }}</span>
        </template>
      </span>
    </button>
    <span
      v-if="end"
      class="ml-2 flex shrink-0 items-center gap-2.5 text-meta text-toned"
    >
      <UIcon
        v-if="hasNote"
        name="i-lucide-file-text"
        class="size-4"
        aria-label="есть заметка"
      />{{ end }}
    </span>
  </div>
</template>
