import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '~/composables/useAppStore'

describe('store persistence', () => {
  beforeEach(() => {
    localStorage.removeItem('taskchat-state')
    const initialized = useState<boolean>('app-initialized')
    initialized.value = false

    const store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
    initialized.value = false
  })

  it('saves state to localStorage after dispatch', () => {
    const store = useAppStore()
    store.dispatch({ type: 'SET_SEARCH', query: 'persisted-query' })

    const raw = localStorage.getItem('taskchat-state')
    expect(raw).toBeTruthy()
    expect(raw).toContain('persisted-query')
  })

  it('loads persisted state on initialization', () => {
    const base = useAppStore().state.value
    const stored = { ...base, searchQuery: 'loaded-query' }
    localStorage.setItem('taskchat-state', JSON.stringify(stored))

    const initialized = useState<boolean>('app-initialized')
    initialized.value = false

    const store = useAppStore()
    expect(store.state.value.searchQuery).toBe('loaded-query')
  })

  it('falls back safely for malformed persisted state', () => {
    localStorage.setItem('taskchat-state', '{broken-json')
    const initialized = useState<boolean>('app-initialized')
    initialized.value = false

    const store = useAppStore()
    expect(store.state.value.searchQuery).toBe('')
  })
})
