<script setup lang="ts">
// The frame: on a phone one screen at a time. On a computer («Как Telegram», computer delta, item 1) Главная itself is the
// left column, with its field at its foot, and the open page, record or settings is on the right; nothing lists the pages
// a second time. Overlays shared by every screen live here.
import { defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, useHead, useColorMode, defineShortcuts } from '#imports'
import { useEventListener } from '@vueuse/core'
import { useScreen } from '~/composables/useScreen'
import { useHomeField } from '~/composables/useSide'
import { pathOf, usePeek } from '~/composables/usePeek'
import { useFind } from '~/composables/useFind'
import { useViewport } from '~/composables/useViewport'
import { useOpenedTracking } from '~/composables/useOpened'
import { FOCUS_PROXY_ID } from '~/composables/useCreatePage'
import { useLater } from '~/composables/useLater'
import { useNotify } from '~/composables/useNotify'
import { useUiStore } from '~/stores/ui'
import { useDataStore } from '~/stores/data'
import SideColumn from './SideColumn.vue'

// Only the screen itself is in the first download; the overlays come with the menus and sheets (useLater), after the
// first paint.
const PreviewPane = defineAsyncComponent(() => import('../overlay/PreviewPane.vue'))
const FindOverlay = defineAsyncComponent(() => import('../overlay/FindOverlay.vue'))
const PagePicker = defineAsyncComponent(() => import('../overlay/PagePicker.vue'))
const ConfirmDialog = defineAsyncComponent(() => import('../overlay/ConfirmDialog.vue'))
const PropSheets = defineAsyncComponent(() => import('../page/PropSheets.vue'))

const { isDesktop } = useScreen()
const peek = usePeek()
const find = useFind()
const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()
const ui = useUiStore()
const data = useDataStore()
const notify = useNotify()
useViewport()
// «Открыто недавно» in Поиск follows what is opened, from anywhere (v24, item 16)
useOpenedTracking()

const later = useLater()
onMounted(later.loadWhenIdle)
watch(() => !!(find.isOpen.value || peek.target.value || ui.picker || ui.confirming), (asked) => {
  if (asked) void later.load()
}, { immediate: true })

defineShortcuts({
  meta_k: () => (find.isOpen.value ? find.close() : find.open())
})

// A computer's Esc closes what is on top, one thing at a time (computer delta, item 20): a field's own Esc first (the text,
// the add row, a title: they handle it there), then a list, a menu or a window (their own layers), then Главная's open
// field, and last a record goes back to its page
const homeField = useHomeField()
function escape(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || !isDesktop.value) return
  if ((e.target as Element | null)?.closest?.('input, textarea, [contenteditable="true"]')) return
  const layers = [...document.querySelectorAll('[data-dismissable-layer], [data-places], [data-home-menu]')]
  if (layers.some(el => !el.querySelector('[role="tooltip"]'))) return
  const field = homeField.value
  if (field?.isOpen()) return field.close()
  if (route.path.startsWith('/r/')) document.querySelector<HTMLElement>('[data-record-back]')?.click()
}
useEventListener(window, 'keydown', escape)

// The browser chrome takes the canvas colour of the current theme, read from the tokens once it applies
const themeColor = ref<string>()
watch(() => colorMode.value, () => nextTick(() => {
  themeColor.value = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
}), { immediate: true, flush: 'post' })
useHead({ meta: [{ name: 'theme-color', content: themeColor }] })

// On a phone a swipe to the right goes back from Журнал to Главная (Журнал is a screen pushed from Главная)
let x0 = 0
let y0 = 0
function touchStart(e: TouchEvent) {
  x0 = e.touches[0]!.clientX
  y0 = e.touches[0]!.clientY
}
function touchEnd(e: TouchEvent) {
  if (isDesktop.value || route.path !== '/journal') return
  const t = e.changedTouches[0]!
  const dx = t.clientX - x0
  const dy = t.clientY - y0
  if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.6) return
  if ((e.target as HTMLElement).closest('input, textarea, [data-no-swipe], .no-scrollbar')) return
  if (dx > 0) void router.push('/')
}

// A preview of something that never existed (an old or mistyped link) closes and says so;
// something deleted stays open with «Этого больше нет»
watch(() => peek.target.value, (t) => {
  if (!t || (t.kind === 'page' ? data.pages[t.id] : data.records[t.id])) return
  peek.close()
  notify(t.kind === 'page' ? 'Такой страницы нет' : 'Такой записи нет', undefined, 3000)
}, { immediate: true })

// Leaving a screen closes its preview on a phone
watch(() => route.path, () => {
  if (route.query.peek && !isDesktop.value) peek.close()
})

// A computer opens a preview's page or record on the right instead (computer delta, item 16)
watch([isDesktop, () => peek.target.value], ([desk, t]) => {
  if (desk && t && (t.kind === 'page' ? data.pages[t.id] : data.records[t.id])) void router.replace(pathOf(t))
}, { immediate: true })
</script>

<template>
  <div
    class="flex h-(--vvh,100dvh) w-full overflow-hidden bg-canvas"
    @touchstart.passive="touchStart"
    @touchend.passive="touchEnd"
  >
    <SideColumn v-if="isDesktop" />
    <main class="flex min-w-0 flex-1 flex-col">
      <slot />
    </main>
  </div>
  <template v-if="later.ready.value">
    <PreviewPane
      v-if="!isDesktop"
      :target="peek.target.value"
      variant="sheet"
    />
    <FindOverlay />
    <PagePicker />
    <ConfirmDialog />
    <PropSheets />
  </template>
  <input
    :id="FOCUS_PROXY_ID"
    class="pointer-events-none fixed top-0 left-0 size-px text-base opacity-0"
    aria-hidden="true"
    tabindex="-1"
  >
</template>
