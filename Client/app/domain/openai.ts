// Авто with the user's own OpenAI key, called straight from the browser. The key never leaves this device otherwise.
import type OpenAI from 'openai'
import type { ModelChoice, Page } from './types'
import { dayKey } from './dates'

export const MODELS: Record<ModelChoice, string> = {
  fast: 'gpt-5.4-mini',
  exact: 'gpt-5.5'
}

/** Why a call failed, in the app's terms: no network (park the line and retry), a key OpenAI refused, or anything else */
export class ModelError extends Error {
  constructor(readonly reason: 'offline' | 'key' | 'other', cause?: unknown) {
    super(cause instanceof Error ? cause.message : reason, { cause })
  }
}

/** The SDK is loaded only when Авто actually calls OpenAI, so without a key it is never downloaded */
async function call<T>(apiKey: string, run: (client: OpenAI) => Promise<T>): Promise<T> {
  let SDK: typeof OpenAI
  try {
    SDK = (await import('openai')).default
  } catch (e) {
    throw new ModelError('offline', e)
  }
  try {
    return await run(new SDK({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 20_000 }))
  } catch (e) {
    if (e instanceof SDK.APIConnectionError) throw new ModelError('offline', e)
    if (e instanceof SDK.AuthenticationError) throw new ModelError('key', e)
    throw new ModelError('other', e)
  }
}

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

const SCHEMA = {
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

const INSTRUCTIONS = `You file short notes into the pages of a personal organiser. The user writes in Russian.
Decide what the line is:
- "question": the user asks something about what is already stored (e.g. «когда менять фильтр воды?»). No items.
- "record": it clearly belongs to one page. Set pageId.
- "unclear": no page fits well or two fit equally. Set pageId to null, put up to three best page ids in guesses, and if no page covers the topic suggest a short plural Russian page name in newPageName (e.g. «Подарки»).
Each page has a description that says what goes there; it matters more than the title.
Items: split the line into separate records only for pages that hold lists of things (shopping); keep one record otherwise.
Write each item's text as the user wrote it, starting with a capital letter, without the date, time or quantity.
date is YYYY-MM-DD (resolve «завтра», «в пятницу» from today's date), time is HH:MM, qty like «2 л», «300 г», «10 шт».
option is the name of a choice from the page's select property that fits the item (for shopping, the store department), else null.`

export async function askModel(apiKey: string, model: ModelChoice, text: string, pages: Page[], now: number, signal?: AbortSignal): Promise<ModelResult> {
  const context = pages.filter(p => p.kind === 'page').map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    selects: p.props.filter(f => f.type === 'select').map(f => ({ name: f.name, options: f.options?.map(o => o.name) ?? [] }))
  }))
  const d = new Date(now)
  const res = await call(apiKey, client => client.responses.create({
    model: MODELS[model],
    reasoning: { effort: 'low' },
    instructions: INSTRUCTIONS,
    input: JSON.stringify({ today: dayKey(now), weekday: d.toLocaleDateString('ru-RU', { weekday: 'long' }), time: d.toTimeString().slice(0, 5), pages: context, line: text }),
    text: { format: { type: 'json_schema', name: 'filing', strict: true, schema: SCHEMA } },
    store: false
  }, { signal }))
  return JSON.parse(res.output_text) as ModelResult
}

/** «Работает» or «Не работает»: a cheap call that needs a valid key. Throws ModelError('offline') without a network. */
export async function checkKey(apiKey: string): Promise<boolean> {
  try {
    await call(apiKey, client => client.models.retrieve(MODELS.fast))
    return true
  } catch (e) {
    if (e instanceof ModelError && e.reason === 'offline') throw e
    return false
  }
}

export function maskKey(key: string): string {
  return key.length > 8 ? `${key.slice(0, 3)}…${key.slice(-4)}` : '…'
}
