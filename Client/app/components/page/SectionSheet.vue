<script setup lang="ts">
// «Секция»: where a page lives. From the property line of a new page and from «Переместить в секцию» in its
// «⋯». A move says where the page went and can be taken back.
import type { Id, Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useNotify } from '~/composables/useNotify'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const props = defineProps<{ page: Page }>()
const open = defineModel<boolean>('open', { default: false })
const data = useDataStore()
const notify = useNotify()

function move(to: Id | null) {
  open.value = false
  const from = props.page.sectionId
  if (to === from) return
  const id = props.page.id
  data.updatePage(id, { sectionId: to })
  const name = to ? data.sections[to]?.name : 'Недавнее'
  notify(`Страница в секции «${name}»`, { label: 'Отменить', run: () => data.updatePage(id, { sectionId: from }) })
}
</script>

<template>
  <AdaptiveOverlay
    v-model:open="open"
    title="Секция"
    dialog
  >
    <div class="flex flex-col pb-2">
      <button
        v-for="s in [null, ...data.sectionList]"
        :key="s?.id ?? 'none'"
        type="button"
        class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-chip px-3 text-left text-base text-highlighted hover:bg-muted active:bg-pressed lg:min-h-10 lg:text-15"
        @click="move(s?.id ?? null)"
      >
        <span class="min-w-0 flex-1 truncate">{{ s?.name ?? 'Недавнее' }}</span>
        <UIcon
          v-if="(s?.id ?? null) === page.sectionId"
          name="i-lucide-check"
          class="size-4.5 text-accent"
        />
      </button>
    </div>
  </AdaptiveOverlay>
</template>
