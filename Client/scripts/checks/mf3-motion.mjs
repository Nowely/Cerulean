import { DESKTOP, MOBILE, expect, open } from './lib.mjs'
import { goPage, write } from './main-flow.mjs'

async function observe(page) {
  await page.evaluate(() => {
    window.motionEvents = []
    for (const type of ['animationstart', 'transitionrun']) {
      document.addEventListener(type, (event) => {
        const el = event.target
        if (!(el instanceof HTMLElement)) return
        const animations = el.getAnimations().map(animation => ({
          name: animation.animationName || animation.transitionProperty,
          duration: animation.effect.getTiming().duration,
          frames: animation.effect.getKeyframes()
        }))
        window.motionEvents.push({ type, className: el.className, animations })
      })
    }
  })
}

async function events(page) {
  return page.evaluate(() => window.motionEvents)
}

function animationFor(log, name) {
  return log.flatMap(event => event.animations).find(animation => animation.name === name)
}

async function motion(page, desktop, reduced) {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await open(page, '/', false)
  await goPage(page, 'Покупки')
  await observe(page)
  await write(page, 'Проверка движения', undefined, desktop ? 'Покупки' : undefined)
  await page.getByRole('button', { name: 'Проверка движения', exact: true }).waitFor()
  let log = await events(page)
  const row = animationFor(log, 'mf3-row-enter')
  if (reduced) expect(!row, 'new row animated with reduced motion')
  else {
    expect(row?.duration === 150, `new row animation: ${JSON.stringify(row)}`)
    expect(row.frames[0].transform === 'translateY(4px)' && row.frames[0].opacity === '0', `new row keyframes: ${JSON.stringify(row.frames)}`)
  }

  if (!desktop) {
    await page.getByRole('link', { name: 'Главная' }).first().click()
    await page.waitForURL(url => url.pathname === '/')
  }
  const caption = page.locator('section[aria-labelledby="cap-recent"] h2 button')
  const chevronDuration = await caption.locator('.iconify').first().evaluate(el => getComputedStyle(el).transitionDuration)
  expect(reduced ? parseFloat(chevronDuration) < 0.001 : chevronDuration === '0.15s', `chevron duration: ${chevronDuration}`)
  await caption.click()
  await page.waitForTimeout(220)
  log = await events(page)
  const fold = log.find(event => event.type === 'transitionrun' && event.className.includes('mf3-fold-leave-active'))
  if (reduced) expect(!fold, 'fold animated with reduced motion')
  else expect(fold?.animations.some(a => a.name === 'opacity' && a.duration === 120), `fold animation: ${JSON.stringify(fold)}`)
  await caption.click()
  await page.waitForTimeout(220)
  log = await events(page)
  const unfold = log.find(event => event.type === 'transitionrun' && event.className.includes('mf3-fold-enter-active'))
  if (reduced) expect(!unfold, 'unfold animated with reduced motion')
  else expect(unfold?.animations.some(a => a.name === 'opacity' && a.duration === 120), `unfold animation: ${JSON.stringify(unfold)}`)

  await page.evaluate(() => {
    const ui = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('ui')
    ui.notice = { id: 100001, title: 'Проверка уведомления', duration: 5000 }
  })
  const notice = page.locator('[data-notice]').filter({ hasText: 'Проверка уведомления' })
  await notice.waitFor()
  await page.waitForTimeout(220)
  log = await events(page)
  const enter = log.find(event => event.type === 'transitionrun' && event.className.includes('mf3-notice-enter-active'))
  if (reduced) expect(!enter, 'notice entrance animated with reduced motion')
  else {
    expect(enter?.animations.some(a => a.name === 'opacity' && a.duration === 150), `notice entrance: ${JSON.stringify(enter)}`)
    const slide = enter.animations.find(a => a.name === 'transform')
    expect(slide?.frames[0].transform.includes('8'), `notice rise: ${JSON.stringify(slide)}`)
  }
  await page.evaluate(() => {
    document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('ui').notice = {
      id: 100002, title: 'Новое уведомление', duration: 5000
    }
  })
  const replacement = page.locator('[data-notice]').filter({ hasText: 'Новое уведомление' })
  await replacement.waitFor()
  expect(await page.locator('[data-notice]').count() === 1, 'replacing a notice left two active notices')
  await page.evaluate(() => {
    document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('ui').notice = null
  })
  if (!reduced) {
    await page.waitForFunction(() => document.querySelector('.mf3-notice-leave-active')?.inert)
    await page.waitForTimeout(220)
    log = await events(page)
    const leave = log.find(event => event.type === 'transitionrun' && event.className.includes('mf3-notice-leave-active'))
    expect(leave?.animations.some(a => a.name === 'opacity' && a.duration === 150), `notice exit: ${JSON.stringify(leave)}`)
  }
  await replacement.waitFor({ state: 'detached' })
}

export default [MOBILE, DESKTOP].flatMap((device, index) => [false, true].map(reduced => ({
  id: `mf3-motion-${index ? 'desktop' : 'phone'}-${reduced ? 'reduced' : 'normal'}`,
  device,
  run: page => motion(page, !!index, reduced)
})))
