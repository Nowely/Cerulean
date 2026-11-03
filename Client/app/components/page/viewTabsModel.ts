import type { Layout, ViewDef } from '~/domain/types'
import { listView, nameForLayout } from '~/domain/templates'

export function insertView(views: ViewDef[], current: ViewDef, layout: Layout) {
  const view = listView(nameForLayout(views, layout), {
    layout,
    filter: current.filter.filter(rule => rule.field === 'done').map(rule => ({ ...rule }))
  })
  const index = views.findIndex(v => v.id === current.id)
  const at = index < 0 ? views.length : index + 1
  return { view, views: [...views.slice(0, at), view, ...views.slice(at)] }
}
