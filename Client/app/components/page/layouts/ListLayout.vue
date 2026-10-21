<script setup lang="ts">
// Список: rows, grouped when the view says so. A long page shows its first 100 rows and «Показать ещё»:
// 600 rows at once took seconds to open and to write to on a phone
import { computed, ref } from 'vue'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useNow } from '~/composables/useNow'
import { applyView } from '~/domain/views'
import RecordRow from '../../record/RecordRow.vue'

const props = defineProps<{ page: Page, view: ViewDef, records: Rec[], freshSince?: number, readonly?: boolean }>()
const emit = defineEmits<{ open: [rec: Rec], choose: [rec: Rec, pageId: Id | 'more' | 'new'] }>()
const now = useNow()
const groups = computed(() => applyView(props.page, props.records, props.view, now.value))

const STEP = 100
const limit = ref(STEP)
const total = computed(() => groups.value.reduce((n, g) => n + g.records.length, 0))
/** The groups cut to the first `limit` rows, in order; a group with nothing left is not shown */
const shown = computed(() => {
  if (total.value <= limit.value) return groups.value
  let left = limit.value
  return groups.value.map((g) => {
    const records = g.records.slice(0, Math.max(0, left))
    left -= records.length
    return { ...g, records }
  }).filter(g => g.records.length)
})
</script>

<template>
  <div>
    <section
      v-for="g in shown"
      :key="g.key"
      :aria-label="g.label || undefined"
    >
      <h3
        v-if="g.label"
        class="px-5 pt-4 pb-1 text-cap lg:px-2.5"
        :class="g.tone === 'warn' ? 'text-warn-ink' : 'text-toned'"
      >
        {{ g.label }}
      </h3>
      <ul>
        <li
          v-for="r in g.records"
          :key="r.id"
        >
          <RecordRow
            :rec="r"
            :page="page"
            :view="view"
            :fresh-since="freshSince"
            :readonly="readonly"
            @open="emit('open', r)"
            @choose="id => emit('choose', r, id)"
          />
        </li>
      </ul>
    </section>
    <button
      v-if="total > limit"
      type="button"
      class="mx-2 mt-1 flex h-11 cursor-pointer items-center rounded-item px-3 text-15 text-accent-ink hover:bg-muted active:bg-pressed lg:mx-0 lg:h-9 lg:px-2.5 lg:text-sm"
      @click="limit += STEP * 2"
    >
      Показать ещё {{ total - limit }}
    </button>
    <slot
      v-if="!total"
      name="empty"
    />
  </div>
</template>
