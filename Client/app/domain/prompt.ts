// What Авто asks a model: the instructions, the answer's shape, the input, and a careful reading of the answer.
// The same for every provider, so experiments with one model carry over to another.
import type { Page } from './types'
import { dayKey } from './dates'
import { isListPage } from './auto'

export interface ModelItem {
  text: string
  date: string | null
  time: string | null
  qty: string | null
  option: string | null
}

export interface ModelResult {
  kind: 'record' | 'question' | 'unclear'
  pageId: string | null
  items: ModelItem[]
  guesses: string[]
  newPageName: string | null
}

const nullable = (type: string) => ({ type: [type, 'null'] })

/** JSON Schema of the answer: strict, so OpenAI's structured outputs and Anthropic's tool input both accept it */
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'pageId', 'items', 'guesses', 'newPageName'],
  properties: {
    kind: { type: 'string', enum: ['record', 'question', 'unclear'] },
    pageId: nullable('string'),
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'date', 'time', 'qty', 'option'],
        properties: { text: { type: 'string' }, date: nullable('string'), time: nullable('string'), qty: nullable('string'), option: nullable('string') }
      }
    },
    guesses: { type: 'array', items: { type: 'string' } },
    newPageName: nullable('string')
  }
}

export const INSTRUCTIONS = `You file short notes into the pages of a personal organiser. The user writes in Russian.
Decide what the line is:
- "question": only an explicit search for what is already stored («найди…», «где…»). No items. Any other question («когда менять фильтр воды?») is something the user keeps: a "record" like any line.
- "record": it clearly belongs to one page. Set pageId.
- "unclear": no page fits well or two fit equally. Set pageId to null, put up to three best page ids in guesses, and if no page covers the topic suggest a short plural Russian page name in newPageName (e.g. «Подарки»).
Each page has a description that says what goes there; it matters more than the title.
items: on a page with "list": true (shopping) each thing is its own item; elsewhere the whole line is one item.
text: the user's words as typed (punctuation, «?» and case kept), starting with a capital letter, without the date or time, and without a first word that only repeats the page («купить» on a shopping list, «почитать» or «книга» on a book list, «идея:» on ideas). On a list page also without the quantity, and the thing in the nominative case («2 л молока» → «Молоко»).
qty: on a list page only, like «2 л», «300 г», «10 шт»; elsewhere numbers stay in the text and qty is null.
date: YYYY-MM-DD of one specific day, resolved from today («завтра», «в пятницу», «25-го»); null for repeating or vague times («по вторникам», «к лету»). time: HH:MM or null.
option: the name of a choice from the page's select property that fits the item (for shopping, the store department), else null.`

/** The user message: today, the pages with what goes on them and whether they are lists, and the line */
export function promptInput(text: string, pages: Page[], now: number): string {
  const context = pages.filter(p => p.kind === 'page').map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    list: isListPage(p),
    selects: p.props.filter(f => f.type === 'select').map(f => ({ name: f.name, options: f.options?.map(o => o.name) ?? [] }))
  }))
  const d = new Date(now)
  return JSON.stringify({ today: dayKey(now), weekday: d.toLocaleDateString('ru-RU', { weekday: 'long' }), time: d.toTimeString().slice(0, 5), pages: context, line: text })
}

const str = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : null

/**
 * Reads an answer whatever the model made of the schema: text with or without a code fence, or an object.
 * Anything missing or of the wrong type becomes empty, so a sloppy answer ends in Уточнение, not an error.
 */
export function readResult(answer: unknown): ModelResult {
  let raw = answer
  if (typeof raw === 'string') {
    const body = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    try {
      raw = JSON.parse(body)
    } catch {
      raw = {}
    }
  }
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const kind = o.kind === 'record' || o.kind === 'question' || o.kind === 'unclear' ? o.kind : 'unclear'
  const items = (Array.isArray(o.items) ? o.items : [])
    .map((it: Record<string, unknown>) => ({ text: str(it?.text) ?? '', date: str(it?.date), time: str(it?.time), qty: str(it?.qty), option: str(it?.option) }))
    .filter(it => it.text)
  const guesses = (Array.isArray(o.guesses) ? o.guesses : []).map(str).filter((g): g is string => !!g)
  return { kind, pageId: str(o.pageId), items, guesses, newPageName: str(o.newPageName) }
}
