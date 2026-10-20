// Export and import: the only way data moves between devices. The model key never goes into a file.
import type { ConnectionField, Entry, Page, Rec, Section, Settings } from './types'
import type { Learned } from './rules'
import { formatDue } from './dates'

export interface Snapshot {
  app: 'cerulean'
  version: 1
  exportedAt: number
  pages: Page[]
  records: Rec[]
  sections: Section[]
  entries: Entry[]
  settings: Omit<Settings, ConnectionField>
  learned: Learned
}

export function toJSON(data: Omit<Snapshot, 'app' | 'version' | 'exportedAt'>, now = Date.now()): string {
  const snapshot: Snapshot = { app: 'cerulean', version: 1, exportedAt: now, ...data }
  return JSON.stringify(snapshot, null, 2)
}

/** Readable copy: one heading per page, records as a checklist with subitems and notes */
export function toMarkdown(pages: Page[], records: Rec[], sections: Section[], now = Date.now()): string {
  const out: string[] = ['# Cerulean', '']
  const live = records.filter(r => !r.deletedAt)
  const groups: { name: string, pages: Page[] }[] = [
    { name: '', pages: pages.filter(p => !p.sectionId) },
    ...sections.map(s => ({ name: s.name, pages: pages.filter(p => p.sectionId === s.id) }))
  ]
  const line = (r: Rec, page: Page, depth: number) => {
    const mark = page.hasDone || depth > 0 ? (r.done ? '- [x] ' : '- [ ] ') : '- '
    const due = r.due ? ` (${formatDue(r.due, now)})` : ''
    const values = page.props
      .map((p) => {
        const v = r.values[p.id]
        if (v === null || v === undefined || v === '') return ''
        const text = p.type === 'select' ? p.options?.find(o => o.id === v)?.name : `${v}${p.unit ? ` ${p.unit}` : ''}`
        return text ? `${p.name}: ${text}` : ''
      })
      .filter(Boolean)
    const pad = '  '.repeat(depth)
    const links = (r.links ?? [])
      .map(id => live.find(x => x.id === id)?.text ?? pages.find(p => p.id === id && !p.deletedAt)?.title)
      .filter(Boolean)
    if (links.length) values.push(`Связано: ${links.join(', ')}`)
    out.push(`${pad}${mark}${r.text}${due}${values.length ? ` · ${values.join(', ')}` : ''}`)
    if (r.note) for (const l of r.note.split('\n').filter(Boolean)) out.push(`${pad}  > ${l}`)
    for (const s of live.filter(x => x.parentId === r.id).sort((a, b) => a.order - b.order)) line(s, page, depth + 1)
  }
  for (const g of groups) {
    if (!g.pages.length) continue
    if (g.name) out.push(`## ${g.name}`, '')
    for (const page of [...g.pages].sort((a, b) => a.order - b.order)) {
      out.push(`### ${page.title || 'Без названия'}`, '')
      if (page.description) out.push(`_${page.description}_`, '')
      const own = live.filter(r => r.pageId === page.id && !r.parentId).sort((a, b) => Number(a.done) - Number(b.done) || a.order - b.order)
      for (const r of own) line(r, page, 0)
      out.push('')
    }
  }
  return out.join('\n')
}

/** Reads an exported JSON file; throws with a sentence for the user when it is not one */
export function parseSnapshot(text: string): Snapshot {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Это не файл экспорта Cerulean: не удалось прочитать JSON')
  }
  const s = data as Partial<Snapshot>
  if (s?.app !== 'cerulean' || !Array.isArray(s.pages) || !Array.isArray(s.records)) {
    throw new Error('Это не файл экспорта Cerulean')
  }
  if (s.version !== 1) throw new Error('Файл из более новой версии приложения')
  return {
    app: 'cerulean',
    version: 1,
    exportedAt: s.exportedAt ?? 0,
    pages: s.pages,
    records: s.records,
    sections: s.sections ?? [],
    entries: s.entries ?? [],
    settings: s.settings!,
    learned: s.learned ?? {}
  }
}
