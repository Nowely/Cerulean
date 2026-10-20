// The toast: inverted, above the composer, text and at most one action; pauses while hovered or focused
import { useToast } from '#imports'

export function useNotify() {
  const toast = useToast()
  return (title: string, action?: { label: string, run: () => void }, duration = 5000) => toast.add({
    title,
    duration,
    close: false,
    actions: action
      ? [{ label: action.label, color: 'neutral', variant: 'link', class: 'h-11 px-2.5 font-semibold text-canvas hover:text-canvas/80 active:text-canvas/70', onClick: action.run }]
      : undefined
  })
}
