import { onScopeDispose, watch } from 'vue'
import { useRouter } from '#imports'
import type { Router } from 'vue-router'
import { onBackPop } from '../utils/backHistory'

type Layer = { id: number, active: () => boolean, close: () => void, order: number, keep: () => boolean }
type Marker = { owner: string, ids: number[] }
const KEY = 'ceruleanLayers'
const coordinators = new WeakMap<Router, ReturnType<typeof createCoordinator>>()

function marker(state: unknown): Marker | undefined {
  const value = (state as Record<string, unknown> | null)?.[KEY] as Marker | undefined
  const position = (state as Record<string, unknown> | null)?.position
  return value && typeof value.owner === 'string' && Array.isArray(value.ids)
    && value.ids.length > 0 && value.ids.every(id => Number.isSafeInteger(id) && id > 0)
    && new Set(value.ids).size === value.ids.length
    && typeof position === 'number' && value.ids.length <= position
    ? value
    : undefined
}

function createCoordinator(router: Router) {
  const history = router.options.history
  let owner = crypto.randomUUID()
  let sequence = 0
  let stack: Layer[] = []
  const wanted = new Map<number, Layer>()
  let applying = false
  let queued = false
  let pending: Promise<void> | null = null
  let finish: (() => void) | undefined
  let popRoute: string | undefined
  let retained: Layer[] = []
  let disposed = false

  function travel(count: number) {
    pending ??= new Promise<void>((resolve) => {
      finish = resolve
    })
    history.go(count)
    return pending
  }

  function close(layers: Layer[]) {
    applying = true
    try {
      for (const layer of [...layers].reverse()) {
        wanted.delete(layer.id)
        layer.close()
      }
    } finally {
      applying = false
    }
  }

  async function reconcile() {
    if (pending) await pending
    if (disposed) return
    const first = stack.findIndex(layer => !wanted.has(layer.id))
    if (first !== -1) {
      close(stack.slice(first))
      await travel(first - stack.length)
    }
    if (disposed) return
    const additions = [...wanted.values()].filter(layer => !stack.includes(layer)).sort((a, b) => a.order - b.order || a.id - b.id)
    for (const layer of additions) {
      stack.push(layer)
      history.push(history.location, { [KEY]: { owner, ids: stack.map(item => item.id) } })
    }
  }

  function schedule() {
    if (queued || applying || disposed) return
    queued = true
    queueMicrotask(() => {
      queued = false
      void reconcile()
    })
  }

  function pop(path: string) {
    const target = marker(history.state)
    // The UI that owned these entries no longer exists (reload, or a previous
    // route). Each marker records exactly how many same-URL entries it added.
    // Keep one pending traversal while unwinding older generations as well.
    if (target && target.owner !== owner) {
      if (!pending) close([...wanted.values()])
      stack = []
      void travel(-target.ids.length)
      return true
    }
    const local = path === router.currentRoute.value.fullPath && (stack.length > 0 || target?.owner === owner || pending)
    if (!local) {
      popRoute = path
      close([...wanted.values()])
      stack = []
      owner = crypto.randomUUID()
      const resolve = finish
      finish = undefined
      pending = null
      resolve?.()
      return false
    }

    const ids = target?.owner === owner ? target.ids : []
    const prefix = ids.every((id, index) => stack[index]?.id === id)
    if (prefix) {
      // An explicit close already ran before travel(). Do not erase a new open
      // request made while that asynchronous traversal was still in flight.
      if (!pending) close(stack.slice(ids.length))
      stack = stack.slice(0, ids.length)
    }
    const resolve = finish
    finish = undefined
    pending = null
    resolve?.()
    // Closed transient UI cannot be replayed safely: Forward returns to the
    // live prefix instead of exposing a dead Back entry or replaying an action.
    if (!prefix) {
      close(stack)
      stack = []
      if (ids.length) void travel(-ids.length)
    }
    return true
  }
  const removePop = onBackPop(history, pop)

  const removeGuard = router.beforeEach(async (to) => {
    if (popRoute === to.fullPath) {
      popRoute = undefined
      return
    }
    if (pending) await pending
    if (stack.length) {
      retained = stack.filter(layer => layer.keep() && layer.active())
      close(stack.filter(layer => !retained.includes(layer)))
      for (const layer of retained) wanted.delete(layer.id)
      await travel(-stack.length)
    }
  })
  const removeAfter = router.afterEach((_to, _from, failure) => {
    popRoute = undefined
    if (!failure) {
      owner = crypto.randomUUID()
      // Router.replace preserves custom history state from the previous entry.
      history.replace(history.location, { [KEY]: null })
    }
    for (const layer of retained) {
      if (layer.active()) wanted.set(layer.id, layer)
    }
    retained = []
    schedule()
  })

  const stale = marker(history.state)
  if (stale) void travel(-stale.ids.length)

  return {
    register(active: () => boolean, close: () => void, order: number, keep: () => boolean) {
      const layer: Layer = { id: ++sequence, active, close, order, keep }
      return {
        set(active: boolean) {
          if (active) wanted.set(layer.id, layer)
          else wanted.delete(layer.id)
          schedule()
        },
        dispose() {
          wanted.delete(layer.id)
          retained = retained.filter(item => item !== layer)
          schedule()
        }
      }
    },
    dispose() {
      disposed = true
      removePop()
      removeGuard()
      removeAfter()
      coordinators.delete(router)
      finish?.()
    }
  }
}

function coordinator(router: Router) {
  let value = coordinators.get(router)
  if (!value) {
    value = createCoordinator(router)
    coordinators.set(router, value)
  }
  return value
}

/** Install once in the shell, before its children register their layers. */
export function useBackHistory() {
  const value = coordinator(useRouter())
  onScopeDispose(value.dispose)
}

/** Lower order is beneath popovers; keep preserves a shared field across route push/replace. */
export function useBackLayer(active: () => boolean, close: () => void, order = 1, keep = () => false) {
  const layer = coordinator(useRouter()).register(active, close, order, keep)
  watch(active, layer.set, { immediate: true, flush: 'sync' })
  onScopeDispose(layer.dispose)
}
