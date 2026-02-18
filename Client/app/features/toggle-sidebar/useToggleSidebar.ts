import { useUIStore } from '~/entities/ui/store'

export function useToggleSidebar() {
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
    isOpen: computed(() => uiStore.sidebarOpen),
    toggle,
    open,
    close
  }
}
