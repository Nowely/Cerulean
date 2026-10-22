// What Авто asks a model: the instructions, the answer's shape, the input, and a careful reading of the answer.
// The same for every provider, so experiments with one model carry over to another.
import type { Page } from './types'
import { dayKey } from './dates'
import { isListPage } from './auto'

export interface ModelItem {
  text: string
  /** Details that are not the name («2,5%, большую пачку»), the record's text under its title */
  note: string
  /** The page the record goes to; null when no page clearly fits (it waits in Входящие) */
  pageId: string | null
  date: string | null
  time: string | null
  qty: string | null
  option: string | null
}

/**
 * A line is records, each on its own page (main flow, item 23), or an explicit search. Nothing is unclear: a
 * record no page fits has no page and goes to Входящие, so nothing asks
 */
export interface ModelResult {
  kind: 'record' | 'question'
  items: ModelItem[]
}

const nullable = (type: string) => ({ type: [type, 'null'] })

/** JSON Schema of the answer: strict, so OpenAI's structured outputs and Anthropic's tool input both accept it */
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'items'],
  properties: {
    kind: { type: 'string', enum: ['record', 'question'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'note', 'pageId', 'date', 'time', 'qty', 'option'],
        properties: {
          text: { type: 'string' },
          note: { type: 'string' },
          pageId: nullable('string'),
          date: nullable('string'),
          time: nullable('string'),
          qty: nullable('string'),
          option: nullable('string')
        }
      }
    }
  }
}

export const INSTRUCTIONS = `You file short notes into the pages of a personal organiser. The user writes in Russian.
Decide what the line is:
- "question": only an explicit search for what is already stored («найди…», «где…»). No items. Any other question («когда менять фильтр воды?») is something the user keeps: a "record" like any line.
- "record": one or more records. A line often holds several («Купить молоко и позвонить маме завтра» is two: a thing to buy and a call). Each item is one record with its own pageId: the page it belongs to, or null when no page clearly fits (it then waits in the inbox; never guess).
Each page has a description that says what goes there; it matters more than the title. Pages the user made («own»: true) are fair targets: «пазл для Пети» belongs on «Подарки» when there is one.
items: on a page with "list": true (shopping) each thing is its own item.
text: a short title in the user's words, starting with a capital letter, without the date or time. A thing to buy keeps only its name, wherever it goes: no «купить» («Купить пазл для Пети» → «Пазл для Пети»), in the nominative case («2 л молока» → «Молоко»). Also without a first word that only repeats the page («почитать» or «книга» on a book list, «идея:» on ideas).
note: details that are not the name, as typed («Купить молоко 2,5% большую пачку» → text «Молоко», note «2,5%, большую пачку»); "" when there are none.
qty: on a list page only, like «2 л», «300 г», «10 шт»; elsewhere numbers stay in the text or note and qty is null.
date: YYYY-MM-DD of one specific day, resolved from today («завтра», «в пятницу», «25-го»); null for repeating or vague times («по вторникам», «к лету»). time: HH:MM or null.
option: the name of a choice from the page's select property that fits the item (for shopping, the store department), else null.`

/** The user message: today, the pages with what goes on them and whether they are lists, and the line */
export function promptInput(text: string, pages: Page[], now: number): string {
  const context = pages.filter(p => p.kind === 'page').map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    list: isListPage(p),
    own: !p.template,
    selects: p.props.filter(f => f.type === 'select').map(f => ({ name: f.name, options: f.options?.map(o => o.name) ?? [] }))
  }))
  const d = new Date(now)
  return JSON.stringify({ today: dayKey(now), weekday: d.toLocaleDateString('ru-RU', { weekday: 'long' }), time: d.toTimeString().slice(0, 5), pages: context, line: text })
}

const str = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : null

/**
 * Reads an answer whatever the model made of the schema: text with or without a code fence, or an object.
 * Anything missing or of the wrong type becomes empty, so a sloppy answer ends in Входящие, not an error.
 * An «unclear» from an older prompt reads as its items with no page
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
  const kind = o.kind === 'question' ? 'question' : 'record'
  const top = o.kind === 'record' ? str(o.pageId) : null
  const items = (Array.isArray(o.items) ? o.items : [])
    .map((it: Record<string, unknown>) => ({
      text: str(it?.text) ?? '',
      note: str(it?.note) ?? '',
      pageId: str(it?.pageId) ?? top,
      date: str(it?.date),
      time: str(it?.time),
      qty: str(it?.qty),
      option: str(it?.option)
    }))
    .filter(it => it.text)
  return { kind, items: kind === 'question' ? [] : items }
}
