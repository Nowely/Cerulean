import { DESKTOP, MOBILE, expect, open } from './lib.mjs'

async function check(page) {
  await open(page, '/', false)
  await page.locator('section[aria-labelledby="cap-recent"]').getByRole('button', { name: 'Новая страница', exact: true }).click()
  await page.waitForURL(/\/p\//)
  await page.locator('[data-starters]').getByRole('button', { name: 'Список покупок', exact: true }).click()
  await page.locator('main').getByRole('button', { name: 'Действия со страницей', exact: true }).first().click()
  const settingsAction = page.viewportSize().width >= 900
    ? page.getByRole('menuitem', { name: 'Настроить вид', exact: true })
    : page.getByRole('dialog').getByRole('button', { name: 'Настроить вид', exact: true })
  await settingsAction.click()
  const settings = page.getByRole('dialog', { name: 'Настроить вид' })
  await settings.waitFor()
  const left = settings.getByRole('switch', { name: 'Осталось', exact: true })
  expect(await left.getAttribute('aria-checked') === 'true', 'the shopping template does not show «Осталось» in the row')
}

export default [
  { id: 'mf3-stock-template-phone', device: MOBILE, run: check },
  { id: 'mf3-stock-template-desktop', device: DESKTOP, run: check }
]
