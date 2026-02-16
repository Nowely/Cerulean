import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InputBar from '~/components/chat/InputBar.vue'
import { useAppStore } from '~/composables/useAppStore'

describe('InputBar', () => {
  beforeEach(() => {
    const store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
    store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
  })

  it('sends a text message', async () => {
    const store = useAppStore()
    const initialCount = store.state.value.messages.length
    const wrapper = await mountSuspended(InputBar)

    await wrapper.find('[data-testid="message-input"]').setValue('New chat message')
    await wrapper.find('[data-testid="send-message-btn"]').trigger('click')
    await nextTick()

    expect(store.state.value.messages.length).toBe(initialCount + 1)
    expect(store.state.value.messages.at(-1)?.content).toBe('New chat message')
  })

  it('opens task form from slash command', async () => {
    const store = useAppStore()
    const wrapper = await mountSuspended(InputBar)

    await wrapper.find('[data-testid="message-input"]').setValue('/task')
    await wrapper.find('[data-testid="send-message-btn"]').trigger('click')
    await nextTick()

    expect(store.state.value.showTaskForm).toBe(true)
  })
})
