// The toast: inverted, above the composer, text and at most one action; pauses while hovered or focused.
// It takes the place of a card docked above the composer. Its action closes it.
import { useToast } from '#imports'
import { useUiStore } from '~/stores/ui'

export function useNotify() {
  const toast = useToast()
  const ui = useUiStore()
  return (title: string, action?: { label: string, run: () => void }, duration = 5000) => {
    ui.toastAt = Date.now()
    const id = `n${ui.toastAt}`
    // The action is done once tapped: the toast goes with it («Открыть» must not stay over the page it opened)
    return toast.add({
      id,
      title,
      duration,
      close: false,
      actions: action
        ? [{ label: action.label, color: 'neutral', variant: 'link', class: 'h-11 px-2.5 font-semibold text-canvas hover:text-canvas/80 active:text-canvas/70', onClick: () => {
            toast.remove(id)
            action.run()
          } }]
        : undefined
    })
  }
}
