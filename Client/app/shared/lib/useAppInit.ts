import { useBlockStore, useUserStore, useNotificationStore } from '~/shared/model'

export function useAppInit() {
  const initialized = ref(false)

  async function init() {
    if (initialized.value) return

    const blockStore = useBlockStore()
    const userStore = useUserStore()
    const notificationStore = useNotificationStore()

    await blockStore.init()
    userStore.init()
    notificationStore.init()

    initialized.value = true
  }

  return {
    initialized,
    init
  }
}
