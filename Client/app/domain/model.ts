// Авто with the user's own model, called straight from the browser with the user's key: OpenAI, Anthropic,
// OpenRouter or any OpenAI-compatible API. The key goes to that service and nowhere else.
import type OpenAI from 'openai'
import type { ModelChoice, Page, Provider, Settings } from './types'
import { INSTRUCTIONS, SCHEMA, promptInput, readResult, type ModelResult } from './prompt'

export type { ModelItem, ModelResult } from './prompt'

export interface ProviderInfo {
  name: string
  /** Быстрая and Точная */
  models: Record<ModelChoice, string>
  baseURL?: string
  keysUrl?: string
  keyPlaceholder: string
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  openai: {
    name: 'OpenAI',
    models: { fast: 'gpt-6-luna', exact: 'gpt-6-sol' },
    keysUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…'
  },
  anthropic: {
    name: 'Anthropic',
    models: { fast: 'claude-haiku-5-5', exact: 'claude-sonnet-5-5' },
    keysUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-…'
  },
  openrouter: {
    name: 'OpenRouter',
    models: { fast: 'openai/gpt-6-luna', exact: 'openai/gpt-6-sol' },
    baseURL: 'https://openrouter.ai/api/v1',
    keysUrl: 'https://openrouter.ai/settings/keys',
    keyPlaceholder: 'sk-or-…'
  },
  custom: {
    name: 'Другой',
    models: { fast: '', exact: '' },
    keyPlaceholder: 'Ключ'
  }
}

export type Connection = Pick<Settings, 'provider' | 'apiKey' | 'baseUrl' | 'modelId' | 'model'>

/** Enough to call: a key, and for «Другой» also its address and model */
export function isConnected(c: Connection): boolean {
  return !!c.apiKey && (c.provider !== 'custom' || (!!c.baseUrl.trim() && !!c.modelId.trim()))
}

/** The model Авто calls: the one typed in, else Быстрая or Точная of the service */
export function modelOf(c: Connection): string {
  return c.modelId.trim() || PROVIDERS[c.provider].models[c.model]
}

/**
 * Why a call failed, in the app's terms: no network (park the line and retry), no answer in time, a key the
 * service refused, a model it does not have, or anything else
 */
export class ModelError extends Error {
  constructor(readonly reason: 'offline' | 'timeout' | 'key' | 'model' | 'other', cause?: unknown) {
    super(cause instanceof Error ? cause.message : reason, { cause })
  }
}

/** Авто waits this long, then the line waits in Входящие with «ИИ не ответил» (v22, B7) */
const TIMEOUT = 10_000

/** OpenAI, OpenRouter and «Другой» go through the OpenAI SDK, loaded only when Авто actually calls a model */
async function viaOpenAI<T>(c: Connection, run: (client: OpenAI) => Promise<T>): Promise<T> {
  let SDK: typeof OpenAI
  try {
    SDK = (await import('openai')).default
  } catch (e) {
    throw new ModelError('offline', e)
  }
  const baseURL = c.provider === 'custom' ? c.baseUrl.trim() : PROVIDERS[c.provider].baseURL
  try {
    return await run(new SDK({ apiKey: c.apiKey, baseURL, dangerouslyAllowBrowser: true, maxRetries: 0, timeout: TIMEOUT }))
  } catch (e) {
    if (e instanceof SDK.APIConnectionTimeoutError) throw new ModelError('timeout', e)
    if (e instanceof SDK.APIConnectionError) throw new ModelError('offline', e)
    if (e instanceof SDK.AuthenticationError || e instanceof SDK.PermissionDeniedError) throw new ModelError('key', e)
    if (e instanceof SDK.NotFoundError) throw new ModelError('model', e)
    throw new ModelError('other', e)
  }
}

/** Anthropic's Messages API answers browsers that say so in a header; no SDK needed for one call */
async function viaAnthropic(c: Connection, body: object): Promise<{ content?: { type: string, input?: unknown }[] }> {
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': c.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT)
    })
  } catch (e) {
    throw new ModelError(e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'offline', e)
  }
  if (res.status === 401 || res.status === 403) throw new ModelError('key')
  if (res.status === 404) throw new ModelError('model')
  if (!res.ok) throw new ModelError('other', new Error(`${res.status} ${await res.text().catch(() => '')}`))
  return res.json()
}

export async function askModel(c: Connection, text: string, pages: Page[], now: number): Promise<ModelResult> {
  const model = modelOf(c)
  const input = promptInput(text, pages, now)

  if (c.provider === 'anthropic') {
    // A forced tool call is how Claude answers in a given shape
    const res = await viaAnthropic(c, {
      model,
      max_tokens: 1024,
      system: INSTRUCTIONS,
      messages: [{ role: 'user', content: input }],
      tools: [{ name: 'file_line', description: 'Files the line into the organiser', input_schema: SCHEMA }],
      tool_choice: { type: 'tool', name: 'file_line' }
    })
    return readResult(res.content?.find(b => b.type === 'tool_use')?.input)
  }

  if (c.provider === 'openai') {
    const res = await viaOpenAI(c, client => client.responses.create({
      model,
      // Reasoning models think briefly; a model typed in by hand may not take the setting at all
      ...(/^(gpt-[5-9]|o\d)/.test(model) ? { reasoning: { effort: 'low' as const } } : {}),
      instructions: INSTRUCTIONS,
      input,
      text: { format: { type: 'json_schema', name: 'filing', strict: true, schema: SCHEMA } },
      store: false
    }))
    return readResult(res.output_text)
  }

  // OpenRouter and other OpenAI-compatible APIs all speak Chat Completions
  const res = await viaOpenAI(c, client => client.chat.completions.create({
    model,
    messages: [{ role: 'system', content: INSTRUCTIONS }, { role: 'user', content: input }],
    response_format: { type: 'json_schema', json_schema: { name: 'filing', strict: true, schema: SCHEMA } }
  }))
  return readResult(res.choices[0]?.message?.content)
}

/**
 * «Работает» or why not: one small real request, so the key, the address and the model are all checked.
 * Throws ModelError('offline') without a network.
 */
export async function checkConnection(c: Connection): Promise<'ok' | 'key' | 'model' | 'other'> {
  try {
    await askModel(c, 'хлеб', [], Date.now())
    return 'ok'
  } catch (e) {
    if (!(e instanceof ModelError)) return 'other'
    if (e.reason === 'offline') throw e
    return e.reason === 'timeout' ? 'other' : e.reason
  }
}

export function maskKey(key: string): string {
  return key.length > 8 ? `${key.slice(0, 3)}…${key.slice(-4)}` : '…'
}
