// Helpers the check modules share: open a screen, send a line, read the data store, wait for something
import { devices } from 'playwright'

export const BASE = process.env.SHOTS_BASE ?? 'http://localhost:3000'
export const MOBILE = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }
export const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }

export async function open(page, path, demo = true) {
  await page.goto(`${BASE}${path}${demo ? `${path.includes('?') ? '&' : '?'}demo` : ''}`)
  await page.waitForSelector('main', { timeout: 15000 })
  await page.waitForTimeout(500)
}

export async function send(page, text) {
  const field = page.getByRole('textbox', { name: 'Новая запись' })
  await field.fill(text)
  await page.keyboard.press('Enter')
  await field.blur()
  await page.waitForTimeout(500)
}

/** The data store, read in the page */
export function store(page, fn, arg) {
  return page.evaluate(([src, a]) => {
    const data = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('data')
    return new Function('data', 'a', `return (${src})(data, a)`)(data, a)
  }, [fn.toString(), arg])
}

export const pageOf = (page, text) => store(page, (data, t) => {
  const r = Object.values(data.records).find(x => x.text.toLowerCase() === t && !x.deletedAt)
  return r ? data.pages[r.pageId]?.title : null
}, text)

/** Waits up to 5 s for something to be on screen */
export const shows = locator => locator.first().waitFor({ timeout: 5000 }).then(() => true, () => false)

export function expect(ok, why) {
  if (!ok) throw new Error(why)
}
