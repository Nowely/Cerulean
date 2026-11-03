// Export and import: the only way data moves between devices. The model key never goes into a file.
import type { ConnectionField, Entry, Id, KeepingField, Page, PropDef, PropOption, Rec, Section, Settings } from './types'
import type { Learned } from './rules'
import { formatDue } from './dates'
import { count, normalize, PAGE_FORMS, RECORD_FORMS } from './text'
import { uid } from './ids'
import { readPage } from './templates'
import { bodyMarkdown, bodyOf, mentionIds, remapMentions, type NameOf } from './body'
import { mdTitle } from './mention'
import { clearMissingStockViews, stockUnit, stockView, uniqueStockName } from './stock'
import { homeOrder, type HomePosition } from './homeOrder'

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

/** Readable copy: one heading per page, records as a checklist with subitems and bodies (a mention as [[Name]]) */
export function toMarkdown(pages: Page[], records: Rec[], sections: Section[], now = Date.now(), nameOf?: NameOf): string {
  const out: string[] = ['# Cerulean', '']
  const live = records.filter(r => !r.deletedAt)
  const name: NameOf = nameOf ?? ((id, label) => live.find(r => r.id === id)?.text ?? pages.find(p => p.id === id)?.title ?? label ?? '')
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
        const unit = page.stocks?.some(s => s.amountProp === p.id) ? stockUnit(r, page, p.id) : p.unit
        const text = p.type === 'select' ? p.options?.find(o => o.id === v)?.name : `${v}${unit ? ` ${unit}` : ''}`
        return text ? `${p.name}: ${text}` : ''
      })
      .filter(Boolean)
    const pad = '  '.repeat(depth)
    const links = (r.links ?? [])
      .map(id => live.find(x => x.id === id)?.text ?? pages.find(p => p.id === id && !p.deletedAt)?.title)
      .filter((n): n is string => !!n)
    // A link the title names after «@» is written there as [[Name]] (v24, item 13); only the others are listed after it
    const title = mdTitle(r.text, links)
    const rest = links.filter(n => !title.includes(`[[${n}]]`))
    if (rest.length) values.push(`Связано: ${rest.join(', ')}`)
    out.push(`${pad}${mark}${title}${due}${values.length ? ` · ${values.join(', ')}` : ''}`)
    // The body under its record, indented into the list item (v23: a mention as [[Name]])
    const body = bodyMarkdown(bodyOf(r), name)
    if (body) out.push('', ...body.split('\n').map(l => l ? `${pad}  ${l}` : ''), '')
    for (const s of live.filter(x => x.parentId === r.id).sort((a, b) => a.order - b.order)) line(s, page, depth + 1)
  }
  for (const g of groups) {
    if (!g.pages.length) continue
    if (g.name) out.push(`## ${g.name}`, '')
    for (const page of [...g.pages].sort((a, b) => a.order - b.order)) {
      out.push(`### ${page.title || 'Без названия'}`, '')
      if (page.description) out.push(`_${page.description}_`, '')
      const note = bodyMarkdown(bodyOf(page), name)
      if (note) out.push(note, '')
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
    pages: s.pages.map(readPage).map(clearMissingStockViews),
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

export type StockImportConflictReason = 'page-name' | 'page-id' | 'stock-schema' | 'record-name' | 'record-id' | 'stock-data' | 'record-links'

/** The caller must stop the entire add-import and show this error before saving anything. */
export class StockImportConflict extends Error {
  readonly code = 'stock-import-conflict'

  constructor(
    readonly reason: StockImportConflictReason,
    readonly pageId: Id,
    readonly pageTitle: string,
    readonly recordId?: Id,
    readonly recordText?: string
  ) {
    super(`Не удалось добавить копию: на странице «${pageTitle || 'Без названия'}» есть конфликт запасов${recordText ? ` в записи «${recordText}»` : ''}. Данные не изменены.`)
    this.name = 'StockImportConflict'
  }
}

/** An imported stock view cannot be remapped without changing what its choice filter means. */
export class FilterImportConflict extends StockImportConflict {
  constructor(page: Page) {
    super('stock-schema', page.id, page.title)
    this.name = 'FilterImportConflict'
    this.message = `Не удалось добавить копию: фильтр вида на странице «${page.title || 'Без названия'}» ссылается на удалённое свойство или вариант. Данные не изменены.`
  }
}

/**
 * «Добавить к текущим»: sections and pages with the same name merge, a record with the same text on the same page
 * (under the same parent) is not doubled. A stock conflict throws StockImportConflict instead of returning a partial
 * merge. What the file brings goes below what is here; trash, Журнал and settings stay out.
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
  // Read the source exactly as Главная does: Page.order first, creation time for Мои страницы,
  // then the source's manual positions and import groups. Nothing here writes to either input.
  const sourceLists = new Map<Id | null, Page[]>()
  for (const page of file.pages.filter(p => !p.deletedAt).sort((a, b) => a.order - b.order)) {
    const section = page.sectionId ?? null
    if (section === null && page.kind !== 'page') continue
    const list = sourceLists.get(section) ?? []
    list.push(page)
    sourceLists.set(section, list)
  }
  const sourcePositions = new Map<Page, number>()
  for (const [section, list] of sourceLists) {
    if (section === null) list.sort((a, b) => b.createdAt - a.createdAt)
    homeOrder(list, section).forEach((page, position) => sourcePositions.set(page, position))
  }
  const sourceSections: (Id | null)[] = [null, ...[...file.sections].sort((a, b) => a.order - b.order).map(s => s.id)]
  for (const section of sourceLists.keys()) if (!sourceSections.includes(section)) sourceSections.push(section)
  const homeGroups = new Map<Id | null, string>()
  const maximum = here.pages.reduce((max, page) => {
    const match = /^home-import-v1:(\d{16}):/.exec(page.homeOrder?.importGroup ?? '')
    if (!match) return max
    const n = Number(match[1])
    if (!Number.isSafeInteger(n)) throw new Error('Не удалось добавить копию: неверный порядок импортированных страниц')
    return Math.max(max, n)
  }, 0)
  if (!Number.isSafeInteger(maximum + sourceSections.length)) throw new Error('Не удалось добавить копию: неверный порядок импортированных страниц')
  const homeGroup = (section: Id | null) => {
    let group = homeGroups.get(section)
    if (!group) {
      const index = sourceSections.indexOf(section)
      group = `home-import-v1:${String(maximum + index + 1).padStart(16, '0')}:${uid('')}:${uid('')}`
      homeGroups.set(section, group)
    }
    return group
  }
  const nextPage = (sectionId: Id | null) => {
    const at = pageAt.get(sectionId) ?? maxOf(livePages.filter(p => p.sectionId === sectionId).map(p => p.order)) + 1
    pageAt.set(sectionId, at + 1)
    return at
  }
  for (const p of file.pages.filter(p => !p.deletedAt).sort((a, b) => a.order - b.order).map(clearMissingStockViews)) {
    const names = p.kind !== 'page'
      ? [...livePages, ...pages].filter(x => x.kind === p.kind)
      : p.title.trim() ? [...livePages, ...pages].filter(x => x.kind === 'page' && key(x.title) === key(p.title)) : []
    const sameId = here.pages.find(x => x.id === p.id)
    const stockPage = !!(p.stocks?.length || sameId?.stocks?.length || names.some(x => x.stocks?.length))
    if (stockPage && sameId && (sameId.deletedAt || sameId.kind !== p.kind)) {
      throw new StockImportConflict('page-id', p.id, p.title)
    }
    if (stockPage && !sameId && names.length > 1) throw new StockImportConflict('page-name', p.id, p.title)
    const same = stockPage && sameId
      ? sameId
      : p.kind !== 'page'
        ? livePages.find(x => x.kind === p.kind)
        : p.title.trim() ? livePages.find(x => x.kind === 'page' && key(x.title) === key(p.title)) : undefined
    if (stockPage && !same && names.length) throw new StockImportConflict('page-name', p.id, p.title)
    if (same) {
      pageOf.set(p.id, same.id)
      const mapping = mergeProps(changed.get(same.id) ?? same, p, page => changed.set(same.id, page))
      propsOf.set(p.id, mapping)
      const target = changed.get(same.id) ?? same
      const memory = { ...target.departmentMemory }
      let memoryChanged = false
      for (const [sourceProp, words] of Object.entries(p.departmentMemory ?? {})) {
        const source = p.props.find(prop => prop.id === sourceProp && prop.type === 'select')
        const mapped = mapping.get(sourceProp)
        if (!source || !mapped || !words || typeof words !== 'object') continue
        const next = { ...memory[mapped.id] }
        for (const [stem, option] of Object.entries(words)) {
          const mappedOption = mapped.options.get(option)
          if (!/^[a-zа-я0-9]{3,5}$/.test(stem) || !source.options?.some(o => o.id === option) || !mappedOption || Object.hasOwn(next, stem)) continue
          next[stem] = mappedOption
          memoryChanged = true
        }
        if (Object.keys(next).length) memory[mapped.id] = next
      }
      if (memoryChanged) changed.set(same.id, { ...target, departmentMemory: memory })
      continue
    }
    if (p.kind !== 'page') continue
    const sectionId = p.sectionId ? sectionOf.get(p.sectionId) ?? null : null
    const made = { ...p, id: own(p.id, 'p'), sectionId, order: nextPage(sectionId), favorite: fav(p.favorite) }
    const imported: HomePosition = { ...p.homeOrder, sectionId, position: sourcePositions.get(p)!, importGroup: homeGroup(p.sectionId ?? null) }
    made.homeOrder = imported
    pages.push(made)
    pageOf.set(p.id, made.id)
  }

  // Records: parents first, so that a subitem follows its parent (or the record here that parent matched)
  const recordOf = new Map<Id, Id>()
  const place = (pageId: Id, parentId: Id | null, text: string) => `${pageId}|${parentId ?? ''}|${key(text)}`
  const index = new Map<string, Rec[]>()
  for (const r of liveRecords) {
    const k = place(r.pageId, r.parentId, r.text)
    index.set(k, [...(index.get(k) ?? []), r])
  }
  const byId = new Map(here.records.map(r => [r.id, r]))
  const orderAt = new Map<string, number>()
  const nextOrder = (pageId: Id, parentId: Id | null) => {
    const k = `${pageId}|${parentId ?? ''}`
    const at = orderAt.get(k) ?? maxOf(liveRecords.filter(r => r.pageId === pageId && r.parentId === parentId).map(r => r.order)) + 1
    orderAt.set(k, at + 1)
    return at
  }
  const records: Rec[] = []
  const stockRefs: { source: Rec, page: Page, existing?: Rec }[] = []
  let left = file.records.filter(r => !r.deletedAt && pageOf.has(r.pageId)).sort((a, b) => a.order - b.order)
  while (left.length) {
    const ready = new Set(left.filter(r => !r.parentId || recordOf.has(r.parentId)))
    if (!ready.size) break // subitems of records in the file's trash stay out
    left = left.filter(r => !ready.has(r))
    for (const r of ready) {
      const pageId = pageOf.get(r.pageId)!
      const parentId = r.parentId ? recordOf.get(r.parentId)! : null
      const sourcePage = file.pages.find(p => p.id === r.pageId)!
      const targetPage = changed.get(pageId) ?? livePages.find(p => p.id === pageId) ?? pages.find(p => p.id === pageId)!
      const stockPage = !!(sourcePage.stocks?.length || targetPage.stocks?.length)
      const candidates = index.get(place(pageId, parentId, r.text)) ?? []
      const sameId = byId.get(r.id)
      if (stockPage && sameId && (sameId.deletedAt || sameId.pageId !== pageId || sameId.parentId !== parentId)) {
        throw new StockImportConflict('record-id', sourcePage.id, sourcePage.title, r.id, r.text)
      }
      if (stockPage && !sameId && taken.has(r.id)) {
        throw new StockImportConflict('record-id', sourcePage.id, sourcePage.title, r.id, r.text)
      }
      if (stockPage && !sameId && candidates.length) {
        throw new StockImportConflict('record-name', sourcePage.id, sourcePage.title, r.id, r.text)
      }
      const same = stockPage ? sameId : candidates[0]
      if (same) {
        if (stockPage && !sameStockData(same, targetPage, r, sourcePage)) {
          throw new StockImportConflict('stock-data', sourcePage.id, sourcePage.title, r.id, r.text)
        }
        if (stockPage) stockRefs.push({ source: r, page: sourcePage, existing: same })
        recordOf.set(r.id, same.id)
        continue
      }
      const props = propsOf.get(r.pageId)
      const values: Rec['values'] = {}
      for (const [propId, value] of Object.entries(r.values)) {
        const to = props ? props.get(propId) : { id: propId, options: new Map<Id, Id>() }
        if (to) values[to.id] = typeof value === 'string' ? to.options.get(value) ?? value : value
      }
      const made = { ...r, id: own(r.id, 'r'), pageId, parentId, values, order: nextOrder(pageId, parentId), favorite: fav(r.favorite) }
      if (props) {
        const remapStock = <T>(items: Record<Id, T> | undefined): Record<Id, T> | undefined => items && Object.fromEntries(
          Object.entries(items).flatMap(([id, value]) => props.has(id) ? [[props.get(id)!.id, value]] : [])
        )
        made.stockUnits = remapStock(r.stockUnits)
        made.stockBuy = remapStock(r.stockBuy)
      }
      records.push(made)
      if (stockPage) {
        stockRefs.push({ source: r, page: sourcePage })
        byId.set(made.id, made)
        const k = place(pageId, parentId, made.text)
        index.set(k, [...(index.get(k) ?? []), made])
      }
      recordOf.set(r.id, made.id)
    }
  }
  // Links, mentions and guesses point at what they became here
  const to = (id: Id) => recordOf.get(id) ?? pageOf.get(id)
  const remap = (ids: Id[]) => ids.map(to).filter((id): id is Id => !!id)
  for (const { source, page, existing } of stockRefs) {
    const references = [source.links ?? [], source.mentions ?? [], source.body ? mentionIds(source.body) : []]
    const mapped = references.map(remap)
    const local = existing ? [existing.links ?? [], existing.mentions ?? [], existing.body ? mentionIds(existing.body) : []] : null
    if (references.some((ids, i) => ids.length !== mapped[i]!.length)
      || (local && mapped.some((ids, i) => JSON.stringify(ids) !== JSON.stringify(local[i])))) {
      throw new StockImportConflict('record-links', page.id, page.title, source.id, source.text)
    }
  }
  for (const x of [...records, ...pages]) {
    if (x.body) x.body = remapMentions(x.body, to)
    if (x.mentions) x.mentions = remap(x.mentions)
  }
  for (const r of records) {
    if (r.links) r.links = remap(r.links)
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

function sameStockData(a: Rec, aPage: Page, b: Rec, bPage: Page): boolean {
  const pairs = [...(aPage.stocks ?? []), ...(bPage.stocks ?? [])]
  return pairs.every(s => a.values[s.amountProp] === b.values[s.amountProp]
    && a.values[s.normProp] === b.values[s.normProp]
    && a.stockUnits?.[s.amountProp] === b.stockUnits?.[s.amountProp]
    && a.stockBuy?.[s.amountProp] === b.stockBuy?.[s.amountProp])
}

/**
 * Ordinary properties match by name and type, options by name. Stock pairs match only by their explicit IDs;
 * otherwise they and their specialized views are added without changing existing views or properties.
 */
function mergeProps(page: Page, source: Page, update: (page: Page) => void): PropMap {
  for (const s of source.stocks ?? []) {
    const amount = source.props.find(p => p.id === s.amountProp)
    const norm = source.props.find(p => p.id === s.normProp)
    const existing = page.stocks?.find(x => x.amountProp === s.amountProp && x.normProp === s.normProp)
    const localAmount = page.props.find(p => p.id === s.amountProp)
    const localNorm = page.props.find(p => p.id === s.normProp)
    const invalid = !amount || !norm || amount.type !== 'number' || norm.type !== 'number' || amount.normProp !== norm.id
      || (!!s.buyViewId && source.views.some(v => v.id === s.buyViewId) && !stockView(source, s, 'buy'))
      || (!!s.stockViewId && source.views.some(v => v.id === s.stockViewId) && !stockView(source, s, 'stock'))
    const collision = existing
      ? !localAmount || !localNorm || localAmount.type !== amount?.type || localNorm.type !== norm?.type
      || localAmount.normProp !== s.normProp || localAmount.unit !== amount?.unit || localNorm.unit !== norm?.unit
      : !!localAmount || !!localNorm
    if (invalid || collision) throw new StockImportConflict('stock-schema', source.id, source.title)
  }
  const out: PropMap = new Map()
  let props = page.props
  const stockIds = new Set((source.stocks ?? []).flatMap(s => [s.amountProp, s.normProp]))
  const sameStockIds = new Set((source.stocks ?? []).filter(s => page.stocks?.some(x => x.amountProp === s.amountProp && x.normProp === s.normProp))
    .flatMap(s => [s.amountProp, s.normProp]))
  const added = new Set<Id>()
  const edit = (next: PropDef[]) => {
    props = next
    update({ ...page, props })
  }
  for (const f of source.props) {
    let mine = stockIds.has(f.id)
      ? (sameStockIds.has(f.id) ? props.find(p => p.id === f.id && p.type === f.type) : undefined)
      : props.find(p => !page.stocks?.some(s => s.amountProp === p.id || s.normProp === p.id) && ![...stockIds].some(id => out.get(id)?.id === p.id) && normalize(p.name) === normalize(f.name) && p.type === f.type)
    if (!mine) {
      // The options come over one by one below
      mine = { ...f, id: props.some(p => p.id === f.id) ? uid('f') : f.id, name: stockIds.has(f.id) ? uniqueStockName(f.name, props.map(p => p.name)) : f.name, options: f.options ? [] : undefined }
      added.add(mine.id)
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
  if (props.some(p => added.has(p.id) && p.normProp && out.has(p.normProp) && out.get(p.normProp)!.id !== p.normProp)) {
    props = props.map(p => added.has(p.id) && p.normProp && out.has(p.normProp) ? { ...p, normProp: out.get(p.normProp)!.id } : p)
  }
  let views = page.views
  const stocks = [...(page.stocks ?? [])]
  for (const s of source.stocks ?? []) {
    const amount = out.get(s.amountProp)?.id
    const norm = out.get(s.normProp)?.id
    const buy = source.views.find(v => v.id === s.buyViewId)
    const stock = source.views.find(v => v.id === s.stockViewId)
    if (!amount || !norm || stocks.some(x => x.amountProp === amount && x.normProp === norm)) continue
    const makeView = (v: NonNullable<typeof buy>) => {
      const id = views.some(x => x.id === v.id) ? uid('v') : v.id
      const field = (id: Id) => out.get(id)?.id ?? id
      const used = new Set<Id>()
      const selectFilters = v.selectFilters && Object.fromEntries(Object.entries(v.selectFilters).map(([propId, choices]) => {
        const target = out.get(propId)
        const sourceProp = source.props.find(p => p.id === propId && p.type === 'select')
        if (!target || !sourceProp || used.has(target.id) || choices.some(id => !target.options.has(id))) throw new FilterImportConflict(source)
        used.add(target.id)
        return [target.id, choices.map(id => target.options.get(id)!)]
      }))
      const made = { ...v, id, name: uniqueStockName(v.name, views.map(x => x.name)),
        filter: v.filter.map(rule => ({ ...rule, field: field(rule.field),
          ...(typeof rule.value === 'string' ? { value: out.get(rule.field)?.options.get(rule.value) ?? rule.value } : {}) })),
        ...(selectFilters ? { selectFilters } : {}),
        groupBy: v.groupBy ? field(v.groupBy) : null, shown: v.shown.map(field),
        stock: v.stock ? { ...v.stock, amountProp: amount, normProp: norm } : undefined }
      views = [...views, made]
      return id
    }
    const buyViewId = buy && makeView(buy)
    const stockViewId = stock && makeView(stock)
    stocks.push({ amountProp: amount, normProp: norm, ...(buyViewId ? { buyViewId } : {}), ...(stockViewId ? { stockViewId } : {}) })
  }
  if (props !== page.props || views !== page.views || stocks.length !== (page.stocks?.length ?? 0)) update({ ...page, props, views, ...(stocks.length ? { stocks } : {}) })
  return out
}
