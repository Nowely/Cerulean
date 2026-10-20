<script setup lang="ts">
// Превью: the same page or record for reading and ticking, keeping your place.
// A sheet on a phone, a right panel on desktop. «Открыть» opens it full.
import { computed } from 'vue'
import type { Target } from '~/composables/usePeek'
import { usePeek } from '~/composables/usePeek'
import { useDataStore } from '~/stores/data'
import PageView from '../page/PageView.vue'
import RecordView from '../record/RecordView.vue'
import PageTile from '../common/PageTile.vue'

const props = defineProps<{ target: Target | null, variant: 'sheet' | 'panel' }>()
const data = useDataStore()
const peek = usePeek()

const page = computed(() => props.target?.kind === 'page' ? data.pages[props.target.id] : undefined)
const rec = computed(() => props.target?.kind === 'record' ? data.records[props.target.id] : undefined)
const recPage = computed(() => rec.value ? data.pages[rec.value.pageId] : undefined)
const gone = computed(() => !!props.target && !(page.value && !page.value.deletedAt) && !(rec.value && !rec.value.deletedAt))

const open = computed({
  get: () => !!props.target,
  set: (v) => {
    if (!v) peek.close()
  }
})
function openFull() {
  if (props.target) peek.open(props.target)
}
</script>

<template>
  <aside
    v-if="variant === 'panel'"
    class="flex w-110 shrink-0 flex-col border-l border-default bg-default xl:w-120"
    aria-label="Превью"
  >
    <header class="flex h-12 shrink-0 items-center gap-1.5 border-b border-default pr-2 pl-3.5">
      <span class="flex min-w-0 flex-1 items-center gap-2 text-sm text-toned">
        <template v-if="rec && recPage">
          <PageTile
            :glyph="recPage.glyph"
            :color="recPage.color"
            :size="18"
          /><span class="truncate">{{ data.placeOf(rec).title }}</span>
        </template>
        <template v-else-if="page">Страница</template>
      </span>
      <UButton
        v-if="!gone"
        @click="openFull"
      >
        Открыть
      </UButton>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        square
        aria-label="Закрыть превью"
        @click="peek.close()"
      />
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto py-4">
      <PageView
        v-if="page && !page.deletedAt"
        :key="page.id"
        :page="page"
        container="preview"
      />
      <RecordView
        v-else-if="rec && !rec.deletedAt"
        :key="rec.id"
        :rec="rec"
        container="preview"
      />
      <p
        v-else
        class="px-4 text-meta text-toned"
      >
        Этого больше нет: удалено или перемещено в корзину.
      </p>
    </div>
  </aside>

  <UDrawer
    v-else
    v-model:open="open"
    :ui="{ content: 'h-[88dvh]' }"
    title="Превью"
  >
    <template #content>
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="flex shrink-0 items-center gap-1 px-3 pt-1 pb-1">
          <UButton
            v-if="!gone"
            icon="i-lucide-square-arrow-out-up-right"
            @click="openFull"
          >
            Открыть
          </UButton>
          <span class="flex-1" />
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            square
            aria-label="Закрыть"
            @click="peek.close()"
          />
        </div>
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),1rem)]"
          data-vaul-no-drag
        >
          <PageView
            v-if="page && !page.deletedAt"
            :key="page.id"
            :page="page"
            container="preview"
          />
          <RecordView
            v-else-if="rec && !rec.deletedAt"
            :key="rec.id"
            :rec="rec"
            container="preview"
          />
          <p
            v-else-if="target"
            class="px-5 text-meta text-toned"
          >
            Этого больше нет: удалено или перемещено в корзину.
          </p>
        </div>
      </div>
    </template>
  </UDrawer>
</template>
