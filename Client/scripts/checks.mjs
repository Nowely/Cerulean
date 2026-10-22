// Walks the «Check:» lines that can be scripted against a running app (pnpm dev) and prints pass or fail
// for each. It does not replace acceptance by the mockups thread; it catches regressions before it.
// Each file in scripts/checks/ (but lib.mjs) exports a list of { id, device, run(page) }.
// Usage: pnpm dev, then: node scripts/checks.mjs [filter,filter2]   (SHOTS_CHROMIUM=/path/to/chromium if needed,
// CHECKS_OUT=dir for a screenshot of each failure, CHECKS_TIMEOUT=ms)
import { readdirSync } from 'node:fs'
import { chromium } from 'playwright'

const filter = process.argv[2]
const dir = new URL('./checks/', import.meta.url)
const checks = []
for (const file of readdirSync(dir).filter(f => f.endsWith('.mjs') && f !== 'lib.mjs').sort()) {
  checks.push(...(await import(new URL(file, dir).href)).default)
}

const browser = await chromium.launch({ executablePath: process.env.SHOTS_CHROMIUM ?? undefined })
let failed = 0
for (const c of checks.filter(c => !filter || filter.split(',').some(f => c.id.toLowerCase().includes(f.toLowerCase())))) {
  const context = await browser.newContext({ ...c.device, locale: 'ru-RU', timezoneId: 'Europe/Moscow' })
  const page = await context.newPage()
  // CHECKS_TIMEOUT shortens Playwright's 30 s wait for a quick pass over many checks
  if (process.env.CHECKS_TIMEOUT) page.setDefaultTimeout(Number(process.env.CHECKS_TIMEOUT))
  try {
    await c.run(page)
    console.log(`pass  ${c.id}`)
  } catch (e) {
    failed++
    console.log(`FAIL  ${c.id}: ${e.message.split('\n')[0]}`)
    if (process.env.CHECKS_OUT) await page.screenshot({ path: `${process.env.CHECKS_OUT}/${c.id}.png` })
  }
  await context.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
