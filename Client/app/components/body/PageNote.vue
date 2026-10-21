<script setup lang="ts">
// «Заметка к странице» (v23, A2, S5, M9, F4): the page's body, between the title block and the view tabs. Not drawn
// while empty: page «⋯» → «Заметка к странице» draws it with the caret in it (the faint placeholder 8pt lower than text
// would sit). Over four lines it folds at four, cut on a line with no fade, the fourth ending in «…»; «Ещё ⌄» on its own
// row opens it, «Свернуть ⌃» folds it back. The fold is per visit; four lines or fewer never fold.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { Page } from '~/domain/types'
import { bodyOf, isEmptyDoc } from '~/domain/body'
import { useUiStore } from '~/stores/ui'
import BodyField from './BodyField.vue'

const props = withDefaults(defineProps<{ page: Page, editable?: boolean }>(), { editable: false })
const ui = useUiStore()

const doc = computed(() => bodyOf(props.page))
const empty = computed(() => isEmptyDoc(doc.value))
/** Opened from the menu while empty: drawn until it is left empty */
const started = ref(false)
const focused = ref(false)
const open = ref(false)
const long = ref(false)
const shown = computed(() => !empty.value || started.value || focused.value)
const folded = computed(() => long.value && !open.value && !focused.value)

const box = useTemplateRef<HTMLElement>('box')
const field = useTemplateRef<InstanceType<typeof BodyField>>('field')

// «Заметка к странице» in the page «⋯»: the caret at the end of the text
watch(() => ui.focusNote, async (id) => {
  if (id !== props.page.id || !props.editable) return
  ui.focusNote = null
  started.value = true
  open.value = true
  await nextTick()
  field.value?.focus('end')
}, { immediate: true })

function onFocus(v: boolean) {
  focused.value = v
  if (v) open.value = true
  else if (empty.value) started.value = false
}

/** Lines of the note, whatever their kinds: a paragraph of three lines counts three, a divider one */
function countLines(root: Element): number {
  let n = 0
  root.querySelectorAll('p, h2, hr').forEach((el) => {
    const h = el.getBoundingClientRect().height
    if (el.tagName === 'HR') n += 1
    else n += Math.max(1, Math.round(h / (parseFloat(getComputedStyle(el).lineHeight) || 24)))
  })
  return n
}

function measure() {
  const text = box.value?.querySelector('.body-text')
  long.value = !!text && countLines(text) > 4
}

let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(() => measure())
  watch(box, (el, was) => {
    if (was) observer?.unobserve(was)
    if (el) {
      observer?.observe(el)
      measure()
    }
  }, { immediate: true })
})
onBeforeUnmount(() => observer?.disconnect())
watch(doc, () => void nextTick(measure))
</script>

<template>
  <div
    v-if="shown"
    ref="box"
    class="page-note mx-4 lg:mx-0"
    :class="[empty && !focused ? 'mt-5' : 'mt-3 lg:mt-3.5', { 'body-folded': folded, 'body-target': editable }]"
  >
    <BodyField
      ref="field"
      :key="page.id"
      :owner="{ kind: 'page', id: page.id }"
      :doc="doc"
      placeholder="Заметка к странице"
      label="Заметка к странице"
      :context="page.title"
      :editable="editable"
      @focus="onFocus"
    />
    <button
      v-if="long && !focused"
      type="button"
      class="-mx-4 flex min-h-11 cursor-pointer items-center gap-1 rounded-chip px-4 text-sm text-toned active:bg-pressed lg:-mx-2 lg:mt-0.5 lg:min-h-9 lg:rounded-item lg:px-2 lg:hover:bg-hover lg:hover:text-highlighted"
      :aria-expanded="open"
      @mousedown.prevent
      @click="open = !open"
    >
      {{ open ? 'Свернуть' : 'Ещё' }}<UIcon
        :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-4"
      />
    </button>
  </div>
</template>
