import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('taskchat e2e smoke', async () => {
  await setup()

  it('renders the migrated app shell', async () => {
    const html = await $fetch('/')
    expect(html).toContain('TaskChat')
    expect(html).toContain('Website Redesign')
    expect(html).toContain('Select a thread from the sidebar')
  })

  it('includes viewport configuration for mobile behavior', async () => {
    const html = await $fetch('/')
    expect(html).toContain('width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
  })
})
