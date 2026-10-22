<script setup lang="ts">
// The places (main flow, item 6): a popover over the field's chip, 232px, 44px rows with the glyph and the name, a tick on
// the current one. Входящие, then the person's pages in Главная's order; never Сегодня, no search, no «Авто» row and no
// «+ Новая страница…». It never takes the focus: a pick closes it and the caret is back where it was.
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import type { Id, Page } from '~/domain/types'
import { pageColor } from '~/domain/look'
import PageTile from '../common/PageTile.vue'

const props = defineProps<{
  pages: Page[]
  current: Id
  /** A row of the list: the popover stands at the right edge, over that row's chip */
  end?: boolean
}>()
const emit = defineEmits<{ pick: [Id], close: [] }>()

const box = useTemplateRef<HTMLElement>('box')
/** Room above the field, so the list scrolls instead of running under the status bar (item 26) */
const room = ref<number | null>(null)
function measure() {
  const el = box.value?.parentElement
  if (!el) return
  // The tallest status bar and notch is 59px, and 16 more keep it clear of the header's edge
  room.value = Math.max(176, el.getBoundingClientRect().top - 8 - 75)
}
/** A press outside closes it; the chip's own press toggles it, so it is left to the chip */
function outside(e: PointerEvent) {
  const t = e.target as Element | null
  if (box.value?.contains(t) || t?.closest('[data-places-chip]')) return
  emit('close')
}
function key(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}
onMounted(() => {
  measure()
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('keydown', key, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('keydown', key, true)
})

const rows = computed(() => props.pages.map(p => ({ page: p, on: p.id === props.current })))
</script>

<template>
  <div
    ref="box"
    class="absolute bottom-[calc(100%+8px)] z-5 w-58 overflow-y-auto overscroll-contain rounded-[14px] border border-line bg-elev p-1.5 shadow-float dark:border-line2 lg:bottom-[calc(100%+6px)]"
    :class="end ? 'right-0.5' : 'left-0.5'"
    :style="room ? { maxHeight: `${room}px` } : undefined"
    role="dialog"
    aria-label="Куда записать"
    data-places
  >
    <button
      v-for="r in rows"
      :key="r.page.id"
      type="button"
      class="flex h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left text-base text-highlighted active:bg-pressed lg:hover:bg-hover"
      :class="{ 'bg-sel': r.on }"
      :aria-current="r.on || undefined"
      @pointerdown.prevent
      @mousedown.prevent
      @click="emit('pick', r.page.id)"
    >
      <PageTile
        :glyph="r.page.glyph"
        :color="pageColor(r.page)"
        tint
      />
      <span class="min-w-0 flex-1 truncate">{{ r.page.title || 'Без названия' }}</span>
      <UIcon
        v-if="r.on"
        name="i-lucide-check"
        class="size-4.5 shrink-0 text-accent-ink"
      />
    </button>
  </div>
</template>
