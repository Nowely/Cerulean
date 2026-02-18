export function twJoin(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date

  if (diff < 1000 * 60) return 'just now'
  if (diff < 1000 * 60 * 60) {
    const mins = Math.floor(diff / (1000 * 60))
    return `${mins}m ago`
  }
  if (diff < 1000 * 60 * 60 * 24) {
    const hrs = Math.floor(diff / (1000 * 60 * 60))
    return `${hrs}h ago`
  }
  if (diff < 1000 * 60 * 60 * 24 * 7) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return `${days}d ago`
  }
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === now.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export function isDueOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < Date.now()
}

export function isDueSoon(dueDate?: string): boolean {
  if (!dueDate) return false
  const diff = new Date(dueDate).getTime() - Date.now()
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2
}
