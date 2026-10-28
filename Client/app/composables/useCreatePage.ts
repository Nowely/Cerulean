// «+» creates a page at once. iOS shows the keyboard only for a field focused inside the tap,
// so a hidden field takes focus first and hands it to the title once the page is on screen.
import { useRouter } from '#imports'
import type { Id, TemplateKey } from '~/domain/types'
import { useDataStore } from '~/stores/data'
import { useUiStore } from '~/stores/ui'
import { applyTemplate, TEMPLATES } from '~/domain/templates'
import { capitalize } from '~/domain/text'
import { useNotify } from './useNotify'

export const FOCUS_PROXY_ID = 'focus-proxy'

export function useCreatePage() {
  const data = useDataStore()
  const ui = useUiStore()
  const router = useRouter()
  const notify = useNotify()

  /**
   * Without a section the page goes to «Мои страницы». `stay`: a first-run template row makes the page
   * and stays on Главная, a toast says where it is and opens it.
   */
  function create(opts: { sectionId?: Id | null, template?: TemplateKey, stay?: boolean } = {}) {
    const page = data.createPage({ title: '', sectionId: opts.sectionId ?? null })
    if (opts.template) {
      data.updatePage(page.id, applyTemplate(page, opts.template))
      if (opts.stay) {
        const name = TEMPLATES.find(t => t.key === opts.template)?.name ?? page.title
        notify(`Страница ${name} создана в Моих страницах`, { label: 'Открыть', run: () => void router.push(`/p/${page.id}`) })
        return page
      }
    } else {
      document.getElementById(FOCUS_PROXY_ID)?.focus()
      ui.focusTitle = page.id
    }
    void router.push(`/p/${page.id}`)
    return page
  }

  /**
   * «Новая страница» in a places list (Josh 28 Oct, 8): a plain list, as «Начать с: Список» makes, in «Мои страницы»
   * where «+» puts one, named as typed with a capital first letter. A page of that name is that page: none is made
   */
  function list(name: string) {
    const title = capitalize(name)
    const low = title.toLowerCase()
    const same = data.livePages.find(p => (p.kind === 'page' || p.kind === 'inbox') && p.title.trim().toLowerCase() === low)
    return same ?? data.createPage({ title, glyph: 'list' })
  }

  return { create, list }
}
