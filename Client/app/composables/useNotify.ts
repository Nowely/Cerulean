// The toast: inverted, above the composer, text and at most one action; pauses while hovered or focused.
// It takes the place of a card docked above the composer.
import { useToast } from '#imports'
import { useUiStore } from '~/stores/ui'

export function useNotify() {
  const toast = useToast()
  const ui = useUiStore()
  return (title: string, action?: { label: string, run: () => void }, duration = 5000) => {
    ui.toastAt = Date.now()
    return toast.add({
      title,
      duration,
      close: false,
      actions: action
        ? [{ label: action.label, color: 'neutral', variant: 'link', class: 'h-11 px-2.5 font-semibold text-canvas hover:text-canvas/80 active:text-canvas/70', onClick: action.run }]
        : undefined
    })
  }
}
