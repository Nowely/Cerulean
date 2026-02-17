export interface WireframeSidebar {
  title?: string
  items: string[]
  search?: string
  searchFocused?: boolean
  activeItem?: string
  showNewThreadDialog?: boolean
  newThreadName?: string
  newThreadType?: 'project' | 'group' | 'direct'
}

export interface WireframeMain {
  title?: string
  header?: string[]
  items: string[]
  composer?: string
  composerFocused?: boolean
  composerValue?: string
  toast?: string
  showCommandPalette?: boolean
  activeMessage?: string
}

export interface WireframePanel {
  title?: string
  items: string[]
  type?: 'notifications' | 'task-detail' | 'task-form' | 'template-picker' | 'command-palette' | 'new-thread'
}

export interface WireframeItem {
  sidebar?: WireframeSidebar
  main?: WireframeMain
  panel?: WireframePanel
  showSidebar?: boolean
  showPanel?: boolean
  isMobile?: boolean
}

export interface FlowInteraction {
  target: string
  type: 'click' | 'type' | 'hover' | 'toggle'
  value?: string
  required?: boolean
  hint?: string
}

export interface FlowAnnotation {
  target: string
  position: 'top' | 'right' | 'bottom' | 'left'
  text: string
  icon?: string
}

export interface FlowStep {
  title: string
  label?: string
  action: string
  result: string
  wireframe: WireframeItem
  interactions?: FlowInteraction[]
  highlights?: string[]
  annotations?: FlowAnnotation[]
}

export interface FlowObservation {
  label: string
  description: string
}

export interface Flow {
  slug: string
  icon: string
  title: string
  description: string
  summary: string
  steps: FlowStep[]
  observations: FlowObservation[]
}

export interface FlowListItem {
  slug: string
  icon: string
  title: string
  description: string
}

export interface FlowControllerState {
  currentStep: number
  completedActions: Set<string>
  highlightedElements: Set<string>
  activeDialogs: Set<string>
  mobileMode: boolean
  darkMode: boolean
  interactiveMode: boolean
}
