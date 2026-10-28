// Превью: a page or record opened from a link keeps your place. It lives in the URL (?peek=r:<id>),
// so the system back gesture closes it like any other step. A computer has no preview panel: it opens the page or the
// record on the right, in place of what is there, and «‹» comes back (computer delta, item 16).
import { computed } from 'vue'
import { useRoute, useRouter } from '#imports'
import type { Id } from '~/domain/types'
import { useScreen } from '~/composables/useScreen'

export type Target = { kind: 'page', id: Id } | { kind: 'record', id: Id }

export function encodeTarget(t: Target): string {
  return `${t.kind === 'page' ? 'p' : 'r'}:${t.id}`
}

export function decodeTarget(v: unknown): Target | null {
  if (typeof v !== 'string') return null
  const [k, id] = v.split(':')
  if (!id) return null
  return k === 'p' ? { kind: 'page', id } : k === 'r' ? { kind: 'record', id } : null
}

export function pathOf(t: Target): string {
  return t.kind === 'page' ? `/p/${t.id}` : `/r/${t.id}`
}

export function usePeek() {
  const route = useRoute()
  const router = useRouter()
  const target = computed(() => decodeTarget(route.query.peek))
  const { isDesktop } = useScreen()

  function peek(t: Target) {
    if (isDesktop.value) return void router.push(pathOf(t))
    const query = { ...route.query, peek: encodeTarget(t) }
    // Swapping one preview for another does not stack history
    if (route.query.peek) void router.replace({ query })
    else void router.push({ query })
  }

  function close() {
    if (!route.query.peek) return
    if (window.history.state?.back) router.back()
    else {
      const { peek: _, ...query } = route.query
      void router.replace({ query })
    }
  }

  /** «Открыть»: the full page replaces the preview */
  function open(t: Target) {
    void router.replace(pathOf(t))
  }

  return { target, peek, close, open }
}
