import { useUIStore } from '~/shared/model'

export function useSidebarToggle() {
  const uiStore = useUIStore()

  function toggle() {
    uiStore.toggleSidebar()
  }

  function open() {
    uiStore.setSidebar(true)
  }

  function close() {
    uiStore.setSidebar(false)
  }

  return {
    isOpen: computed(() => uiStore.sidebarOpen.value),
    toggle,
    open,
    close
  }
}
