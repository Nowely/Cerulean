// The large title collapses (v23, B2, M6): once a page's title block (title, summary, tabs) or a record's title has
// scrolled under the header, the header names it. `mark` finds the element in the scroller whose `edge` ends the
// block: a page's rows start where its tabs end, a record's title row ends where its properties start.
// On desktop the slim 44px header appears above the scroller only then; the scroller moves the same 44px the other
// way, so nothing on screen jumps.
import { nextTick, ref, watch, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useScreen } from './useScreen'

const SLIM = 44

export function useTitleCollapse(scroller: Ref<HTMLElement | null | undefined>, mark: string, edge: 'top' | 'bottom', key: () => unknown) {
  const { isDesktop } = useScreen()
  const collapsed = ref(false)

  function check() {
    const box = scroller.value
    const el = box?.querySelector(mark)
    if (!box || !el) {
      collapsed.value = false
      return
    }
    const r = el.getBoundingClientRect()
    collapsed.value = (edge === 'top' ? r.top : r.bottom) <= box.getBoundingClientRect().top + 0.5
  }

  useEventListener(scroller, 'scroll', check, { passive: true })
  useEventListener(typeof window === 'undefined' ? undefined : window, 'resize', check, { passive: true })
  // Another page in the same screen, or the screen mounted: the title is back on top
  watch([scroller, key], async () => {
    collapsed.value = false
    await nextTick()
    check()
  }, { immediate: true })

  watch(collapsed, async (on) => {
    if (!isDesktop.value || !scroller.value) return
    await nextTick()
    scroller.value.scrollTop += on ? SLIM : -SLIM
  })

  return { collapsed, check }
}
