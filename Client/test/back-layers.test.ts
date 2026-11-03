import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { createRouter, type Router, type RouterHistory, type HistoryState } from 'vue-router'
import { useBackHistory, useBackLayer } from '../app/composables/useBackLayer'
import { withBackLayers } from '../app/utils/backHistory'

const current = vi.hoisted(() => ({ router: null as Router | null }))
vi.mock('#imports', () => ({ useRouter: () => current.router }))

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.reverse().forEach(scope => scope.stop())
  scopes.length = 0
  vi.unstubAllGlobals()
})

const tick = () => new Promise(resolve => setTimeout(resolve, 10))

async function setup() {
  type Listener = Parameters<RouterHistory['listen']>[0]
  const listeners = new Set<Listener>()
  const entries: { path: string, state: HistoryState }[] = [{ path: '/', state: { position: 0 } }]
  let position = 0
  const history = withBackLayers({
    base: '',
    createHref: path => path,
    listen(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    destroy() {
      listeners.clear()
    },
    get location() { return entries[position]!.path },
    get state() { return entries[position]!.state },
    push(path: string, state?: HistoryState) {
      entries.splice(position + 1)
      entries.push({ path, state: { ...state, position: ++position } })
    },
    replace(path: string, state?: HistoryState) {
      entries[position] = { path, state: { ...state, position } }
      // Native replaceState preserves Forward. Vue Router's SSR memory history
      // truncates it, so it cannot model this browser-history regression.
    },
    go(delta: number, trigger = true) {
      // Native traversals deliver separate tasks, with microtasks between pops.
      setTimeout(() => {
        const next = Math.max(0, Math.min(entries.length - 1, position + delta))
        if (next === position) return
        const actual = next - position
        const from = entries[position]!.path
        position = next
        if (trigger) {
          const info = { type: 'pop', delta: actual, direction: actual < 0 ? 'back' : 'forward' } as Parameters<Listener>[2]
          for (const listener of listeners) listener(entries[position]!.path, from, info)
        }
      }, 0)
    }
  })
  const router = createRouter({ history, routes: ['/', '/page', '/record'].map(path => ({ path, component: {} })) })
  current.router = router
  await router.push('/')
  let scope = effectScope()
  scopes.push(scope)
  scope.run(useBackHistory)
  await router.push('/page')
  function layer(order = 1, keep = false) {
    const active = ref(false)
    const close = vi.fn(() => {
      active.value = false
    })
    scope.run(() => useBackLayer(() => active.value, close, order, () => keep))
    return { active, close }
  }
  function reload() {
    scope.stop()
    scope = effectScope()
    scopes.push(scope)
    scope.run(useBackHistory)
  }
  return { router, history, layer, reload }
}

describe('system Back layers', () => {
  it('closes places before the field, then returns to the previous route', async () => {
    const { router, history, layer } = await setup()
    const navigate = vi.fn(() => undefined)
    router.beforeEach(navigate)
    const places = layer()
    const field = layer(0)
    places.active.value = true
    field.active.value = true
    await tick()
    history.go(-1)
    await tick()
    expect(places.active.value).toBe(false)
    expect(field.active.value).toBe(true)
    expect(router.currentRoute.value.path).toBe('/page')
    expect(navigate).not.toHaveBeenCalled()
    history.go(-1)
    await tick()
    expect(field.close).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/page')
    expect(navigate).not.toHaveBeenCalled()
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('removes the layer entry on outside close', async () => {
    const { router, history, layer } = await setup()
    const menu = layer()
    menu.active.value = true
    await tick()
    menu.active.value = false
    await tick()
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('serializes close followed immediately by navigation', async () => {
    const { router, history, layer } = await setup()
    const menu = layer()
    menu.active.value = true
    await tick()
    menu.active.value = false
    await router.push('/record')
    expect(router.currentRoute.value.path).toBe('/record')
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/page')
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('replaces a closed picker with its editor without a dead picker entry', async () => {
    const { router, history, layer } = await setup()
    const picker = layer()
    const editor = layer()
    picker.active.value = true
    await tick()
    picker.active.value = false
    editor.active.value = true
    await tick()
    history.go(-1)
    await tick()
    expect(editor.active.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/page')
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('does not replay a closed action on Forward', async () => {
    const { history, layer } = await setup()
    const menu = layer()
    menu.active.value = true
    await tick()
    history.go(-1)
    await tick()
    const base = history.state.position
    history.go(1)
    await tick()
    expect(history.state.position).toBe(base)
    expect(menu.active.value).toBe(false)
    expect(menu.close).toHaveBeenCalledOnce()
  })

  it('handles two consecutive Back events without undoing the route traversal', async () => {
    const { router, history, layer } = await setup()
    const menu = layer()
    menu.active.value = true
    await tick()
    history.go(-1)
    history.go(-1)
    await tick()
    expect(menu.active.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.listening).toBe(true)
  })

  it('cleans up all nested levels when their parent closes', async () => {
    const { router, history, layer } = await setup()
    const parent = layer()
    const child = layer(2)
    const grandchild = layer(3)
    parent.active.value = true
    child.active.value = true
    grandchild.active.value = true
    await tick()
    parent.active.value = false
    await tick()
    expect(child.active.value).toBe(false)
    expect(grandchild.active.value).toBe(false)
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('cleans up an open layer before route replace', async () => {
    const { router, history, layer } = await setup()
    const menu = layer()
    menu.active.value = true
    await tick()
    await router.replace('/record')
    expect(menu.active.value).toBe(false)
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('keeps a reopen requested while explicit close is traversing history', async () => {
    const { router, history, layer } = await setup()
    const menu = layer()
    menu.active.value = true
    await tick()
    menu.active.value = false
    await Promise.resolve()
    menu.active.value = true
    await tick()
    expect(menu.active.value).toBe(true)
    history.go(-1)
    await tick()
    expect(menu.active.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/page')
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it.each([1, 3])('unwinds %i stale layers on reload without navigating or losing the route below', async (depth) => {
    const { router, history, layer, reload } = await setup()
    const base = history.state.position
    const navigate = vi.fn(() => undefined)
    router.beforeEach(navigate)
    for (let n = 0; n < depth; n++) layer(n).active.value = true
    await tick()
    reload()
    await tick()
    expect(history.state.position).toBe(base)
    expect(router.currentRoute.value.path).toBe('/page')
    expect(navigate).not.toHaveBeenCalled()
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
    history.go(1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/page')
    expect(history.state.position).toBe(base)
  })

  it('unwinds stale generations stacked by older versions and ignores them on Forward', async () => {
    const { router, history, reload } = await setup()
    const base = history.state.position
    history.push('/page', { ceruleanLayers: { owner: 'old', ids: [1] } })
    history.push('/page', { ceruleanLayers: { owner: 'old', ids: [1, 2] } })
    history.push('/page', { ceruleanLayers: { owner: 'later', ids: [1] } })
    reload()
    await tick()
    expect(history.state.position).toBe(base)
    history.go(3)
    await tick()
    expect(history.state.position).toBe(base)
    expect(router.currentRoute.value.path).toBe('/page')
    await router.push('/record')
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/page')
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('keeps the desktop field across route push, then closes it before route Back', async () => {
    const { router, history, layer } = await setup()
    const field = layer(0, true)
    field.active.value = true
    await tick()
    await router.push('/record')
    await tick()
    expect(field.active.value).toBe(true)
    expect(field.close).not.toHaveBeenCalled()
    history.go(-1)
    await tick()
    expect(field.active.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/record')
    history.go(-1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/page')
    history.go(1)
    await tick()
    expect(router.currentRoute.value.path).toBe('/record')
  })

  it('keeps the desktop field if a route guard cancels the navigation', async () => {
    const { router, history, layer } = await setup()
    const field = layer(0, true)
    field.active.value = true
    await tick()
    router.beforeEach(() => false)
    await router.push('/record')
    await tick()
    expect(field.active.value).toBe(true)
    expect(field.close).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/page')
    history.go(-1)
    await tick()
    expect(field.active.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/page')
  })
})
