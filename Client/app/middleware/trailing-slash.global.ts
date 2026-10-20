// Static hosts serve /chat as the folder /chat/ with its index.html. Routes are compared without the slash
// (the current tab, leaving a screen closes its preview), so the address loses it before anything reads it.
import { defineNuxtRouteMiddleware, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/' || !to.path.endsWith('/')) return
  return navigateTo({ path: to.path.replace(/\/+$/, ''), query: to.query, hash: to.hash }, { replace: true })
})
