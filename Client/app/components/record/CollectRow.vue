<script setup lang="ts">
// A row of a view that collects records (v24, И10): the record line, with its home page on line 2 in muted and the
// day on the right («было вчера» muted 500, «сегодня, 10:00», «ср»). A tap opens the record as a preview over the
// page. The view sorts «По сроку», so nothing drags: a long press on a phone only opens the row's menu, as on Сегодня,
// and on desktop a right click opens the same actions
import { computed, onBeforeUnmount, ref, type FunctionalComponent } from 'vue'
import { LazyUContextMenu } from '#components'
import type { Rec, ViewDef } from '~/domain/types'
import { useNow } from '~/composables/useNow'
import { useScreen } from '~/composables/useScreen'
import { useLater } from '~/composables/useLater'
import { useRecordActions } from '~/composables/useRecordActions'
import { rowEnd } from '~/domain/collect'
import RecordLine from './RecordLine.vue'
import ActionMenu, { type MenuItem } from '../overlay/ActionMenu.vue'

const props = defineProps<{ rec: Rec, view: ViewDef, readonly?: boolean }>()
const emit = defineEmits<{ open: [] }>()
const now = useNow()
const { isDesktop } = useScreen()
const later = useLater()
const actions = useRecordActions()

const end = computed(() => props.view.shown.includes('due') ? rowEnd(props.rec, props.view, now.value) : { text: '', late: false })
// The row of the latest send carries the fresh tint, as on the record's own page (B4)
const fresh = computed(() => Date.now() - props.rec.addedAt < 5000 && !props.rec.done)

const items = computed<MenuItem[][]>(() => [
  [
    { label: 'Открыть', icon: 'i-lucide-arrow-up-right', onSelect: () => emit('open') },
    ...(props.rec.parentId ? [] : [{ label: 'Переместить', icon: 'i-lucide-folder-input', onSelect: () => actions.move([props.rec.id]) }]),
    { label: props.rec.favorite === null ? 'Добавить в избранное' : 'Убрать из избранного', icon: 'i-lucide-star', onSelect: () => actions.favorite(props.rec) },
    { label: 'Скопировать текст', icon: 'i-lucide-copy', onSelect: () => actions.copy(props.rec) }
  ],
  [{ label: 'Удалить', icon: 'i-lucide-trash-2', danger: true, onSelect: () => actions.remove([props.rec.id]) }]
])
const desk = computed(() => items.value.map(g => g.map(i => ({ label: i.label, icon: i.icon, onSelect: i.onSelect, ...(i.danger ? { color: 'error' as const } : {}) }))))

// ---------- the long press: about 400 ms, no lift, then the menu ----------

const menuOpen = ref(false)
const SLOP = 8
let press: { x: number, y: number, timer: ReturnType<typeof setTimeout> } | null = null
let swallow = false
function down(e: PointerEvent) {
  if (props.readonly || isDesktop.value || e.button !== 0) return
  cancel()
  press = {
    x: e.clientX,
    y: e.clientY,
    timer: setTimeout(() => {
      press = null
      swallow = true
      navigator.vibrate?.(8)
      menuOpen.value = true
      void later.load()
    }, 400)
  }
}
function moveBy(e: PointerEvent) {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) cancel()
}
function cancel() {
  if (press) clearTimeout(press.timer)
  press = null
}
/** The click that ends a long press is not a tap on the row */
function click(e: MouseEvent) {
  if (!swallow) return
  swallow = false
  e.stopPropagation()
  e.preventDefault()
}
onBeforeUnmount(cancel)

const Bare: FunctionalComponent = (_, { slots }) => slots.default?.()
Bare.inheritAttrs = false
</script>

<template>
  <component
    :is="later.ready.value && isDesktop && !readonly ? LazyUContextMenu : Bare"
    :items="desk"
  >
    <div
      class="relative mx-1 rounded-chip select-none lg:mx-0 lg:select-auto lg:hover:bg-hover"
      :class="{ 'fresh-tint': fresh }"
      style="-webkit-touch-callout: none"
      data-collect-row
      @pointerdown="down"
      @pointermove="moveBy"
      @pointerup="cancel"
      @pointercancel="cancel"
      @contextmenu="!isDesktop && $event.preventDefault()"
      @click.capture="click"
    >
      <RecordLine
        :rec="rec"
        :end="end.text"
        :end-late="end.late"
        aside
        :note="!view.noteOff"
        density="list"
        @open="emit('open')"
      />
    </div>
  </component>
  <ActionMenu
    v-if="!isDesktop && !readonly"
    v-model:open="menuOpen"
    :items="items"
    :title="rec.text"
    :label="`Действия: ${rec.text}`"
    bare
  />
</template>
