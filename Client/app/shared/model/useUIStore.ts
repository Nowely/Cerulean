const sidebarOpen = ref(false)
const searchQuery = ref('')
const showTaskForm = ref(false)
const showTemplates = ref(false)

export function useUIStore() {
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setSidebar(open: boolean) {
    sidebarOpen.value = open
  }

  function setSearch(query: string) {
    searchQuery.value = query
  }

  function setShowTaskForm(show: boolean) {
    showTaskForm.value = show
  }

  function setShowTemplates(show: boolean) {
    showTemplates.value = show
  }

  return {
    sidebarOpen,
    searchQuery,
    showTaskForm,
    showTemplates,
    toggleSidebar,
    setSidebar,
    setSearch,
    setShowTaskForm,
    setShowTemplates
  }
}
