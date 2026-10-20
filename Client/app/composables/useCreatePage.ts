// «+» creates a page at once. iOS shows the keyboard only for a field focused inside the tap,
// so a hidden field takes focus first and hands it to the title once the page is on screen.
import { useRouter } from '#imports'
import type { Id, TemplateKey } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { applyTemplate } from '~/domain/templates'

export const FOCUS_PROXY_ID = 'focus-proxy'

export function useCreatePage() {
  const data = useDataStore()
  const ui = useUiStore()
  const router = useRouter()

  function create(opts: { sectionId?: Id | null, template?: TemplateKey } = {}) {
    const page = data.createPage({ title: '', sectionId: opts.sectionId ?? null })
    if (opts.template) {
      data.updatePage(page.id, applyTemplate(page, opts.template))
    } else {
      document.getElementById(FOCUS_PROXY_ID)?.focus()
      ui.focusTitle = page.id
    }
    void router.push(`/p/${page.id}`)
    return page
  }

  return { create }
}
