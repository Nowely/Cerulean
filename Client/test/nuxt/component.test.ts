import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppShell from '~/components/AppShell.vue'
import { useAppStore } from '~/composables/useAppStore'

describe('AppShell', () => {
  beforeEach(() => {
    const store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
  })

  it('shows welcome state when no thread is active', async () => {
    const wrapper = await mountSuspended(AppShell)
    expect(wrapper.text()).toContain('Welcome to TaskChat')
  })

  it('shows chat header when a thread is selected', async () => {
    const store = useAppStore()
    const wrapper = await mountSuspended(AppShell)

    store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
    await nextTick()

    expect(wrapper.text()).toContain('Website Redesign')
  })
})
