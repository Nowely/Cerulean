<script setup lang="ts">
// Список: rows, grouped when the view says so
import { computed } from 'vue'
import type { Id, Page, Rec, ViewDef } from '~/domain/types'
import { useNow } from '~/composables/useNow'
import { applyView } from '~/domain/views'
import RecordRow from '../../record/RecordRow.vue'

const props = defineProps<{ page: Page, view: ViewDef, records: Rec[], freshSince?: number, readonly?: boolean }>()
const emit = defineEmits<{ open: [rec: Rec], choose: [rec: Rec, pageId: Id | 'more' | 'new'] }>()
const now = useNow()
const groups = computed(() => applyView(props.page, props.records, props.view, now.value))
</script>

<template>
  <div>
    <section
      v-for="g in groups"
      :key="g.key"
      :aria-label="g.label || undefined"
    >
      <h3
        v-if="g.label"
        class="px-5 pt-4 pb-1 text-caption lg:px-2.5"
        :class="g.tone === 'warn' ? 'text-warn-ink' : 'text-toned lg:text-dimmed'"
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
    <slot
      v-if="!groups.some(g => g.records.length)"
      name="empty"
    />
  </div>
</template>
