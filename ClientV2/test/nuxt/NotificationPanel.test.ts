import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import NotificationPanel from '~/components/notifications/NotificationPanel.vue'
import { useAppStore } from '~/composables/useAppStore'

describe('NotificationPanel', () => {
  beforeEach(() => {
    const store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
    store.dispatch({ type: 'SHOW_NOTIFICATIONS', show: true })
  })

  it('marks all notifications as read', async () => {
    const store = useAppStore()
    const wrapper = await mountSuspended(NotificationPanel)

    const unreadBefore = store.state.value.notifications.filter(n => !n.read).length
    expect(unreadBefore).toBeGreaterThan(0)

    await wrapper.find('[data-testid="mark-all-read-btn"]').trigger('click')
    await nextTick()

    expect(store.state.value.notifications.every(n => n.read)).toBe(true)
  })

  it('opens a notification and navigates to related thread', async () => {
    const store = useAppStore()
    const wrapper = await mountSuspended(NotificationPanel)

    await wrapper.find('[data-testid="notification-item-n2"]').trigger('click')
    await nextTick()

    expect(store.state.value.activeThreadId).toBe('t1')
    expect(store.state.value.showNotifications).toBe(false)
  })
})
