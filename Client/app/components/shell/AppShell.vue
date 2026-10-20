<script setup lang="ts">
// The frame: on a phone one screen at a time; on desktop the sidebar, the main column and,
// when something is previewed, the right panel. Overlays shared by every screen live here.
import { nextTick, ref, watch } from 'vue'
import { useRoute, useRouter, useHead, useColorMode, defineShortcuts } from '#imports'
import { useScreen } from '~/composables/useScreen'
import { usePeek } from '~/composables/usePeek'
import { useFind } from '~/composables/useFind'
import { useViewport } from '~/composables/useViewport'
import { FOCUS_PROXY_ID } from '~/composables/useCreatePage'
import AppSidebar from './AppSidebar.vue'
import PreviewPane from '../overlay/PreviewPane.vue'
import FindOverlay from '../overlay/FindOverlay.vue'
import PagePicker from '../overlay/PagePicker.vue'
import ConfirmDialog from '../overlay/ConfirmDialog.vue'

const { isDesktop } = useScreen()
const peek = usePeek()
const find = useFind()
const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()
useViewport()

defineShortcuts({
  meta_k: () => (find.isOpen.value ? find.close() : find.open())
})

// The browser chrome takes the canvas colour of the current theme, read from the tokens once it applies
const themeColor = ref<string>()
watch(() => colorMode.value, () => nextTick(() => {
  themeColor.value = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
}), { immediate: true, flush: 'post' })
useHead({ meta: [{ name: 'theme-color', content: themeColor }] })

// A phone swipes between Главная and Чат
let x0 = 0
let y0 = 0
function touchStart(e: TouchEvent) {
  x0 = e.touches[0]!.clientX
  y0 = e.touches[0]!.clientY
}
function touchEnd(e: TouchEvent) {
  if (isDesktop.value || (route.path !== '/' && route.path !== '/chat')) return
  const t = e.changedTouches[0]!
  const dx = t.clientX - x0
  const dy = t.clientY - y0
  if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.6) return
  if ((e.target as HTMLElement).closest('input, textarea, [data-no-swipe], .no-scrollbar')) return
  if (dx < 0 && route.path === '/') void router.push('/chat')
  if (dx > 0 && route.path === '/chat') void router.push('/')
}

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
  <PreviewPane
    v-if="!isDesktop"
    :target="peek.target.value"
    variant="sheet"
  />
  <FindOverlay />
  <PagePicker />
  <ConfirmDialog />
  <input
    :id="FOCUS_PROXY_ID"
    class="pointer-events-none fixed top-0 left-0 size-px text-base opacity-0"
    aria-hidden="true"
    tabindex="-1"
  >
</template>
