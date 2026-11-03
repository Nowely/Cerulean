<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from '#imports'
import { useBackLayer } from '~/composables/useBackLayer'
import type { Page } from '~/domain/types'
import { toMarkdown } from '~/domain/export'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { useNotify } from '~/composables/useNotify'

const props = defineProps<{ page: Page, rect: DOMRect, to: string, compact?: boolean, offset?: { x: number, y: number } | null }>()
const emit = defineEmits<{ close: [], move: [] }>()
useBackLayer(() => true, () => emit('close'))
const router = useRouter()
const data = useDataStore()
const ui = useUiStore()
const notify = useNotify()
const itemClass = 'flex h-11 w-full items-center gap-3 rounded-item px-2.5 text-left text-15 outline-none focus-visible:bg-hover active:bg-pressed disabled:cursor-not-allowed'
const own = computed(() => props.page.kind === 'page')
const above = computed(() => props.rect.top + props.rect.height / 2 > window.innerHeight / 2)
const cardStyle = computed(() => ({ left: `${props.rect.left}px`, top: `${props.rect.top}px`, width: `${props.rect.width}px`, transform: props.offset ? `translate(${props.offset.x}px, ${props.offset.y}px) scale(1.04)` : undefined }))
const menuStyle = computed(() => ({
  left: `${Math.max(8, Math.min(props.rect.left, window.innerWidth - 264))}px`,
  top: `${above.value ? props.rect.top - 8 : props.rect.bottom + 8}px`,
  maxHeight: `${Math.max(0, above.value ? props.rect.top - 16 : window.innerHeight - props.rect.bottom - 16)}px`,
  transform: above.value ? 'translateY(-100%)' : undefined
}))

function edit(what: 'title' | 'glyph') {
  if (what === 'title') ui.focusTitle = props.page.id
  else ui.openGlyph = props.page.id
  emit('close')
  void router.push(props.to)
}
function favorite() {
  data.toggleFavorite({ kind: 'page', id: props.page.id })
  emit('close')
}
async function copy() {
  const text = toMarkdown([props.page], data.liveRecords.filter(r => r.pageId === props.page.id), [], Date.now(), data.nameOf)
  emit('close')
  try {
    await navigator.clipboard.writeText(text.replace(/^# Cerulean\n\n/, ''))
    notify('Страница скопирована как текст', undefined, 3000)
  } catch {
    notify('Не удалось скопировать', undefined, 3000)
  }
}
function remove() {
  const id = props.page.id
  data.removePage(id)
  emit('close')
  notify('Страница в корзине', { label: 'Отменить', run: () => data.restorePage(id) })
}
function openPage() {
  emit('close')
  void router.push(props.to)
}
function preventScroll(event: TouchEvent) {
  // A menu may itself need to scroll on a short screen.
  if (!(event.target as Element | null)?.closest('[data-home-hold-menu]')) event.preventDefault()
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
  else suppressReleaseClick = false
}
let suppressReleaseClick = true
function nextPress() {
  suppressReleaseClick = false
}
function releaseClick(event: MouseEvent) {
  if (!suppressReleaseClick) return
  suppressReleaseClick = false
  event.preventDefault()
  event.stopImmediatePropagation()
}
onMounted(() => {
  document.addEventListener('touchmove', preventScroll, { passive: false })
  document.addEventListener('keydown', keydown)
  document.addEventListener('pointerdown', nextPress, true)
  document.addEventListener('click', releaseClick, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('touchmove', preventScroll)
  document.removeEventListener('keydown', keydown)
  document.removeEventListener('pointerdown', nextPress, true)
  document.removeEventListener('click', releaseClick, true)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50"
      :class="{ 'pointer-events-none': offset }"
      data-home-hold
    >
      <button
        type="button"
        aria-label="Закрыть меню"
        tabindex="-1"
        class="absolute inset-0 cursor-default bg-[var(--home-hold-veil)] backdrop-blur-[6px]"
        data-home-hold-veil
        :class="{ 'opacity-0': offset }"
        @click="emit('close')"
      />
      <a
        :href="to"
        class="held-card absolute flex select-none items-center gap-3 rounded-card bg-elev px-2 text-left shadow-float inset-ring inset-ring-line [-webkit-touch-callout:none]"
        :class="compact ? 'min-h-11' : 'min-h-15 py-2'"
        :style="cardStyle"
        data-home-hold-card
        @click.prevent="openPage"
        @contextmenu.prevent
      ><slot /></a>
      <div
        v-if="!offset"
        role="menu"
        :aria-label="`Действия: ${page.title || 'Без названия'}`"
        class="absolute w-64 overflow-y-auto rounded-[14px] border border-line bg-elev p-1.5 shadow-float dark:border-line2"
        :style="menuStyle"
        data-home-hold-menu
      >
        <button
          v-if="own"
          type="button"
          role="menuitem"
          class="text-highlighted"
          :class="itemClass"
          @click="edit('title')"
        >
          <UIcon
            name="i-lucide-pencil"
            class="size-4.5 shrink-0 text-dimmed"
          />Переименовать
        </button>
        <button
          v-if="own"
          type="button"
          role="menuitem"
          class="text-highlighted"
          :class="itemClass"
          @click="edit('glyph')"
        >
          <UIcon
            name="i-lucide-palette"
            class="size-4.5 shrink-0 text-dimmed"
          />Значок и цвет
        </button>
        <button
          type="button"
          role="menuitem"
          class="text-highlighted"
          :class="itemClass"
          @click="favorite"
        >
          <UIcon
            name="i-lucide-star"
            class="size-4.5 shrink-0 text-dimmed"
          />{{ page.favorite === null ? 'Добавить в избранное' : 'Убрать из избранного' }}
        </button>
        <button
          v-if="own"
          type="button"
          role="menuitem"
          class="text-highlighted"
          :class="itemClass"
          @click="emit('move')"
        >
          <UIcon
            name="i-lucide-arrow-right"
            class="size-4.5 shrink-0 text-dimmed"
          />Переместить в секцию
        </button>
        <button
          type="button"
          role="menuitem"
          class="text-highlighted"
          :class="itemClass"
          @click="copy"
        >
          <UIcon
            name="i-lucide-copy"
            class="size-4.5 shrink-0 text-dimmed"
          />Скопировать как текст
        </button>
        <template v-if="own">
          <div
            class="mx-1 my-1.5 h-px bg-line"
            role="separator"
          />
          <button
            type="button"
            role="menuitem"
            class="text-warn-ink"
            :class="itemClass"
            @click="remove"
          >
            <UIcon
              name="i-lucide-trash-2"
              class="size-4.5 shrink-0"
            />Удалить
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.held-card { transform: scale(1.02); }
@media (prefers-reduced-motion: no-preference) {
  .held-card { animation: home-lift 150ms ease-out; }
}
@keyframes home-lift {
  from { transform: scale(1); }
}
</style>
