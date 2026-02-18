interface ToastOptions {
  title: string
  description?: string
  icon?: string
}

export function useToastHelpers() {
  const toast = useToast()

  function success(options: ToastOptions) {
    toast.add({
      ...options,
      color: 'success',
      icon: options.icon ?? 'i-lucide-check-circle'
    })
  }

  function warning(options: ToastOptions) {
    toast.add({
      ...options,
      color: 'warning',
      icon: options.icon ?? 'i-lucide-alert-triangle'
    })
  }

  function error(options: ToastOptions) {
    toast.add({
      ...options,
      color: 'error',
      icon: options.icon ?? 'i-lucide-circle-alert'
    })
  }

  function primary(options: ToastOptions) {
    toast.add({
      ...options,
      color: 'primary',
      icon: options.icon
    })
  }

  return {
    success,
    warning,
    error,
    primary
  }
}
