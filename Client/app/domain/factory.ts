// New objects with every field set, so stored data always has one shape
import type { Entry, Page, Rec, Section, Settings } from './types'
import { defaultViews, RECORD_NOUN } from './templates'
import { uid } from './ids'

export function newPage(init: Partial<Page> = {}, now = Date.now()): Page {
  const hasDone = init.hasDone ?? true
  return {
    id: uid('p'),
    kind: 'page',
    title: '',
    glyph: null,
    color: 'gray',
    sectionId: null,
    order: 0,
    hasDone,
    description: '',
    props: [],
    views: defaultViews(hasDone),
    favorite: null,
    noun: RECORD_NOUN,
    createdAt: now,
    openedAt: now,
    seenAt: now,
    deletedAt: null,
    ...init
  }
}

export function newRecord(init: Partial<Rec> & Pick<Rec, 'pageId' | 'text'>, now = Date.now()): Rec {
  return {
    id: uid('r'),
    parentId: null,
    done: false,
    note: '',
    values: {},
    due: null,
    tags: [],
    via: 'manual',
    addedAt: now,
    order: 0,
    favorite: null,
    deletedAt: null,
    ...init
  }
}

export function newSection(name: string, order: number): Section {
  return { id: uid('s'), name, order, collapsed: false }
}

export function newEntry(init: Omit<Entry, 'id'>): Entry {
  return { id: uid('e'), ...init }
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  modelId: '',
  keyState: 'unknown',
  model: 'fast',
  rulesFirst: true,
  homeRows: 'summary',
  dismissed: [],
  folded: []
}

/** The system pages every database has: Входящие (pinned) and Сегодня (all pages, due today) */
export function systemPages(now = Date.now()): Page[] {
  return [
    newPage({
      kind: 'inbox',
      title: 'Входящие',
      glyph: 'inbox',
      color: 'gray',
      order: -2,
      hasDone: true,
      description: 'то, что не удалось разложить',
      noun: RECORD_NOUN
    }, now),
    newPage({
      kind: 'today',
      title: 'Сегодня',
      glyph: 'cal',
      color: 'teal',
      order: -1,
      hasDone: true,
      description: 'дела со сроком на сегодня и просроченные, со всех страниц',
      views: [],
      noun: ['дело', 'дела', 'дел']
    }, now)
  ]
}
