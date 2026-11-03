import type { Id, Page } from './types'

/** Imported positions belong to their own slots until a later drag writes a new order. */
export type HomePosition = NonNullable<Page['homeOrder']>

/** Versioned group ids share a batch prefix; older group ids remain independent. */
export function homeImportBatch(group: string): string {
  const match = /^home-import-v1:(\d{16}):([^:]+):/.exec(group)
  return match ? `1:${match[1]}:${match[2]}` : `0:${group}`
}

/** Unmarked pages keep their legacy slots; each import batch follows what was already here. */
export function homeOrder(pages: Page[], sectionId: Id | null): Page[] {
  const hasPosition = (p: Page) => p.kind === 'page' && p.homeOrder?.sectionId === sectionId && Number.isFinite(p.homeOrder.position)
  const isImported = (p: Page) => hasPosition(p) && !!p.homeOrder?.importGroup
  const local = pages.filter(p => !isImported(p))
  const front = sectionId === null
    ? local.filter(p => hasPosition(p) && p.homeOrder!.position < 0)
        .sort((a, b) => a.homeOrder!.position - b.homeOrder!.position)
    : []
  const first = new Set(front.map(p => p.id))
  const rest = local.filter(p => !first.has(p.id))
  const groupOf = (p: Page) => p.homeOrder?.importGroup
  const ordered = (list: Page[]) => {
    const groups = new Map<string | undefined, Page[]>()
    for (const page of list.filter(hasPosition)) {
      const group = groupOf(page)
      const items = groups.get(group)
      if (items) items.push(page)
      else groups.set(group, [page])
    }
    for (const group of groups.values()) group.sort((a, b) => a.homeOrder!.position - b.homeOrder!.position)
    const offsets = new Map<string | undefined, number>()
    return list.map((p) => {
      if (!hasPosition(p)) return p
      const group = groupOf(p)
      const index = offsets.get(group) ?? 0
      offsets.set(group, index + 1)
      return groups.get(group)![index]!
    })
  }
  const batches = new Map<string, Page[]>()
  for (const page of pages.filter(isImported)) {
    const batch = homeImportBatch(page.homeOrder!.importGroup!)
    const items = batches.get(batch)
    if (items) items.push(page)
    else batches.set(batch, [page])
  }
  return [...front, ...ordered(rest), ...[...batches.keys()].sort().flatMap(batch => ordered(batches.get(batch)!))]
}
