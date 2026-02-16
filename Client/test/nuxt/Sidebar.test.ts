import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Sidebar from '~/components/sidebar/Sidebar.vue'
import { useAppStore } from '~/composables/useAppStore'

describe('Sidebar', () => {
  beforeEach(() => {
    const store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
  })

  it('renders thread list', async () => {
    const wrapper = await mountSuspended(Sidebar)
    expect(wrapper.find('[data-testid="thread-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="thread-item-"]').length).toBeGreaterThan(0)
  })

  it('filters threads by search text', async () => {
    const wrapper = await mountSuspended(Sidebar)

    const search = wrapper.find('[data-testid="thread-search-input"]')
    await search.setValue('Website')
    await nextTick()

    const items = wrapper.findAll('[data-testid^="thread-item-"]')
    expect(items.length).toBe(1)
    expect(items[0]?.text()).toContain('Website Redesign')
  })

  it('creates a new thread from sidebar action', async () => {
    const wrapper = await mountSuspended(Sidebar)

    await wrapper.find('[data-testid="new-thread-btn"]').trigger('click')
    await nextTick()

    const nameInput = document.querySelector('[data-testid="new-thread-name-input"]') as HTMLInputElement | null
    expect(nameInput).not.toBeNull()
    nameInput!.value = 'Release Planning'
    nameInput!.dispatchEvent(new Event('input', { bubbles: true }))

    const submitBtn = document.querySelector('[data-testid="create-thread-submit-btn"]') as HTMLButtonElement | null
    expect(submitBtn).not.toBeNull()
    submitBtn!.click()
    await nextTick()

    expect(wrapper.text()).toContain('Release Planning')
  })
})
