<script setup lang="ts">
// A page with no records is its own manual (v24, И9, И13; light: each line does what its menu row does). Three quiet
// lines under the title block, faint with their menu row's glyph: «Заметка к странице» puts the caret in the page body
// and goes once the body has text; «+ Свойство» opens «Новое свойство» and switches the property on in «Справа в
// строке», naming the page's own properties on the right; «Как показывать» names the first view's layout and opens
// «Настроить вид» of that view (desktop: a popover at this line). After the first record the lines go, and the same
// rows stay where they always were, in «⋯» and «Настроить вид». The page puts its view settings in the default slot.
import { computed } from 'vue'
import type { Page } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { usePropSheets } from '~/composables/usePropSheets'
import { useBodyEditing } from '~/composables/useBodyEditing'
import { FOCUS_PROXY_ID } from '~/composables/useCreatePage'
import { bodyOf, isEmptyDoc } from '~/domain/body'
import { LAYOUT_NAMES } from '~/domain/templates'
import AdaptiveOverlay from '../overlay/AdaptiveOverlay.vue'

const props = defineProps<{
  page: Page
  /** The overlay's head, so «Фильтр» can be its second level as in the bar's (v24, D5) */
  title: string
  subtitle?: string
  back?: () => void
}>()
// `how`: the page shows its first view, whose settings open here; `closed`: the settings are gone and focus is back
const emit = defineEmits<{ how: [], closed: [] }>()
/** «Настроить вид» opened from this manual */
const settings = defineModel<boolean>('settings', { default: false })
const data = useDataStore()
const ui = useUiStore()
const propSheets = usePropSheets()
const body = useBodyEditing()

/** Until the body has text, or while it is being written */
const noteLine = computed(() => isEmptyDoc(bodyOf(props.page)) && body.session.value?.owner.id !== props.page.id)

/** The same as «Заметка к странице» in the page «⋯»: the keyboard comes up in this tap */
function note() {
  document.getElementById(FOCUS_PROXY_ID)?.focus()
  ui.focusNote = props.page.id
}

/** «Создать» switches the new property on in every view: the page has no rows yet, so nothing else changes */
function newProp() {
  const pageId = props.page.id
  propSheets.create(pageId, {
    from: 'view',
    onCreate: (p) => {
      const page = data.pages[pageId]
      if (page) data.updatePage(pageId, { views: page.views.map(v => v.shown.includes(p.id) ? v : { ...v, shown: [...v.shown, p.id] }) })
    }
  })
}

const own = computed(() => props.page.props.map(p => p.name).join(', '))
const layout = computed(() => LAYOUT_NAMES[props.page.views[0]?.layout ?? 'list'])

const row = 'flex h-11 w-full cursor-pointer items-center gap-2.5 text-left text-base text-faint active:bg-pressed lg:-mx-2 lg:h-10 lg:w-[calc(100%+1rem)] lg:gap-3 lg:rounded-chip lg:px-2 lg:text-15 lg:hover:bg-hover lg:hover:text-toned'
</script>

<template>
  <div
    class="mt-0.5 lg:mt-1.5"
    role="group"
    aria-label="Начать страницу"
  >
    <button
      v-if="noteLine"
      type="button"
      :class="row"
      aria-label="Заметка к странице"
      @click="note"
    >
      <UIcon
        name="i-cer-note"
        class="size-4.5 shrink-0"
      />Заметка к странице
    </button>
    <button
      type="button"
      :class="row"
      aria-label="Добавить свойство"
      aria-haspopup="dialog"
      @click="newProp"
    >
      <UIcon
        name="i-lucide-plus"
        class="size-4.5 shrink-0"
      /><span class="shrink-0">Свойство</span>
      <span
        v-if="own"
        class="min-w-0 flex-1 truncate text-right text-sm text-toned"
      >{{ own }}</span>
    </button>
    <AdaptiveOverlay
      v-model:open="settings"
      :title="title"
      :subtitle="subtitle"
      :back="back"
      width="w-105"
      align="start"
      @closed="emit('closed')"
    >
      <template #trigger>
        <button
          type="button"
          :class="row"
          :aria-label="`Настроить вид: как показывать, ${layout}`"
          aria-haspopup="dialog"
          :aria-expanded="settings"
          @click="emit('how')"
        >
          <UIcon
            name="i-lucide-sliders-horizontal"
            class="size-4.5 shrink-0"
          /><span class="shrink-0">Как показывать</span>
          <span class="min-w-0 flex-1 truncate text-right text-sm text-toned">{{ layout }}</span>
        </button>
      </template>
      <slot />
    </AdaptiveOverlay>
  </div>
</template>
