<script setup lang="ts">
// The frame: on a phone one screen at a time; on desktop the sidebar, the main column and,
// when something is previewed, the right panel. Overlays shared by every screen live here.
import { defineAsyncComponent, h, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, useHead, useColorMode, defineShortcuts } from '#imports'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
import { useFind } from '~/composables/useFind'
import { useViewport } from '~/composables/useViewport'
import { FOCUS_PROXY_ID } from '~/composables/useCreatePage'
import { useLater } from '~/composables/useLater'
import { useNotify } from '~/composables/useNotify'
import { useUiStore } from '~/stores/ui'
import { useDataStore } from '~/stores/data'

// Only the screen itself is in the first download. The sidebar (desktop only) keeps its width while it
// loads; the overlays come with the menus and sheets (useLater), after the first paint.
const AppSidebar = defineAsyncComponent({
  loader: () => import('./AppSidebar.vue'),
  loadingComponent: { render: () => h('aside', { class: 'w-65 shrink-0 bg-side' }) },
  delay: 0
})
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

const later = useLater()
onMounted(later.loadWhenIdle)
watch(() => !!(find.isOpen.value || peek.target.value || ui.picker || ui.confirming), (asked) => {
  if (asked) void later.load()
}, { immediate: true })

defineShortcuts({
  meta_k: () => (find.isOpen.value ? find.close() : find.open())
})

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
</script>

<template>
  <div
    class="flex h-(--vvh,100dvh) w-full overflow-hidden bg-canvas"
    @touchstart.passive="touchStart"
    @touchend.passive="touchEnd"
  >
    <AppSidebar v-if="isDesktop" />
    <main class="flex min-w-0 flex-1 flex-col">
      <slot />
    </main>
    <PreviewPane
      v-if="isDesktop && peek.target.value"
      :target="peek.target.value"
      variant="panel"
    />
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
