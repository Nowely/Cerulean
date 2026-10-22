<script setup lang="ts">
// «Куда записать» from a record's composer chip (v24, И3): two places and no search, «Подпункт» («строкой в
// «Подпунктах»») and «В заметку» («абзацем в конце заметки»), a check on the current one. A content-sized sheet on a
// phone (v24 fixes, 8: grabber, title, two 48pt rows, 22pt under them), not the tall page picker; on desktop a 400px
// popover right above the chip, sized to its two rows. A pick closes it; Esc or a tap outside closes it too.
import { ref } from 'vue'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

export type RecordDestKind = 'sub' | 'note'

defineProps<{
  /** The record's (or the template's) name, under the title */
  name: string
}>()
const emit = defineEmits<{ picked: [] }>()
const dest = defineModel<RecordDestKind>({ required: true })
const open = ref(false)
let picked = false

const ROWS: { kind: RecordDestKind, name: string, what: string, icon: string }[] = [
  { kind: 'sub', name: 'Подпункт', what: 'строкой в «Подпунктах»', icon: 'cer:ring' },
  { kind: 'note', name: 'В заметку', what: 'абзацем в конце заметки', icon: 'cer:note' }
]

function pick(kind: RecordDestKind) {
  dest.value = kind
  picked = true
  open.value = false
}
/** After a pick the caret goes back to the field, where the next words are typed */
function closed() {
  if (picked) emit('picked')
  picked = false
}
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Куда записать"
    :subtitle="name"
    stacked
    side="top"
    align="start"
    width="w-100"
    @closed="closed"
  >
    <template #trigger>
      <slot :open="open" />
    </template>
    <ul class="pb-1.5 lg:pb-0">
      <li
        v-for="row in ROWS"
        :key="row.kind"
      >
        <button
          type="button"
          class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base hover:bg-muted active:bg-pressed lg:min-h-11 lg:gap-2.5 lg:px-2 lg:text-15"
          :aria-current="dest === row.kind || undefined"
          @click="pick(row.kind)"
        >
          <UIcon
            :name="row.icon"
            class="size-4.5 shrink-0 text-toned"
          />
          <span class="min-w-0 flex-1 truncate text-highlighted">{{ row.name }}</span>
          <span class="shrink-0 text-meta text-toned">{{ row.what }}</span>
          <UIcon
            v-if="dest === row.kind"
            name="i-lucide-check"
            class="size-4.5 shrink-0 text-accent"
          />
        </button>
      </li>
    </ul>
  </AdaptiveOverlay>
</template>
