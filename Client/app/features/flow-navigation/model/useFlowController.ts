import type { Flow, FlowStep, FlowInteraction } from '~/shared/lib'

export function useFlowController(flow: Ref<Flow | null>) {
  const currentStep = ref(0)
  const completedActions = ref<Set<string>>(new Set())
  const highlightedElements = ref<Set<string>>(new Set())
  const activeDialogs = ref<Set<string>>(new Set())
  const mobileMode = ref(false)
  const darkMode = ref(false)
  const interactiveMode = ref(false)

  const totalSteps = computed(() => flow.value?.steps.length ?? 0)

  const currentStepData = computed<FlowStep | null>(() => {
    if (!flow.value) return null
    return flow.value.steps[currentStep.value] ?? null
  })

  const progress = computed(() => {
    if (totalSteps.value === 0) return 0
    return Math.round(((currentStep.value + 1) / totalSteps.value) * 100)
  })

  const isStepCompleted = computed(() => {
    if (!currentStepData.value?.interactions) return true
    return currentStepData.value.interactions
      .filter(i => i.required)
      .every(i => completedActions.value.has(`${currentStep.value}-${i.target}`))
  })

  function goToStep(idx: number) {
    if (idx >= 0 && idx < totalSteps.value) {
      currentStep.value = idx
      updateHighlights()
    }
  }

  function nextStep() {
    if (currentStep.value < totalSteps.value - 1) {
      currentStep.value++
      updateHighlights()
    }
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
      updateHighlights()
    }
  }

  function updateHighlights() {
    highlightedElements.value = new Set(currentStepData.value?.highlights ?? [])
  }

  function completeAction(interaction: FlowInteraction) {
    const key = `${currentStep.value}-${interaction.target}`
    completedActions.value.add(key)

    if (interaction.type === 'click' && interaction.target.includes('dialog')) {
      activeDialogs.value.add(interaction.target)
    }
  }

  function toggleDialog(dialogId: string) {
    if (activeDialogs.value.has(dialogId)) {
      activeDialogs.value.delete(dialogId)
    } else {
      activeDialogs.value.add(dialogId)
    }
  }

  function isHighlighted(element: string): boolean {
    return highlightedElements.value.has(element)
  }

  function isDialogActive(dialogId: string): boolean {
    return activeDialogs.value.has(dialogId)
  }

  function toggleMobileMode() {
    mobileMode.value = !mobileMode.value
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }

  function toggleInteractiveMode() {
    interactiveMode.value = !interactiveMode.value
  }

  function reset() {
    currentStep.value = 0
    completedActions.value = new Set()
    highlightedElements.value = new Set()
    activeDialogs.value = new Set()
    updateHighlights()
  }

  watch(flow, () => {
    reset()
  }, { immediate: true })

  return {
    currentStep,
    currentStepData,
    totalSteps,
    progress,
    isStepCompleted,
    mobileMode,
    darkMode,
    interactiveMode,
    highlightedElements,
    activeDialogs,
    goToStep,
    nextStep,
    prevStep,
    completeAction,
    toggleDialog,
    isHighlighted,
    isDialogActive,
    toggleMobileMode,
    toggleDarkMode,
    toggleInteractiveMode,
    reset
  }
}
