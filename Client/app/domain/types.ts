// The data model. Everything lives on pages: Чат and Поиск only point at pages and records.

export type Id = string

export const PAGE_COLORS = ['green', 'blue', 'brown', 'yellow', 'pink', 'purple', 'gray', 'teal'] as const
export type PageColor = typeof PAGE_COLORS[number]

/** A date with an optional time, both local. Stored as text so it never shifts with time zones. */
export interface Due {
  date: string // YYYY-MM-DD
  time?: string // HH:MM
}

export type PropType = 'text' | 'number' | 'select' | 'date' | 'relation'

export interface PropOption {
  id: Id
  name: string
}

export interface PropDef {
  id: Id
  name: string
  type: PropType
  options?: PropOption[]
  /** For a number: the number property it is compared with («Осталось» below «Норма» shows «мало») */
  normProp?: Id
  /** Unit shown after a number («шт», «л») */
  unit?: string
}

/** What «Как показывать» offers: exactly these four */
export type Layout = 'list' | 'board' | 'table' | 'calendar'

/** System fields a view can filter, group or show besides the page's own properties */
export type SystemField = 'done' | 'due'

export interface FilterRule {
  field: SystemField | Id
  op: 'is' | 'empty' | 'notEmpty'
  value?: boolean | string
}

export type GroupBy = Id | 'due' | null

export interface ViewDef {
  id: Id
  name: string
  layout: Layout
  filter: FilterRule[]
  groupBy: GroupBy
  sort: 'manual' | 'due' | 'name'
  /** «Справа в строке»: what a row shows on its right */
  shown: (Id | 'due' | 'note')[]
}

export type PageKind = 'page' | 'inbox' | 'today'

export type TemplateKey = 'shop' | 'todo' | 'goal' | 'note'

export interface Page {
  id: Id
  kind: PageKind
  title: string
  glyph: Glyph | null
  color: PageColor
  sectionId: Id | null
  order: number
  /** Pages with «Готово» show checkboxes, the rest show a dot */
  hasDone: boolean
  /** «Описание для Авто»: what goes here; Авто reads it when filing */
  description: string
  props: PropDef[]
  views: ViewDef[]
  /** Position in Избранное, or null */
  favorite: number | null
  /** How the summary counts: [one, few, many], e.g. ['дело', 'дела', 'дел'] or ['купить', 'купить', 'купить'] */
  noun: [string, string, string]
  /** Records are titles (books, films): the summary keeps their capital letter */
  titles?: boolean
  template?: TemplateKey
  createdAt: number
  /** Last time the page was opened (search groups) */
  openedAt: number
  /** «новых» counts records added after this */
  seenAt: number
  deletedAt: number | null
}

export type Tag = 'clarify' | 'offline'

export interface Rec {
  id: Id
  pageId: Id
  /** A subitem (Подпункт) belongs to a record */
  parentId: Id | null
  text: string
  done: boolean
  doneAt?: number
  note: string
  values: Record<Id, string | number | null>
  due: Due | null
  /** A record with its own icon shows its tile instead of the checkbox or dot */
  glyph?: Glyph | null
  color?: PageColor | null
  tags: Tag[]
  /** Pages Авто would offer for a record tagged «уточнить» */
  guesses?: Id[]
  /** «Связано»: records and pages this one is linked to. A link reads both ways: the other side lists it too */
  links?: Id[]
  via: 'chat' | 'manual'
  addedAt: number
  order: number
  favorite: number | null
  openedAt?: number
  deletedAt: number | null
}

export interface Section {
  id: Id
  name: string
  order: number
  collapsed: boolean
}

export type EntryKind = 'pending' | 'routed' | 'ask' | 'found' | 'undone' | 'offline'

/** One line of the Чат journal: what was written and where it went */
export interface Entry {
  id: Id
  at: number
  text: string
  kind: EntryKind
  pageId?: Id
  recordIds?: Id[]
  /** Records were moved with «Не туда» */
  moved?: boolean
  /** Found records for a question */
  hits?: Id[]
  /** A guessed name for «Новая страница «…»» */
  newName?: string | null
}

export type ModelChoice = 'fast' | 'exact'
export type HomeRows = 'summary' | 'compact'

export interface Settings {
  apiKey: string
  keyState: 'unknown' | 'ok' | 'bad'
  model: ModelChoice
  rulesFirst: boolean
  homeRows: HomeRows
  /** One-time tips and cards that were closed */
  dismissed: string[]
}

export const GLYPHS = {
  basket: 'i-lucide-shopping-basket',
  check: 'i-lucide-square-check',
  home: 'i-lucide-house',
  bulb: 'i-lucide-lightbulb',
  flag: 'i-lucide-flag',
  target: 'i-lucide-target',
  book: 'i-lucide-book',
  inbox: 'i-lucide-inbox',
  gift: 'i-lucide-gift',
  cal: 'i-lucide-calendar',
  doc: 'i-lucide-file-text',
  heart: 'i-lucide-heart',
  star: 'i-lucide-star',
  run: 'i-lucide-footprints',
  plane: 'i-lucide-plane',
  car: 'i-lucide-car',
  wallet: 'i-lucide-wallet',
  pill: 'i-lucide-pill',
  music: 'i-lucide-music',
  film: 'i-lucide-clapperboard',
  work: 'i-lucide-briefcase',
  study: 'i-lucide-graduation-cap',
  leaf: 'i-lucide-leaf',
  paw: 'i-lucide-paw-print',
  tool: 'i-lucide-wrench',
  cook: 'i-lucide-cooking-pot',
  people: 'i-lucide-users',
  pen: 'i-lucide-pen-line'
} as const

export type Glyph = keyof typeof GLYPHS

/** Names read by screen readers in the icon picker */
export const GLYPH_LABELS: Record<Glyph, string> = {
  basket: 'Корзина покупок',
  check: 'Галочка',
  home: 'Дом',
  bulb: 'Лампочка',
  flag: 'Флаг',
  target: 'Мишень',
  book: 'Книга',
  inbox: 'Входящие',
  gift: 'Подарок',
  cal: 'Календарь',
  doc: 'Документ',
  heart: 'Сердце',
  star: 'Звезда',
  run: 'Следы',
  plane: 'Самолёт',
  car: 'Машина',
  wallet: 'Кошелёк',
  pill: 'Таблетка',
  music: 'Музыка',
  film: 'Кино',
  work: 'Портфель',
  study: 'Учёба',
  leaf: 'Лист',
  paw: 'Лапа',
  tool: 'Ключ',
  cook: 'Кастрюля',
  people: 'Люди',
  pen: 'Ручка'
}
