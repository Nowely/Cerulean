import { describe, expect, it } from 'vitest'

describe('useIsMobile', () => {
  it('should return a ref', async () => {
    const { useIsMobile } = await import('~/composables/useIsMobile')
    const isMobile = useIsMobile()
    expect(isMobile).toBeDefined()
    expect(typeof isMobile.value).toBe('boolean')
  })
})
