// The data model. Everything lives on pages: Журнал and Поиск only point at pages and records.

export type Id = string

export const PAGE_COLORS = ['green', 'blue', 'brown', 'yellow', 'pink', 'purple', 'gray', 'teal'] as const
export type PageColor = typeof PAGE_COLORS[number]

/** Names read by screen readers in the colour pickers */
export const COLOR_NAMES: Record<PageColor, string> = {
  green: 'Зелёный', blue: 'Синий', brown: 'Коричневый', yellow: 'Жёлтый', pink: 'Розовый', purple: 'Фиолетовый', gray: 'Серый', teal: 'Бирюзовый'
}

/** A date with an optional time, both local. Stored as text so it never shifts with time zones. */
export interface Due {
  date: string // YYYY-MM-DD
  time?: string // HH:MM
}

export type PropType = 'text' | 'number' | 'select' | 'date' | 'relation'

export interface PropOption {
  id: Id
  name: string
  /** Its dot in the property editor and the value sheet; older data has none and reads one by position */
  color?: PageColor
}

export interface PropDef {
  id: Id
  name: string
  type: PropType
  options?: PropOption[]
  /** A «Выбор» changed to another type keeps its options here, so going back keeps their ids and colours */
  stash?: PropOption[]
  /** For a number: the number property it is compared with («Осталось» below «Норма» shows «мало») */
  normProp?: Id
  /** Unit shown after a number («шт», «л») */
  unit?: string
}

/** The built-in properties every page has: Срок (`rec.due`) and Заметка (the body, `rec.body`) */
export type BuiltinProp = 'due' | 'note'

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
  /** Group captions folded in this view (group keys), kept per page and view */
  folded?: string[]
  /** The name was typed: it no longer follows the type («Список», «Доска 2») */
  named?: boolean
}

/** A mark in a body: bold, italic (drawn oblique) or a link */
export interface BodyMark {
  type: string
  attrs?: { href?: string, [k: string]: unknown }
}

/**
 * A node of a body (v23): the editor's JSON. Only what a body holds: doc, paragraph, heading (level 2), bulletList,
 * orderedList, listItem, blockquote, horizontalRule, text and mention (`attrs.id`, `attrs.label` the name it had)
 */
export interface BodyNode {
  type: string
  attrs?: Record<string, unknown>
  content?: BodyNode[]
  text?: string
  marks?: BodyMark[]
}

export interface BodyDoc extends BodyNode {
  type: 'doc'
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
  /** «Заметка к странице» (v23): the page's body, drawn between the title block and the view tabs; null or absent: none */
  body?: BodyDoc | null
  /** Records and pages the body mentions, read out of it on every change (they show in «Связано» of each) */
  mentions?: Id[]
  props: PropDef[]
  /** The order of «Свойства»: property ids with 'due' and 'note' among them. Without it the page's own come first */
  propOrder?: (Id | BuiltinProp)[]
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
  /** Last tick or untick: a row ticked while its page is open stays in place until the page is opened again */
  tickedAt?: number
  /** The plain «Заметка» from before v23: read as a one-paragraph body until the body is first written, then '' */
  note: string
  /** The body (v23): the editor's JSON; null or absent: empty (or the old `note`) */
  body?: BodyDoc | null
  /** Records and pages the body mentions, read out of it on every change: «Связано» on both sides, apart from `links` */
  mentions?: Id[]
  values: Record<Id, string | number | null>
  due: Due | null
  /** A record with its own icon shows its tile instead of the checkbox or dot */
  glyph?: Glyph | null
  color?: PageColor | null
  tags: Tag[]
  /** Pages Авто would offer for a record tagged «уточнить» */
  guesses?: Id[]
  /** «Связано»: records and pages this one is linked to by hand. A link reads both ways: the other side lists it too */
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

/** One line of the Журнал journal: what was written and where it went */
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
  /** Авто made the page for this line from a template: «Отменить» and «Не туда» take the page back while it is empty */
  made?: boolean
  /** Filed when the network came back: the receipt says «разобрано, когда появилась сеть» */
  resumed?: boolean
  /** Its parts went to different pages (v22, U3): one receipt, a «→» on every row, no «Не туда» in the header */
  split?: boolean
  /**
   * Why Авто filed it the plain way: `slow` the model did not answer in 10 s (the record waits in Входящие),
   * `key` the key was refused (filed by the simple rules)
   */
  note?: 'slow' | 'key'
  /** A question written down: up to three records like it, «Похожее в записях» under the receipt */
  similar?: Id[]
  /** Records of this send merged into an open one like them (v22, G3): the new record's id → the record it went into */
  merged?: Record<Id, Id>
  /** The page was chosen by hand (Уточнение, «Не туда», «Ещё…»): the receipt offers «Запомнить» (v22, U5) */
  learn?: boolean
  /** «Запомнить» was tapped: the line is an example in the page's «Описание для Авто» */
  learned?: boolean
}

export type ModelChoice = 'fast' | 'exact'
export type HomeRows = 'summary' | 'compact'
/** Where Авто's model runs: «Другой» is any OpenAI-compatible API at its own address */
export type Provider = 'openai' | 'anthropic' | 'openrouter' | 'custom'

export interface Settings {
  provider: Provider
  apiKey: string
  /** «Другой»: the API address, like https://example.com/v1 */
  baseUrl: string
  /** A model id typed in by hand; empty: Быстрая or Точная of the service */
  modelId: string
  keyState: 'unknown' | 'ok' | 'bad'
  model: ModelChoice
  rulesFirst: boolean
  homeRows: HomeRows
  /** One-time tips and cards that were closed */
  dismissed: string[]
  /** Folded system sections on Главная: 'favorites', 'recent' (user sections keep their own flag) */
  folded: string[]
  /** Keeping data: when a copy was last saved and when «Не сейчас» hid the reminder (0: never) */
  copiedAt: number
  copyHiddenAt: number
  /** Records count towards the first reminder from here (the first run); 0 for a database older than the reminder */
  startedAt: number
  /** `navigator.storage.persist()` is asked once by itself, at the first record; then only by «Включить» */
  persistAsked: boolean
}

/** The connection to a model stays in this browser: never in an export, kept through an import */
export type ConnectionField = 'provider' | 'apiKey' | 'baseUrl' | 'modelId' | 'keyState'

/** How this browser keeps the data: about this browser, not the data, so never in an export either */
export type KeepingField = 'copiedAt' | 'copyHiddenAt' | 'startedAt' | 'persistAsked'

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
