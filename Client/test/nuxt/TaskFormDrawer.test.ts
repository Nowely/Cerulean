import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TaskFormDrawer from '~/components/task/TaskFormDrawer.vue'
import { useAppStore } from '~/composables/useAppStore'

describe('TaskFormDrawer', () => {
  beforeEach(() => {
    const store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
    store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
    store.dispatch({ type: 'SHOW_TASK_FORM', show: true })
  })

  it('renders and validates required title', async () => {
    const wrapper = await mountSuspended(TaskFormDrawer)
    expect(wrapper.exists()).toBe(true)

    const submitBtn = wrapper.find('[data-testid="task-submit-btn"]')
    expect(submitBtn.exists()).toBe(true)
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('creates a task and closes drawer', async () => {
    const store = useAppStore()
    const initialTaskCount = store.state.value.tasks.length
    const wrapper = await mountSuspended(TaskFormDrawer)

    await wrapper.find('[data-testid="task-title-input"]').setValue('Ship migration')
    await wrapper.find('[data-testid="task-description-input"]').setValue('Finish remaining migration tasks')
    await wrapper.find('[data-testid="task-submit-btn"]').trigger('click')
    await nextTick()

    expect(store.state.value.tasks.length).toBe(initialTaskCount + 1)
    expect(store.state.value.showTaskForm).toBe(false)
    expect(store.state.value.tasks.some(t => t.title === 'Ship migration')).toBe(true)
  })
})
