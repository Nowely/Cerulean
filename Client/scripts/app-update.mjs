// A new version of the app (option В) against two real builds, since the service worker is off under `pnpm dev`:
//   pnpm build && cp -r .output /tmp/A   # then mark B in app.vue: ;(window as any).__ver = 'B'
//   pnpm build && cp -r .output /tmp/B   # and take the mark back
//   node scripts/app-update.mjs /tmp     # SHOTS_CHROMIUM=/opt/pw-browsers/chromium in a cloud container
// The page's visibility is faked, so «hidden» stands for the app going to the background
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const DIR = process.argv[2]
const PORT = 4100
const URL = `http://localhost:${PORT}/`
const FIELD = { x: 150, y: 800 }
const FIELD_TEXT = { x: 70, y: 732 }

const sleep = ms => new Promise(r => setTimeout(r, ms))

let server
async function serve(build) {
  if (server) {
    server.kill()
    await new Promise(r => server.on('exit', r))
  }
  server = spawn('node', [`${DIR}/${build}/server/index.mjs`], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' })
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(URL)
      return
    } catch {
      await sleep(200)
    }
  }
}

function fakeVisibility() {
  let state = 'visible'
  Object.defineProperty(document, 'visibilityState', { get: () => state, configurable: true })
  Object.defineProperty(document, 'hidden', { get: () => state === 'hidden', configurable: true })
  window.__setVis = (v) => {
    state = v
    document.dispatchEvent(new Event('visibilitychange'))
  }
}

const version = p => p.evaluate(() => window.__ver ?? 'A')
const becomesB = p => p.waitForFunction(() => window.__ver === 'B', null, { timeout: 20000 }).catch(() => {})
const setVis = (p, v) => p.evaluate(s => window.__setVis(s), v)
const touch = p => p.keyboard.press('Shift')

async function lookForUpdate(p) {
  await p.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
  await p.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()).waiting, null, { timeout: 20000, polling: 300 })
}

async function type(p, text) {
  await p.mouse.click(FIELD.x, FIELD.y)
  await sleep(500)
  await p.keyboard.type(text)
}

const browser = await chromium.launch(process.env.SHOTS_CHROMIUM ? { executablePath: process.env.SHOTS_CHROMIUM } : {})

/** A phone with build A installed and in control */
async function installed() {
  await serve('A')
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(fakeVisibility)
  const p = await ctx.newPage()
  let loads = 0
  p.on('load', () => loads++)
  await p.goto(URL)
  await p.evaluate(() => navigator.serviceWorker.ready)
  await p.reload()
  await p.waitForFunction(() => !!navigator.serviceWorker.controller)
  await sleep(500)
  return { ctx, p, loads: () => loads }
}

const results = []
function result(name, ok) {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`)
}

// Back to the front after use: the new build switches before the person touches anything
{
  const { ctx, p } = await installed()
  await touch(p)
  await serve('B')
  await setVis(p, 'hidden')
  await setVis(p, 'visible')
  await becomesB(p)
  result('upd-front: coming back switches to the new build', (await version(p)) === 'B')
  await ctx.close()
}

// Found while in use: nothing reloads in front, unsent words hold it in the background, an empty field lets it go
{
  const { ctx, p, loads } = await installed()
  await touch(p)
  await serve('B')
  const before = loads()
  await lookForUpdate(p)
  await sleep(1000)
  result('upd-in-use: no reload while the app is in use', loads() === before && (await version(p)) === 'A')
  await type(p, 'молоко')
  await setVis(p, 'hidden')
  await sleep(1500)
  result('upd-typing: no reload in the background while typing', loads() === before && (await version(p)) === 'A')
  await setVis(p, 'visible')
  await p.evaluate(() => document.activeElement?.blur())
  await setVis(p, 'hidden')
  await sleep(2000)
  result('upd-unsent: unsent words in the field hold it', (await version(p)) === 'A')
  await setVis(p, 'visible')
  await p.mouse.click(FIELD_TEXT.x, FIELD_TEXT.y)
  await sleep(300)
  await p.keyboard.press('Control+A')
  await p.keyboard.press('Backspace')
  await p.evaluate(() => document.activeElement?.blur())
  await setVis(p, 'hidden')
  await becomesB(p)
  result('upd-hidden: an empty field in the background switches', (await version(p)) === 'B')
  await ctx.close()
}

// Opening the app with the old build cached: it switches right after it opens
{
  const { ctx, p } = await installed()
  await p.close()
  await serve('B')
  const q = await ctx.newPage()
  await q.goto(URL)
  const first = await version(q)
  await becomesB(q)
  result('upd-open: a cold start switches right away', first === 'A' && (await version(q)) === 'B')
  await ctx.close()
}

// Two tabs: the hidden one switches, the one being typed in keeps the old build until it is free
{
  const { ctx, p } = await installed()
  const q = await ctx.newPage()
  await q.goto(URL)
  await sleep(800)
  await touch(p)
  await touch(q)
  await type(q, 'хлеб')
  await serve('B')
  await lookForUpdate(p)
  await setVis(p, 'hidden')
  await becomesB(p)
  await sleep(1000)
  result('upd-tabs: the hidden tab switches', (await version(p)) === 'B')
  result('upd-tabs: the tab being typed in waits', (await version(q)) === 'A')
  await ctx.close()
}

await browser.close()
server.kill()
if (results.includes(false)) process.exit(1)
