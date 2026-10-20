// Simple rules: file a line on the device, without a model. Clear cases only; the rest goes to Входящие.
import type { Id, Page, PropDef, TemplateKey } from './types'
import { fold, stems } from './text'

type Topic = 'shop' | 'todo' | 'home' | 'goal' | 'idea' | 'note' | 'book' | 'film' | 'gift' | 'health' | 'travel'

/** Word beginnings that point at a kind of page */
const VOCAB: Record<Topic, string[]> = {
  shop: [
    'купит', 'хлеб', 'батон', 'булк', 'багет', 'лаваш', 'молок', 'кефир', 'сыр', 'творог', 'сметан', 'йогурт', 'ряженк', 'сливк',
    'масл', 'яйц', 'яиц', 'мяс', 'куриц', 'курин', 'фарш', 'говядин', 'свинин', 'рыб', 'колбас', 'сосис', 'ветчин', 'индейк',
    'банан', 'яблок', 'апельсин', 'мандарин', 'лимон', 'груш', 'виноград', 'помидор', 'томат', 'огур', 'картош', 'картоф', 'морков',
    'капуст', 'чеснок', 'зелен', 'укроп', 'авокадо', 'ягод', 'макарон', 'спагет', 'рис', 'греч', 'круп', 'мук', 'сахар', 'соль',
    'чай', 'кофе', 'сок', 'минералк', 'пиво', 'вино', 'шоколад', 'конфет', 'печен', 'торт', 'хлопь', 'овсян', 'консерв',
    'соус', 'кетчуп', 'майонез', 'порош', 'мыл', 'шампун', 'гель', 'зубн', 'паст', 'туалетн', 'бумаг', 'салфет', 'губк', 'пакет',
    'батарейк', 'лампочк', 'корм', 'подгузн', 'кондиционер', 'отбеливат'
  ],
  todo: [
    'позвонит', 'позвон', 'оплатит', 'заплатит', 'записат', 'отправит', 'сдать', 'забрат', 'заказат', 'вернут', 'встретит',
    'написат', 'договорит', 'проверит', 'продлит', 'отнест', 'сходит', 'съездит', 'напомн', 'подготовит', 'распечатат', 'забронир'
  ],
  home: [
    'убрат', 'уборк', 'помыт', 'почистит', 'пылесос', 'ремонт', 'мастер', 'сантехник', 'электрик', 'фильтр', 'кран', 'розетк',
    'стирк', 'постират', 'погладит', 'полит', 'цвет', 'мусор', 'починит', 'повесит', 'собрат', 'шкаф', 'полк', 'окн', 'балкон'
  ],
  goal: ['цель', 'цели', 'целью', 'научит', 'выучит', 'пробежат', 'марафон', 'похудет', 'накопит', 'освоит', 'добит'],
  idea: ['идея', 'идеи', 'идею', 'идей', 'придумат', 'а что если', 'может быть', 'приложен', 'стартап'],
  note: ['заметк', 'мысл', 'ссылк', 'черновик', 'цитат'],
  book: ['книг', 'прочитат', 'почитат', 'роман', 'автор'],
  film: ['фильм', 'сериал', 'посмотрет', 'кино', 'мульт'],
  gift: ['подар', 'подарит', 'день рожд', 'др'],
  health: ['врач', 'анализ', 'таблет', 'лекарств', 'аптек', 'витамин', 'стоматолог', 'терапевт'],
  travel: ['поездк', 'билет', 'отел', 'самолет', 'поезд', 'виза', 'отпуск', 'чемодан']
}

/** «Стоматолог» is a call to make, not a health page, when there is no such page */
const FALLBACK: Partial<Record<Topic, Topic>> = { health: 'todo', travel: 'todo' }

/** Page titles that say what a page is about; the more specific ones come first («Дела по дому» is home, not todo) */
const TITLE_TOPICS: [RegExp, Topic][] = ([
  ['(дом|квартир|дач)', 'home'],
  ['(продукт|покуп|магазин)', 'shop'],
  ['(подар)', 'gift'],
  ['(книг|чтени)', 'book'],
  ['(фильм|сериал|кино)', 'film'],
  ['(цел)', 'goal'],
  ['(иде)', 'idea'],
  ['(заметк)', 'note'],
  ['(здоров|врач|аптек)', 'health'],
  ['(поездк|путешеств|отпуск)', 'travel'],
  ['(задач|дела|дел$)', 'todo']
] as const).map(([re, topic]) => [new RegExp(`(^|[^а-я])${re}`), topic])

const TEMPLATE_TOPIC = { shop: 'shop', todo: 'todo', goal: 'goal', note: 'note' } as const

export function pageTopic(page: Page): Topic | null {
  const title = fold(page.title)
  for (const [re, topic] of TITLE_TOPICS) if (re.test(title)) return topic
  return page.template ? TEMPLATE_TOPIC[page.template] : null
}

/** A name in quotes is a title, not a topic: «прочитать «Мастер и Маргарита»» is about a book, not a repair man */
function unquoted(text: string): string {
  return text.replace(/«[^»]*»?|"[^"]*"?|“[^”]*”?/g, ' ')
}

function words(text: string): string[] {
  return fold(unquoted(text)).split(/[^a-zа-я0-9]+/).filter(Boolean)
}

function hits(text: string, vocab: string[]): number {
  const f = ` ${fold(unquoted(text))} `
  const ws = words(text)
  return vocab.filter(v => v.includes(' ') ? f.includes(` ${v}`) : ws.some(w => w.startsWith(v) && (v.length > 2 || w === v))).length
}

export function textTopics(text: string): Topic[] {
  return (Object.keys(VOCAB) as Topic[])
    .map(t => [t, hits(text, VOCAB[t])] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
}

/** Stems the user taught by moving records: stem → page */
export type Learned = Record<string, Id>

export interface Ranked {
  pageId: Id
  score: number
}

/** Pages ranked for a line. Scores: topic word 3, a word shared with the page title or description 2, a taught word 4. */
export function rank(text: string, pages: Page[], learned: Learned = {}): Ranked[] {
  const topics = textTopics(text)
  const own = new Set(stems(unquoted(text)))
  return pages
    .filter(p => p.kind === 'page')
    .map((page) => {
      let score = 0
      const topic = pageTopic(page)
      if (topic) {
        const n = hits(text, VOCAB[topic])
        score += n * 3
        if (!n && topics.length && topics.every(t => FALLBACK[t] === topic) && !pages.some(p => pageTopic(p) === topics[0])) score += 3
      }
      for (const s of stems(`${page.title} ${page.description}`)) if (own.has(s)) score += 2
      for (const s of own) if (learned[s] === page.id) score += 4
      return { pageId: page.id, score }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
}

export interface RuleResult {
  /** Set when one page clearly wins */
  pageId: Id | null
  /** Up to three pages to offer when it is unclear */
  guesses: Id[]
  /** A name for «Новая страница «…»» when the line is about something no page covers */
  newName: string | null
}

const NEW_NAMES: [Topic, string][] = [
  ['gift', 'Подарки'],
  ['film', 'Фильмы'],
  ['book', 'Книги'],
  ['health', 'Здоровье'],
  ['travel', 'Поездки'],
  ['idea', 'Идеи'],
  ['goal', 'Цели'],
  ['home', 'Дом'],
  ['shop', 'Покупки'],
  ['note', 'Заметки']
]

/**
 * Decides on the device. Confident only when one page scores at least 3 and beats the next one;
 * `recent` fills the guesses when nothing matches (the pages written to lately).
 */
export function classify(text: string, pages: Page[], learned: Learned = {}, recent: Id[] = []): RuleResult {
  const ranked = rank(text, pages, learned)
  const best = ranked[0]
  const confident = !!best && best.score >= 3 && (ranked[1]?.score ?? 0) < best.score
  const guesses = [...ranked.map(r => r.pageId), ...recent.filter(id => pages.some(p => p.id === id && p.kind === 'page'))]
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, 3)
  const topic = textTopics(text)[0]
  const named = NEW_NAMES.find(([t]) => t === topic)?.[1] ?? null
  const taken = named && pages.some(p => fold(p.title) === fold(named))
  return { pageId: confident ? best.pageId : null, guesses, newName: confident || taken ? null : named }
}

/** Which starter a kind of line belongs to: calls, payments and visits are Дела, thoughts are Заметки */
const TOPIC_TEMPLATE: Partial<Record<Topic, TemplateKey>> = {
  shop: 'shop',
  todo: 'todo',
  health: 'todo',
  travel: 'todo',
  home: 'todo',
  goal: 'goal',
  idea: 'note',
  note: 'note'
}

/**
 * Day one, or a kind of line no page holds yet: the starter that fits it, when no page of that kind exists
 * (`classify` found no page). Books, films and gifts have no starter: they stay an Уточнение.
 */
export function templateFor(text: string, pages: Page[]): TemplateKey | null {
  const topic = textTopics(text)[0]
  const key = topic ? TOPIC_TEMPLATE[topic] : undefined
  if (!key) return null
  const own = pages.filter(p => p.kind === 'page')
  if (own.some(p => p.template === key || pageTopic(p) === key)) return null
  return key
}

/** Department for a shopping line, by the same word beginnings */
const DEPT_RULES: [string, string[]][] = [
  ['Хлеб и выпечка', ['хлеб', 'батон', 'булк', 'багет', 'лаваш', 'выпечк', 'круассан', 'пирож', 'бублик', 'сушк']],
  ['Молочное', ['молок', 'кефир', 'сыр', 'творог', 'сметан', 'йогурт', 'ряженк', 'сливк', 'масл', 'яйц', 'яиц']],
  ['Овощи и фрукты', ['банан', 'яблок', 'апельсин', 'мандарин', 'лимон', 'груш', 'виноград', 'помидор', 'томат', 'огур', 'картош', 'картоф', 'лук', 'морков', 'капуст', 'чеснок', 'зелен', 'укроп', 'авокадо', 'ягод', 'клубник', 'перец', 'кабачк']],
  ['Мясо и рыба', ['мяс', 'куриц', 'курин', 'фарш', 'говядин', 'свинин', 'рыб', 'лосос', 'семг', 'колбас', 'сосис', 'ветчин', 'индейк', 'креветк']],
  ['Бакалея', ['макарон', 'спагет', 'рис', 'греч', 'круп', 'мук', 'сахар', 'соль', 'чай', 'кофе', 'хлопь', 'овсян', 'консерв', 'соус', 'кетчуп', 'майонез', 'мед', 'специ']],
  ['Бытовая химия', ['порош', 'мыл', 'шампун', 'гель', 'зубн', 'паст', 'туалетн', 'бумаг', 'салфет', 'губк', 'кондиционер', 'отбеливат', 'средств']]
]

/** Option id of the «Выбор» property that fits a shopping line, or null */
export function guessOption(text: string, prop: PropDef): Id | null {
  const ws = words(text)
  const rule = DEPT_RULES.find(([, vocab]) => vocab.some(v => ws.some(w => w.startsWith(v))))
  if (!rule) return prop.options?.find(o => o.name === 'Прочее')?.id ?? null
  return prop.options?.find(o => o.name === rule[0])?.id ?? null
}

/** Taught stems after the user moved a record: its words now point at the page */
export function learn(learned: Learned, text: string, pageId: Id): Learned {
  const next = { ...learned }
  for (const s of stems(text)) next[s] = pageId
  return next
}
