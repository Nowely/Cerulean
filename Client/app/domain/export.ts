// Export and import: the only way data moves between devices. The model key never goes into a file.
import type { ConnectionField, Entry, Id, KeepingField, Page, PropDef, PropOption, Rec, Section, Settings } from './types'
import type { Learned } from './rules'
import { formatDue } from './dates'
import { count, normalize, PAGE_FORMS, RECORD_FORMS } from './text'
import { uid } from './ids'
import { readPage } from './templates'

export interface Snapshot {
  app: 'cerulean'
  version: 1
  exportedAt: number
  pages: Page[]
  records: Rec[]
  sections: Section[]
  entries: Entry[]
  settings: Omit<Settings, ConnectionField | KeepingField>
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
    // An older copy reads as today's shape (v23: «Готово» → «Сделано»)
    pages: s.pages.map(readPage),
    records: s.records,
    sections: s.sections ?? [],
    entries: s.entries ?? [],
    settings: s.settings!,
    learned: s.learned ?? {}
  }
}

// ---------- «Загрузить копию» ----------

export interface Size {
  pages: number
  records: number
}

/** What a copy holds, as the import sheet and the confirms count it: the user's live pages and the live records on them */
export function measure(d: Pick<Snapshot, 'pages' | 'records'>): Size {
  const live = new Set(d.pages.filter(p => !p.deletedAt).map(p => p.id))
  return {
    pages: d.pages.filter(p => p.kind === 'page' && !p.deletedAt).length,
    records: d.records.filter(r => !r.deletedAt && live.has(r.pageId)).length
  }
}

/** «24 страницы и 594 записи»; with `all` false a zero part is left out («3 записи») */
export function sizeText(n: Size, all = true): string {
  const parts = [n.pages || all ? count(n.pages, PAGE_FORMS) : '', n.records || all ? count(n.records, RECORD_FORMS) : '']
  return parts.filter(Boolean).join(' и ') || count(0, RECORD_FORMS)
}

/** «Добавлено 24 страницы и 594 записи», «Добавлена 1 запись» (both nouns are feminine) */
export function addedText(n: Size): string {
  const first = n.pages || n.records
  const one = first % 10 === 1 && first % 100 !== 11
  return `${one ? 'Добавлена' : 'Добавлено'} ${sizeText(n, false)}`
}

/** What «Добавить к текущим» adds: new things, and copies of the pages here that took properties or options from the file */
export interface Merge {
  sections: Section[]
  pages: Page[]
  changed: Page[]
  records: Rec[]
  /** Words Авто learned in the file and does not know here, pointing at pages that exist after the merge */
  learned: Learned
}

/**
 * «Добавить к текущим»: sections and pages with the same name merge, a record with the same text on the same page
 * (under the same parent) is not doubled, and what the file brings goes below what is here. The file's trash,
 * Журнал and settings stay out. Ids already taken here get new ones.
 */
export function mergeSnapshot(here: Pick<Snapshot, 'pages' | 'records' | 'sections' | 'learned'>, file: Snapshot): Merge {
  const key = (s: string) => normalize(s)
  const taken = new Set<Id>([...here.pages, ...here.records, ...here.sections].map(x => x.id))
  const own = (id: Id, prefix: string) => {
    const out = taken.has(id) ? uid(prefix) : id
    taken.add(out)
    return out
  }
  const maxOf = (xs: number[]) => xs.reduce((m, x) => Math.max(m, x), -1)
  const livePages = here.pages.filter(p => !p.deletedAt)
  const liveRecords = here.records.filter(r => !r.deletedAt)

  // Sections by name
  const sectionOf = new Map<Id, Id>()
  const sections: Section[] = []
  let sectionAt = maxOf(here.sections.map(s => s.order)) + 1
  for (const s of [...file.sections].sort((a, b) => a.order - b.order)) {
    const same = here.sections.find(x => key(x.name) === key(s.name))
    const made = same ? null : { ...s, id: own(s.id, 's'), order: sectionAt++ }
    if (made) sections.push(made)
    sectionOf.set(s.id, (same ?? made)!.id)
  }

  // Pages: Входящие and Сегодня by kind, the user's by title (an untitled page never merges)
  const pageOf = new Map<Id, Id>()
  /** For a page that merged: how its properties and options are called here */
  const propsOf = new Map<Id, PropMap>()
  const changed = new Map<Id, Page>()
  const pages: Page[] = []
  const favAt = maxOf([...livePages, ...liveRecords].map(x => x.favorite ?? -1)) + 1
  const fav = (f: number | null) => f === null ? null : favAt + f
  const pageAt = new Map<Id | null, number>()
  const nextPage = (sectionId: Id | null) => {
    const at = pageAt.get(sectionId) ?? maxOf(livePages.filter(p => p.sectionId === sectionId).map(p => p.order)) + 1
    pageAt.set(sectionId, at + 1)
    return at
  }
  for (const p of file.pages.filter(p => !p.deletedAt).sort((a, b) => a.order - b.order)) {
    const same = p.kind !== 'page'
      ? livePages.find(x => x.kind === p.kind)
      : p.title.trim() ? livePages.find(x => x.kind === 'page' && key(x.title) === key(p.title)) : undefined
    if (same) {
      pageOf.set(p.id, same.id)
      propsOf.set(p.id, mergeProps(changed.get(same.id) ?? same, p.props, page => changed.set(same.id, page)))
      continue
    }
    if (p.kind !== 'page') continue
    const sectionId = p.sectionId ? sectionOf.get(p.sectionId) ?? null : null
    const made = { ...p, id: own(p.id, 'p'), sectionId, order: nextPage(sectionId), favorite: fav(p.favorite) }
    pages.push(made)
    pageOf.set(p.id, made.id)
  }

  // Records: parents first, so that a subitem follows its parent (or the record here that parent matched)
  const recordOf = new Map<Id, Id>()
  const place = (pageId: Id, parentId: Id | null, text: string) => `${pageId}|${parentId ?? ''}|${key(text)}`
  const index = new Map(liveRecords.map(r => [place(r.pageId, r.parentId, r.text), r.id]))
  const orderAt = new Map<string, number>()
  const nextOrder = (pageId: Id, parentId: Id | null) => {
    const k = `${pageId}|${parentId ?? ''}`
    const at = orderAt.get(k) ?? maxOf(liveRecords.filter(r => r.pageId === pageId && r.parentId === parentId).map(r => r.order)) + 1
    orderAt.set(k, at + 1)
    return at
  }
  const records: Rec[] = []
  let left = file.records.filter(r => !r.deletedAt && pageOf.has(r.pageId)).sort((a, b) => a.order - b.order)
  while (left.length) {
    const ready = new Set(left.filter(r => !r.parentId || recordOf.has(r.parentId)))
    if (!ready.size) break // subitems of records in the file's trash stay out
    left = left.filter(r => !ready.has(r))
    for (const r of ready) {
      const pageId = pageOf.get(r.pageId)!
      const parentId = r.parentId ? recordOf.get(r.parentId)! : null
      const same = index.get(place(pageId, parentId, r.text))
      if (same) {
        recordOf.set(r.id, same)
        continue
      }
      const props = propsOf.get(r.pageId)
      const values: Rec['values'] = {}
      for (const [propId, value] of Object.entries(r.values)) {
        const to = props ? props.get(propId) : { id: propId, options: new Map<Id, Id>() }
        if (to) values[to.id] = typeof value === 'string' ? to.options.get(value) ?? value : value
      }
      const made = { ...r, id: own(r.id, 'r'), pageId, parentId, values, order: nextOrder(pageId, parentId), favorite: fav(r.favorite) }
      records.push(made)
      recordOf.set(r.id, made.id)
    }
  }
  // Links and guesses point at what they became here
  for (const r of records) {
    if (r.links) r.links = r.links.map(id => recordOf.get(id) ?? pageOf.get(id)).filter((id): id is Id => !!id)
    if (r.guesses) r.guesses = r.guesses.map(id => pageOf.get(id)).filter((id): id is Id => !!id)
  }

  const learned: Learned = {}
  for (const [word, pageId] of Object.entries(file.learned)) {
    const to = pageOf.get(pageId)
    if (to && !(word in here.learned)) learned[word] = to
  }
  return { sections, pages, changed: [...changed.values()], records, learned }
}

type PropMap = Map<Id, { id: Id, options: Map<Id, Id> }>

/**
 * A page here meets the same page from a file: properties match by name and type, options by name, and what the
 * file has on top is added to a copy of the page (`update` gets it). Returns how the file's ids are called here.
 */
function mergeProps(page: Page, from: PropDef[], update: (page: Page) => void): PropMap {
  const out: PropMap = new Map()
  let props = page.props
  const edit = (next: PropDef[]) => {
    props = next
    update({ ...page, props })
  }
  for (const f of from) {
    let mine = props.find(p => normalize(p.name) === normalize(f.name) && p.type === f.type)
    if (!mine) {
      // The options come over one by one below
      mine = { ...f, id: props.some(p => p.id === f.id) ? uid('f') : f.id, options: f.options ? [] : undefined }
      edit([...props, mine])
    }
    const options = new Map<Id, Id>()
    for (const o of f.options ?? []) {
      const same = mine.options?.find(x => normalize(x.name) === normalize(o.name))
      if (same) {
        options.set(o.id, same.id)
        continue
      }
      const was: PropDef = mine
      const made: PropOption = { ...o, id: was.options?.some(x => x.id === o.id) ? uid('o') : o.id }
      const grown: PropDef = { ...was, options: [...(was.options ?? []), made] }
      edit(props.map(p => p.id === was.id ? grown : p))
      mine = grown
      options.set(o.id, made.id)
    }
    out.set(f.id, { id: mine.id, options })
  }
  return out
}
