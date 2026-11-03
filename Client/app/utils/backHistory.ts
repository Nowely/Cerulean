import type { RouterHistory } from 'vue-router'

const handlers = new WeakMap<RouterHistory, (to: string) => boolean>()

/** Intercept local layers after history state updates, before Router navigates. */
export function withBackLayers(history: RouterHistory): RouterHistory {
  const listen = history.listen
  history.listen = callback => listen((to, from, info) => {
    if (!handlers.get(history)?.(to)) callback(to, from, info)
  })
  return history
}

export function onBackPop(history: RouterHistory, handler: (to: string) => boolean) {
  handlers.set(history, handler)
  return () => handlers.delete(history)
}
