const sidebarOpen = ref(false)
const showTaskForm = ref(false)
const showTemplates = ref(false)

export function useUIStore() {
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setSidebar(open: boolean) {
    sidebarOpen.value = open
  }

  function setShowTaskForm(show: boolean) {
    showTaskForm.value = show
  }

  function setShowTemplates(show: boolean) {
    showTemplates.value = show
  }

  return {
    sidebarOpen,
    showTaskForm,
    showTemplates,
    toggleSidebar,
    setSidebar,
    setShowTaskForm,
    setShowTemplates
  }
}
