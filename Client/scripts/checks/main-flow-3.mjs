import { BASE, DESKTOP, MOBILE, expect, open, store } from './lib.mjs'
import { goPage, write } from './main-flow.mjs'

async function recentExpansion(page) {
  await open(page, '/', false)
  const fixture = await store(page, async (data) => {
    const made = ['Ремонт', 'Подарки', 'Книги'].map(title => data.createPage({ title }))
    const section = data.createSection('Дом')
    data.createPage({ title: 'Дела по дому', sectionId: section.id })
    await data.flush()
    return { target: made[0].id, section: section.id }
  })
  const section = page.locator('section[aria-labelledby="cap-recent"]')
  const more = section.getByRole('button', { name: 'Ещё 2', exact: true })
  const less = section.getByRole('button', { name: 'Свернуть', exact: true })
  await more.waitFor()
  expect(await section.locator('[data-name]').count() === 5, 'initially «Мои страницы» does not show five rows')
  await more.click()
  await store(page, data => data.flush())
  await less.waitFor()
  expect(await section.locator('[data-name]').count() === 7, 'expanding «Ещё» does not show seven rows')

  await page.goto(`${BASE}/p/${fixture.target}`)
  await page.waitForSelector('main')
  await page.goBack()
  await less.waitFor()
  expect(await section.locator('[data-name]').count() === 7, 'navigation lost the expanded state')

  await page.reload()
  await less.waitFor()
  expect(await section.locator('[data-name]').count() === 7, 'reload lost the expanded state')
  await less.click()
  await store(page, data => data.flush())
  await more.waitFor()
  await page.reload()
  await more.waitFor()
  expect(await section.locator('[data-name]').count() === 5, 'reload lost the collapsed state')

  const homeSection = page.locator(`section[aria-labelledby="cap-${fixture.section}"]`)
  const homeCaption = homeSection.locator('h2 button')
  await homeCaption.click()
  await store(page, data => data.flush())
  await page.reload()
  await homeCaption.waitFor()
  expect(await homeCaption.getAttribute('aria-expanded') === 'false', 'the «Дом» section lost its fold')
  await more.waitFor()
}

export default [
  { id: 'mf3-1-recent-expansion-phone', device: MOBILE, run: recentExpansion },
  { id: 'mf3-1-recent-expansion-desktop', device: DESKTOP, run: recentExpansion },
  ...[MOBILE, DESKTOP].flatMap((device, index) => ['light', 'dark'].map(colorScheme => ({
    id: `mf3-4-bare-home-glyph-${index ? 'desktop' : 'phone'}-${colorScheme}`,
    device: { ...device, colorScheme },
    run: async (page) => {
      await open(page, '/', false)
      const glyphs = page.locator('[data-home] [data-home-glyph]')
      await glyphs.first().waitFor()
      const shapes = await glyphs.evaluateAll(items => items.map((item) => {
        const slot = item.getBoundingClientRect()
        const icon = item.firstElementChild.getBoundingClientRect()
        return { width: slot.width, icon: icon.width, bg: getComputedStyle(item).backgroundColor }
      }))
      expect(shapes.every(s => s.width === 24 && s.icon === 22 && s.bg === 'rgba(0, 0, 0, 0)'), `glyphs: ${JSON.stringify(shapes)}`)
      await store(page, data => data.setSettings({ homeRows: 'compact' }))
      expect(await glyphs.count() === 0, 'the compact rows retained the summary glyph slot')
      const compact = await page.locator('[data-home] [role="listitem"] a > span').first().evaluate(e => e.getBoundingClientRect().width)
      expect(compact === 18, `compact glyph slot: ${compact}`)
    }
  }))),
  ...[MOBILE, DESKTOP].flatMap((device, index) => ['light', 'dark'].map(colorScheme => ({
    id: `mf3-5-surfaces-${index ? 'desktop' : 'phone'}-${colorScheme}`,
    device: { ...device, colorScheme },
    run: async (page) => {
      await open(page, '/', false)
      const home = page.locator('[data-home]')
      await home.waitFor()
      const homeColor = colorScheme === 'light' ? 'rgb(241, 241, 239)' : 'rgb(11, 18, 22)'
      const paper = colorScheme === 'light' ? 'rgb(252, 252, 251)' : 'rgb(22, 31, 38)'
      const surfaces = await home.evaluate((el) => {
        const screen = el.parentElement.parentElement
        return {
          screen: getComputedStyle(screen).backgroundColor,
          caption: getComputedStyle(el.querySelector('section > div')).backgroundColor
        }
      })
      expect(surfaces.screen === homeColor && surfaces.caption === homeColor, `home surfaces: ${JSON.stringify(surfaces)}`)
      await goPage(page, 'Покупки')
      const content = await page.locator('main').evaluate((el) => {
        for (let node = el; node; node = node.parentElement) {
          const bg = getComputedStyle(node).backgroundColor
          if (bg !== 'rgba(0, 0, 0, 0)') return bg
        }
        return ''
      })
      expect(content === paper, `page background: ${content}`)
    }
  }))),
  { id: 'mf3-6-new-records-last', device: MOBILE, run: async (page) => {
    await open(page, '/', false)
    await store(page, async (data) => {
      const shop = data.livePages.find(p => p.title === 'Покупки')
      const dept = shop.props.find(p => p.type === 'select')
      const milk = dept.options.find(o => o.name === 'Молочное')
      data.addRecord({ pageId: shop.id, text: 'Сыр', order: 0, values: { [dept.id]: milk.id } })
      data.addRecord({ pageId: shop.id, text: 'Яйца', order: 1, values: { [dept.id]: milk.id } })
      await data.flush()
    })
    await goPage(page, 'Покупки')
    const names = () => page.locator('[data-rows] [data-row-text]').allInnerTexts().then(rows => rows.map(row => row.split('\n')[0].trim()))
    await write(page, 'Молоко')
    expect(JSON.stringify(await names()) === JSON.stringify(['Сыр', 'Яйца', 'Молоко']), `field order: ${await names()}`)
    await page.locator('[data-add-row]').click()
    await page.locator('[data-add-line] input').fill('Кефир')
    await page.locator('[data-add-line] input').press('Enter')
    expect(JSON.stringify(await names()) === JSON.stringify(['Сыр', 'Яйца', 'Молоко', 'Кефир']), `add row order: ${await names()}`)
  } },
  { id: 'mf3-6-inbox-last-tint-reveal', device: MOBILE, run: async (page) => {
    await open(page, '/', false)
    await store(page, async (data) => {
      for (let i = 0; i < 30; i++) data.addRecord({ pageId: data.inbox.id, text: `Старая запись ${i + 1}`, order: i, addedAt: Date.now() - 10000 })
      await data.flush()
    })
    await goPage(page, 'Входящие')
    await write(page, 'Позвонить в сервис')
    const names = page.locator('[data-rows] [data-row-text]')
    const last = names.last()
    expect((await last.innerText()).replace(/\s+/g, ' ').startsWith('Позвонить в сервис'), `last row: ${await last.innerText()}`)
    const row = last.locator('xpath=ancestor::*[contains(@class,"group/row")][1]')
    expect(await row.evaluate(el => el.classList.contains('fresh-tint')), 'the new record has no fresh tint')
    const visible = await last.evaluate((el) => {
      const viewport = el.closest('.scroll-fade').getBoundingClientRect()
      const bounds = el.getBoundingClientRect()
      return bounds.top >= viewport.top && bounds.bottom <= viewport.bottom
    })
    expect(visible, 'the new record was not scrolled into view')
  } },
  { id: 'mf3-7-shopping-departments', device: MOBILE, run: async (page) => {
    await open(page, '/', false)
    await goPage(page, 'Покупки')
    const headings = () => page.locator('[data-rows] h3').allInnerTexts()
    await write(page, 'Хлеб')
    expect((await headings()).length === 0, `one department has captions: ${await headings()}`)
    await write(page, 'Молоко')
    const two = await headings()
    expect(two.some(t => t.includes('Хлеб и выпечка')) && two.some(t => t.includes('Молочное')), `departments: ${two}`)
    await page.locator('[data-rows] h3').filter({ hasText: 'Хлеб и выпечка' }).getByRole('button').click()
    await page.getByRole('checkbox', { name: 'Отметить «Молоко»' }).click()
    await page.waitForFunction(() => document.querySelectorAll('[data-rows] h3').length === 0)
    expect(await page.locator('[data-rows] [data-row-text]').filter({ hasText: 'Хлеб' }).isVisible(), 'the only remaining department is still folded')
  } }
]
