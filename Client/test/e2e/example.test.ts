import { describe, expect, it } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'

describe('taskchat e2e smoke', async () => {
  // SPA mode: the HTML is an empty shell, so assertions run against the rendered page
  await setup({ browser: true })

  it('renders the migrated app shell', async () => {
    const page = await createPage('/')
    await page.getByText('Website Redesign').first().waitFor()

    expect(await page.title()).toBe('TaskChat')
    expect(await page.textContent('body')).toContain('Select a thread from the sidebar')
  })

  it('includes viewport configuration for mobile behavior', async () => {
    const page = await createPage('/')
    await page.getByText('Website Redesign').first().waitFor()

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport).toBe('width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
  })
})
