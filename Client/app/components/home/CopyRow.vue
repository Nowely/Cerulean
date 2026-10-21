<script setup lang="ts">
// «Сохранить копию» under the sections of Главная while the browser may clear the data (see `copyDue`).
// An action row like the key row: a tap downloads the copy and the row goes; × is «Не сейчас» for a month.
import { computed } from 'vue'
import { useDataStore } from '~/stores/data'
import { useNow } from '~/composables/useNow'
import { useCopy } from '~/composables/useCopy'
import { copyDue } from '~/domain/keep'
import { formatDate } from '~/domain/dates'

defineProps<{ compact?: boolean }>()
const data = useDataStore()
const now = useNow()
const { saveCopy } = useCopy()

const due = computed(() => !data.storageError && copyDue(data.settings, Object.values(data.records), now.value, data.persisted))
const last = computed(() => data.settings.copiedAt ? `Последняя копия ${formatDate(data.settings.copiedAt, now.value)}` : 'Копию ещё не сохраняли')
</script>

<template>
  <div
    v-if="due"
    class="mt-3 flex items-center rounded-card hover:bg-muted lg:rounded-chip"
  >
    <button
      type="button"
      class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-card px-2 text-left active:bg-pressed lg:rounded-chip"
      :class="compact ? 'min-h-8' : 'min-h-13 py-1.25 lg:min-h-12'"
      @click="saveCopy()"
    >
      <UIcon
        name="i-lucide-download"
        class="size-4.5 shrink-0 text-toned"
      />
      <span class="flex min-w-0 flex-1 flex-col gap-px">
        <span
          class="truncate"
          :class="compact ? 'text-15 text-toned' : 'text-base text-default lg:text-sm'"
        >Сохранить копию</span>
        <span
          v-if="!compact"
          class="truncate text-sm text-toned lg:text-13"
        >{{ last }}</span>
      </span>
    </button>
    <button
      type="button"
      class="hit-44 relative mr-1.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-item text-dimmed hover:text-highlighted"
      aria-label="Не сейчас"
      @click="data.setSettings({ copyHiddenAt: Date.now() })"
    >
      <UIcon
        name="i-lucide-x"
        class="size-4.5"
      />
    </button>
  </div>
</template>
