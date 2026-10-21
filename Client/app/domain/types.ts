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
  /** Its pill wherever the value shows; older data has none and reads one by position */
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

/** The built-in properties every page has: Срок (`rec.due`) and Заметка (`rec.note`) */
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

export type PageKind = 'page' | 'inbox' | 'today'

export type TemplateKey = 'shop' | 'todo' | 'goal' | 'note'

export interface Page {
  id: Id
  kind: PageKind
  title: string
  glyph: Glyph | null
  /** Chosen in «Значок и цвет»; null is «Без цвета» (read through `pageColor`: older data has a grey that means none) */
  color: PageColor | null
  sectionId: Id | null
  order: number
  /** Pages with the checkbox (a «Сделано» view) show checkboxes, the rest show a dot */
  hasDone: boolean
  /** «Что сюда класть»: the words that tell Авто what goes here (v23: never called «описание» on screen) */
  description: string
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
  note: string
  values: Record<Id, string | number | null>
  due: Due | null
  /** A record with its own icon shows its tile instead of the checkbox or dot */
  glyph?: Glyph | null
  /** Not read since v23: a record's own tile is neutral (older demo data has one) */
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
  /** «Запомнить» was tapped: the line is an example in the page's «Что сюда класть» */
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

/**
 * Page glyphs in Lucide's stroke. The first 35 are what «Значок и цвет» offers (v23, M10); the last ones are
 * kept so older pages still draw (Входящие's tray, and icons the picker offered before v23)
 */
export const GLYPHS = {
  basket: 'i-lucide-shopping-basket',
  check: 'i-lucide-square-check',
  home: 'i-lucide-house',
  bulb: 'i-lucide-lightbulb',
  flag: 'i-lucide-flag',
  target: 'i-lucide-target',
  book: 'i-lucide-book',
  gift: 'i-lucide-gift',
  cal: 'i-lucide-calendar',
  doc: 'i-lucide-file-text',
  bag: 'i-lucide-shopping-bag',
  car: 'i-lucide-car',
  plane: 'i-lucide-plane',
  phone: 'i-lucide-smartphone',
  pill: 'i-lucide-pill',
  paw: 'i-lucide-paw-print',
  plant: 'i-lucide-sprout',
  tool: 'i-lucide-wrench',
  key: 'i-lucide-key-round',
  cup: 'i-lucide-coffee',
  money: 'i-lucide-banknote',
  // Lucide has no pram: the mockup's own, drawn in the same stroke (app/assets/icons)
  stroller: 'cer:stroller',
  music: 'i-lucide-music',
  camera: 'i-lucide-camera',
  heart: 'i-lucide-heart',
  gym: 'i-lucide-dumbbell',
  work: 'i-lucide-briefcase',
  pin: 'i-lucide-map-pin',
  film: 'i-lucide-film',
  sun: 'i-lucide-sun',
  study: 'i-lucide-graduation-cap',
  globe: 'i-lucide-globe',
  food: 'i-lucide-utensils',
  moon: 'i-lucide-moon',
  hills: 'i-lucide-mountain',
  inbox: 'i-lucide-inbox',
  star: 'i-lucide-star',
  run: 'i-lucide-footprints',
  wallet: 'i-lucide-wallet',
  leaf: 'i-lucide-leaf',
  cook: 'i-lucide-cooking-pot',
  people: 'i-lucide-users',
  pen: 'i-lucide-pen-line'
} as const

export type Glyph = keyof typeof GLYPHS

/**
 * «Значок и цвет»: the icons offered, six to a row, each with the Russian words that find it; the first word is its
 * name for screen readers (v23, A9, M10)
 */
export const GLYPH_WORDS: [Glyph, string][] = [
  ['basket', 'Корзинка покупки магазин еда продукты'],
  ['check', 'Дела задачи галочка список'],
  ['home', 'Дом квартира ремонт дача'],
  ['bulb', 'Идея лампочка мысль'],
  ['flag', 'Флаг цель забег финиш'],
  ['target', 'Мишень цель план'],
  ['book', 'Книга чтение учёба'],
  ['gift', 'Подарок праздник день рождения'],
  ['cal', 'Календарь дата встреча'],
  ['doc', 'Документ заметка текст файл'],
  ['bag', 'Сумка магазин покупки одежда'],
  ['car', 'Машина авто дорога ремонт'],
  ['plane', 'Самолёт поездка отпуск путешествие'],
  ['phone', 'Телефон звонок связь'],
  ['pill', 'Таблетка лекарство здоровье врач аптека'],
  ['paw', 'Лапа питомец кошка собака'],
  ['plant', 'Растение цветы сад дача'],
  ['tool', 'Инструмент ремонт мастер'],
  ['key', 'Ключ квартира замок'],
  ['cup', 'Чашка кофе чай кафе'],
  ['money', 'Деньги бюджет финансы счета'],
  ['stroller', 'Коляска ребёнок дети малыш'],
  ['music', 'Музыка песни концерт'],
  ['camera', 'Камера фото снимки'],
  ['heart', 'Сердце любовь семья'],
  ['gym', 'Гантели спорт тренировки зал'],
  ['work', 'Портфель работа офис проект'],
  ['pin', 'Место адрес карта'],
  ['film', 'Плёнка кино фильмы сериалы'],
  ['sun', 'Солнце лето отдых погода'],
  ['study', 'Учёба школа курсы'],
  ['globe', 'Глобус мир языки'],
  ['food', 'Еда рецепты кухня ужин'],
  ['moon', 'Луна сон ночь'],
  ['hills', 'Горы поход природа']
]
