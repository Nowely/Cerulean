import type { ThreadKind } from '../types/thread'

export interface ThreadKindConfig {
  kind: ThreadKind
  label: string
  icon: string
  color: string
  description: string
}

export const THREAD_KINDS: Record<ThreadKind, ThreadKindConfig> = {
  tasks: {
    kind: 'tasks',
    label: 'Tasks',
    icon: 'i-lucide-check-square',
    color: 'hsl(142 71% 45%)',
    description: 'Track tasks with statuses, priorities, and assignees'
  },
  shopping: {
    kind: 'shopping',
    label: 'Shopping',
    icon: 'i-lucide-shopping-cart',
    color: 'hsl(38 92% 50%)',
    description: 'Create checklists for groceries and purchases'
  },
  checklist: {
    kind: 'checklist',
    label: 'Checklist',
    icon: 'i-lucide-list-checks',
    color: 'hsl(262 83% 58%)',
    description: 'Simple todo list with checkboxes'
  },
  notes: {
    kind: 'notes',
    label: 'Notes',
    icon: 'i-lucide-notebook-pen',
    color: 'hsl(262 83% 58%)',
    description: 'Capture ideas, meeting notes, and references'
  },
  contacts: {
    kind: 'contacts',
    label: 'Contacts',
    icon: 'i-lucide-contact',
    color: 'hsl(199 89% 48%)',
    description: 'Organize people with details and tags'
  },
  chat: {
    kind: 'chat',
    label: 'Chat',
    icon: 'i-lucide-message-square',
    color: 'hsl(210 100% 52%)',
    description: 'General conversation and discussion'
  }
}

export function getThreadKindConfig(kind: ThreadKind): ThreadKindConfig {
  return THREAD_KINDS[kind]
}
